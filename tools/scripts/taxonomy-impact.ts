/**
 * Taxonomy Impact CLI (Phase 5 Operations)
 *
 * 親 taxonomy-v2 plan §OCS.3 + 子 operations.md §5 で正本化された
 * `taxonomy:impact` の R 軸 / T 軸 出力を生成する。
 *
 * 使い方:
 *   cd app && npm run taxonomy:impact
 *   cd app && npm run taxonomy:impact -- --base main --head HEAD
 *   cd app && npm run taxonomy:impact -- --axis responsibility
 *   cd app && npm run taxonomy:impact -- --axis test
 *
 * 出力 contract:
 * - R 軸: responsibility-taxonomy-operations.md §5.2
 * - T 軸: test-taxonomy-operations.md §5.2
 *
 * 設計原則:
 * - read-only（git diff から changed file を読み、registry から Interlock を引くのみ）
 * - registry V2 を SSOT として参照（責務軸 / テスト軸 ともに）
 * - 結果は人間可読 + exit code（fail -> exit 1）
 *
 * 関連:
 * - projects/taxonomy-v2/plan.md §OCS.3
 * - references/03-guides/responsibility-taxonomy-operations.md §5
 * - references/03-guides/test-taxonomy-operations.md §5
 * - references/01-principles/taxonomy-interlock.md (Interlock マトリクス正本)
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { resolve, relative, dirname, basename } from 'node:path'

import { RESPONSIBILITY_TAG_REGISTRY_V2 } from '../../app/src/test/responsibilityTaxonomyRegistryV2'
import { TEST_TAXONOMY_REGISTRY_V2 } from '../../app/src/test/testTaxonomyRegistryV2'

// ---------------------------------------------------------------------------
// パス + CLI 引数
// ---------------------------------------------------------------------------

const REPO_ROOT = resolve(__dirname, '../..')

interface CliArgs {
  base: string
  head: string
  axis: 'responsibility' | 'test' | 'both'
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { base: 'main', head: 'HEAD', axis: 'both' }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--base' && argv[i + 1]) {
      args.base = argv[i + 1]!
      i++
    } else if (arg === '--head' && argv[i + 1]) {
      args.head = argv[i + 1]!
      i++
    } else if (arg === '--axis' && argv[i + 1]) {
      const a = argv[i + 1]!
      if (a !== 'responsibility' && a !== 'test' && a !== 'both') {
        throw new Error(
          `--axis must be one of: responsibility | test | both (got: ${a})`,
        )
      }
      args.axis = a
      i++
    }
  }
  return args
}

// ---------------------------------------------------------------------------
// Annotation 抽出
// ---------------------------------------------------------------------------

const RESPONSIBILITY_REGEX = /@responsibility\s+(R:[a-z][a-z0-9-]+(?:\s*,\s*R:[a-z][a-z0-9-]+)*)/g
const TAXONOMY_KIND_REGEX = /@taxonomyKind\s+(T:[a-z][a-z0-9-]+(?:\s*,\s*T:[a-z][a-z0-9-]+)*)/g

function extractTags(content: string, regex: RegExp): readonly string[] {
  const tags = new Set<string>()
  for (const match of content.matchAll(regex)) {
    for (const tag of match[1]!.split(',')) {
      tags.add(tag.trim())
    }
  }
  return [...tags].sort()
}

// ---------------------------------------------------------------------------
// File group resolution（src ↔ test の pair 解決）
// ---------------------------------------------------------------------------

function isTestFile(path: string): boolean {
  return /\.(test|spec)\.(ts|tsx)$/.test(path)
}

function isSourceFile(path: string): boolean {
  return /\.(ts|tsx)$/.test(path) && !isTestFile(path)
}

/**
 * src file から想定される test file の候補パスを返す。
 *
 * 例: app/src/domain/calculations/foo.ts
 *   → app/src/domain/calculations/foo.test.ts
 *   → app/src/test/<...>/foo.test.ts (heuristic)
 */
function findPairedTestFiles(srcPath: string): readonly string[] {
  const candidates: string[] = []
  const dir = dirname(srcPath)
  const base = basename(srcPath).replace(/\.(ts|tsx)$/, '')

  for (const ext of ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'] as const) {
    const p = resolve(dir, `${base}${ext}`)
    if (existsSync(p)) candidates.push(p)
  }

  // guards/<name>.test.ts heuristic（responsibilityTagGuard.ts → guards/responsibilityTagGuard.test.ts）
  const guardPath = resolve(REPO_ROOT, 'app/src/test/guards', `${base}.test.ts`)
  if (existsSync(guardPath)) candidates.push(guardPath)

  return [...new Set(candidates)]
}

/**
 * test file から対応する src file の候補を返す。
 */
function findPairedSourceFiles(testPath: string): readonly string[] {
  const candidates: string[] = []
  const dir = dirname(testPath)
  const base = basename(testPath).replace(/\.(test|spec)\.(ts|tsx)$/, '')

  for (const ext of ['.ts', '.tsx'] as const) {
    const p = resolve(dir, `${base}${ext}`)
    if (existsSync(p)) candidates.push(p)
  }

  return candidates
}

