/**
 * dayDetailDataLogic.ts — pure logic test
 *
 * 検証対象:
 * - resolveDayDetailRanges: currentDate / prevDate / cumRange / wowRange (day<8 で unavailable)
 * - buildCtsInput / buildSummaryInput / buildWeatherInput: null range → null / storeIds 変換
 * - selectCtsWithFallback: primary 空 → fallback
 * - aggregateSummary: 複数 row → sum
 */
import { describe, it, expect } from 'vitest'
import {
  resolveDayDetailRanges,
  buildCtsInput,
  buildSummaryInput,
  buildWeatherInput,
  selectCtsWithFallback,
  aggregateSummary,
} from '../dayDetailDataLogic'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { StoreDaySummaryRow } from '@/application/queries/summary/StoreDaySummaryHandler'
import type { AsyncQueryResult } from '@/application/queries/QueryContract'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

const sameDateScope = { alignmentMode: 'sameDate' } as unknown as ComparisonScope

function makeAsyncResult(
  records: readonly CategoryTimeSalesRecord[],
): AsyncQueryResult<{ readonly records: readonly CategoryTimeSalesRecord[] }> {
  return {
    data: { records },
    isLoading: false,
    error: null,
  } as unknown as AsyncQueryResult<{ readonly records: readonly CategoryTimeSalesRecord[] }>
}

// ─── resolveDayDetailRanges ──────────────────────────

describe('resolveDayDetailRanges', () => {
  it('currentDate + dateKey を生成', () => {
    const result = resolveDayDetailRanges(2026, 4, 15, sameDateScope)
    expect(result.currentDate).toEqual({ year: 2026, month: 4, day: 15 })
    expect(result.dateKey).toBe('2026-04-15')
  })

  it('singleDayRange は currentDate から currentDate', () => {
    const result = resolveDayDetailRanges(2026, 4, 15, sameDateScope)
    expect(result.singleDayRange.from).toEqual({ year: 2026, month: 4, day: 15 })
    expect(result.singleDayRange.to).toEqual({ year: 2026, month: 4, day: 15 })
  })

  it('prevDateKey: sameDate モードで前年同日', () => {
    const result = resolveDayDetailRanges(2026, 4, 15, sameDateScope)
    expect(result.prevDateKey).toBe('2025-04-15')
  })

  it('day<8: wowRange は undefined (canWoW=false)', () => {
    const result = resolveDayDetailRanges(2026, 4, 5, sameDateScope)
    expect(result.wowRange).toBeUndefined()
  })

  it('day>=8: wowRange は day-7 の単日範囲', () => {
    const result = resolveDayDetailRanges(2026, 4, 15, sameDateScope)
    expect(result.wowRange).toEqual({
      from: { year: 2026, month: 4, day: 8 },
      to: { year: 2026, month: 4, day: 8 },
    })
  })

  it('cumRange: day=1 から 現在日', () => {
    const result = resolveDayDetailRanges(2026, 4, 15, sameDateScope)
    expect(result.cumRange.from).toEqual({ year: 2026, month: 4, day: 1 })
    expect(result.cumRange.to).toEqual({ year: 2026, month: 4, day: 15 })
  })

  it('comparisonScope=null → sameDate デフォルト', () => {
    const result = resolveDayDetailRanges(2026, 4, 15, null)
    // デフォルト alignment=sameDate で前年同日
    expect(result.prevDateKey).toBe('2025-04-15')
  })
})

// ─── buildCtsInput ───────────────────────────────────

