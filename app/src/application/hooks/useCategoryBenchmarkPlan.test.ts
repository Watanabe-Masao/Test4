import { describe, it, expect } from 'vitest'
import { buildCategoryBenchmarkInputs } from './useCategoryBenchmarkPlan'
import type { CategoryBenchmarkPlanParams } from './useCategoryBenchmarkPlan'
import type { DateRange } from '@/domain/models/calendar'

const testDateRange: DateRange = {
  from: { year: 2025, month: 1, day: 1 },
  to: { year: 2025, month: 1, day: 31 },
}

const baseParams: CategoryBenchmarkPlanParams = {
  executor: { isReady: true } as CategoryBenchmarkPlanParams['executor'],
  currentDateRange: testDateRange,
  selectedStoreIds: new Set(['S001', 'S002']),
  level: 'department',
  parentDeptCode: '',
  parentLineCode: '',
}

describe('buildCategoryBenchmarkInputs', () => {
  it('executor null → 全 input null', () => {
    const result = buildCategoryBenchmarkInputs({ ...baseParams, executor: null })
    expect(result.deptInput).toBeNull()
    expect(result.lineInput).toBeNull()
    expect(result.benchmarkInput).toBeNull()
    expect(result.trendInput).toBeNull()
  })

  it('executor not ready → 全 input null', () => {
    const result = buildCategoryBenchmarkInputs({
      ...baseParams,
      executor: { isReady: false } as CategoryBenchmarkPlanParams['executor'],
    })
    expect(result.deptInput).toBeNull()
    expect(result.lineInput).toBeNull()
    expect(result.benchmarkInput).toBeNull()
    expect(result.trendInput).toBeNull()
  })

  it('基本入力が正しく構築される', () => {
    const result = buildCategoryBenchmarkInputs(baseParams)

    expect(result.deptInput).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
      storeIds: ['S001', 'S002'],
      level: 'department',
    })

    expect(result.lineInput).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
      storeIds: ['S001', 'S002'],
      level: 'line',
      parentDeptCode: undefined,
    })

    expect(result.benchmarkInput).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
      storeIds: ['S001', 'S002'],
      level: 'department',
      parentDeptCode: undefined,
      parentLineCode: undefined,
    })

    expect(result.trendInput).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
      storeIds: ['S001', 'S002'],
      level: 'department',
      parentDeptCode: undefined,
      parentLineCode: undefined,
    })
  })

  it('parentDeptCode/parentLineCode が反映される', () => {
    const result = buildCategoryBenchmarkInputs({
      ...baseParams,
      level: 'klass',
      parentDeptCode: 'D01',
      parentLineCode: 'L02',
    })

    expect(result.lineInput?.parentDeptCode).toBe('D01')
    expect(result.benchmarkInput?.parentDeptCode).toBe('D01')
    expect(result.benchmarkInput?.parentLineCode).toBe('L02')
    expect(result.trendInput?.parentDeptCode).toBe('D01')
    expect(result.trendInput?.parentLineCode).toBe('L02')
    expect(result.benchmarkInput?.level).toBe('klass')
  })

  it('空の selectedStoreIds → storeIds undefined', () => {
    const result = buildCategoryBenchmarkInputs({
      ...baseParams,
      selectedStoreIds: new Set(),
    })

    expect(result.deptInput?.storeIds).toBeUndefined()
    expect(result.benchmarkInput?.storeIds).toBeUndefined()
  })

  it('dept input は常に level=department、line input は常に level=line', () => {
    const result = buildCategoryBenchmarkInputs({
      ...baseParams,
      level: 'klass',
    })

    expect(result.deptInput?.level).toBe('department')
    expect(result.lineInput?.level).toBe('line')
    expect(result.benchmarkInput?.level).toBe('klass')
    expect(result.trendInput?.level).toBe('klass')
  })
})
