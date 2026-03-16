/**
 * ConditionSummaryEnhanced.vm 純粋関数テスト
 *
 * 禁止事項 #10（率はパイプラインで持ち回さない）の不変条件を検証する。
 * 全ての率計算が domain/calculations 経由で行われていることを、
 * 入出力の整合性テストで保証する。
 */
import { describe, it, expect } from 'vitest'
import {
  buildRows,
  buildTotalFromResult,
  buildDailyMarkupRateYoYRows,
  buildDailyDiscountRateYoYRows,
  buildDailyDiscountRows,
  type BuildRowsInput,
} from '../ConditionSummaryEnhanced.vm'
import { makeStoreResult, makeEmptyPrevYear, makeDailyRecord } from './widgetTestHelpers'
import type { PrevYearMonthlyKpi } from '@/application/hooks'
import { calculateMarkupRates } from '@/domain/calculations/markupRate'
import { calculateDiscountRate } from '@/domain/calculations/estMethod'

// ─── Test Helpers ────────────────────────────────────────

function makeNoHasPrevYearKpi(): PrevYearMonthlyKpi {
  return { hasPrevYear: false } as PrevYearMonthlyKpi
}

function makeHasPrevYearKpi(
  storeContributions: {
    storeId: string
    originalDay: number
    mappedDay: number
    sales: number
    customers: number
    discount: number
  }[],
): PrevYearMonthlyKpi {
  const totalSales = storeContributions.reduce((s, c) => s + c.sales, 0)
  const totalCustomers = storeContributions.reduce((s, c) => s + c.customers, 0)
  const entry = {
    sales: totalSales,
    customers: totalCustomers,
    transactionValue: 0,
    dailyMapping: [] as {
      prevDay: number
      prevMonth: number
      prevYear: number
      currentDay: number
      prevSales: number
      prevCustomers: number
    }[],
    storeContributions,
  }
  return {
    hasPrevYear: true,
    sameDow: entry,
    sameDate: entry,
    sourceYear: 2025,
    sourceMonth: 3,
    dowOffset: 0,
    monthlyTotal: { sales: totalSales, customers: totalCustomers, transactionValue: 0 },
  }
}

/** StoreResult with daily records for markup rate testing */
function makeStoreResultWithDaily() {
  const daily = new Map(
    [
      makeDailyRecord({
        day: 1,
        sales: 50000,
        purchase: { cost: 30000, price: 40000 },
        flowers: { cost: 2000, price: 3000 },
        directProduce: { cost: 1000, price: 1500 },
        interStoreIn: { cost: 500, price: 700 },
        interStoreOut: { cost: 200, price: 300 },
        interDepartmentIn: { cost: 100, price: 150 },
        interDepartmentOut: { cost: 50, price: 80 },
        discountAbsolute: 1000,
      }),
      makeDailyRecord({
        day: 2,
        sales: 60000,
        purchase: { cost: 35000, price: 48000 },
        flowers: { cost: 3000, price: 4000 },
        directProduce: { cost: 1500, price: 2000 },
        interStoreIn: { cost: 600, price: 800 },
        interStoreOut: { cost: 300, price: 400 },
        interDepartmentIn: { cost: 150, price: 200 },
        interDepartmentOut: { cost: 100, price: 120 },
        discountAbsolute: 1200,
      }),
    ].map((r) => [r.day, r] as const),
  )

  return makeStoreResult({
    storeId: 'S1',
    totalSales: 110000,
    totalDiscount: 2200,
    discountRate: calculateDiscountRate(110000, 2200),
    averageMarkupRate: 0.25,
    daily,
    elapsedDays: 2,
  })
}

// ─── Tests ───────────────────────────────────────────────

