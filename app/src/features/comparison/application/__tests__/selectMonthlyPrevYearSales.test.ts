import { describe, it, expect } from 'vitest'
import { selectMonthlyPrevYearSales } from '../selectMonthlyPrevYearSales'
import type { PrevYearMonthlyKpi, PrevYearMonthlyKpiEntry } from '../comparisonTypes'

const emptyEntry: PrevYearMonthlyKpiEntry = {
  sales: 0,
  customers: 0,
  transactionValue: 0,
  ctsQuantity: 0,
  dailyMapping: [],
  storeContributions: [],
}

function makeKpi(overrides?: Partial<PrevYearMonthlyKpi>): PrevYearMonthlyKpi {
  return {
    hasPrevYear: true,
    sameDow: { ...emptyEntry, sales: 35_000_000 },
    sameDate: { ...emptyEntry, sales: 40_000_000 },
    monthlyTotal: {
      sales: 40_878_125,
      customers: 100_000,
      transactionValue: 408,
      ctsQuantity: 500_000,
    },
    sourceYear: 2025,
    sourceMonth: 4,
    dowOffset: 0,
    ...overrides,
  }
}

describe('selectMonthlyPrevYearSales', () => {
  it('sameDate: monthlyTotal.sales を返す', () => {
    const result = selectMonthlyPrevYearSales(makeKpi(), 'sameDate')
    expect(result).toEqual({
      hasPrevYear: true,
      monthlySales: 40_878_125,
      mode: 'sameDate',
      source: 'kpi-sameDate',
    })
  })

  it('sameDow: sameDow.sales を返す', () => {
    const result = selectMonthlyPrevYearSales(makeKpi(), 'sameDow')
    expect(result).toEqual({
      hasPrevYear: true,
      monthlySales: 35_000_000,
      mode: 'sameDow',
      source: 'kpi-sameDow',
    })
  })

  it('mode 未指定時は sameDate を既定とする', () => {
    const result = selectMonthlyPrevYearSales(makeKpi())
    expect(result.mode).toBe('sameDate')
    expect(result.monthlySales).toBe(40_878_125)
  })

  it('null 入力は source="none" を返す', () => {
    const result = selectMonthlyPrevYearSales(null, 'sameDate')
    expect(result).toEqual({
      hasPrevYear: false,
      monthlySales: 0,
      mode: 'sameDate',
      source: 'none',
    })
  })

  it('undefined 入力は source="none" を返す', () => {
    const result = selectMonthlyPrevYearSales(undefined, 'sameDow')
    expect(result).toEqual({
      hasPrevYear: false,
      monthlySales: 0,
      mode: 'sameDow',
      source: 'none',
    })
  })

  it('hasPrevYear=false は source="none" を返す', () => {
    const kpi = makeKpi({ hasPrevYear: false })
    const result = selectMonthlyPrevYearSales(kpi, 'sameDate')
    expect(result.hasPrevYear).toBe(false)
    expect(result.source).toBe('none')
  })

  it('monthlyTotal.sales=0 (sameDate) は source="none" を返す', () => {
    const kpi = makeKpi({
      monthlyTotal: { sales: 0, customers: 0, transactionValue: 0, ctsQuantity: 0 },
    })
    const result = selectMonthlyPrevYearSales(kpi, 'sameDate')
    expect(result.hasPrevYear).toBe(false)
    expect(result.monthlySales).toBe(0)
    expect(result.source).toBe('none')
  })

  it('sameDow.sales=0 は source="none" を返す (sameDate は別経路)', () => {
    const kpi = makeKpi({ sameDow: { ...emptyEntry, sales: 0 } })
    const sameDow = selectMonthlyPrevYearSales(kpi, 'sameDow')
    expect(sameDow.hasPrevYear).toBe(false)
    expect(sameDow.source).toBe('none')
    // sameDate 側は独立に機能する
    const sameDate = selectMonthlyPrevYearSales(kpi, 'sameDate')
    expect(sameDate.hasPrevYear).toBe(true)
    expect(sameDate.monthlySales).toBe(40_878_125)
  })

  it('回帰ガード: elapsed cap された値を誤って返さない（期間スコープ混入の検出）', () => {
    // monthlyTotal.sales は elapsed cap なし、sameDow/sameDate も fullMonthPeriod1
    // で構築される前提。selector は受け取った値をそのまま返すだけなので、
    // 「source が 'kpi-*' のときの monthlySales は渡された kpi の値と一致」
    // ことを固定する。期間スコープ値が混入した場合はこの不変が破れる。
    const kpi = makeKpi({
      monthlyTotal: {
        sales: 43_850_000,
        customers: 0,
        transactionValue: 0,
        ctsQuantity: 0,
      },
    })
    const result = selectMonthlyPrevYearSales(kpi, 'sameDate')
    expect(result.monthlySales).toBe(kpi.monthlyTotal.sales)
  })
})
