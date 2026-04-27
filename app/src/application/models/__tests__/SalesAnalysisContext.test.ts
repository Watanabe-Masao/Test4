/**
 * SalesAnalysisContext — buildSalesAnalysisContext / deriveChildContext tests
 *
 * 売上推移分析ユニットの文脈構築純粋関数。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildSalesAnalysisContext, deriveChildContext } from '../SalesAnalysisContext'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'

const sampleRange: DateRange = {
  from: { year: 2026, month: 3, day: 1 },
  to: { year: 2026, month: 3, day: 31 },
}

describe('buildSalesAnalysisContext', () => {
  it('dateRange と storeIds を保持', () => {
    const ctx = buildSalesAnalysisContext(sampleRange, new Set(['s1', 's2']))
    expect(ctx.dateRange).toEqual(sampleRange)
    expect(ctx.selectedStoreIds.has('s1')).toBe(true)
    expect(ctx.selectedStoreIds.size).toBe(2)
  })

  it('hierarchy 省略時は空オブジェクト', () => {
    const ctx = buildSalesAnalysisContext(sampleRange, new Set())
    expect(ctx.hierarchy).toEqual({})
  })

  it('hierarchy を受け取ればそのまま保持', () => {
    const ctx = buildSalesAnalysisContext(sampleRange, new Set(), undefined, undefined, {
      deptCode: 'D1',
      lineCode: 'L1',
    })
    expect(ctx.hierarchy.deptCode).toBe('D1')
    expect(ctx.hierarchy.lineCode).toBe('L1')
  })

  it('comparisonScope を保持', () => {
    const scope = 'current' as unknown as PrevYearScope
    const ctx = buildSalesAnalysisContext(sampleRange, new Set(), scope)
    expect(ctx.comparisonScope).toBe(scope)
  })

  it('comparisonScope 省略時は undefined', () => {
    const ctx = buildSalesAnalysisContext(sampleRange, new Set())
    expect(ctx.comparisonScope).toBeUndefined()
  })

  it('selectedDayRange を保持', () => {
    const ctx = buildSalesAnalysisContext(sampleRange, new Set(), undefined, {
      startDay: 5,
      endDay: 10,
    })
    expect(ctx.selectedDayRange).toEqual({ startDay: 5, endDay: 10 })
  })
})

describe('deriveChildContext', () => {
  const parent = buildSalesAnalysisContext(
    sampleRange,
    new Set(['s1']),
    'current' as unknown as PrevYearScope,
    { startDay: 1, endDay: 10 },
    { deptCode: 'D1' },
  )

  it('dateRange を上書き', () => {
    const drillRange: DateRange = {
      from: { year: 2026, month: 3, day: 5 },
      to: { year: 2026, month: 3, day: 6 },
    }
    const child = deriveChildContext(parent, drillRange)
    expect(child.dateRange).toEqual(drillRange)
  })

  it('storeIds / hierarchy / selectedDayRange は継承', () => {
    const child = deriveChildContext(parent, sampleRange)
    expect(child.selectedStoreIds).toBe(parent.selectedStoreIds)
    expect(child.hierarchy).toBe(parent.hierarchy)
    expect(child.selectedDayRange).toBe(parent.selectedDayRange)
  })

  it('comparisonScope 未指定なら親の値を継承', () => {
    const child = deriveChildContext(parent, sampleRange)
    expect(child.comparisonScope).toBe(parent.comparisonScope)
  })

  it('comparisonScope 指定で上書き', () => {
    const child = deriveChildContext(parent, sampleRange, undefined as unknown as PrevYearScope)
    // undefined を明示的に渡しても ?? で parent を継承
    expect(child.comparisonScope).toBe(parent.comparisonScope)
  })

  it('親文脈を破壊しない（immutable）', () => {
    const before = { ...parent }
    const drillRange: DateRange = {
      from: { year: 2025, month: 1, day: 1 },
      to: { year: 2025, month: 1, day: 31 },
    }
    deriveChildContext(parent, drillRange)
    expect(parent.dateRange).toEqual(before.dateRange)
    expect(parent.comparisonScope).toBe(before.comparisonScope)
  })
})
