/**
 * useHeatmapPlan.ts — buildHeatmapPlanInputs pure function test
 *
 * 検証対象:
 * - executor=null or not ready → 全 null
 * - storeIds 空 → undefined / size>0 → [...set]
 * - prevYearScope 有無で matrixInput に comparison key を付与
 * - deptCode / lineCode / klassCode が各 LevelAggregationInput に反映
 */
import { describe, it, expect } from 'vitest'
import { buildHeatmapPlanInputs } from '../useHeatmapPlan'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { DateRange } from '@/domain/models/calendar'

function makeExecutor(isReady: boolean): QueryExecutor {
  return { isReady } as unknown as QueryExecutor
}

const dateRange: DateRange = {
  from: { year: 2026, month: 4, day: 1 },
  to: { year: 2026, month: 4, day: 30 },
}

describe('buildHeatmapPlanInputs — executor not ready', () => {
  it('executor=null → 全 input が null', () => {
    const result = buildHeatmapPlanInputs({
      executor: null,
      currentDateRange: dateRange,
      selectedStoreIds: new Set(),
      deptCode: '',
      lineCode: '',
      klassCode: '',
    })
    expect(result.matrixInput).toBeNull()
    expect(result.deptInput).toBeNull()
    expect(result.lineInput).toBeNull()
    expect(result.klassInput).toBeNull()
  })

  it('executor.isReady=false → 全 input が null', () => {
    const result = buildHeatmapPlanInputs({
      executor: makeExecutor(false),
      currentDateRange: dateRange,
      selectedStoreIds: new Set(),
      deptCode: '',
      lineCode: '',
      klassCode: '',
    })
    expect(result.matrixInput).toBeNull()
  })
})

describe('buildHeatmapPlanInputs — executor ready', () => {
  const executor = makeExecutor(true)

  it('selectedStoreIds 空 → storeIds=undefined', () => {
    const result = buildHeatmapPlanInputs({
      executor,
      currentDateRange: dateRange,
      selectedStoreIds: new Set(),
      deptCode: '',
      lineCode: '',
      klassCode: '',
    })
    expect(result.matrixInput?.storeIds).toBeUndefined()
    expect(result.deptInput?.storeIds).toBeUndefined()
  })

  it('selectedStoreIds 有 → storeIds=[...set]', () => {
    const result = buildHeatmapPlanInputs({
      executor,
      currentDateRange: dateRange,
      selectedStoreIds: new Set(['s1', 's2']),
      deptCode: '',
      lineCode: '',
      klassCode: '',
    })
    expect(result.matrixInput?.storeIds).toEqual(['s1', 's2'])
  })

  it('prevYearScope 未指定 → matrixInput に comparisonDateFrom/To なし', () => {
    const result = buildHeatmapPlanInputs({
      executor,
      currentDateRange: dateRange,
      selectedStoreIds: new Set(),
      deptCode: '',
      lineCode: '',
      klassCode: '',
    })
    expect(result.matrixInput).not.toBeNull()
    const m = result.matrixInput as { comparisonDateFrom?: string }
    expect(m.comparisonDateFrom).toBeUndefined()
  })

  it('prevYearScope 指定 → matrixInput に comparison key が付く', () => {
    const prevRange: DateRange = {
      from: { year: 2025, month: 4, day: 1 },
      to: { year: 2025, month: 4, day: 30 },
    }
    const result = buildHeatmapPlanInputs({
      executor,
      currentDateRange: dateRange,
      selectedStoreIds: new Set(),
      prevYearScope: { dateRange: prevRange } as unknown as Parameters<
        typeof buildHeatmapPlanInputs
      >[0]['prevYearScope'],
      deptCode: '',
      lineCode: '',
      klassCode: '',
    })
    const m = result.matrixInput as { comparisonDateFrom: string; comparisonDateTo: string }
    expect(m.comparisonDateFrom).toBeDefined()
    expect(m.comparisonDateTo).toBeDefined()
  })

  it('deptCode 指定 → deptInput.level=department + lineInput.deptCode 反映', () => {
    const result = buildHeatmapPlanInputs({
      executor,
      currentDateRange: dateRange,
      selectedStoreIds: new Set(),
      deptCode: 'D1',
      lineCode: '',
      klassCode: '',
    })
    expect(result.deptInput?.level).toBe('department')
    expect(result.lineInput?.deptCode).toBe('D1')
  })

  it('lineCode 指定 → klassInput.lineCode 反映', () => {
    const result = buildHeatmapPlanInputs({
      executor,
      currentDateRange: dateRange,
      selectedStoreIds: new Set(),
      deptCode: 'D1',
      lineCode: 'L1',
      klassCode: '',
    })
    expect(result.klassInput?.lineCode).toBe('L1')
    expect(result.klassInput?.level).toBe('klass')
  })

  it('deptCode 空文字 → lineInput.deptCode=undefined (|| undefined conversion)', () => {
    const result = buildHeatmapPlanInputs({
      executor,
      currentDateRange: dateRange,
      selectedStoreIds: new Set(),
      deptCode: '',
      lineCode: '',
      klassCode: '',
    })
    expect(result.lineInput?.deptCode).toBeUndefined()
  })
})
