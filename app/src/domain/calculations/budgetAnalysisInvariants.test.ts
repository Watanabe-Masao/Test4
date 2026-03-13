import { describe, it, expect } from 'vitest'
import { calculateBudgetAnalysis, calculateGrossProfitBudget } from './budgetAnalysis'
import type { BudgetAnalysisInput, GrossProfitBudgetInput } from './budgetAnalysis'

/**
 * budgetAnalysis 不変条件テスト
 *
 * WASM 移行後も TS テストで検証し続ける数学的・業務的性質。
 * cross-validation (dual-run compare) のベースラインとなる。
 */

// ── テストヘルパー ──────────────────────────────────
function makeInput(overrides: Partial<BudgetAnalysisInput> = {}): BudgetAnalysisInput {
  const budgetDaily: Record<number, number> = {}
  const salesDaily: Record<number, number> = {}
  for (let d = 1; d <= 31; d++) {
    budgetDaily[d] = 100_000
    salesDaily[d] = d <= 14 ? 120_000 : 0
  }
  return {
    totalSales: 120_000 * 14,
    budget: 3_100_000,
    budgetDaily,
    salesDaily,
    elapsedDays: 14,
    salesDays: 14,
    daysInMonth: 31,
    ...overrides,
  }
}

describe('budgetAnalysis invariants', () => {
  // ── B-INV-1: 予算合計保存 ────────────────────────
  describe('B-INV-1: remainingBudget == budget - totalSales', () => {
    it('通常ケース', () => {
      const input = makeInput()
      const result = calculateBudgetAnalysis(input)
      expect(result.remainingBudget).toBe(input.budget - input.totalSales)
    })

    it('売上 > 予算（超過）', () => {
      const input = makeInput({ totalSales: 5_000_000 })
      const result = calculateBudgetAnalysis(input)
      expect(result.remainingBudget).toBe(input.budget - input.totalSales)
      expect(result.remainingBudget).toBeLessThan(0)
    })
  })

  // ── B-INV-2: 進捗ギャップの恒等式 ──────────────────
  describe('B-INV-2: budgetProgressGap == budgetProgressRate - budgetElapsedRate', () => {
    it('通常ケース', () => {
      const result = calculateBudgetAnalysis(makeInput())
      expect(result.budgetProgressGap).toBeCloseTo(
        result.budgetProgressRate - result.budgetElapsedRate,
        10,
      )
    })

    it('ゼロ予算', () => {
      const result = calculateBudgetAnalysis(makeInput({ budget: 0 }))
      expect(result.budgetProgressGap).toBeCloseTo(
        result.budgetProgressRate - result.budgetElapsedRate,
        10,
      )
    })
  })

  // ── B-INV-3: 予算差異の恒等式 ──────────────────────
  describe('B-INV-3: budgetVariance == totalSales - cumulativeBudget', () => {
    it('通常ケース', () => {
      const input = makeInput()
      const result = calculateBudgetAnalysis(input)
      // cumulativeBudget = Σ budgetDaily[1..elapsedDays]
      let cumulativeBudget = 0
      for (let d = 1; d <= input.elapsedDays; d++) {
        cumulativeBudget += input.budgetDaily[d] ?? 0
      }
      expect(result.budgetVariance).toBe(input.totalSales - cumulativeBudget)
    })
  })

  // ── B-INV-4: 日別累計の単調非減少 ─────────────────
  describe('B-INV-4: dailyCumulative is monotonically non-decreasing', () => {
    it('売上・予算とも単調非減少', () => {
      const result = calculateBudgetAnalysis(makeInput())
      let prevSales = 0
      let prevBudget = 0
      for (let d = 1; d <= 31; d++) {
        const entry = result.dailyCumulative[d]
        expect(entry.sales).toBeGreaterThanOrEqual(prevSales)
        expect(entry.budget).toBeGreaterThanOrEqual(prevBudget)
        prevSales = entry.sales
        prevBudget = entry.budget
      }
    })
  })

  // ── B-INV-5: ゼロ除算安全性 ──────────────────────
  describe('B-INV-5: zero divisor returns 0 (safeDivide guarantee)', () => {
    it('budget = 0', () => {
      const result = calculateBudgetAnalysis(makeInput({ budget: 0 }))
      expect(result.budgetAchievementRate).toBe(0)
      expect(result.projectedAchievement).toBe(0)
      expect(Number.isFinite(result.projectedSales)).toBe(true)
    })

    it('salesDays = 0', () => {
      const result = calculateBudgetAnalysis(makeInput({ salesDays: 0, totalSales: 0 }))
      expect(result.averageDailySales).toBe(0)
      expect(Number.isFinite(result.projectedSales)).toBe(true)
    })

    it('elapsedDays = daysInMonth（月末、残日数 0）', () => {
      const result = calculateBudgetAnalysis(
        makeInput({ elapsedDays: 31, salesDays: 31, totalSales: 3_100_000 }),
      )
      expect(result.requiredDailySales).toBe(0)
    })
  })

  // ── B-INV-6: 欠損 budget key ─────────────────────
  describe('B-INV-6: missing budget keys treated as 0', () => {
    it('歯抜け budgetDaily', () => {
      const budgetDaily: Record<number, number> = { 1: 100_000, 15: 200_000 }
      const result = calculateBudgetAnalysis(
        makeInput({ budgetDaily, budget: 300_000, elapsedDays: 20 }),
      )
      // 経過日の累計予算 = 100_000 (day 1) + 200_000 (day 15) = 300_000
      expect(Number.isFinite(result.budgetElapsedRate)).toBe(true)
      expect(Number.isFinite(result.budgetProgressRate)).toBe(true)
    })

    it('空 budgetDaily', () => {
      const result = calculateBudgetAnalysis(makeInput({ budgetDaily: {} }))
      expect(result.budgetElapsedRate).toBe(0) // 0/budget = 0 via safeDivide
      expect(Number.isFinite(result.budgetVariance)).toBe(true)
    })
  })

  // ── B-INV-7: 極端値でも finite ──────────────────
  describe('B-INV-7: extreme values produce finite results', () => {
    it('大数値（10億売上）', () => {
      const result = calculateBudgetAnalysis(
        makeInput({ totalSales: 10_000_000_000, budget: 12_000_000_000 }),
      )
      expect(Number.isFinite(result.budgetAchievementRate)).toBe(true)
      expect(Number.isFinite(result.projectedSales)).toBe(true)
      expect(Number.isFinite(result.projectedAchievement)).toBe(true)
      expect(Number.isFinite(result.requiredDailySales)).toBe(true)
    })

    it('微小値（1円売上）', () => {
      const result = calculateBudgetAnalysis(makeInput({ totalSales: 1, budget: 1 }))
      expect(Number.isFinite(result.budgetAchievementRate)).toBe(true)
      expect(Number.isFinite(result.projectedSales)).toBe(true)
    })
  })

  // ── B-INV-8: 達成率の整合性 ────────────────────
  describe('B-INV-8: achievement rate consistency', () => {
    it('budgetAchievementRate == totalSales / budget', () => {
      const input = makeInput()
      const result = calculateBudgetAnalysis(input)
      expect(result.budgetAchievementRate).toBeCloseTo(input.totalSales / input.budget, 10)
    })

    it('projectedAchievement == projectedSales / budget', () => {
      const input = makeInput()
      const result = calculateBudgetAnalysis(input)
      expect(result.projectedAchievement).toBeCloseTo(result.projectedSales / input.budget, 10)
    })
  })

  // ── 粗利予算の不変条件 ────────────────────────
  describe('GrossProfitBudget invariants', () => {
    function makeGPInput(overrides: Partial<GrossProfitBudgetInput> = {}): GrossProfitBudgetInput {
      return {
        grossProfit: 500_000,
        grossProfitBudget: 1_000_000,
        budgetElapsedRate: 0.45,
        elapsedDays: 14,
        salesDays: 14,
        daysInMonth: 31,
        ...overrides,
      }
    }

    it('GP-INV-1: ゼロ予算 → 達成率 0', () => {
      const result = calculateGrossProfitBudget(makeGPInput({ grossProfitBudget: 0 }))
      expect(result.projectedGPAchievement).toBe(0)
      expect(Number.isFinite(result.grossProfitBudgetVariance)).toBe(true)
    })

    it('GP-INV-2: remainingDays == 0 → requiredDailyGrossProfit == 0', () => {
      const result = calculateGrossProfitBudget(makeGPInput({ elapsedDays: 31 }))
      expect(result.requiredDailyGrossProfit).toBe(0)
    })

    it('GP-INV-3: 全出力が finite', () => {
      const result = calculateGrossProfitBudget(makeGPInput())
      expect(Number.isFinite(result.grossProfitBudgetVariance)).toBe(true)
      expect(Number.isFinite(result.grossProfitProgressGap)).toBe(true)
      expect(Number.isFinite(result.requiredDailyGrossProfit)).toBe(true)
      expect(Number.isFinite(result.projectedGrossProfit)).toBe(true)
      expect(Number.isFinite(result.projectedGPAchievement)).toBe(true)
    })

    it('GP-INV-4: 極端値でも finite', () => {
      const result = calculateGrossProfitBudget(
        makeGPInput({
          grossProfit: 10_000_000_000,
          grossProfitBudget: 12_000_000_000,
        }),
      )
      expect(Number.isFinite(result.projectedGrossProfit)).toBe(true)
      expect(Number.isFinite(result.projectedGPAchievement)).toBe(true)
    })
  })
})