// ---------------------------------------------------------------------------
// Interlock 解決
// ---------------------------------------------------------------------------

function requiredTKindsOf(rTags: readonly string[]): readonly string[] {
  const set = new Set<string>()
  for (const tag of rTags) {
    const entry = (RESPONSIBILITY_TAG_REGISTRY_V2 as Record<string, { interlock?: { requiredTKinds?: readonly string[] } }>)[tag]
    if (entry?.interlock?.requiredTKinds) {
      for (const t of entry.interlock.requiredTKinds) set.add(t)
    }
  }
  return [...set].sort()
}

function optionalTKindsOf(rTags: readonly string[]): readonly string[] {
  const set = new Set<string>()
  for (const tag of rTags) {
    const entry = (RESPONSIBILITY_TAG_REGISTRY_V2 as Record<string, { interlock?: { optionalTKinds?: readonly string[] } }>)[tag]
    if (entry?.interlock?.optionalTKinds) {
      for (const t of entry.interlock.optionalTKinds) set.add(t)
    }
  }
  return [...set].sort()
}

function verifiesOf(tKinds: readonly string[]): readonly string[] {
  const set = new Set<string>()
  for (const kind of tKinds) {
    const entry = (TEST_TAXONOMY_REGISTRY_V2 as Record<string, { interlock?: { verifies?: readonly string[] } }>)[kind]
    if (entry?.interlock?.verifies) {
      for (const r of entry.interlock.verifies) set.add(r)
    }
  }
  return [...set].sort()
}

// ---------------------------------------------------------------------------
// Git diff
// ---------------------------------------------------------------------------

function listChangedFiles(base: string, head: string): readonly string[] {
  try {
    const out = execSync(
      `git diff --name-only --diff-filter=ACMR ${base}...${head}`,
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    )
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(
        (s) =>
          s.length > 0 &&
          (s.endsWith('.ts') || s.endsWith('.tsx')) &&
          existsSync(resolve(REPO_ROOT, s)),
      )
  } catch (err) {
    process.stderr.write(`[taxonomy:impact] git diff failed: ${(err as Error).message}\n`)
    return []
  }
}

// ---------------------------------------------------------------------------
// 出力レポート
// ---------------------------------------------------------------------------

interface ResponsibilityReport {
  readonly path: string
  readonly detectedResponsibility: readonly string[]
  readonly requiredTKinds: readonly string[]
  readonly optionalTKinds: readonly string[]
  readonly foundTKinds: readonly string[]
  readonly missingTKinds: readonly string[]
  readonly result: 'pass' | 'warn' | 'fail'
}

interface TestReport {
  readonly path: string
  readonly detectedTKinds: readonly string[]
  readonly linkedRTags: readonly string[]
  readonly expectedTKinds: readonly string[]
  readonly presentTKinds: readonly string[]
  readonly missingTKinds: readonly string[]
  readonly unverifiedTKinds: readonly string[]
  readonly result: 'pass' | 'warn' | 'fail'
}

function analyzeResponsibility(absPath: string): ResponsibilityReport | null {
  if (!isSourceFile(absPath) || !existsSync(absPath)) return null
  if (!statSync(absPath).isFile()) return null

  const content = readFileSync(absPath, 'utf-8')
  const detected = extractTags(content, RESPONSIBILITY_REGEX)
  if (detected.length === 0) return null

  const required = requiredTKindsOf(detected)
  const optional = optionalTKindsOf(detected)

  const pairedTests = findPairedTestFiles(absPath)
  const found = new Set<string>()
  for (const testPath of pairedTests) {
    const tcontent = readFileSync(testPath, 'utf-8')
    for (const t of extractTags(tcontent, TAXONOMY_KIND_REGEX)) found.add(t)
  }
  const foundArr = [...found].sort()
  const missing = required.filter((t) => !found.has(t))

  const result: 'pass' | 'warn' | 'fail' =
    missing.length > 0 ? 'fail' : optional.some((t) => !found.has(t)) ? 'warn' : 'pass'

  return {
    path: relative(REPO_ROOT, absPath),
    detectedResponsibility: detected,
    requiredTKinds: required,
    optionalTKinds: optional,
    foundTKinds: foundArr,
    missingTKinds: missing,
    result,
  }
}

