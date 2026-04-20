/**
 * dowGapActualDay — analyzeDowGapActualDay tests
 *
 * 同日マッピングと同曜日マッピングの差集合から境界シフトを検出するロジック。
 */
import { describe, it, expect } from 'vitest'
import { analyzeDowGapActualDay } from '../dowGapActualDay'

interface MappingRow {
  currentDay: number
  prevDay: number
  prevMonth: number
  prevYear: number
  prevSales: number
  prevCustomers?: number
}

describe('analyzeDowGapActualDay', () => {
  it('sameDate が空なら ZERO_ACTUAL_DAY_IMPACT', () => {
    const r = analyzeDowGapActualDay(
      [],
      [{ currentDay: 1, prevDay: 2, prevMonth: 3, prevYear: 2025, prevSales: 100 }],
      2025,
      3,
      2026,
      3,
    )
    expect(r.estimatedImpact).toBe(0)
    expect(r.shiftedIn).toEqual([])
    expect(r.shiftedOut).toEqual([])
    expect(r.isValid).toBe(false)
  })

  it('sameDow が空なら ZERO_ACTUAL_DAY_IMPACT', () => {
    const r = analyzeDowGapActualDay(
      [{ currentDay: 1, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 100 }],
      [],
      2025,
      3,
      2026,
      3,
    )
    expect(r.isValid).toBe(false)
  })

  it('両マッピング同一なら shifted 0 / isValid=false', () => {
    const map = [
      {
        currentDay: 1,
        prevDay: 1,
        prevMonth: 3,
        prevYear: 2025,
        prevSales: 100,
        prevCustomers: 10,
      },
    ]
    const r = analyzeDowGapActualDay(map, map, 2025, 3, 2026, 3)
    expect(r.shiftedIn).toEqual([])
    expect(r.shiftedOut).toEqual([])
    expect(r.estimatedImpact).toBe(0)
    expect(r.customerImpact).toBe(0)
    expect(r.isValid).toBe(false)
  })

  it('sameDow のみにある前年日は shiftedIn', () => {
    const sameDate = [
      {
        currentDay: 1,
        prevDay: 1,
        prevMonth: 3,
        prevYear: 2025,
        prevSales: 100,
        prevCustomers: 10,
      },
    ]
    const sameDow = [
      {
        currentDay: 1,
        prevDay: 1,
        prevMonth: 3,
        prevYear: 2025,
        prevSales: 100,
        prevCustomers: 10,
      },
      {
        currentDay: 2,
        prevDay: 8,
        prevMonth: 3,
        prevYear: 2025,
        prevSales: 200,
        prevCustomers: 20,
      },
    ]
    const r = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)
    expect(r.shiftedIn).toHaveLength(1)
    expect(r.shiftedIn[0]).toMatchObject({
      prevDay: 8,
      prevMonth: 3,
      prevSales: 200,
      prevCustomers: 20,
    })
    expect(r.shiftedOut).toHaveLength(0)
    expect(r.isValid).toBe(true)
  })

  it('sameDate のみにある前年日は shiftedOut', () => {
    const sameDate = [
      { currentDay: 1, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 100 },
      { currentDay: 2, prevDay: 2, prevMonth: 3, prevYear: 2025, prevSales: 300 },
    ]
    const sameDow = [{ currentDay: 1, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 100 }]
    const r = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)
    expect(r.shiftedOut).toHaveLength(1)
    expect(r.shiftedOut[0]).toMatchObject({ prevDay: 2, prevSales: 300 })
    expect(r.shiftedIn).toHaveLength(0)
  })

  it('estimatedImpact = ΣshiftedIn - Σshiftedout', () => {
    const sameDate = [{ currentDay: 1, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 500 }]
    const sameDow = [{ currentDay: 1, prevDay: 8, prevMonth: 3, prevYear: 2025, prevSales: 200 }]
    const r = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)
    expect(r.estimatedImpact).toBe(200 - 500)
  })

  it('customerImpact を計算', () => {
    const sameDate = [
      { currentDay: 1, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 0, prevCustomers: 30 },
    ]
    const sameDow = [
      { currentDay: 1, prevDay: 8, prevMonth: 3, prevYear: 2025, prevSales: 0, prevCustomers: 50 },
    ]
    const r = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)
    expect(r.customerImpact).toBe(50 - 30)
  })

  it('shiftedIn の dow は currentYear/Month ベース', () => {
    // currentDay=5 in 2026-03 is Thursday (getDay()=4, label=木)
    const sameDow = [{ currentDay: 5, prevDay: 3, prevMonth: 3, prevYear: 2025, prevSales: 100 }]
    const r = analyzeDowGapActualDay(
      [{ currentDay: 99, prevDay: 99, prevMonth: 99, prevYear: 2025, prevSales: 0 }],
      sameDow,
      2025,
      3,
      2026,
      3,
    )
    expect(r.shiftedIn[0].dow).toBe(new Date(2026, 2, 5).getDay())
    expect(r.shiftedIn[0].label).toBe(
      ['日', '月', '火', '水', '木', '金', '土'][new Date(2026, 2, 5).getDay()],
    )
  })

  it('shiftedOut の dow は prevYear/prevMonth/prevDay ベース', () => {
    const sameDate = [{ currentDay: 1, prevDay: 15, prevMonth: 3, prevYear: 2025, prevSales: 100 }]
    const sameDow = [{ currentDay: 99, prevDay: 99, prevMonth: 99, prevYear: 2025, prevSales: 0 }]
    const r = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)
    const expected = new Date(2025, 2, 15).getDay()
    expect(r.shiftedOut[0].dow).toBe(expected)
  })

  it('prevCustomers 未指定は 0 扱い', () => {
    const sameDow = [{ currentDay: 1, prevDay: 8, prevMonth: 3, prevYear: 2025, prevSales: 100 }]
    const sameDate: MappingRow[] = [
      { currentDay: 99, prevDay: 99, prevMonth: 99, prevYear: 2025, prevSales: 0 },
    ]
    const r = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)
    expect(r.shiftedIn[0].prevCustomers).toBe(0)
  })

  it('shiftedIn は prevMonth / prevDay 昇順ソート', () => {
    const sameDate: MappingRow[] = [
      { currentDay: 99, prevDay: 99, prevMonth: 99, prevYear: 2025, prevSales: 0 },
    ]
    const sameDow = [
      { currentDay: 1, prevDay: 15, prevMonth: 3, prevYear: 2025, prevSales: 100 },
      { currentDay: 2, prevDay: 1, prevMonth: 4, prevYear: 2025, prevSales: 200 },
      { currentDay: 3, prevDay: 8, prevMonth: 3, prevYear: 2025, prevSales: 300 },
    ]
    const r = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)
    expect(r.shiftedIn.map((s) => s.prevDay)).toEqual([8, 15, 1])
    // 3/8, 3/15, 4/1
  })
})
