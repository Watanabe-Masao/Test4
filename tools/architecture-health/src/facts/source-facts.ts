/**
 * Source Facts collector — file-level size + structure facts articulation.
 *
 * Wave 1 #4 (= reposteward-ai-ops-platform) で landing。canonical schema =
 * `docs/contracts/aag/source-facts.schema.json`。Wave 1 #5 statistics の入力、
 * Wave 1 #6 stats files query の back-end、Wave 2 sizeGuard refactor の reference。
 *
 * 不可侵原則 (= projects/active/reposteward-ai-ops-platform/plan.md §不可侵原則):
 *   1. JSON-first (= output は schema 準拠 JSON)
 *   3. Read-only first (= file 走査のみ、書き換えなし)
 *   4. 主検出は構造 (= comment annotation 駆動ではなく path / extension / 行 pattern 駆動)
 *   6. Additive-only (= 既存 collector / Health pipeline に並行で追加)
 *
 * @see docs/contracts/aag/source-facts.schema.json (canonical)
 * @see aag/parameters/aag-parameters.json (= codeSize.metric / excludedKinds が本 collector の入力)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ───────────────────────────────────────────────────────────────────────
// types
// ───────────────────────────────────────────────────────────────────────

export type SourceFactKind = 'typescript' | 'tsx' | 'go' | 'markdown' | 'json' | 'other'
export type ExcludedKind = 'generated' | 'fixture' | 'archive'

export interface SourceFact {
  readonly path: string
  readonly kind: SourceFactKind
  readonly layer: string | null
  readonly physicalLines: number
  readonly blankLines: number
  readonly commentLines: number
  readonly effectiveCodeLines: number
  readonly imports?: ReadonlyArray<string>
  readonly exports?: number
  readonly hooks?: Readonly<Record<string, number>>
}

export interface SourceFactsSummary {
  readonly totalFiles: number
  readonly byKind: Readonly<Record<string, number>>
  readonly excludedKinds: ReadonlyArray<ExcludedKind>
}

export interface SourceFactsBundle {
  readonly schemaVersion: 'source-facts-v1'
  readonly generatedAt: string
  readonly summary: SourceFactsSummary
  readonly facts: ReadonlyArray<SourceFact>
}

export interface CollectOptions {
  readonly repoRoot: string
  readonly excludedKinds?: ReadonlyArray<ExcludedKind>
  readonly includeDirs?: ReadonlyArray<string>
}

// ───────────────────────────────────────────────────────────────────────
// constants
// ───────────────────────────────────────────────────────────────────────

const DEFAULT_INCLUDE_DIRS = [
  'app/src',
  'aag-engine',
  'tools/architecture-health/src',
  'references',
  'docs',
  'projects',
] as const

const ALWAYS_SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
  '.vercel',
  '.turbo',
])

const REACT_HOOKS = [
  'useState',
  'useEffect',
  'useMemo',
  'useCallback',
  'useRef',
  'useContext',
  'useReducer',
  'useLayoutEffect',
  'useImperativeHandle',
  'useDebugValue',
] as const

// ───────────────────────────────────────────────────────────────────────
// public API
// ───────────────────────────────────────────────────────────────────────

export function collectSourceFacts(opts: CollectOptions): SourceFactsBundle {
  const repoRoot = opts.repoRoot
  const excludedKinds = opts.excludedKinds ?? []
  const includeDirs = opts.includeDirs ?? DEFAULT_INCLUDE_DIRS

  const facts: SourceFact[] = []
  const byKind: Record<string, number> = {}

  for (const dir of includeDirs) {
    const absDir = path.join(repoRoot, dir)
    if (!fs.existsSync(absDir)) continue
    walkDir(absDir, repoRoot, excludedKinds, (relPath) => {
      const fact = factForFile(repoRoot, relPath)
      if (fact == null) return
      facts.push(fact)
      byKind[fact.kind] = (byKind[fact.kind] ?? 0) + 1
    })
  }

  facts.sort((a, b) => a.path.localeCompare(b.path))

  return {
    schemaVersion: 'source-facts-v1',
    generatedAt: new Date().toISOString(),
    summary: {
      totalFiles: facts.length,
      byKind,
      excludedKinds,
    },
    facts,
  }
}

// ───────────────────────────────────────────────────────────────────────
// walking
// ───────────────────────────────────────────────────────────────────────

function walkDir(
  absDir: string,
  repoRoot: string,
  excludedKinds: ReadonlyArray<ExcludedKind>,
  visit: (relPath: string) => void,
): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.claude') continue
    if (ALWAYS_SKIP_DIRS.has(entry.name)) continue
    const absChild = path.join(absDir, entry.name)
    const relChild = toPosix(path.relative(repoRoot, absChild))
    if (entry.isDirectory()) {
      if (isExcluded(relChild, excludedKinds, true)) continue
      walkDir(absChild, repoRoot, excludedKinds, visit)
    } else if (entry.isFile()) {
      if (isExcluded(relChild, excludedKinds, false)) continue
      visit(relChild)
    }
  }
}

function isExcluded(
  relPath: string,
  excludedKinds: ReadonlyArray<ExcludedKind>,
  isDir: boolean,
): boolean {
  for (const kind of excludedKinds) {
    if (kind === 'generated' && (relPath.includes('/generated/') || relPath.startsWith('generated/'))) {
      return true
    }
    if (kind === 'fixture' && (relPath.includes('/fixtures/') || relPath.startsWith('fixtures/') || /\.fixture\.[a-z]+$/.test(relPath))) {
      return true
    }
    if (kind === 'archive' && (relPath.startsWith('projects/completed/') || relPath.startsWith('references/99-archive/'))) {
      return true
    }
  }
  // path-helpers compatibility: skip files outside the recognized include set just-in-case
  void isDir
  return false
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

// ───────────────────────────────────────────────────────────────────────
// per-file facts
// ───────────────────────────────────────────────────────────────────────

function factForFile(repoRoot: string, relPath: string): SourceFact | null {
  const kind = inferKind(relPath)
  if (kind === 'other') return null

  const absPath = path.join(repoRoot, relPath)
  let raw: string
  try {
    raw = fs.readFileSync(absPath, 'utf-8')
  } catch {
    return null
  }

  const lines = raw.split('\n')
  const physicalLines = raw.length === 0 ? 0 : lines.length

  let blankLines = 0
  for (const line of lines) {
    if (line.trim().length === 0) blankLines++
  }

  const commentLines = countCommentLines(lines, kind)
  const effectiveCodeLines = Math.max(0, physicalLines - blankLines - commentLines)

  const fact: SourceFact = {
    path: relPath,
    kind,
    layer: inferLayer(relPath),
    physicalLines,
    blankLines,
    commentLines,
    effectiveCodeLines,
  }

  if (kind === 'typescript' || kind === 'tsx') {
    return enrichTs(fact, raw, kind)
  }
  if (kind === 'go') {
    return enrichGo(fact, raw)
  }
  return fact
}

function inferKind(relPath: string): SourceFactKind {
  if (relPath.endsWith('.tsx')) return 'tsx'
  if (relPath.endsWith('.ts')) return 'typescript'
  if (relPath.endsWith('.go')) return 'go'
  if (relPath.endsWith('.md')) return 'markdown'
  if (relPath.endsWith('.json')) return 'json'
  return 'other'
}

function inferLayer(relPath: string): string | null {
  if (relPath.startsWith('app/src/presentation/')) return 'presentation'
  if (relPath.startsWith('app/src/application/')) return 'application'
  if (relPath.startsWith('app/src/domain/')) return 'domain'
  if (relPath.startsWith('app/src/infrastructure/')) return 'infrastructure'
  if (relPath.startsWith('app/src/features/')) {
    const segments = relPath.split('/')
    return segments.length >= 4 ? `features/${segments[3]}` : 'features'
  }
  if (relPath.startsWith('app/src/test/')) return 'test'
  if (relPath.startsWith('app/src/stories/')) return 'stories'
  if (relPath.startsWith('app/src/')) return 'app'
  if (relPath.startsWith('aag-engine/')) return 'aag-engine'
  if (relPath.startsWith('tools/')) return 'tools'
  if (relPath.startsWith('references/')) return 'references'
  if (relPath.startsWith('docs/')) return 'docs'
  if (relPath.startsWith('projects/')) return 'projects'
  return null
}

// ───────────────────────────────────────────────────────────────────────
// comment counting
// ───────────────────────────────────────────────────────────────────────

function countCommentLines(lines: ReadonlyArray<string>, kind: SourceFactKind): number {
  if (kind === 'markdown' || kind === 'json' || kind === 'other') return 0

  let count = 0
  let inBlock = false
  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (trimmed.length === 0) continue

    if (inBlock) {
      count++
      const closeIdx = trimmed.indexOf('*/')
      if (closeIdx !== -1) {
        inBlock = false
        const after = trimmed.slice(closeIdx + 2).trim()
        if (after.length > 0 && !after.startsWith('//')) {
          count--
        }
      }
      continue
    }

    if (trimmed.startsWith('//')) {
      count++
      continue
    }
    if (trimmed.startsWith('/*')) {
      const closeIdx = trimmed.indexOf('*/', 2)
      if (closeIdx === -1) {
        inBlock = true
        count++
      } else {
        const after = trimmed.slice(closeIdx + 2).trim()
        if (after.length === 0 || after.startsWith('//')) {
          count++
        }
      }
    }
  }
  return count
}

