import { describe, it, expect } from 'vitest'
import {
  loadReducer,
  findSourceMonth,
  monthKey,
} from '@/application/comparison/comparisonLoadLogic'
import type { ComparisonLoadStatus } from '@/application/comparison/comparisonLoadLogic'
import type { QueryMonth } from '@/domain/models/ComparisonScope'

const INITIAL: ComparisonLoadStatus = {
  status: 'idle',
  requestedRanges: [],
  loadedRanges: [],
  lastError: null,
}

describe('loadReducer', () => {
  it('start → loading 状態に遷移する', () => {
    const ranges: QueryMonth[] = [{ year: 2025, month: 3 }]
    const result = loadReducer(INITIAL, { type: 'start', requestedRanges: ranges })
    expect(result.status).toBe('loading')
    expect(result.requestedRanges).toEqual(ranges)
    expect(result.loadedRanges).toEqual([])
    expect(result.lastError).toBeNull()
  })

  it('success → success 状態に遷移する', () => {
    const ranges: QueryMonth[] = [{ year: 2025, month: 3 }]
    const loaded: QueryMonth[] = [{ year: 2025, month: 3 }]
    const result = loadReducer(INITIAL, {
      type: 'success',
      requestedRanges: ranges,
      loadedRanges: loaded,
    })
    expect(result.status).toBe('success')
    expect(result.loadedRanges).toEqual(loaded)
    expect(result.lastError).toBeNull()
  })

  it('partial → partial 状態にエラーメッセージ付きで遷移する', () => {
    const ranges: QueryMonth[] = [
      { year: 2025, month: 2 },
      { year: 2025, month: 3 },
    ]
    const loaded: QueryMonth[] = [{ year: 2025, month: 3 }]
    const result = loadReducer(INITIAL, {
      type: 'partial',
      requestedRanges: ranges,
      loadedRanges: loaded,
      error: 'Missing February data',
    })
    expect(result.status).toBe('partial')
    expect(result.requestedRanges).toEqual(ranges)
    expect(result.loadedRanges).toEqual(loaded)
    expect(result.lastError).toBe('Missing February data')
  })

  it('error → error 状態にエラーメッセージ付きで遷移する', () => {
    const ranges: QueryMonth[] = [{ year: 2025, month: 3 }]
    const result = loadReducer(INITIAL, {
      type: 'error',
      requestedRanges: ranges,
      loadedRanges: [],
      error: 'Network error',
    })
    expect(result.status).toBe('error')
    expect(result.lastError).toBe('Network error')
    expect(result.loadedRanges).toEqual([])
  })
})

describe('findSourceMonth', () => {
  it('空配列で null を返す', () => {
    expect(findSourceMonth([])).toBeNull()
  })

  it('1要素で先頭を返す', () => {
    const result = findSourceMonth([{ year: 2025, month: 3 }])
    expect(result).toEqual({ year: 2025, month: 3 })
  })

  it('3要素で中央（インデックス1）を返す', () => {
    const ranges: QueryMonth[] = [
      { year: 2025, month: 2 },
      { year: 2025, month: 3 },
      { year: 2025, month: 4 },
    ]
    const result = findSourceMonth(ranges)
    expect(result).toEqual({ year: 2025, month: 3 })
  })

  it('偶数要素でも floor(length/2) を返す', () => {
    const ranges: QueryMonth[] = [
      { year: 2025, month: 1 },
      { year: 2025, month: 2 },
      { year: 2025, month: 3 },
      { year: 2025, month: 4 },
    ]
    const result = findSourceMonth(ranges)
    expect(result).toEqual({ year: 2025, month: 3 })
  })
})

describe('monthKey', () => {
  it('年月をハイフン区切り文字列にする', () => {
    expect(monthKey({ year: 2025, month: 3 })).toBe('2025-3')
  })

  it('月が1桁でもゼロパディングしない', () => {
    expect(monthKey({ year: 2024, month: 1 })).toBe('2024-1')
  })

  it('月が12でも正しく動作する', () => {
    expect(monthKey({ year: 2025, month: 12 })).toBe('2025-12')
  })
})