describe('ConditionSummaryEnhanced.vm 不変条件', () => {
  describe('buildRows — 値入率前年比（禁止事項 #10: 額→率変換は domain 経由）', () => {
    it('prevYearStoreCostPrice から値入率を domain/calculations 経由で算出する', () => {
      const sr = makeStoreResult({ storeId: 'S1', averageMarkupRate: 0.28 })
      const prevCostPrice = new Map([['S1', { cost: 700000, price: 1000000 }]])

      const input: BuildRowsInput = {
        allStoreResults: new Map([['S1', sr]]),
        stores: new Map([['S1', { code: 'S1', name: '店舗1' } as never]]),
        metric: 'markupRate',
        tab: 'elapsed',
        elapsedDays: 15,
        daysInMonth: 28,
        prevYear: makeEmptyPrevYear(),
        prevYearMonthlyKpi: makeNoHasPrevYearKpi(),
        prevYearStoreCostPrice: prevCostPrice,
      }

      const rows = buildRows(input)
      expect(rows).toHaveLength(1)

      // 前年値入率: domain/calculations で同じ入力から算出した値と一致すること
      const { averageMarkupRate } = calculateMarkupRates({
        purchasePrice: 1000000,
        purchaseCost: 700000,
        deliveryPrice: 0,
        deliveryCost: 0,
        transferPrice: 0,
        transferCost: 0,
        defaultMarkupRate: 0,
      })
      const expectedLy = averageMarkupRate * 100
      expect(rows[0].ly).toBeCloseTo(expectedLy, 10)
    })

    it('prevYearStoreCostPrice が未提供の場合、前年比は null', () => {
      const sr = makeStoreResult({ storeId: 'S1' })
      const input: BuildRowsInput = {
        allStoreResults: new Map([['S1', sr]]),
        stores: new Map([['S1', { code: 'S1', name: '店舗1' } as never]]),
        metric: 'markupRate',
        tab: 'elapsed',
        elapsedDays: 15,
        daysInMonth: 28,
        prevYear: makeEmptyPrevYear(),
        prevYearMonthlyKpi: makeNoHasPrevYearKpi(),
      }

      const rows = buildRows(input)
      expect(rows[0].ly).toBeNull()
      expect(rows[0].yoy).toBeNull()
    })
  })

  describe('buildTotalFromResult — 値入率全店合計（額の合算→率1回計算）', () => {
    it('複数店舗の額を合算してから率を1回計算する（加重平均が自然に得られる）', () => {
      const result = makeStoreResult({ averageMarkupRate: 0.27 })
      const prevCostPrice = new Map([
        ['S1', { cost: 300000, price: 500000 }],
        ['S2', { cost: 400000, price: 600000 }],
      ])

      const total = buildTotalFromResult(result, {
        metric: 'markupRate',
        tab: 'elapsed',
        elapsedDays: 15,
        daysInMonth: 28,
        prevYear: makeEmptyPrevYear(),
        prevYearMonthlyKpi: makeNoHasPrevYearKpi(),
        prevYearStoreCostPrice: prevCostPrice,
      })

      // 合算: cost=700000, price=1100000
      const { averageMarkupRate } = calculateMarkupRates({
        purchasePrice: 1100000,
        purchaseCost: 700000,
        deliveryPrice: 0,
        deliveryCost: 0,
        transferPrice: 0,
        transferCost: 0,
        defaultMarkupRate: 0,
      })
      expect(total.ly).toBeCloseTo(averageMarkupRate * 100, 10)
    })
  })

  describe('buildTotalFromResult — 売変率全店合計（額の合算→率1回計算）', () => {
    it('storeContributions の sales/discount を合算して calculateDiscountRate で算出', () => {
      const result = makeStoreResult({ discountRate: 0.02 })
      const kpi = makeHasPrevYearKpi([
        {
          storeId: 'S1',
          originalDay: 1,
          mappedDay: 1,
          sales: 50000,
          customers: 30,
          discount: 1000,
        },
        {
          storeId: 'S2',
          originalDay: 1,
          mappedDay: 1,
          sales: 60000,
          customers: 40,
          discount: 1500,
        },
      ])

      const total = buildTotalFromResult(result, {
        metric: 'discountRate',
        tab: 'elapsed',
        elapsedDays: 15,
        daysInMonth: 28,
        prevYear: makeEmptyPrevYear(),
        prevYearMonthlyKpi: kpi,
      })

      const expectedRate = calculateDiscountRate(110000, 2500) * 100
      expect(total.ly).toBeCloseTo(expectedRate, 10)
    })
  })

  describe('buildDailyMarkupRateYoYRows — 日別値入率前年比', () => {
    it('累計は額の running total から率を再計算する（率の平均ではない）', () => {
      const sr = makeStoreResultWithDaily()
      const prevDailyData = new Map([
        [1, { totalCost: 28000, totalPrice: 38000 }],
        [2, { totalCost: 32000, totalPrice: 44000 }],
      ])

      const rows = buildDailyMarkupRateYoYRows(sr, prevDailyData, 2, 28)

      expect(rows).toHaveLength(2)

      // Day 1: 前年率は (38000-28000)/38000 を domain 経由で算出した値と一致
      const { averageMarkupRate: prevDay1Rate } = calculateMarkupRates({
        purchasePrice: 38000,
        purchaseCost: 28000,
        deliveryPrice: 0,
        deliveryCost: 0,
        transferPrice: 0,
        transferCost: 0,
        defaultMarkupRate: 0,
      })
      expect(rows[0].prevRate).toBeCloseTo(prevDay1Rate * 100, 10)

      // Day 2 cumulative: 累計 cost=60000, price=82000 から算出
      const { averageMarkupRate: cumPrevRate } = calculateMarkupRates({
        purchasePrice: 82000,
        purchaseCost: 60000,
        deliveryPrice: 0,
        deliveryCost: 0,
        transferPrice: 0,
        transferCost: 0,
        defaultMarkupRate: 0,
      })
      expect(rows[1].cumPrevRate).toBeCloseTo(cumPrevRate * 100, 10)

      // 不変条件: cumDiff = cumCurRate - cumPrevRate
      expect(rows[1].cumDiff).toBeCloseTo(rows[1].cumCurRate - rows[1].cumPrevRate, 10)
    })

    it('前年データがない日は率0、累計は既存データのみ', () => {
      const sr = makeStoreResultWithDaily()
      // day=2 のみ前年データあり
      const prevDailyData = new Map([[2, { totalCost: 32000, totalPrice: 44000 }]])

      const rows = buildDailyMarkupRateYoYRows(sr, prevDailyData, 2, 28)

      expect(rows[0].prevRate).toBe(0) // day=1: 前年データなし → 0
      expect(rows[1].prevRate).toBeGreaterThan(0) // day=2: 前年データあり
    })
  })

  describe('buildDailyDiscountRateYoYRows — 日別売変率前年比', () => {
    it('累計は sales/discount の running total から率を再計算する', () => {
      const sr = makeStoreResultWithDaily()
      const kpi = makeHasPrevYearKpi([
        { storeId: 'S1', originalDay: 1, mappedDay: 1, sales: 48000, customers: 30, discount: 800 },
        {
          storeId: 'S1',
          originalDay: 2,
          mappedDay: 2,
          sales: 55000,
          customers: 35,
          discount: 1100,
        },
      ])

      const rows = buildDailyDiscountRateYoYRows(sr, 'S1', kpi, 2, 28)

      expect(rows).toHaveLength(2)

      // Day 1 前年率
      const prevDay1 = calculateDiscountRate(48000, 800) * 100
      expect(rows[0].prevRate).toBeCloseTo(prevDay1, 10)

      // Day 2 累計前年率: 合算して再計算
      const cumPrevRate = calculateDiscountRate(103000, 1900) * 100
      expect(rows[1].cumPrevRate).toBeCloseTo(cumPrevRate, 10)

      // 不変条件: diff = curRate - prevRate
      for (const row of rows) {
        expect(row.diff).toBeCloseTo(row.curRate - row.prevRate, 10)
        expect(row.cumDiff).toBeCloseTo(row.cumCurRate - row.cumPrevRate, 10)
      }
    })
  })

  describe('buildDailyDiscountRows — 日別売変種別内訳', () => {
    it('日別売変率が calculateDiscountRate と一致する', () => {
      const sr = makeStoreResultWithDaily()
      const rows = buildDailyDiscountRows(sr, 2, 28)

      expect(rows).toHaveLength(2)

      // Day 1: sales=50000, discount=1000
      const expectedRate1 = calculateDiscountRate(50000, 1000) * 100
      expect(rows[0].totalRate).toBeCloseTo(expectedRate1, 10)

      // Day 2: sales=60000, discount=1200
      const expectedRate2 = calculateDiscountRate(60000, 1200) * 100
      expect(rows[1].totalRate).toBeCloseTo(expectedRate2, 10)
    })
  })
})