// ───────────────────────────────────────────────────────────────────────
// TS / TSX enrichment
// ───────────────────────────────────────────────────────────────────────

function enrichTs(base: SourceFact, raw: string, kind: 'typescript' | 'tsx'): SourceFact {
  const imports = extractTsImports(raw)
  const exportsCount = countTsExports(raw)
  let hooks: Record<string, number> | undefined

  if (kind === 'tsx') {
    hooks = countReactHooks(raw)
    if (Object.keys(hooks).length === 0) hooks = undefined
  }

  return {
    ...base,
    imports,
    exports: exportsCount,
    ...(hooks ? { hooks } : {}),
  }
}

function extractTsImports(raw: string): ReadonlyArray<string> {
  const out: string[] = []
  const re = /^[ \t]*import\s+(?:[\w*\s{},]+\s+from\s+)?["']([^"']+)["']/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    out.push(match[1])
  }
  return out
}

function countTsExports(raw: string): number {
  // Count `export ` occurrences, excluding `export type ...` and `export interface ...`
  // Also exclude re-exports `export { x } from ...` only? No, count those as exports.
  const total = (raw.match(/^[ \t]*export\s+(?!type\s|interface\s)/gm) ?? []).length
  return total
}

function countReactHooks(raw: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const hook of REACT_HOOKS) {
    const re = new RegExp(`\\b${hook}\\s*\\(`, 'g')
    const m = raw.match(re)
    if (m && m.length > 0) {
      out[hook] = m.length
    }
  }
  return out
}

