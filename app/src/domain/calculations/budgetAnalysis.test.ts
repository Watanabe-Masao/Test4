import { describe, it, expect } from 'vitest'
import { calculateBudgetAnalysis, prorateBudget, projectLinear } from './budgetAnalysis'

function makeUniformBudget(totalBudget: number, days: number): Readonly<Record<number, number>> {
  const daily = totalBudget / days
  const rec: Record<number, number> = {}
  for (let d = 1; d <= days; d++) {
    rec[d] = daily
  }
  return rec
}

describe('calculateBudgetAnalysis', () => {
  it('基本的な予算分析', () => {
    const budgetDaily = makeUniformBudget(6_000_000, 28)
    const salesDaily: Record<number, number> = {}
    for (let d = 1; d <= 14; d++) {
      salesDaily[d] = 250_000 // 14日 × 250,000 = 3,500,000
    }

    const result = calculateBudgetAnalysis({
      totalSales: 3_500_000,
      budget: 6_000_000,
      budgetDaily,
      salesDaily,
      elapsedDays: 14,
      salesDays: 14,
      daysInMonth: 28,
    })

    expect(result.budgetAchievementRate).toBeCloseTo(3_500_000 / 6_000_000, 6)
    // 予算経過率 = 経過14日の累計予算(3,000,000) / 全体予算(6,000,000) = 0.5
    expect(result.budgetElapsedRate).toBeCloseTo(0.5, 6)
    expect(result.averageDailySales).toBe(250_000)
    // 予測売上 = 3,500,000 + 250,000 × 14 = 7,000,000
    expect(result.projectedSales).toBe(7_000_000)
    expect(result.projectedAchievement).toBeCloseTo(7_000_000 / 6_000_000, 6)
    expect(result.remainingBudget).toBe(2_500_000)
  })

  it('予算0の場合', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 1_000_000,
      budget: 0,
      budgetDaily: {},
      salesDaily: { 1: 1_000_000 },
      elapsedDays: 1,
      salesDays: 1,
      daysInMonth: 30,
    })
    expect(result.budgetAchievementRate).toBe(0)
    expect(result.budgetElapsedRate).toBe(0)
    expect(result.projectedAchievement).toBe(0)
  })

  it('売上0の場合', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 0,
      budget: 6_000_000,
      budgetDaily: makeUniformBudget(6_000_000, 30),
      salesDaily: {},
      elapsedDays: 0,
      salesDays: 0,
      daysInMonth: 30,
    })
    expect(result.budgetAchievementRate).toBe(0)
    expect(result.averageDailySales).toBe(0)
    expect(result.projectedSales).toBe(0)
    expect(result.remainingBudget).toBe(6_000_000)
  })

  it('日別累計が正しく計算されること', () => {
    const budgetDaily: Record<number, number> = {
      1: 100_000,
      2: 200_000,
      3: 300_000,
    }
    const salesDaily: Record<number, number> = {
      1: 150_000,
      2: 250_000,
    }

    const result = calculateBudgetAnalysis({
      totalSales: 400_000,
      budget: 600_000,
      budgetDaily,
      salesDaily,
      elapsedDays: 2,
      salesDays: 2,
      daysInMonth: 3,
    })

    expect(result.dailyCumulative[1]).toEqual({ sales: 150_000, budget: 100_000 })
    expect(result.dailyCumulative[2]).toEqual({ sales: 400_000, budget: 300_000 })
    expect(result.dailyCumulative[3]).toEqual({ sales: 400_000, budget: 600_000 })
  })

  it('予算消化率の計算', () => {
    const budgetDaily: Record<number, number> = {
      1: 200_000,
      2: 200_000,
      3: 200_000,
    }

    const result = calculateBudgetAnalysis({
      totalSales: 500_000,
      budget: 600_000,
      budgetDaily,
      salesDaily: { 1: 200_000, 2: 300_000 },
      elapsedDays: 2,
      salesDays: 2,
      daysInMonth: 3,
    })

    // 経過日累計予算 = 200,000 + 200,000 = 400,000
    // 予算消化率 = 500,000 / 400,000 = 1.25
    expect(result.budgetProgressRate).toBeCloseTo(1.25, 6)
    // 予算経過率 = 400,000 / 600,000 ≈ 0.6667
    expect(result.budgetElapsedRate).toBeCloseTo(400_000 / 600_000, 6)
  })

  it('観測期間内の売上0の場合の日平均', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 0,
      budget: 1_000_000,
      budgetDaily: {},
      salesDaily: {},
      elapsedDays: 5,
      salesDays: 0,
      daysInMonth: 30,
    })
    // 日平均 = 0 / 5 = 0（観測期間ベース）
    expect(result.averageDailySales).toBe(0)
  })

  it('月の最終日まで到達したケース', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 7_500_000,
      budget: 6_000_000,
      budgetDaily: makeUniformBudget(6_000_000, 31),
      salesDaily: Object.fromEntries(Array.from({ length: 31 }, (_, i) => [i + 1, 241_935])),
      elapsedDays: 31,
      salesDays: 31,
      daysInMonth: 31,
    })
    // 残日数 = 0 → 予測売上 = 実績売上
    expect(result.projectedSales).toBe(7_500_000)
    expect(result.budgetAchievementRate).toBeCloseTo(1.25, 2)
  })

  it('大きな予算差異の検出', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 1_000_000,
      budget: 10_000_000,
      budgetDaily: makeUniformBudget(10_000_000, 30),
      salesDaily: { 1: 1_000_000 },
      elapsedDays: 15,
      salesDays: 1,
      daysInMonth: 30,
    })
    // 日平均 = 1,000,000 / 15 ≈ 66,667（観測期間ベース）
    // 予測 = 1,000,000 + 66,667 × 15 = 2,000,000
    expect(result.projectedSales).toBeCloseTo(2_000_000, 0)
  })

  // ── budgetProgressGap ─────────────────────────────
  it('budgetProgressGap: 消化率 > 経過率のとき正値（前倒し）', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 500_000,
      budget: 600_000,
      budgetDaily: { 1: 200_000, 2: 200_000, 3: 200_000 },
      salesDaily: { 1: 200_000, 2: 300_000 },
      elapsedDays: 2,
      salesDays: 2,
      daysInMonth: 3,
    })
    // 消化率 = 500,000 / 400,000 = 1.25
    // 経過率 = 400,000 / 600,000 ≈ 0.6667
    // ギャップ = 1.25 - 0.6667 ≈ 0.5833
    expect(result.budgetProgressGap).toBeCloseTo(1.25 - 400_000 / 600_000, 6)
    expect(result.budgetProgressGap).toBeGreaterThan(0)
  })

  it('budgetProgressGap: 消化率 < 経過率のとき負値（遅れ）', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 100_000,
      budget: 600_000,
      budgetDaily: { 1: 200_000, 2: 200_000, 3: 200_000 },
      salesDaily: { 1: 100_000 },
      elapsedDays: 2,
      salesDays: 1,
      daysInMonth: 3,
    })
    // 消化率 = 100,000 / 400,000 = 0.25
    // 経過率 = 400,000 / 600,000 ≈ 0.6667
    // ギャップ = 0.25 - 0.6667 ≈ -0.4167
    expect(result.budgetProgressGap).toBeLessThan(0)
  })

  // ── budgetVariance ────────────────────────────────
  it('budgetVariance: 実績 − 累計予算に一致', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 500_000,
      budget: 600_000,
      budgetDaily: { 1: 200_000, 2: 200_000, 3: 200_000 },
      salesDaily: { 1: 200_000, 2: 300_000 },
      elapsedDays: 2,
      salesDays: 2,
      daysInMonth: 3,
    })
    // 累計予算 = 200,000 + 200,000 = 400,000
    // 差異 = 500,000 - 400,000 = 100,000
    expect(result.budgetVariance).toBe(100_000)
  })

  // ── requiredDailySales ────────────────────────────
  it('requiredDailySales: 残余予算 / 残日数', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 3_500_000,
      budget: 6_000_000,
      budgetDaily: makeUniformBudget(6_000_000, 28),
      salesDaily: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [i + 1, 250_000])),
      elapsedDays: 14,
      salesDays: 14,
      daysInMonth: 28,
    })
    // 残余予算 = 6,000,000 - 3,500,000 = 2,500,000
    // 残日数 = 28 - 14 = 14
    // 必要日次売上 ≈ 178,571
    expect(result.requiredDailySales).toBeCloseTo(2_500_000 / 14, 0)
  })

  it('requiredDailySales: 残日数0の場合 → 0', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 7_500_000,
      budget: 6_000_000,
      budgetDaily: makeUniformBudget(6_000_000, 31),
      salesDaily: Object.fromEntries(Array.from({ length: 31 }, (_, i) => [i + 1, 241_935])),
      elapsedDays: 31,
      salesDays: 31,
      daysInMonth: 31,
    })
    expect(result.requiredDailySales).toBe(0)
  })
})

