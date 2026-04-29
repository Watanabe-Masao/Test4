/**
 * Integrity Domain Skeleton Guard — `app-domain/integrity/` の構造保証
 *
 * canonicalization-domain-consolidation Phase B Step B-1 で landing。
 * Phase E 振り返りで判明した「hardcode された EXPECTED 配列が primitive 追加時に
 * stale 化する」問題を解消するため introspection 方式に書き換え (2026-04-28)。
 *
 * 検証対象:
 * - 必須 file 存在 (APP_DOMAIN_INDEX.md / types.ts / index.ts + 3 sub-barrel)
 * - 全 primitive file (parsing/* /detection/* /reporting/*) に named export がある
 * - sub-barrel の re-export 群が `@app-domain/integrity` から runtime 取得可能
 * - 命名規約: parsing は名詞 / detection は `check*` / reporting は `format*`
 * - domain 純粋性: types.ts / 全 primitive file が I/O / cross-layer import を持たない
 * - domain 純粋性: index.ts が 4 sub-barrel (./types ./parsing ./detection ./reporting) を re-export
 *
 * **introspection 方針**: primitive file は filesystem 走査で自動列挙、expected
 * runtime export は sub-barrel の `export { ... }` を parse して導出する。
 * primitive 追加時に本 guard の hardcode 更新は不要 (Phase E retrospective fix #1 を構造的に解消)。
 *
 * @see references/03-guides/integrity-domain-architecture.md
 * @see references/01-principles/canonicalization-principles.md §P9
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

type Category = 'parsing' | 'detection' | 'reporting'
const CATEGORIES: readonly Category[] = ['parsing', 'detection', 'reporting']

function listPrimitiveFiles(category: Category): string[] {
  const dir = path.join(INTEGRITY_DIR, category)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => `${category}/${f}`)
    .sort()
}

function parseBarrelExports(barrelPath: string): { values: string[]; types: string[] } {
  const content = fs.readFileSync(barrelPath, 'utf-8')
  const values: string[] = []
  const types: string[] = []
  // `export { a, type B, c, type D } from '...'` を parse
  const exportRe = /export\s*\{([^}]+)\}\s*from/g
  let match: RegExpExecArray | null
  while ((match = exportRe.exec(content)) !== null) {
    const items = match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    for (const item of items) {
      const typeMatch = item.match(/^type\s+(\w+)/)
      if (typeMatch) {
        types.push(typeMatch[1])
      } else {
        const nameMatch = item.match(/^(\w+)/)
        if (nameMatch) values.push(nameMatch[1])
      }
    }
  }
  return { values, types }
}

const ALL_PRIMITIVE_FILES = CATEGORIES.flatMap(listPrimitiveFiles)

describe('Integrity Domain Skeleton (introspection-based)', () => {
  it('app-domain/integrity/ ディレクトリが存在する', () => {
    expect(fs.existsSync(INTEGRITY_DIR)).toBe(true)
  })

  it('B-1: APP_DOMAIN_INDEX.md / types.ts / index.ts が揃っている', () => {
    const required = ['APP_DOMAIN_INDEX.md', 'types.ts', 'index.ts']
    const missing = required.filter((f) => !fs.existsSync(path.join(INTEGRITY_DIR, f)))
    expect(missing, `missing files: ${missing.join(', ')}`).toEqual([])
  })

  it('全 sub-barrel (parsing/detection/reporting/index.ts) が揃っている', () => {
    const missing = CATEGORIES.filter(
      (c) => !fs.existsSync(path.join(INTEGRITY_DIR, c, 'index.ts')),
    )
    expect(missing, `missing barrels: ${missing.join(', ')}`).toEqual([])
  })

  it('各 primitive file が named export を持つ (空 file 検出)', () => {
    const empty: string[] = []
    for (const f of ALL_PRIMITIVE_FILES) {
      const content = fs.readFileSync(path.join(INTEGRITY_DIR, f), 'utf-8')
      if (!/^\s*export\s+/m.test(content)) empty.push(f)
    }
    expect(empty, `primitive files without export: ${empty.join(', ')}`).toEqual([])
  })

  it('各 category に最低 1 file (parsing/detection/reporting すべて非空)', () => {
    const empty = CATEGORIES.filter((c) => listPrimitiveFiles(c).length === 0)
    expect(empty, `empty categories: ${empty.join(', ')}`).toEqual([])
  })

  it('sub-barrel の全 value export が `@app-domain/integrity` から runtime 取得可能', () => {
    const moduleKeys = new Set(Object.keys(integrity))
    const missing: string[] = []
    for (const c of CATEGORIES) {
      const { values } = parseBarrelExports(path.join(INTEGRITY_DIR, c, 'index.ts'))
      for (const v of values) {
        if (!moduleKeys.has(v)) missing.push(`${c}/${v}`)
      }
    }
    expect(missing, `barrel exports not reachable via public API: ${missing.join(', ')}`).toEqual(
      [],
    )
  })

  it('命名規約: detection の value export は `check` で始まる', () => {
    const { values } = parseBarrelExports(path.join(INTEGRITY_DIR, 'detection/index.ts'))
    const violations = values.filter((v) => !v.startsWith('check'))
    expect(
      violations,
      `detection は assertion を返す primitive のみ。check* prefix 違反: ${violations.join(', ')}`,
    ).toEqual([])
  })

  it('命名規約: reporting の value export は `format` で始まる', () => {
    const { values } = parseBarrelExports(path.join(INTEGRITY_DIR, 'reporting/index.ts'))
    const violations = values.filter((v) => !v.startsWith('format'))
    expect(
      violations,
      `reporting は formatter のみ。format* prefix 違反: ${violations.join(', ')}`,
    ).toEqual([])
  })

  it('命名規約: parsing の value export は `check`/`format` prefix を持たない (動詞混入禁止)', () => {
    const { values } = parseBarrelExports(path.join(INTEGRITY_DIR, 'parsing/index.ts'))
    const violations = values.filter((v) => v.startsWith('check') || v.startsWith('format'))
    expect(
      violations,
      `parsing は data を返す primitive のみ。検出/整形動詞の混入: ${violations.join(', ')}`,
    ).toEqual([])
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
    for (const f of ALL_PRIMITIVE_FILES) {
      const content = fs.readFileSync(path.join(INTEGRITY_DIR, f), 'utf-8')
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
    for (const f of ALL_PRIMITIVE_FILES) {
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
