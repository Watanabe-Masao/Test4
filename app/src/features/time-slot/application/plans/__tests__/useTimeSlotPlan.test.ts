/**
 * buildTimeSlotPlanInputs — 純粋関数テスト
 *
 * TimeSlotChart の query 入力が drill 文脈で正しく組み立てられることを検証する。
 * 特に: 日別売上チャートから単日ドリル (4月10日) 時に前年 hourly / day count が
 * 正しい query input を生成することを確認する (#前年値非表示 bug の再現テスト)。
 */
import { describe, it, expect } from 'vitest'
import { buildTimeSlotPlanInputs } from '../useTimeSlotPlan'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'

const curRange: DateRange = {
  from: { year: 2026, month: 4, day: 10 },
  to: { year: 2026, month: 4, day: 10 },
}

const prevYearScope: PrevYearScope = {
  dateRange: {
    from: { year: 2025, month: 4, day: 10 },
    to: { year: 2025, month: 4, day: 10 },
  },
  totalCustomers: 0,
  dowOffset: 0,
}

describe('buildTimeSlotPlanInputs — yoy drill (単日ドリル)', () => {
  it('prevYearScope 指定で compHourlyInput / compDayCountInput が前年日付と isPrevYear=true で組まれる', () => {
    const result = buildTimeSlotPlanInputs({
      currentDateRange: curRange,
      selectedStoreIds: new Set(),
      prevYearScope,
      compMode: 'yoy',
      hierarchy: {},
    })

    // 当年
    expect(result.curHourlyInput.dateFrom).toBe('2026-04-10')
    expect(result.curHourlyInput.dateTo).toBe('2026-04-10')
    expect(result.curHourlyInput.isPrevYear).toBe(false)

    // 前年 — これが null になっていると「前年値が表示されない」バグになる
    expect(result.compHourlyInput).not.toBeNull()
    expect(result.compHourlyInput?.dateFrom).toBe('2025-04-10')
    expect(result.compHourlyInput?.dateTo).toBe('2025-04-10')
    expect(result.compHourlyInput?.isPrevYear).toBe(true)

    // 営業日数カウントも前年側が正しく組まれる
    expect(result.compDayCountInput).not.toBeNull()
    expect(result.compDayCountInput?.isPrevYear).toBe(true)
  })

  it('prevYearScope 未指定なら compHourlyInput / compDayCountInput は null', () => {
    const result = buildTimeSlotPlanInputs({
      currentDateRange: curRange,
      selectedStoreIds: new Set(),
      prevYearScope: undefined,
      compMode: 'yoy',
      hierarchy: {},
    })

    expect(result.compHourlyInput).toBeNull()
    expect(result.compDayCountInput).toBeNull()
  })

  it('storeIds / hierarchy が compHourlyInput にも反映される', () => {
    const result = buildTimeSlotPlanInputs({
      currentDateRange: curRange,
      selectedStoreIds: new Set(['S001', 'S002']),
      prevYearScope,
      compMode: 'yoy',
      hierarchy: { deptCode: 'D1', lineCode: 'L1' },
    })

    expect(result.compHourlyInput?.storeIds).toEqual(['S001', 'S002'])
    expect(result.compHourlyInput?.deptCode).toBe('D1')
    expect(result.compHourlyInput?.lineCode).toBe('L1')
    expect(result.compHourlyInput?.isPrevYear).toBe(true)
  })
})

describe('buildTimeSlotPlanInputs — wow drill (前週比較)', () => {
  it('compMode=wow では compHourlyInput が 7 日前の範囲 + isPrevYear=false で組まれる', () => {
    const result = buildTimeSlotPlanInputs({
      currentDateRange: curRange,
      selectedStoreIds: new Set(),
      prevYearScope,
      compMode: 'wow',
      hierarchy: {},
    })

    // 4/10 の 7 日前 = 4/3
    expect(result.compHourlyInput?.dateFrom).toBe('2026-04-03')
    expect(result.compHourlyInput?.dateTo).toBe('2026-04-03')
    // wow は同年データなので is_prev_year=false
    expect(result.compHourlyInput?.isPrevYear).toBe(false)
  })

  it('compMode=wow では prevYearScope が undefined でも compHourlyInput は非 null', () => {
    const result = buildTimeSlotPlanInputs({
      currentDateRange: curRange,
      selectedStoreIds: new Set(),
      prevYearScope: undefined,
      compMode: 'wow',
      hierarchy: {},
    })

    // wow は前年スコープと独立して常に動く
    expect(result.compHourlyInput).not.toBeNull()
  })
})