// ── prorateBudget 不変条件 ──

describe('prorateBudget 不変条件', () => {
  it('均等配分で半月経過 → monthlyTotal の 50%', () => {
    const budgetDaily: Record<number, number> = {}
    for (let d = 1; d <= 30; d++) budgetDaily[d] = 100_000
    // 月間予算 3,000,000、粗利予算 600,000、15日経過
    const result = prorateBudget(600_000, 3_000_000, budgetDaily, 15)
    expect(result).toBeCloseTo(300_000, 0) // 600,000 × (1,500,000 / 3,000,000)
  })

  it('不均等配分で前半に予算が偏る → 按分結果は 50% より大きい', () => {
    const budgetDaily: Record<number, number> = {}
    // 前半15日は20万、後半15日は10万
    for (let d = 1; d <= 15; d++) budgetDaily[d] = 200_000
    for (let d = 16; d <= 30; d++) budgetDaily[d] = 100_000
    const monthlyBudget = 200_000 * 15 + 100_000 * 15 // = 4,500,000
    const result = prorateBudget(900_000, monthlyBudget, budgetDaily, 15)
    // 前半15日の予算合計 = 3,000,000
    // 按分 = 900,000 × (3,000,000 / 4,500,000) = 600,000
    expect(result).toBeCloseTo(600_000, 0)
    expect(result).toBeGreaterThan(900_000 * 0.5) // 均等より大きい
  })

  it('Map でも Record でも同じ結果', () => {
    const record: Record<number, number> = { 1: 100_000, 2: 200_000, 3: 300_000 }
    const map = new Map([[1, 100_000], [2, 200_000], [3, 300_000]])
    const fromRecord = prorateBudget(500_000, 600_000, record, 2)
    const fromMap = prorateBudget(500_000, 600_000, map, 2)
    expect(fromRecord).toBeCloseTo(fromMap, 10)
  })

  it('elapsedDays=0 → 0', () => {
    expect(prorateBudget(600_000, 3_000_000, {}, 0)).toBe(0)
  })

  it('monthlyBudget=0 → 0', () => {
    expect(prorateBudget(600_000, 0, {}, 15)).toBe(0)
  })
})

