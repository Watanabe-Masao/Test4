/**
 * Old Path Reference Guard
 *
 * R3a で rename された 5 directory (`01-principles` / `02-status` / `04-design-system` /
 * `03-guides` / `05-contents`) への path reference 残置を機械検出する。
 *
 * ratchet-down baseline=0、Hard fail。
 *
 * 役割:
 * - 旧 path に逆戻りする commit を構造的に block (= 不可侵原則 5「partial migration 禁止」を ratchet-down で永続化)
 * - 新規 file / 既存 file の改修で旧 path string が混入することを防ぐ
 * - archive (= `projects/completed/` + `references/99-archive/`) は **意図的に whitelist 除外**
 *   (= drawer 不可逆性、archive doc は frozen state)
 *
 * scope:
 * - `references/`、`aag/`、`projects/` 配下の active artifact (= archive 除外)
 * - `app/`、`tools/`、`docs/`、`.github/` 配下の active code / config
 * - root 直下の `.md` (= CLAUDE.md / README.md / etc.)
 *
 * 例外 (= intentional preservation):
 * - 旧 path migration の articulation 自身 (= plan.md / breaking-changes.md / DA entry の
 *   「01-principles → 01-foundation」mapping 記述)
 * - decision-audit.md の判断 lineage 内 historical reference
 * - doc-improvement-backlog.md の P1-1 articulation
 * - docs/contracts/doc-registry.json の `$comment` 内 changelog
 * - `dependabot.yml` の workflow id (= 偶然の sub-string match)
 *
 * landed: aag-self-hosting-completion R3d (= DA-α-004d で institute)
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 * @see projects/active/aag-self-hosting-completion/decision-audit.md DA-α-004d
 * @see projects/active/aag-self-hosting-completion/plan.md §6.2
 */

import path from 'path'
import fs from 'fs'
import { describe, it, expect } from 'vitest'

const PROJECT_ROOT = path.resolve(__dirname, '../../../../')

const OLD_PATH_PATTERN =
  /references\/(01-principles|02-status|03-guides|04-design-system|05-contents)\//g

const SCAN_ROOTS = ['references', 'aag', 'projects', 'app', 'tools', 'docs', '.github', '.claude']
const SCAN_EXTENSIONS = [
  '.md',
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.toml',
]
const SKIP_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage', 'target', '.cache']

const WHITELIST_FILES = new Set([
  // 旧 path migration を articulate する meta-doc (= 意図的な historical reference)
  'projects/active/aag-self-hosting-completion/plan.md',
  'projects/active/aag-self-hosting-completion/checklist.md',
  'projects/active/aag-self-hosting-completion/breaking-changes.md',
  'projects/active/aag-self-hosting-completion/decision-audit.md',
  'projects/active/aag-self-hosting-completion/HANDOFF.md',
  'projects/active/aag-self-hosting-completion/AI_CONTEXT.md',
  'projects/active/aag-self-hosting-completion/doc-improvement-backlog.md',
  'projects/active/aag-self-hosting-completion/discovery-log.md',
  // README.md は migration mapping を articulate
  'references/README.md',
  // doc-registry.json は $comment 内に historical changelog
  'docs/contracts/doc-registry.json',
  // 本 guard test 自身は old path string を definition として持つ (= self-referent)
  'app/src/test/guards/oldPathReferenceGuard.test.ts',
])

const WHITELIST_PATH_PREFIXES = [
  // archive directory は frozen、touch なし (= drawer 不可逆性)
  'projects/completed/',
  'references/99-archive/',
]

function shouldScanFile(relPath: string): boolean {
  if (WHITELIST_FILES.has(relPath)) return false
  for (const prefix of WHITELIST_PATH_PREFIXES) {
    if (relPath.startsWith(prefix)) return false
  }
  const ext = path.extname(relPath)
  if (!SCAN_EXTENSIONS.includes(ext)) return false
  return true
}

function walkDir(dir: string, relRoot: string): string[] {
  const results: string[] = []
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.includes(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...walkDir(full, relRoot))
    } else if (entry.isFile()) {
      const rel = path.relative(relRoot, full)
      if (shouldScanFile(rel)) {
        results.push(full)
      }
    }
  }
  return results
}

describe('Old Path Reference Guard (DA-α-004d)', () => {
  it('O1: 旧 5 directory path string が active scope に残置していない (= ratchet-down baseline=0)', () => {
    const violations: string[] = []
    for (const root of SCAN_ROOTS) {
      const fullRoot = path.join(PROJECT_ROOT, root)
      const files = walkDir(fullRoot, PROJECT_ROOT)
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        const matches = content.matchAll(OLD_PATH_PATTERN)
        for (const m of matches) {
          // line number for diagnostic
          const lineNo = content.substring(0, m.index!).split('\n').length
          const rel = path.relative(PROJECT_ROOT, file)
          violations.push(`${rel}:${lineNo}: ${m[0]}`)
        }
      }
    }
    expect(violations, formatViolations(violations)).toEqual([])
  })
})

function formatViolations(violations: string[]): string {
  if (violations.length === 0) return ''
  return [
    `旧 path reference が ${violations.length} 件残置 (baseline=0):`,
    '',
    ...violations.slice(0, 30).map((v) => `  ${v}`),
    violations.length > 30 ? `  ... and ${violations.length - 30} more` : '',
    '',
    '修正方法:',
    '  旧 path → 新 path mapping:',
    '    references/01-principles/ → references/01-foundation/',
    '    references/02-status/ → references/04-tracking/',
    '    references/03-guides/ → references/03-implementation/',
    '    references/04-design-system/ → references/02-design-system/',
    '    references/05-contents/ → references/04-tracking/elements/',
    '',
    '例外 (= intentional preservation) を追加する場合:',
    '  1. WHITELIST_FILES に file path 追加 (= articulation 自身が migration を語る場合)',
    '  2. WHITELIST_PATH_PREFIXES に prefix 追加 (= archive directory)',
    '',
    '詳細: projects/active/aag-self-hosting-completion/plan.md §6.2 + DA-α-004d',
  ]
    .filter(Boolean)
    .join('\n')
}