function analyzeTest(absPath: string): TestReport | null {
  if (!isTestFile(absPath) || !existsSync(absPath)) return null
  if (!statSync(absPath).isFile()) return null

  const content = readFileSync(absPath, 'utf-8')
  const detected = extractTags(content, TAXONOMY_KIND_REGEX)
  if (detected.length === 0) return null

  const pairedSrcs = findPairedSourceFiles(absPath)
  const linkedRSet = new Set<string>()
  for (const srcPath of pairedSrcs) {
    const scontent = readFileSync(srcPath, 'utf-8')
    for (const r of extractTags(scontent, RESPONSIBILITY_REGEX)) linkedRSet.add(r)
  }
  const linked = [...linkedRSet].sort()

  const expected = requiredTKindsOf(linked)
  const present = detected
  const missing = expected.filter((t) => !present.includes(t))

  // unverified: detected の T:kind のうち、linked R:tag が verifies 集合に含まれないもの
  const verifiedRSet = new Set(verifiesOf(detected))
  const unverified = detected.filter(
    (t) => {
      const entry = (TEST_TAXONOMY_REGISTRY_V2 as Record<string, { interlock?: { verifies?: readonly string[] } }>)[t]
      const verifies = entry?.interlock?.verifies ?? []
      // unverified = test が「これを verify する」と主張する R:tag が src に存在しない
      return verifies.length > 0 && !verifies.some((r) => linked.includes(r))
    },
  )
  // verifiedRSet は将来の per-tag 詳細表示用（現在は判定のみで使用）
  void verifiedRSet

  const result: 'pass' | 'warn' | 'fail' =
    missing.length > 0 ? 'fail' : unverified.length > 0 ? 'warn' : 'pass'

  return {
    path: relative(REPO_ROOT, absPath),
    detectedTKinds: detected,
    linkedRTags: linked,
    expectedTKinds: expected,
    presentTKinds: present,
    missingTKinds: missing,
    unverifiedTKinds: unverified,
    result,
  }
}

// ---------------------------------------------------------------------------
// 人間可読 formatter
// ---------------------------------------------------------------------------

function formatList(items: readonly string[]): string {
  return items.length === 0 ? '  (none)' : items.map((i) => `  ${i}`).join('\n')
}

function renderResponsibilityReport(r: ResponsibilityReport): string {
  return [
    `Changed file:`,
    `  ${r.path}`,
    `Detected responsibility:`,
    formatList(r.detectedResponsibility),
    `Required tests (from Interlock matrix):`,
    formatList(r.requiredTKinds),
    `Optional tests:`,
    formatList(r.optionalTKinds),
    `Found tests:`,
    formatList(r.foundTKinds),
    `Missing:`,
    formatList(r.missingTKinds),
    `Result:`,
    `  ${r.result}`,
    '',
  ].join('\n')
}

function renderTestReport(r: TestReport): string {
  return [
    `Changed file:`,
    `  ${r.path}`,
    `Detected T:kind:`,
    formatList(r.detectedTKinds),
    `Linked R:tag (src side):`,
    formatList(r.linkedRTags),
    `Expected T:kind (Interlock):`,
    formatList(r.expectedTKinds),
    `Present T:kind:`,
    formatList(r.presentTKinds),
    `Missing:`,
    formatList(r.missingTKinds),
    `Unverified:`,
    formatList(r.unverifiedTKinds),
    `Result:`,
    `  ${r.result}`,
    '',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs(process.argv.slice(2))

  process.stdout.write(
    `[taxonomy:impact] base=${args.base} head=${args.head} axis=${args.axis}\n\n`,
  )

  const changed = listChangedFiles(args.base, args.head)
  if (changed.length === 0) {
    process.stdout.write(`[taxonomy:impact] No changed .ts/.tsx files between ${args.base}..${args.head}\n`)
    return
  }

  const rReports: ResponsibilityReport[] = []
  const tReports: TestReport[] = []

  for (const rel of changed) {
    const abs = resolve(REPO_ROOT, rel)
    if (args.axis === 'responsibility' || args.axis === 'both') {
      const r = analyzeResponsibility(abs)
      if (r) rReports.push(r)
    }
    if (args.axis === 'test' || args.axis === 'both') {
      const t = analyzeTest(abs)
      if (t) tReports.push(t)
    }
  }

  let exitCode = 0

  if (rReports.length > 0) {
    process.stdout.write(`=== Responsibility axis (${rReports.length} file(s)) ===\n\n`)
    for (const r of rReports) {
      process.stdout.write(renderResponsibilityReport(r))
      if (r.result === 'fail') exitCode = 1
    }
  }

  if (tReports.length > 0) {
    process.stdout.write(`=== Test axis (${tReports.length} file(s)) ===\n\n`)
    for (const t of tReports) {
      process.stdout.write(renderTestReport(t))
      if (t.result === 'fail') exitCode = 1
    }
  }

  if (rReports.length === 0 && tReports.length === 0) {
    process.stdout.write(
      `[taxonomy:impact] No tagged files in changed set (axis=${args.axis})\n`,
    )
  }

  const summary = `=== Summary ===
Responsibility axis: ${rReports.filter((r) => r.result === 'pass').length} pass / ${rReports.filter((r) => r.result === 'warn').length} warn / ${rReports.filter((r) => r.result === 'fail').length} fail
Test axis:           ${tReports.filter((t) => t.result === 'pass').length} pass / ${tReports.filter((t) => t.result === 'warn').length} warn / ${tReports.filter((t) => t.result === 'fail').length} fail
Exit code:           ${exitCode}
`
  process.stdout.write('\n' + summary)

  process.exit(exitCode)
}

main()