describe('buildCtsInput', () => {
  it('range=undefined → null', () => {
    expect(buildCtsInput(undefined, new Set())).toBeNull()
  })

  it('range あり → dateFrom/dateTo を key 化', () => {
    const range = {
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 15 },
    }
    const result = buildCtsInput(range, new Set())
    expect(result?.dateFrom).toBe('2026-04-01')
    expect(result?.dateTo).toBe('2026-04-15')
  })

  it('storeIds 空 → undefined', () => {
    const range = {
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 15 },
    }
    const result = buildCtsInput(range, new Set())
    expect(result?.storeIds).toBeUndefined()
  })

  it('storeIds 有 → array 化', () => {
    const range = {
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 15 },
    }
    const result = buildCtsInput(range, new Set(['s1', 's2']))
    expect(result?.storeIds).toEqual(['s1', 's2'])
  })

  it('isPrevYear フラグを伝搬', () => {
    const range = {
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 15 },
    }
    const result = buildCtsInput(range, new Set(), true)
    expect(result?.isPrevYear).toBe(true)
  })
})

// ─── buildSummaryInput ───────────────────────────────

describe('buildSummaryInput', () => {
  it('range=undefined → null', () => {
    expect(buildSummaryInput(undefined, new Set())).toBeNull()
  })

  it('range あり → dateFrom/dateTo を key 化', () => {
    const range = {
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 15 },
    }
    const result = buildSummaryInput(range, new Set(['s1']))
    expect(result?.dateFrom).toBe('2026-04-01')
    expect(result?.storeIds).toEqual(['s1'])
  })
})

// ─── buildWeatherInput ───────────────────────────────

describe('buildWeatherInput', () => {
  it('storeId 空 → null', () => {
    expect(buildWeatherInput('', '2026-04-15')).toBeNull()
  })

  it('dateKey null → null', () => {
    expect(buildWeatherInput('s1', null)).toBeNull()
  })

  it('両方有 → { storeId, dateFrom, dateTo } (同日)', () => {
    const result = buildWeatherInput('s1', '2026-04-15')
    expect(result).toEqual({ storeId: 's1', dateFrom: '2026-04-15', dateTo: '2026-04-15' })
  })
})

// ─── selectCtsWithFallback ──────────────────────────

describe('selectCtsWithFallback', () => {
  it('primary 空 → fallback を使う', () => {
    const primary = makeAsyncResult([])
    const fallback = makeAsyncResult([{ storeId: 's1' } as unknown as CategoryTimeSalesRecord])
    const result = selectCtsWithFallback(primary, fallback)
    expect(result).toHaveLength(1)
  })

  it('primary 有 → primary を使う (fallback を無視)', () => {
    const primary = makeAsyncResult([
      { storeId: 's1' } as unknown as CategoryTimeSalesRecord,
      { storeId: 's2' } as unknown as CategoryTimeSalesRecord,
    ])
    const fallback = makeAsyncResult([{ storeId: 'F' } as unknown as CategoryTimeSalesRecord])
    const result = selectCtsWithFallback(primary, fallback)
    expect(result).toHaveLength(2)
  })

  it('両方空 → 空配列', () => {
    const primary = makeAsyncResult([])
    const fallback = makeAsyncResult([])
    const result = selectCtsWithFallback(primary, fallback)
    expect(result).toEqual([])
  })
})

// ─── aggregateSummary ───────────────────────────────

describe('aggregateSummary', () => {
  it('null → null', () => {
    expect(aggregateSummary(null)).toBeNull()
  })

  it('空配列 → null', () => {
    expect(aggregateSummary([])).toBeNull()
  })

  it('単一 row → そのまま', () => {
    const rows = [{ sales: 1000, customers: 100 } as unknown as StoreDaySummaryRow]
    expect(aggregateSummary(rows)).toEqual({ sales: 1000, customers: 100 })
  })

  it('複数 row → sum', () => {
    const rows = [
      { sales: 1000, customers: 100 } as unknown as StoreDaySummaryRow,
      { sales: 500, customers: 50 } as unknown as StoreDaySummaryRow,
      { sales: 200, customers: 20 } as unknown as StoreDaySummaryRow,
    ]
    expect(aggregateSummary(rows)).toEqual({ sales: 1700, customers: 170 })
  })
})