// ── projectLinear 不変条件 ──

describe('projectLinear 不変条件', () => {
  it('半月経過で日平均が一定 → actual の 2倍', () => {
    // 15日で 1,500,000 → 日平均 100,000 → 残15日 → 予測 3,000,000
    expect(projectLinear(1_500_000, 15, 30)).toBeCloseTo(3_000_000, 0)
  })

  it('月末到達 → actual をそのまま返す', () => {
    expect(projectLinear(5_000_000, 31, 31)).toBe(5_000_000)
  })

  it('elapsedDays=0 → 0', () => {
    expect(projectLinear(0, 0, 30)).toBe(0)
  })

  it('calculateBudgetAnalysis の projectedSales と一致', () => {
    const budgetDaily = makeUniformBudget(6_000_000, 28)
    const salesDaily: Record<number, number> = {}
    for (let d = 1; d <= 14; d++) salesDaily[d] = 250_000

    const budgetResult = calculateBudgetAnalysis({
      totalSales: 3_500_000,
      budget: 6_000_000,
      budgetDaily,
      salesDaily,
      elapsedDays: 14,
      salesDays: 14,
      daysInMonth: 28,
    })

    const projected = projectLinear(3_500_000, 14, 28)
    expect(projected).toBeCloseTo(budgetResult.projectedSales, 0)
  })
})
