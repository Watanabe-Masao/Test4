/**
 * Integrity Domain Skeleton Guard — `app-domain/integrity/` の構造保証
 *
 * canonicalization-domain-consolidation Phase B Step B-1 で landing。
 * Phase C / D / E で primitive 群が出揃った時点で本 guard を最終形に拡張 (2026-04-28)。
 *
 * 検証対象 (Phase E 完了時点):
 * - 必須 file 存在 (parsing 6 / detection 7 / reporting 1 / types 1 + 4 barrel)
 * - public API barrel が全 14 関数 + 4 type を export
 * - domain 純粋性: types.ts は外部 import なし
 * - domain 純粋性: 全 primitive file は I/O module を import しない (caller 注入)
 * - domain 純粋性: index.ts が 4 sub-barrel (./types ./parsing ./detection ./reporting) を re-export
 *
 * 本 guard は domain 構造の最終形を保証するゲートとして恒久運用される。
 *
 * @see references/03-guides/integrity-domain-architecture.md
 * @see app-domain/integrity/APP_DOMAIN_INDEX.md
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as integrity from '@app-domain/integrity'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const INTEGRITY_DIR = path.join(PROJECT_ROOT, 'app-domain/integrity')

// Phase C/D/E 完遂時点の primitive file 一覧 (caller side I/O は本 list 対象外)
const PRIMITIVE_FILES = [
  'parsing/yamlFrontmatter.ts',
  'parsing/sourceLineLookup.ts',
  'parsing/jsonRegistry.ts',
  'parsing/tsRegistry.ts',
  'parsing/markdownIdScan.ts',
  'parsing/filesystemRegistry.ts',
  'detection/existence.ts',
  'detection/pathExistence.ts',
  'detection/ratchet.ts',
  'detection/temporal.ts',
  'detection/setRelation.ts',
  'detection/cardinality.ts',
  'detection/bidirectionalReference.ts',
  'reporting/formatViolation.ts',
] as const

// 全 runtime export 関数 (Phase B-2 〜 D-W3 で出揃った 14 関数)
const EXPECTED_RUNTIME_EXPORTS = [
  // parsing (B-3 + C + D-W1 + D-W3)
  'parseSpecFrontmatter',
  'inferKindFromId',
  'findIdLine',
  'findExportLine',
  'jsonRegistry',
  'tsRegistry',
  'scanMarkdownIds',
  'filesystemRegistry',
  // detection (B-4 + B-5 + D-W1 + D-W2)
  'checkBidirectionalExistence',
  'checkPathExistence',
  'checkRatchet',
  'checkExpired',
  'checkFreshness',
  'checkDisjoint',
  'checkInclusion',
  'checkInclusionByPredicate',
  'checkUniqueness',
  'checkUpperBound',
  'checkNonEmpty',
  'checkSizeEquality',
  'checkBidirectionalReference',
  // reporting (B-2)
  'formatViolations',
  'formatStringViolations',
] as const

describe('Integrity Domain Skeleton (Phase B〜E 最終形)', () => {
  it('app-domain/integrity/ ディレクトリが存在する', () => {
    expect(fs.existsSync(INTEGRITY_DIR)).toBe(true)
  })

  it('B-1: APP_DOMAIN_INDEX.md / types.ts / index.ts が揃っている', () => {
    const required = ['APP_DOMAIN_INDEX.md', 'types.ts', 'index.ts']
    const missing = required.filter((f) => !fs.existsSync(path.join(INTEGRITY_DIR, f)))
    expect(missing, `missing files: ${missing.join(', ')}`).toEqual([])
  })

  it('全 sub-barrel (parsing/detection/reporting/index.ts) が揃っている', () => {
    const required = ['parsing/index.ts', 'detection/index.ts', 'reporting/index.ts']
    const missing = required.filter((f) => !fs.existsSync(path.join(INTEGRITY_DIR, f)))
    expect(missing, `missing barrels: ${missing.join(', ')}`).toEqual([])
  })

  it('全 primitive file が物理存在する (parsing 6 / detection 7 / reporting 1)', () => {
    const missing = PRIMITIVE_FILES.filter((f) => !fs.existsSync(path.join(INTEGRITY_DIR, f)))
    expect(missing, `missing primitives: ${missing.join(', ')}`).toEqual([])
  })

  it('public API barrel が全 14 関数を runtime export している', () => {
    expect(typeof integrity).toBe('object')
    const moduleKeys = new Set(Object.keys(integrity))
    const missing = EXPECTED_RUNTIME_EXPORTS.filter((fn) => !moduleKeys.has(fn))
    expect(missing, `missing exports: ${missing.join(', ')}`).toEqual([])
  })

  it('domain 純粋性: types.ts は外部 module を import しない', () => {
    const typesContent = fs.readFileSync(path.join(INTEGRITY_DIR, 'types.ts'), 'utf-8')
    const importLines = typesContent
      .split('\n')
      .filter((l) => /^\s*import\s+/.test(l) && !l.trim().startsWith('//'))
    expect(
      importLines,
      `types.ts must be self-contained, but found imports: ${importLines.join(' / ')}`,
    ).toEqual([])
  })

  it('domain 純粋性: 全 primitive file が I/O module (node:fs / node:path 等) を import しない', () => {
    const violations: string[] = []
    for (const f of PRIMITIVE_FILES) {
      const content = fs.readFileSync(path.join(INTEGRITY_DIR, f), 'utf-8')
      // 行頭の `import ... from 'node:fs|node:path|fs|path|node:child_process|node:os'` を検出
      // (JSDoc 内の `import` 文字列は対象外 — 行頭が `*` の comment 行を除外)
      const ioImports = content
        .split('\n')
        .filter(
          (l) =>
            /^\s*import\s+/.test(l) &&
            !l.trim().startsWith('*') &&
            /from\s+['"](node:fs|node:path|fs|path|node:child_process|node:os)['"]/.test(l),
        )
      if (ioImports.length > 0) {
        violations.push(`${f}: ${ioImports.join(' / ')}`)
      }
    }
    expect(
      violations,
      `primitives must not import I/O modules. found: ${violations.join('; ')}`,
    ).toEqual([])
  })

  it('domain 純粋性: 全 primitive file が app/src 経由の cross-layer import を持たない', () => {
    const violations: string[] = []
    for (const f of PRIMITIVE_FILES) {
      const content = fs.readFileSync(path.join(INTEGRITY_DIR, f), 'utf-8')
      const crossImports = content
        .split('\n')
        .filter(
          (l) =>
            /^\s*import\s+/.test(l) &&
            !l.trim().startsWith('*') &&
            /from\s+['"](@\/|\.\.\/\.\.\/|app\/src)/.test(l),
        )
      if (crossImports.length > 0) {
        violations.push(`${f}: ${crossImports.join(' / ')}`)
      }
    }
    expect(
      violations,
      `primitives must not import from app/src. found: ${violations.join('; ')}`,
    ).toEqual([])
  })

  it('domain 純粋性: index.ts は parsing/detection/reporting + types を re-export する', () => {
    const indexContent = fs.readFileSync(path.join(INTEGRITY_DIR, 'index.ts'), 'utf-8')
    const requiredReExports = ['./types', './parsing', './detection', './reporting']
    const missing = requiredReExports.filter(
      (m) => !new RegExp(`from\\s+['"]${m}['"]`).test(indexContent),
    )
    expect(missing, `index.ts missing re-exports: ${missing.join(', ')}`).toEqual([])
  })
})
