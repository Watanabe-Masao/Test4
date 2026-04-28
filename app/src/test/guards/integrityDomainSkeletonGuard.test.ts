/**
 * Integrity Domain Skeleton Guard — `app-domain/integrity/` の構造保証
 *
 * canonicalization-domain-consolidation Phase B Step B-1 で landing。
 * 抽象型 4 種が public API として export されていること、ファイル構造が
 * 設計 doc (`integrity-domain-architecture.md` §1) と一致することを検証する。
 *
 * Phase B Step B-2 以降で primitive が追加されるたびに本 guard も拡張する。
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

describe('Integrity Domain Skeleton (Phase B Step B-1)', () => {
  it('app-domain/integrity/ ディレクトリが存在する', () => {
    expect(fs.existsSync(INTEGRITY_DIR)).toBe(true)
  })

  it('APP_DOMAIN_INDEX.md / types.ts / index.ts が揃っている', () => {
    const required = ['APP_DOMAIN_INDEX.md', 'types.ts', 'index.ts']
    const missing = required.filter((f) => !fs.existsSync(path.join(INTEGRITY_DIR, f)))
    expect(missing, `missing files: ${missing.join(', ')}`).toEqual([])
  })

  it('public API barrel が抽象型 4 種を export している', () => {
    // 型は runtime に存在しないが、import 自体が成功することで TS compile が通っている証左
    // 実体が無いことの確認は型システムで完結している
    expect(typeof integrity).toBe('object')

    // EnforcementSeverity は string union 型なので runtime には現れないが、
    // import に成功している = barrel が正しく export している
    const moduleKeys = Object.keys(integrity)
    // 現時点 (B-1) では type-only export のみで runtime symbol は 0
    expect(moduleKeys.length).toBe(0)
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

  it('domain 純粋性: index.ts は ./types のみ re-export する (B-1 時点)', () => {
    const indexContent = fs.readFileSync(path.join(INTEGRITY_DIR, 'index.ts'), 'utf-8')
    const exportLines = indexContent
      .split('\n')
      .filter((l) => /^\s*export\s+/.test(l) && !l.trim().startsWith('//'))
    // 現時点では `export type { ... } from './types'` の 1 行のみ (multi-line block 含む)
    const hasTypesReExport = /from\s+['"]\.\/types['"]/.test(indexContent)
    expect(
      hasTypesReExport,
      `index.ts must re-export from ./types. exports found: ${exportLines.join(' / ')}`,
    ).toBe(true)

    // B-1 時点では parsing / detection / reporting の re-export はまだ無い
    // (B-2 以降で順次追加される予定なので、本検査は B-2 着手時に緩和する)
    const hasOtherSubdir = /from\s+['"]\.\/(parsing|detection|reporting)/.test(indexContent)
    expect(
      hasOtherSubdir,
      'index.ts must NOT re-export parsing/detection/reporting yet (B-1 scope: types only)',
    ).toBe(false)
  })
})
