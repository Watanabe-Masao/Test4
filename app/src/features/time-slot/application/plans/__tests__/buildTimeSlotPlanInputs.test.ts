/**
 * buildTimeSlotPlanInputs — pure input builder tests
 *
 * 検証対象:
 * - currentDateRange → dateFrom/dateTo 変換
 * - selectedStoreIds → array（空なら undefined）
 * - compMode='yoy': prevYearScope + isPrevYear=true
 * - compMode='wow': 7日前の同範囲 + isPrevYear=false
 * - hierarchy は展開して付与
 */
import { describe, it, expect } from 'vitest'
import { buildTimeSlotPlanInputs } from '../buildTimeSlotPlanInputs'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'

const sampleRange: DateRange = {
  from: { year: 2026, month: 3, day: 1 },
  to: { year: 2026, month: 3, day: 7 },
}

describe('buildTimeSlotPlanInputs', () => {
  it('currentDateRange を dateFrom/dateTo に変換', () => {
    const r = buildTimeSlotPlanInputs({
      currentDateRange: sampleRange,
      selectedStoreIds: new Set(),
      compMode: 'yoy',
      hierarchy: {},
    })
    expect(r.curHourlyInput.dateFrom).toBe('2026-03-01')
    expect(r.curHourlyInput.dateTo).toBe('2026-03-07')
  })

  it('selectedStoreIds を配列に変換（非空）', () => {
    const r = buildTimeSlotPlanInputs({
      currentDateRange: sampleRange,
      selectedStoreIds: new Set(['s1', 's2']),
      compMode: 'yoy',
      hierarchy: {},
    })
    expect(r.curHourlyInput.storeIds).toEqual(expect.arrayContaining(['s1', 's2']))
    expect(r.curHourlyInput.storeIds?.length).toBe(2)
  })

  it('selectedStoreIds 空なら undefined', () => {
    const r = buildTimeSlotPlanInputs({
      currentDateRange: sampleRange,
      selectedStoreIds: new Set(),
      compMode: 'yoy',
      hierarchy: {},
    })
    expect(r.curHourlyInput.storeIds).toBeUndefined()
  })

  it('curHourlyInput.isPrevYear は常に false', () => {
    const r = buildTimeSlotPlanInputs({
      currentDateRange: sampleRange,
      selectedStoreIds: new Set(),
      compMode: 'yoy',
      hierarchy: {},
    })
    expect(r.curHourlyInput.isPrevYear).toBe(false)
  })

  it('compMode=yoy: prevYearScope があれば comp 入力を構築', () => {
    const prevYearScope: PrevYearScope = {
      dateRange: {
        from: { year: 2025, month: 3, day: 1 },
        to: { year: 2025, month: 3, day: 7 },
      },
    } as unknown as PrevYearScope
    const r = buildTimeSlotPlanInputs({
      currentDateRange: sampleRange,
      selectedStoreIds: new Set(),
      prevYearScope,
      compMode: 'yoy',
      hierarchy: {},
    })
    expect(r.compHourlyInput).not.toBeNull()
    expect(r.compHourlyInput!.dateFrom).toBe('2025-03-01')
    expect(r.compHourlyInput!.dateTo).toBe('2025-03-07')
    expect(r.compHourlyInput!.isPrevYear).toBe(true)
  })

  it('compMode=yoy: prevYearScope なしで comp 入力 null', () => {
    const r = buildTimeSlotPlanInputs({
      currentDateRange: sampleRange,
      selectedStoreIds: new Set(),
      compMode: 'yoy',
      hierarchy: {},
    })
    expect(r.compHourlyInput).toBeNull()
    expect(r.compDayCountInput).toBeNull()
  })

  it('compMode=wow: 7日前の同範囲を構築 + isPrevYear=false', () => {
    const r = buildTimeSlotPlanInputs({
      currentDateRange: sampleRange,
      selectedStoreIds: new Set(),
      compMode: 'wow',
      hierarchy: {},
    })
    expect(r.compHourlyInput).not.toBeNull()
    // 7日前: 2026-02-22 to 2026-02-28
    expect(r.compHourlyInput!.dateFrom).toBe('2026-02-22')
    expect(r.compHourlyInput!.dateTo).toBe('2026-02-28')
    expect(r.compHourlyInput!.isPrevYear).toBe(false)
  })

  it('hierarchy を comp/cur 両方に展開', () => {
    const r = buildTimeSlotPlanInputs({
      currentDateRange: sampleRange,
      selectedStoreIds: new Set(),
      compMode: 'wow',
      hierarchy: { deptCode: 'D1', lineCode: 'L1' },
    })
    expect(r.curHourlyInput.deptCode).toBe('D1')
    expect(r.curHourlyInput.lineCode).toBe('L1')
    expect(r.compHourlyInput!.deptCode).toBe('D1')
    expect(r.compHourlyInput!.lineCode).toBe('L1')
  })

  it('curDayCountInput と compDayCountInput は hierarchy を含まない（別契約）', () => {
    const r = buildTimeSlotPlanInputs({
      currentDateRange: sampleRange,
      selectedStoreIds: new Set(),
      compMode: 'wow',
      hierarchy: { deptCode: 'D1' },
    })
    // DistinctDayCountInput は dateFrom/dateTo/storeIds/isPrevYear のみ
    expect(r.curDayCountInput.dateFrom).toBe('2026-03-01')
    expect(r.curDayCountInput.dateTo).toBe('2026-03-07')
    expect(r.compDayCountInput!.isPrevYear).toBe(false)
  })
})
