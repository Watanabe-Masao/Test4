/**
 * usePerformanceIndexPlan — buildPlanInputs の純粋関数テスト
 *
 * @guard H1 Screen Plan 経由のみ
 */
import { describe, it, expect } from 'vitest'
import { buildPlanInputs, type PerformanceIndexPlanParams } from './usePerformanceIndexPlan'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'

const mockExecutor: QueryExecutor = {
  isReady: true,
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
    const notReady = { isReady: false, execute: async () => null } as QueryExecutor
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
