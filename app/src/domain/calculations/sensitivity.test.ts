import { describe, it, expect } from 'vitest'
import {
  calculateSensitivity,
  calculateElasticity,
  extractSensitivityBase,
} from './sensitivity'
import type { SensitivityBase, SensitivityDeltas } from './sensitivity'

const BASE: SensitivityBase = {
  totalSales: 10_000_000, // 1000万円
  totalCost: 7_000_000, // 700万円（原価率70%）
  totalDiscount: 500_000, // 50万円（売変率約4.8%）
  grossSales: 10_500_000, // 1050万円（粗売上）
  totalCustomers: 5_000, // 5000人
  totalConsumable: 100_000, // 10万円（消耗品）
  averageMarkupRate: 0.3, // 値入率30%
  budget: 12_000_000, // 1200万円予算
  elapsedDays: 20,
  salesDays: 30,
}

const ZERO_DELTAS: SensitivityDeltas = {
  discountRateDelta: 0,
  customersDelta: 0,
  transactionValueDelta: 0,
  costRateDelta: 0,
}

describe('sensitivity', () => {
  describe('calculateSensitivity', () => {
    it('変動ゼロの場合、ベースラインと同じ値を返す', () => {
      const result = calculateSensitivity(BASE, ZERO_DELTAS)

      expect(result.grossProfitDelta).toBeCloseTo(0, 0)
      expect(result.salesDelta).toBeCloseTo(0, 0)
      expect(result.projectedSalesDelta).toBeCloseTo(0, 0)
      expect(result.budgetAchievementDelta).toBeCloseTo(0, 4)
    })

    it('売変率1pt改善で粗利が増加する', () => {
      const result = calculateSensitivity(BASE, {
        ...ZERO_DELTAS,
        discountRateDelta: -0.01, // 1pt改善
      })

      expect(result.grossProfitDelta).toBeGreaterThan(0)
      // 売上自体は変わらない（客数×客単価は変動なし）
      expect(result.salesDelta).toBeCloseTo(0, 0)
    })

    it('客数10%増で売上・粗利が増加する', () => {
      const result = calculateSensitivity(BASE, {
        ...ZERO_DELTAS,
        customersDelta: 0.10, // 10%増
      })

      expect(result.salesDelta).toBeGreaterThan(0)
      expect(result.grossProfitDelta).toBeGreaterThan(0)
      // 売上は約10%増
      expect(result.simulatedSales).toBeCloseTo(BASE.totalSales * 1.1, -3)
    })

    it('客単価5%増で売上・粗利が増加する', () => {
      const result = calculateSensitivity(BASE, {
        ...ZERO_DELTAS,
        transactionValueDelta: 0.05, // 5%増
      })

      expect(result.salesDelta).toBeGreaterThan(0)
      expect(result.grossProfitDelta).toBeGreaterThan(0)
    })

    it('原価率1pt悪化で粗利が減少する', () => {
      const result = calculateSensitivity(BASE, {
        ...ZERO_DELTAS,
        costRateDelta: 0.01, // 1pt悪化
      })

      expect(result.grossProfitDelta).toBeLessThan(0)
      // 売上は変わらない
      expect(result.salesDelta).toBeCloseTo(0, 0)
    })

    it('複数パラメータの同時変動で相互作用がある', () => {
      // 客数+10%, 客単価+5% → 売上は約 +15.5%（乗算効果）
      const result = calculateSensitivity(BASE, {
        ...ZERO_DELTAS,
        customersDelta: 0.10,
        transactionValueDelta: 0.05,
      })

      const expectedSales = BASE.totalSales * 1.10 * 1.05
      expect(result.simulatedSales).toBeCloseTo(expectedSales, -2)
    })

    it('着地予測が日平均×営業日数で算出される', () => {
      const result = calculateSensitivity(BASE, {
        ...ZERO_DELTAS,
        customersDelta: 0.20, // 20%増
      })

      const simSales = BASE.totalSales * 1.20
      const simDailyAvg = simSales / BASE.elapsedDays
      const expectedProjected = simDailyAvg * BASE.salesDays
      expect(result.simulatedProjectedSales).toBeCloseTo(expectedProjected, -2)
    })

    it('売上ゼロのベースでゼロ除算にならない', () => {
      const zeroBase: SensitivityBase = {
        ...BASE,
        totalSales: 0,
        totalCost: 0,
        totalDiscount: 0,
        grossSales: 0,
        totalCustomers: 0,
        totalConsumable: 0,
        elapsedDays: 0,
      }
      const result = calculateSensitivity(zeroBase, {
        ...ZERO_DELTAS,
        customersDelta: 0.10,
      })

      expect(isFinite(result.simulatedGrossProfit)).toBe(true)
      expect(isFinite(result.simulatedSales)).toBe(true)
      expect(isNaN(result.simulatedGrossProfit)).toBe(false)
    })

    it('予算ゼロでもbudgetAchievementDeltaがNaNにならない', () => {
      const zeroBudget: SensitivityBase = { ...BASE, budget: 0 }
      const result = calculateSensitivity(zeroBudget, {
        ...ZERO_DELTAS,
        customersDelta: 0.10,
      })

      expect(isFinite(result.budgetAchievementDelta)).toBe(true)
    })
  })

  describe('calculateElasticity', () => {
    it('全弾性値がfiniteである', () => {
      const e = calculateElasticity(BASE)

      expect(isFinite(e.discountRateElasticity)).toBe(true)
      expect(isFinite(e.customersElasticity)).toBe(true)
      expect(isFinite(e.transactionValueElasticity)).toBe(true)
      expect(isFinite(e.costRateElasticity)).toBe(true)
    })

    it('売変率改善は正の弾性値を持つ', () => {
      const e = calculateElasticity(BASE)
      // 売変率1pt「改善」→ 粗利増 → 正値
      expect(e.discountRateElasticity).toBeGreaterThan(0)
    })

    it('客数増加は正の弾性値を持つ', () => {
      const e = calculateElasticity(BASE)
      expect(e.customersElasticity).toBeGreaterThan(0)
    })

    it('客単価増加は正の弾性値を持つ', () => {
      const e = calculateElasticity(BASE)
      expect(e.transactionValueElasticity).toBeGreaterThan(0)
    })

    it('原価率改善は正の弾性値を持つ', () => {
      const e = calculateElasticity(BASE)
      expect(e.costRateElasticity).toBeGreaterThan(0)
    })

    it('売上ゼロでもNaNにならない', () => {
      const zeroBase: SensitivityBase = {
        ...BASE,
        totalSales: 0,
        totalCost: 0,
        totalDiscount: 0,
        grossSales: 0,
        totalCustomers: 0,
        totalConsumable: 0,
      }
      const e = calculateElasticity(zeroBase)
      expect(isFinite(e.discountRateElasticity)).toBe(true)
      expect(isFinite(e.customersElasticity)).toBe(true)
    })
  })

  describe('extractSensitivityBase', () => {
    it('StoreResult風オブジェクトから正しく抽出する', () => {
      const mockResult = {
        totalSales: 10_000_000,
        totalCost: 7_000_000,
        totalDiscount: 500_000,
        grossSales: 10_500_000,
        totalCustomers: 5_000,
        totalConsumable: 100_000,
        averageMarkupRate: 0.3,
        budget: 12_000_000,
        elapsedDays: 20,
        salesDays: 30,
        // extra fields (should be ignored)
        storeId: 'test',
        daily: new Map(),
      }

      const base = extractSensitivityBase(mockResult)
      expect(base.totalSales).toBe(10_000_000)
      expect(base.budget).toBe(12_000_000)
      expect(base.elapsedDays).toBe(20)
    })
  })
})
