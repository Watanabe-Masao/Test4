/**
 * GrossProfitRateChart.vm.ts — pure ViewModel tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildGrossProfitRateViewModel, getBarColor } from '../GrossProfitRateChart.vm'
import type { DailyRecord } from '@/domain/models/record'

function mkDaily(day: number, sales: number, totalCost: number): DailyRecord {
  return {
    day,
    sales,
    totalCost,
    customers: 0,
    salesBudget: 0,
    grossProfit: sales - totalCost,
  } as unknown as DailyRecord
}

describe('buildGrossProfitRateViewModel', () => {
  it('builds cumulative rate series restricted to range', () => {
    const daily = new Map<number, DailyRecord>([
      [1, mkDaily(1, 1000, 700)], // cum 1000 / 700 → rate 0.3
      [2, mkDaily(2, 1000, 600)], // cum 2000 / 1300 → 0.35
      [3, mkDaily(3, 1000, 500)], // cum 3000 / 1800 → 0.4
    ])
    const vm = buildGrossProfitRateViewModel(daily, 3, 1, 3)
    expect(vm.data).toHaveLength(3)
    expect(vm.data[0]?.day).toBe(1)
    expect(vm.data[0]?.hasSales).toBe(true)
    expect(vm.data[0]?.rate).toBeCloseTo(0.3, 5)
    expect(vm.data[1]?.rate).toBeCloseTo(0.35, 5)
    expect(vm.data[2]?.rate).toBeCloseTo(0.4, 5)
  })

  it('filters out days outside [rangeStart, rangeEnd]', () => {
    const daily = new Map<number, DailyRecord>([
      [1, mkDaily(1, 1000, 700)],
      [2, mkDaily(2, 1000, 600)],
      [3, mkDaily(3, 1000, 500)],
    ])
    const vm = buildGrossProfitRateViewModel(daily, 3, 2, 3)
    expect(vm.data.map((d) => d.day)).toEqual([2, 3])
  })

  it('marks days without records as hasSales=false and carries cumulative forward', () => {
    const daily = new Map<number, DailyRecord>([[2, mkDaily(2, 1000, 500)]])
    const vm = buildGrossProfitRateViewModel(daily, 3, 1, 3)
    expect(vm.data).toHaveLength(3)
    expect(vm.data[0]?.hasSales).toBe(false)
    expect(vm.data[1]?.hasSales).toBe(true)
    expect(vm.data[2]?.hasSales).toBe(false)
  })

  it('yMax is at least 0.5 (lower floor)', () => {
    const daily = new Map<number, DailyRecord>([[1, mkDaily(1, 1000, 900)]]) // rate ≈ 0.1
    const vm = buildGrossProfitRateViewModel(daily, 1, 1, 1)
    expect(vm.yMax).toBe(0.5)
  })

  it('yMax rounds up max rate to 0.1 granularity', () => {
    const daily = new Map<number, DailyRecord>([[1, mkDaily(1, 1000, 200)]]) // rate 0.8
    const vm = buildGrossProfitRateViewModel(daily, 1, 1, 1)
    expect(vm.yMax).toBeGreaterThanOrEqual(0.8)
    // 0.8 → ceil(8)/10 = 0.8
    expect(vm.yMax).toBeCloseTo(0.8, 5)
  })

  it('returns empty data array when range is empty', () => {
    const daily = new Map<number, DailyRecord>([[1, mkDaily(1, 1000, 500)]])
    const vm = buildGrossProfitRateViewModel(daily, 3, 10, 20)
    expect(vm.data).toHaveLength(0)
    expect(vm.yMax).toBe(0.5)
  })
})

describe('getBarColor', () => {
  const colors = { success: '#0f0', warning: '#ff0', danger: '#f00' }

  it('returns success when rate >= target', () => {
    expect(getBarColor(0.5, 0.3, 0.2, colors)).toBe('#0f0')
    expect(getBarColor(0.3, 0.3, 0.2, colors)).toBe('#0f0')
  })

  it('returns warning when rate is between warning and target', () => {
    expect(getBarColor(0.25, 0.3, 0.2, colors)).toBe('#ff0')
    expect(getBarColor(0.2, 0.3, 0.2, colors)).toBe('#ff0')
  })

  it('returns danger when rate is below warning', () => {
    expect(getBarColor(0.1, 0.3, 0.2, colors)).toBe('#f00')
  })
})
