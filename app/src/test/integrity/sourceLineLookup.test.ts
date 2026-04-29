/**
 * Integrity Domain — sourceLineLookup primitive unit tests
 *
 * Phase B Step B-3 拡張で landing した `findIdLine` / `findExportLine` の
 * 動作を fixture string で検証。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { findIdLine, findExportLine } from '@app-domain/integrity'

describe('parsing/findIdLine', () => {
  it('id: literal の行番号を 1-indexed で返す', () => {
    const src = ['const a = 1', "  id: 'WID-001',", "  id: 'WID-002',"].join('\n')
    expect(findIdLine(src, 'WID-001')).toBe(2)
    expect(findIdLine(src, 'WID-002')).toBe(3)
  })

  it('見つからなければ 0', () => {
    expect(findIdLine("const x = 'WID-001'", 'WID-001')).toBe(0) // id: ではない
    expect(findIdLine('', 'WID-001')).toBe(0)
  })

  it('正規表現特殊文字を含む id でも安全', () => {
    const src = "  id: 'foo.bar+baz'"
    expect(findIdLine(src, 'foo.bar+baz')).toBe(1)
    expect(findIdLine(src, 'foo.bar.baz')).toBe(0) // . は escape されている
  })
})

describe('parsing/findExportLine', () => {
  it('export function を検出', () => {
    const src = ['// header', 'export function foo() {}'].join('\n')
    expect(findExportLine(src, 'foo')).toBe(2)
  })

  it('export const / let / var / class / interface / type を検出', () => {
    expect(findExportLine('export const foo = 1', 'foo')).toBe(1)
    expect(findExportLine('export let foo = 1', 'foo')).toBe(1)
    expect(findExportLine('export var foo = 1', 'foo')).toBe(1)
    expect(findExportLine('export class Foo {}', 'Foo')).toBe(1)
    expect(findExportLine('export interface IFoo {}', 'IFoo')).toBe(1)
    expect(findExportLine('export type TFoo = string', 'TFoo')).toBe(1)
  })

  it('export async function を検出', () => {
    expect(findExportLine('export async function foo() {}', 'foo')).toBe(1)
  })

  it('見つからなければ 0', () => {
    expect(findExportLine('const foo = 1', 'foo')).toBe(0) // export なし
    expect(findExportLine('export { foo }', 'foo')).toBe(0) // re-export 形式は対象外
  })
})
