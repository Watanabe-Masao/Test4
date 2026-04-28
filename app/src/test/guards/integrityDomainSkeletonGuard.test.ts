/**
 * Integrity Domain Skeleton Guard — `app-domain/integrity/` の構造保証
 *
 * canonicalization-domain-consolidation Phase B Step B-1 で landing。
 * Phase B Step B-2〜B-5 で primitive 群 (reporting / parsing / detection) を追加し、
 * 本 guard も拡張済 (2026-04-28)。
 *
 * Phase B Step B-6 以降で adapter migration が landing したら、
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

describe('Integrity Domain Skeleton (Phase B Step B-1〜B-5)', () => {
  it('app-domain/integrity/ ディレクトリが存在する', () => {
    expect(fs.existsSync(INTEGRITY_DIR)).toBe(true)
  })

  it('B-1: APP_DOMAIN_INDEX.md / types.ts / index.ts が揃っている', () => {
    const required = ['APP_DOMAIN_INDEX.md', 'types.ts', 'index.ts']
    const missing = required.filter((f) => !fs.existsSync(path.join(INTEGRITY_DIR, f)))
    expect(missing, `missing files: ${missing.join(', ')}`).toEqual([])
  })

  it('B-2: reporting/ subdir + formatViolation.ts + index.ts', () => {
    const required = ['reporting/formatViolation.ts', 'reporting/index.ts']
    const missing = required.filter((f) => !fs.existsSync(path.join(INTEGRITY_DIR, f)))
    expect(missing, `missing: ${missing.join(', ')}`).toEqual([])
  })

  it('B-3: parsing/ subdir + yamlFrontmatter.ts + sourceLineLookup.ts + index.ts', () => {
    const required = [
      'parsing/yamlFrontmatter.ts',
      'parsing/sourceLineLookup.ts',
      'parsing/index.ts',
    ]
    const missing = required.filter((f) => !fs.existsSync(path.join(INTEGRITY_DIR, f)))
    expect(missing, `missing: ${missing.join(', ')}`).toEqual([])
  })

  it('B-4: detection/ subdir + existence.ts + pathExistence.ts', () => {
    const required = ['detection/existence.ts', 'detection/pathExistence.ts']
    const missing = required.filter((f) => !fs.existsSync(path.join(INTEGRITY_DIR, f)))
    expect(missing, `missing: ${missing.join(', ')}`).toEqual([])
  })

  it('B-5: detection/ratchet.ts + temporal.ts + index.ts', () => {
    const required = ['detection/ratchet.ts', 'detection/temporal.ts', 'detection/index.ts']
    const missing = required.filter((f) => !fs.existsSync(path.join(INTEGRITY_DIR, f)))
    expect(missing, `missing: ${missing.join(', ')}`).toEqual([])
  })

  it('public API barrel が runtime symbol (関数) を export している', () => {
    expect(typeof integrity).toBe('object')
    // Phase B Step B-2〜B-5 完了で runtime 関数 export が出揃う
    const expectedFns = [
      'parseSpecFrontmatter',
      'inferKindFromId',
      'findIdLine',
      'findExportLine',
      'checkBidirectionalExistence',
      'checkPathExistence',
      'checkRatchet',
      'checkExpired',
      'checkFreshness',
      'formatViolations',
      'formatStringViolations',
    ] as const
    const moduleKeys = new Set(Object.keys(integrity))
    const missing = expectedFns.filter((fn) => !moduleKeys.has(fn))
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

  it('domain 純粋性: 全 primitive file が node:fs / node:path を import しない (I/O は caller 側)', () => {
    const primitiveFiles = [
      'parsing/yamlFrontmatter.ts',
      'parsing/sourceLineLookup.ts',
      'detection/existence.ts',
      'detection/pathExistence.ts',
      'detection/ratchet.ts',
      'detection/temporal.ts',
      'reporting/formatViolation.ts',
    ]
    const violations: string[] = []
    for (const f of primitiveFiles) {
      const content = fs.readFileSync(path.join(INTEGRITY_DIR, f), 'utf-8')
      const ioImports = content
        .split('\n')
        .filter(
          (l) =>
            /^\s*import\s+/.test(l) &&
            /from\s+['"](node:fs|node:path|fs|path|node:child_process)['"]/.test(l),
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

  it('domain 純粋性: index.ts は parsing/detection/reporting + types を re-export する', () => {
    const indexContent = fs.readFileSync(path.join(INTEGRITY_DIR, 'index.ts'), 'utf-8')
    const requiredReExports = ['./types', './parsing', './detection', './reporting']
    const missing = requiredReExports.filter(
      (m) => !new RegExp(`from\\s+['"]${m}['"]`).test(indexContent),
    )
    expect(missing, `index.ts missing re-exports: ${missing.join(', ')}`).toEqual([])
  })
})
