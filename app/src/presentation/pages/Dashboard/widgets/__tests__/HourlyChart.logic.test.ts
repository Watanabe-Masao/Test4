import { describe, it, expect } from 'vitest'
import {
  buildHourlyData,
  computeSelectedData,
  buildHourCategoryDetail,
  buildCumulativeData,
} from '../HourlyChart.logic'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'

const makeRec = (
  dept: string,
  line: string,
  klass: string,
  slots: { hour: number; amount: number; quantity: number }[],
): CategoryLeafDailyEntry =>
  ({
    department: { code: dept, name: dept },
    line: { code: line, name: line },
    klass: { code: klass, name: klass },
    deptCode: dept,
    deptName: dept,
    lineCode: line,
    lineName: line,
    klassCode: klass,
    klassName: klass,
    timeSlots: slots,
  }) as unknown as CategoryLeafDailyEntry

describe('buildHourlyData', () => {
  it('returns empty array for no records', () => {
    expect(buildHourlyData([])).toEqual([])
  })

  it('aggregates slots across records and zero-fills min-max range', () => {
    const r1 = makeRec('D', 'L', 'K', [
      { hour: 9, amount: 100, quantity: 5 },
      { hour: 11, amount: 200, quantity: 10 },
    ])
    const r2 = makeRec('D2', 'L2', 'K2', [{ hour: 9, amount: 50, quantity: 2 }])
    const result = buildHourlyData([r1, r2])
    expect(result).toEqual([
      { hour: 9, amount: 150, quantity: 7 },
      { hour: 10, amount: 0, quantity: 0 },
      { hour: 11, amount: 200, quantity: 10 },
    ])
  })

  it('handles a single hour', () => {
    const r = makeRec('D', 'L', 'K', [{ hour: 14, amount: 100, quantity: 5 }])
    expect(buildHourlyData([r])).toEqual([{ hour: 14, amount: 100, quantity: 5 }])
  })
})

describe('computeSelectedData', () => {
  const padded = [
    { hour: 9, amount: 100, quantity: 5 },
    { hour: 10, amount: 200, quantity: 10 },
    { hour: 11, amount: 300, quantity: 15 },
  ]

  it('returns null when no hours selected', () => {
    expect(computeSelectedData(new Set(), padded)).toBeNull()
  })

  it('sums data for selected hours', () => {
    const r = computeSelectedData(new Set([9, 11]), padded)
    expect(r).toEqual({ amount: 400, quantity: 20 })
  })

  it('ignores unknown hours in selection', () => {
    const r = computeSelectedData(new Set([99]), padded)
    expect(r).toEqual({ amount: 0, quantity: 0 })
  })
})

describe('buildHourCategoryDetail', () => {
  it('returns empty array when no hours selected', () => {
    const result = buildHourCategoryDetail(new Set(), [], [], 'cur')
    expect(result).toEqual([])
  })

  it('aggregates categories for selected hours and computes pct/color', () => {
    const r1 = makeRec('D1', 'L1', 'K1', [
      { hour: 9, amount: 300, quantity: 3 },
      { hour: 10, amount: 100, quantity: 1 },
    ])
    const r2 = makeRec('D2', 'L2', 'K2', [{ hour: 9, amount: 100, quantity: 1 }])
    const result = buildHourCategoryDetail(new Set([9]), [r1, r2], [], 'cur')
    expect(result).toHaveLength(2)
    expect(result[0].dept).toBe('D1')
    expect(result[0].amount).toBe(300)
    expect(result[0].quantity).toBe(3)
    expect(result[0].pct).toBe(75)
    expect(result[1].dept).toBe('D2')
    expect(result[1].amount).toBe(100)
    expect(result[1].pct).toBe(25)
    expect(typeof result[0].color).toBe('string')
  })

  it('skips slots with 0 amount and 0 quantity', () => {
    const r = makeRec('D', 'L', 'K', [{ hour: 9, amount: 0, quantity: 0 }])
    expect(buildHourCategoryDetail(new Set([9]), [r], [], 'cur')).toEqual([])
  })

  it('uses prevDayRecords when hourlyMode is prev', () => {
    const cur = makeRec('D1', 'L1', 'K1', [{ hour: 9, amount: 999, quantity: 99 }])
    const prev = makeRec('D2', 'L2', 'K2', [{ hour: 9, amount: 200, quantity: 4 }])
    const result = buildHourCategoryDetail(new Set([9]), [cur], [prev], 'prev')
    expect(result).toHaveLength(1)
    expect(result[0].dept).toBe('D2')
    expect(result[0].amount).toBe(200)
  })
})

describe('buildCumulativeData', () => {
  it('returns cumulative percent per hour', () => {
    const padded = [
      { hour: 9, amount: 100 },
      { hour: 10, amount: 100 },
      { hour: 11, amount: 200 },
    ]
    const result = buildCumulativeData(padded, 400)
    expect(result).toEqual([
      { hour: 9, cumPct: 25 },
      { hour: 10, cumPct: 50 },
      { hour: 11, cumPct: 100 },
    ])
  })

  it('returns 0 cumPct when totalAmt is 0', () => {
    const result = buildCumulativeData([{ hour: 9, amount: 0 }], 0)
    expect(result).toEqual([{ hour: 9, cumPct: 0 }])
  })

  it('returns empty array when padded is empty', () => {
    expect(buildCumulativeData([], 100)).toEqual([])
  })
})