// ───────────────────────────────────────────────────────────────────────
// Go enrichment
// ───────────────────────────────────────────────────────────────────────

function enrichGo(base: SourceFact, raw: string): SourceFact {
  const imports = extractGoImports(raw)
  const exportsCount = countGoExports(raw)
  return { ...base, imports, exports: exportsCount }
}

function extractGoImports(raw: string): ReadonlyArray<string> {
  const out: string[] = []
  const singleRe = /^[ \t]*import\s+"([^"]+)"/gm
  let m: RegExpExecArray | null
  while ((m = singleRe.exec(raw)) !== null) {
    out.push(m[1])
  }
  const blockRe = /^[ \t]*import\s*\(\s*([\s\S]*?)\)/gm
  let bm: RegExpExecArray | null
  while ((bm = blockRe.exec(raw)) !== null) {
    const body = bm[1]
    const lineRe = /"([^"]+)"/g
    let lm: RegExpExecArray | null
    while ((lm = lineRe.exec(body)) !== null) {
      out.push(lm[1])
    }
  }
  return out
}

function countGoExports(raw: string): number {
  const re = /^[ \t]*(?:func|type|var|const)\s+(?:\([^)]*\)\s+)?([A-Z][\w]*)/gm
  const m = raw.match(re)
  return m ? m.length : 0
}
