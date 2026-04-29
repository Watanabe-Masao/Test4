/**
 * Integrity Domain — jsonRegistry primitive unit tests
 *
 * Phase C 着手 1 番手で landing。fixture string + 変換関数で完結。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { jsonRegistry } from '@app-domain/integrity'

describe('parsing/jsonRegistry', () => {
  it('単純な JSON object から Registry を構築', () => {
    const reg = jsonRegistry<{ value: number }>(
      '{"a": 1, "b": 2}',
      (parsed) => {
        const obj = parsed as Record<string, number>
        return Object.entries(obj).map(([k, v]) => [k, { value: v }] as const)
      },
      'fixture',
    )
    expect(reg.source).toBe('fixture')
    expect(reg.entries.size).toBe(2)
    expect(reg.entries.get('a')).toEqual({ value: 1 })
    expect(reg.entries.get('b')).toEqual({ value: 2 })
  })

  it('doc-registry.json 風の構造から flat Registry を構築', () => {
    const json = JSON.stringify({
      categories: [
        {
          id: 'principles',
          title: '原則',
          docs: [
            { path: 'X.md', label: 'X' },
            { path: 'Y.md', label: 'Y' },
          ],
        },
        {
          id: 'guides',
          title: 'ガイド',
          docs: [{ path: 'Z.md', label: 'Z' }],
        },
      ],
    })
    type DocEntry = { path: string; label: string; categoryId: string }
    const reg = jsonRegistry<DocEntry>(
      json,
      (parsed) => {
        const obj = parsed as {
          categories: Array<{ id: string; docs: Array<{ path: string; label: string }> }>
        }
        return obj.categories.flatMap((c) =>
          c.docs.map((d) => [d.path, { ...d, categoryId: c.id }] as const),
        )
      },
      'fixture',
    )
    expect(reg.entries.size).toBe(3)
    expect(reg.entries.get('X.md')).toEqual({ path: 'X.md', label: 'X', categoryId: 'principles' })
    expect(reg.entries.get('Z.md')).toEqual({ path: 'Z.md', label: 'Z', categoryId: 'guides' })
  })

  it('invalid JSON で source を含む明示的 error', () => {
    expect(() => jsonRegistry<unknown>('not-json', () => [], 'badfile.json')).toThrow(
      /jsonRegistry: failed to parse badfile\.json/,
    )
  })

  it('純粋性: 同じ入力 → 同じ出力 (副作用なし)', () => {
    const json = '{"x": 10}'
    const conv = (p: unknown): Iterable<readonly [string, number]> => {
      const obj = p as Record<string, number>
      return Object.entries(obj)
    }
    const a = jsonRegistry<number>(json, conv, 'src')
    const b = jsonRegistry<number>(json, conv, 'src')
    expect([...a.entries]).toEqual([...b.entries])
  })

  it('toEntries が空 iterable を返せば entries は空 (例外でない)', () => {
    const reg = jsonRegistry<unknown>('{}', () => [], 'src')
    expect(reg.entries.size).toBe(0)
  })

  it('id 重複時は後勝ち (Map の挙動)', () => {
    const reg = jsonRegistry<number>('{}', () => [['k', 1] as const, ['k', 2] as const], 'src')
    expect(reg.entries.get('k')).toBe(2)
    expect(reg.entries.size).toBe(1)
  })
})
