/**
 * useAsyncQuery モジュールの純粋ヘルパー関数テスト
 *
 * useCtsHierarchyQueries.ts は React hook のみで純粋関数を持たないため、
 * 同ディレクトリの useAsyncQuery.ts に含まれる純粋ヘルパー
 * (toDateKeys / storeIdsToArray) を代替として検証する。
 */
import { describe, it, expect } from 'vitest'
import { toDateKeys, storeIdsToArray } from '../useAsyncQuery'
import type { DateRange } from '@/domain/models/calendar'

describe('toDateKeys', () => {
  it('DateRange を YYYY-MM-DD 形式の dateFrom/dateTo に変換する', () => {
    const range: DateRange = {
      from: { year: 2026, month: 1, day: 5 },
      to: { year: 2026, month: 1, day: 10 },
    }
    expect(toDateKeys(range)).toEqual({
      dateFrom: '2026-01-05',
      dateTo: '2026-01-10',
    })
  })

  it('月・日が 1 桁の場合でも 0 埋めされる', () => {
    const range: DateRange = {
      from: { year: 2025, month: 3, day: 1 },
      to: { year: 2025, month: 9, day: 9 },
    }
    const result = toDateKeys(range)
    expect(result.dateFrom).toBe('2025-03-01')
    expect(result.dateTo).toBe('2025-09-09')
  })

  it('月末日（12/31）を正しく返す', () => {
    const range: DateRange = {
      from: { year: 2024, month: 12, day: 31 },
      to: { year: 2024, month: 12, day: 31 },
    }
    expect(toDateKeys(range)).toEqual({
      dateFrom: '2024-12-31',
      dateTo: '2024-12-31',
    })
  })
})

describe('storeIdsToArray', () => {
  it('空集合は undefined を返す', () => {
    expect(storeIdsToArray(new Set())).toBeUndefined()
  })

  it('単一要素は 1 要素配列を返す', () => {
    const result = storeIdsToArray(new Set(['S1']))
    expect(result).toEqual(['S1'])
  })

  it('複数要素は元の集合と同じ順序で配列化される', () => {
    const source = new Set(['A', 'B', 'C'])
    const result = storeIdsToArray(source)
    expect(result).not.toBeUndefined()
    expect(new Set(result)).toEqual(source)
    expect(result?.length).toBe(3)
  })

  it('返り値は元の集合と独立した配列（元への影響がない）', () => {
    const source = new Set(['X', 'Y'])
    const result = storeIdsToArray(source)
    expect(Array.isArray(result)).toBe(true)
    expect(result).not.toBe(source as unknown as readonly string[])
  })
})
