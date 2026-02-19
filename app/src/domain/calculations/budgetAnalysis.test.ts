import { describe, it, expect } from 'vitest'
import { calculateBudgetAnalysis } from './budgetAnalysis'

function makeUniformBudget(totalBudget: number, days: number): ReadonlyMap<number, number> {
  const daily = totalBudget / days
  const map = new Map<number, number>()
  for (let d = 1; d <= days; d++) {
    map.set(d, daily)
  }
  return map
}

describe('calculateBudgetAnalysis', () => {
  it('基本的な予算分析', () => {
    const budgetDaily = makeUniformBudget(6_000_000, 28)
    const salesDaily = new Map<number, number>()
    for (let d = 1; d <= 14; d++) {
      salesDaily.set(d, 250_000) // 14日 × 250,000 = 3,500,000
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
      budgetDaily: new Map(),
      salesDaily: new Map([[1, 1_000_000]]),
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
      salesDaily: new Map(),
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
    const budgetDaily = new Map<number, number>([
      [1, 100_000],
      [2, 200_000],
      [3, 300_000],
    ])
    const salesDaily = new Map<number, number>([
      [1, 150_000],
      [2, 250_000],
    ])

    const result = calculateBudgetAnalysis({
      totalSales: 400_000,
      budget: 600_000,
      budgetDaily,
      salesDaily,
      elapsedDays: 2,
      salesDays: 2,
      daysInMonth: 3,
    })

    expect(result.dailyCumulative.get(1)).toEqual({ sales: 150_000, budget: 100_000 })
    expect(result.dailyCumulative.get(2)).toEqual({ sales: 400_000, budget: 300_000 })
    expect(result.dailyCumulative.get(3)).toEqual({ sales: 400_000, budget: 600_000 })
  })

  it('予算消化率の計算', () => {
    const budgetDaily = new Map<number, number>([
      [1, 200_000],
      [2, 200_000],
      [3, 200_000],
    ])

    const result = calculateBudgetAnalysis({
      totalSales: 500_000,
      budget: 600_000,
      budgetDaily,
      salesDaily: new Map([
        [1, 200_000],
        [2, 300_000],
      ]),
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

  it('営業日0の場合の日平均', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 0,
      budget: 1_000_000,
      budgetDaily: new Map(),
      salesDaily: new Map(),
      elapsedDays: 5,
      salesDays: 0,
      daysInMonth: 30,
    })
    expect(result.averageDailySales).toBe(0)
  })

  it('月の最終日まで到達したケース', () => {
    const result = calculateBudgetAnalysis({
      totalSales: 7_500_000,
      budget: 6_000_000,
      budgetDaily: makeUniformBudget(6_000_000, 31),
      salesDaily: new Map(Array.from({ length: 31 }, (_, i) => [i + 1, 241_935])),
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
      salesDaily: new Map([[1, 1_000_000]]),
      elapsedDays: 15,
      salesDays: 1,
      daysInMonth: 30,
    })
    // 日平均 = 1,000,000 (1営業日)
    // 予測 = 1,000,000 + 1,000,000 × 15 = 16,000,000
    expect(result.projectedSales).toBe(16_000_000)
  })
})
