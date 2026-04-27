/**
 * usePerformanceIndexPlan — buildPlanInputs の純粋関数テスト
 *
 * @guard H1 Screen Plan 経由のみ
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildPlanInputs, type PerformanceIndexPlanParams } from './usePerformanceIndexPlan'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'

const mockExecutor: QueryExecutor = {
  isReady: true,
  dataVersion: 1,
  execute: async () => null,
}

const currentDateRange: DateRange = {
  from: { year: 2025, month: 3, day: 1 },
  to: { year: 2025, month: 3, day: 31 },
}

const prevYearScope: PrevYearScope = {
  dateRange: {
    from: { year: 2024, month: 3, day: 2 },
    to: { year: 2024, month: 4, day: 1 },
  },
  totalCustomers: 450,
  dowOffset: 1,
}

function makeParams(
  overrides: Partial<PerformanceIndexPlanParams> = {},
): PerformanceIndexPlanParams {
  return {
    executor: mockExecutor,
    categoryDateRange: currentDateRange,
    currentDateRange,
    selectedStoreIds: new Set(['S1', 'S2']),
    categoryLevel: 'department',
    storePILevel: 'department',
    ...overrides,
  }
}

describe('buildPlanInputs', () => {
  it('executor が null の場合は両方 null', () => {
    const { categoryInput, storeCatInput } = buildPlanInputs(makeParams({ executor: null }))
    expect(categoryInput).toBeNull()
    expect(storeCatInput).toBeNull()
  })

  it('executor が not ready の場合は両方 null', () => {
    const notReady = { isReady: false, dataVersion: 0, execute: async () => null } as QueryExecutor
    const { categoryInput, storeCatInput } = buildPlanInputs(makeParams({ executor: notReady }))
    expect(categoryInput).toBeNull()
    expect(storeCatInput).toBeNull()
  })

  it('current only: comparisonDateFrom/To が含まれない', () => {
    const { categoryInput } = buildPlanInputs(makeParams({ prevYearScope: undefined }))
    expect(categoryInput).not.toBeNull()
    expect(categoryInput!.dateFrom).toBe('2025-03-01')
    expect(categoryInput!.dateTo).toBe('2025-03-31')
    expect(categoryInput!.comparisonDateFrom).toBeUndefined()
    expect(categoryInput!.comparisonDateTo).toBeUndefined()
  })

  it('prevYearScope あり: comparisonDateFrom/To が設定される', () => {
    const { categoryInput } = buildPlanInputs(makeParams({ prevYearScope }))
    expect(categoryInput).not.toBeNull()
    expect(categoryInput!.comparisonDateFrom).toBe('2024-03-02')
    expect(categoryInput!.comparisonDateTo).toBe('2024-04-01')
  })

  it('storeIds が渡される', () => {
    const { categoryInput, storeCatInput } = buildPlanInputs(makeParams())
    expect(categoryInput!.storeIds).toEqual(['S1', 'S2'])
    expect(storeCatInput!.storeIds).toEqual(['S1', 'S2'])
  })

  it('空の selectedStoreIds → storeIds は undefined', () => {
    const { categoryInput, storeCatInput } = buildPlanInputs(
      makeParams({ selectedStoreIds: new Set() }),
    )
    expect(categoryInput!.storeIds).toBeUndefined()
    expect(storeCatInput!.storeIds).toBeUndefined()
  })

  it('level が正しく設定される', () => {
    const { categoryInput, storeCatInput } = buildPlanInputs(
      makeParams({ categoryLevel: 'line', storePILevel: 'klass' }),
    )
    expect(categoryInput!.level).toBe('line')
    expect(storeCatInput!.level).toBe('klass')
  })

  it('categoryDateRange と currentDateRange が独立', () => {
    const childRange: DateRange = {
      from: { year: 2025, month: 3, day: 10 },
      to: { year: 2025, month: 3, day: 20 },
    }
    const { categoryInput, storeCatInput } = buildPlanInputs(
      makeParams({ categoryDateRange: childRange }),
    )
    // category uses childRange
    expect(categoryInput!.dateFrom).toBe('2025-03-10')
    expect(categoryInput!.dateTo).toBe('2025-03-20')
    // storeCatPI uses full month
    expect(storeCatInput!.dateFrom).toBe('2025-03-01')
    expect(storeCatInput!.dateTo).toBe('2025-03-31')
  })
})

// ── old/new path equivalence: plan が旧 inline 取得と同じ入力を生成する ──

describe('buildPlanInputs — old/new 等価性検証', () => {
  /**
   * 旧コード（CategoryPerformanceChart 内の inline 取得）:
   *   dateRangeToKeys(currentDateRange) → { fromKey, toKey }
   *   useQueryWithHandler(executor, handler, { dateFrom: fromKey, dateTo: toKey, storeIds, level, isPrevYear: false })
   *   useQueryWithHandler(executor, handler, { dateFrom: prevFrom, dateTo: prevTo, storeIds, level, isPrevYear: true })
   *
   * 新コード（plan 経由の pair handler）:
   *   buildPlanInputs → { dateFrom, dateTo, storeIds, level, comparisonDateFrom, comparisonDateTo }
   *   useQueryWithHandler(executor, pairHandler, pairedInput)
   *
   * pair handler 内部で isPrevYear=false/true に分解するため、
   * dateFrom/dateTo と comparisonDateFrom/To が旧コードの2回呼び出しに対応する。
   */
  it('plan の categoryInput.dateFrom/dateTo は旧コードの cur 呼び出しと一致', () => {
    const { categoryInput } = buildPlanInputs(makeParams({ prevYearScope }))
    // 旧コード: dateRangeToKeys(currentDateRange) → { fromKey, toKey }
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    expect(categoryInput!.dateFrom).toBe(fromKey)
    expect(categoryInput!.dateTo).toBe(toKey)
  })

  it('plan の comparisonDateFrom/To は旧コードの prev 呼び出しと一致', () => {
    const { categoryInput } = buildPlanInputs(makeParams({ prevYearScope }))
    // 旧コード: dateRangeToKeys(prevYearScope.dateRange) → { fromKey, toKey }
    const { fromKey: prevFrom, toKey: prevTo } = dateRangeToKeys(prevYearScope.dateRange)
    expect(categoryInput!.comparisonDateFrom).toBe(prevFrom)
    expect(categoryInput!.comparisonDateTo).toBe(prevTo)
  })

  it('plan の storeCatInput は旧コードの storeCategoryPIHandler 呼び出しと一致', () => {
    const { storeCatInput } = buildPlanInputs(
      makeParams({ storePILevel: 'klass', selectedStoreIds: new Set(['S1']) }),
    )
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    expect(storeCatInput!.dateFrom).toBe(fromKey)
    expect(storeCatInput!.dateTo).toBe(toKey)
    expect(storeCatInput!.storeIds).toEqual(['S1'])
    expect(storeCatInput!.level).toBe('klass')
  })

  it('storeIds 変換: Set → Array は旧コードの [...selectedStoreIds] と同一', () => {
    const storeSet = new Set(['S3', 'S1', 'S2'])
    const { categoryInput } = buildPlanInputs(makeParams({ selectedStoreIds: storeSet }))
    // 旧コード: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined
    expect(categoryInput!.storeIds).toEqual([...storeSet])
  })
})
