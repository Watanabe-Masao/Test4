/**
 * InsightTabBudget.vm.ts — buildBudgetTableRows のユニットテスト
 *
 * 検証する contract:
 * - day 昇順ソートされる (入力順序非依存)
 * - actualCum=0 かつ budgetCum=0 の行はフィルタで除外される
 * - 累積計算 (cumDiscount / cumGrossSales / cumPrevYear / discountRateCum) が
 *   行を跨いで正しく蓄積される
 * - missing data (Map に key 不在) は 0 にフォールバックして NaN を返さない
 * - 0 除算は safeDivide で 0 にフォールバック (achievement / pyDayRatio /
 *   pyCumRatio)
 */
import { describe, it, expect } from 'vitest'
import { buildBudgetTableRows } from './InsightTabBudget.vm'
import type { DailyRecord } from '@/domain/models/record'

/**
 * 必要フィールドのみ設定した最小 DailyRecord
 * (chartCorrectnessBaseline.test.ts と同じパターン)
 */
function makeDailyRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    sales: 100000,
    grossSales: 110000,
    discountAbsolute: 10000,
    customers: 50,
    totalCost: 70000,
    ...overrides,
  } as DailyRecord
}

describe('buildBudgetTableRows', () => {
  describe('基本構造', () => {
    it('単一日のデータから 1 行を返す', () => {
      const chartData = [{ day: 1, actualCum: 100000, budgetCum: 90000 }]
      const daily = new Map([[1, makeDailyRecord({ discountAbsolute: 5000, grossSales: 105000 })]])
      const salesDaily = new Map([[1, 100000]])
      const budgetDaily = new Map([[1, 90000]])
      const prevYearDailyMap = new Map([[1, 95000]])

      const rows = buildBudgetTableRows(chartData, daily, salesDaily, budgetDaily, prevYearDailyMap)

      expect(rows).toHaveLength(1)
      expect(rows[0].day).toBe(1)
      expect(rows[0].dayBudget).toBe(90000)
      expect(rows[0].daySales).toBe(100000)
      expect(rows[0].variance).toBe(10000)
      expect(rows[0].dayDiscountAbsolute).toBe(5000)
      expect(rows[0].budgetCum).toBe(90000)
      expect(rows[0].actualCum).toBe(100000)
      expect(rows[0].budgetVariance).toBe(10000)
    })

    it('入力 chartData が day 昇順でなくても出力は day 昇順になる', () => {
      const chartData = [
        { day: 3, actualCum: 300000, budgetCum: 300000 },
        { day: 1, actualCum: 100000, budgetCum: 100000 },
        { day: 2, actualCum: 200000, budgetCum: 200000 },
      ]
      const empty = new Map<number, number>()
      const emptyDaily = new Map<number, DailyRecord>()

      const rows = buildBudgetTableRows(chartData, emptyDaily, empty, empty, empty)

      expect(rows.map((r) => r.day)).toEqual([1, 2, 3])
    })

    it('actualCum=0 かつ budgetCum=0 の行はフィルタで除外される', () => {
      const chartData = [
        { day: 1, actualCum: 100000, budgetCum: 100000 },
        { day: 2, actualCum: 0, budgetCum: 0 }, // 除外対象
        { day: 3, actualCum: 0, budgetCum: 50000 }, // budgetCum > 0 で残る
        { day: 4, actualCum: 50000, budgetCum: 0 }, // actualCum > 0 で残る
      ]
      const empty = new Map<number, number>()
      const emptyDaily = new Map<number, DailyRecord>()

      const rows = buildBudgetTableRows(chartData, emptyDaily, empty, empty, empty)

      expect(rows.map((r) => r.day)).toEqual([1, 3, 4])
    })
  })

  describe('累積計算 (state across rows)', () => {
    it('cumPrevYear が行を跨いで正しく蓄積される', () => {
      const chartData = [
        { day: 1, actualCum: 100000, budgetCum: 100000 },
        { day: 2, actualCum: 200000, budgetCum: 200000 },
        { day: 3, actualCum: 300000, budgetCum: 300000 },
      ]
      const empty = new Map<number, number>()
      const emptyDaily = new Map<number, DailyRecord>()
      const prevYearDailyMap = new Map([
        [1, 50000],
        [2, 60000],
        [3, 70000],
      ])

      const rows = buildBudgetTableRows(chartData, emptyDaily, empty, empty, prevYearDailyMap)

      expect(rows[0].cumPrevYear).toBe(50000)
      expect(rows[1].cumPrevYear).toBe(110000) // 50000 + 60000
      expect(rows[2].cumPrevYear).toBe(180000) // 50000 + 60000 + 70000
    })

    it('discountRateCum は累積 discount / 累積 grossSales で計算される', () => {
      const chartData = [
        { day: 1, actualCum: 100000, budgetCum: 100000 },
        { day: 2, actualCum: 200000, budgetCum: 200000 },
      ]
      const daily = new Map([
        [1, makeDailyRecord({ discountAbsolute: 1000, grossSales: 10000 })],
        [2, makeDailyRecord({ discountAbsolute: 3000, grossSales: 20000 })],
      ])
      const empty = new Map<number, number>()

      const rows = buildBudgetTableRows(chartData, daily, empty, empty, empty)

      // day 1: cumDiscount=1000, cumGross=10000 → 0.1
      expect(rows[0].discountRateCum).toBeCloseTo(0.1, 5)
      // day 2: cumDiscount=4000, cumGross=30000 → 0.1333...
      expect(rows[1].discountRateCum).toBeCloseTo(4000 / 30000, 5)
    })

    it('累積計算は filter (actualCum=0 かつ budgetCum=0) で除外された行をスキップする', () => {
      const chartData = [
        { day: 1, actualCum: 100000, budgetCum: 100000 },
        { day: 2, actualCum: 0, budgetCum: 0 }, // 除外
        { day: 3, actualCum: 200000, budgetCum: 200000 },
      ]
      const empty = new Map<number, number>()
      const emptyDaily = new Map<number, DailyRecord>()
      const prevYearDailyMap = new Map([
        [1, 50000],
        [2, 999999], // 除外行の値は累積に含まれない
        [3, 70000],
      ])

      const rows = buildBudgetTableRows(chartData, emptyDaily, empty, empty, prevYearDailyMap)

      expect(rows).toHaveLength(2)
      expect(rows[0].cumPrevYear).toBe(50000)
      expect(rows[1].cumPrevYear).toBe(120000) // 50000 + 70000 (999999 はスキップ)
    })
  })

  describe('contract: 比率計算の 0 除算ガード', () => {
    it('budgetCum=0 のとき achievement は 0 を返す (0 除算しない)', () => {
      const chartData = [{ day: 1, actualCum: 50000, budgetCum: 0 }]
      const empty = new Map<number, number>()
      const emptyDaily = new Map<number, DailyRecord>()

      const rows = buildBudgetTableRows(chartData, emptyDaily, empty, empty, empty)

      expect(rows[0].achievement).toBe(0)
      expect(Number.isNaN(rows[0].achievement)).toBe(false)
    })

    it('pyDaySales=0 のとき pyDayRatio は 0 を返す', () => {
      const chartData = [{ day: 1, actualCum: 100000, budgetCum: 100000 }]
      const empty = new Map<number, number>()
      const emptyDaily = new Map<number, DailyRecord>()
      const salesDaily = new Map([[1, 100000]])
      const prevYearDailyMap = new Map([[1, 0]])

      const rows = buildBudgetTableRows(chartData, emptyDaily, salesDaily, empty, prevYearDailyMap)

      expect(rows[0].pyDayRatio).toBe(0)
      expect(Number.isNaN(rows[0].pyDayRatio)).toBe(false)
    })

    it('cumPrevYear=0 のとき pyCumRatio は 0 を返す', () => {
      const chartData = [{ day: 1, actualCum: 100000, budgetCum: 100000 }]
      const empty = new Map<number, number>()
      const emptyDaily = new Map<number, DailyRecord>()
      const prevYearDailyMap = new Map([[1, 0]])

      const rows = buildBudgetTableRows(chartData, emptyDaily, empty, empty, prevYearDailyMap)

      expect(rows[0].pyCumRatio).toBe(0)
      expect(Number.isNaN(rows[0].pyCumRatio)).toBe(false)
    })

    it('grossSales=0 のとき discountRate は 0 を返す (safeDivide)', () => {
      const chartData = [{ day: 1, actualCum: 100000, budgetCum: 100000 }]
      const daily = new Map([[1, makeDailyRecord({ discountAbsolute: 5000, grossSales: 0 })]])
      const empty = new Map<number, number>()

      const rows = buildBudgetTableRows(chartData, daily, empty, empty, empty)

      expect(rows[0].discountRate).toBe(0)
      expect(Number.isNaN(rows[0].discountRate)).toBe(false)
    })
  })

  describe('contract: missing data fallback', () => {
    it('daily Map に day key 不在なら discountAbsolute / grossSales は 0', () => {
      const chartData = [{ day: 5, actualCum: 100000, budgetCum: 100000 }]
      const emptyDaily = new Map<number, DailyRecord>()
      const empty = new Map<number, number>()

      const rows = buildBudgetTableRows(chartData, emptyDaily, empty, empty, empty)

      expect(rows[0].dayDiscountAbsolute).toBe(0)
      expect(rows[0].discountRate).toBe(0)
      expect(rows[0].discountRateCum).toBe(0)
    })

    it('salesDaily / budgetDaily / prevYearDailyMap に key 不在なら 0', () => {
      const chartData = [{ day: 99, actualCum: 100000, budgetCum: 100000 }]
      const empty = new Map<number, number>()
      const emptyDaily = new Map<number, DailyRecord>()

      const rows = buildBudgetTableRows(chartData, emptyDaily, empty, empty, empty)

      expect(rows[0].daySales).toBe(0)
      expect(rows[0].dayBudget).toBe(0)
      expect(rows[0].pyDaySales).toBe(0)
      expect(rows[0].cumPrevYear).toBe(0)
      expect(rows[0].variance).toBe(0)
    })
  })

  describe('contract: variance / budgetVariance の符号', () => {
    it('daySales > dayBudget なら variance は正', () => {
      const chartData = [{ day: 1, actualCum: 100000, budgetCum: 100000 }]
      const empty = new Map<number, DailyRecord>()
      const salesDaily = new Map([[1, 120000]])
      const budgetDaily = new Map([[1, 100000]])
      const emptyMap = new Map<number, number>()

      const rows = buildBudgetTableRows(chartData, empty, salesDaily, budgetDaily, emptyMap)

      expect(rows[0].variance).toBe(20000)
    })

    it('daySales < dayBudget なら variance は負', () => {
      const chartData = [{ day: 1, actualCum: 100000, budgetCum: 100000 }]
      const empty = new Map<number, DailyRecord>()
      const salesDaily = new Map([[1, 80000]])
      const budgetDaily = new Map([[1, 100000]])
      const emptyMap = new Map<number, number>()

      const rows = buildBudgetTableRows(chartData, empty, salesDaily, budgetDaily, emptyMap)

      expect(rows[0].variance).toBe(-20000)
    })

    it('actualCum > budgetCum なら budgetVariance は正', () => {
      const chartData = [{ day: 1, actualCum: 120000, budgetCum: 100000 }]
      const empty = new Map<number, DailyRecord>()
      const emptyMap = new Map<number, number>()

      const rows = buildBudgetTableRows(chartData, empty, emptyMap, emptyMap, emptyMap)

      expect(rows[0].budgetVariance).toBe(20000)
    })
  })
})
