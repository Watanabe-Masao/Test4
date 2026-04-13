/**
 * remainingBudgetRate テスト — 残予算必要達成率
 */
import { describe, it, expect } from 'vitest'
import { calculateRemainingBudgetRate, type RemainingBudgetRateInput } from '../remainingBudgetRate'

describe('calculateRemainingBudgetRate', () => {
  const makeBudgetDaily = (daily: number, daysInMonth: number): ReadonlyMap<number, number> => {
    const m = new Map<number, number>()
    for (let d = 1; d <= daysInMonth; d++) m.set(d, daily)
    return m
  }

  it('計画通りのペース → 100%', () => {
    // 30日月、日次予算 100、10日経過、残予算 2000、残期間予算 2000
    const input: RemainingBudgetRateInput = {
      budget: 3000,
      totalSales: 1000,
      budgetDaily: makeBudgetDaily(100, 30),
      elapsedDays: 10,
      daysInMonth: 30,
    }
    expect(calculateRemainingBudgetRate(input)).toBe(100)
  })

  it('進捗超過 → 100% 未満', () => {
    // 30日月、日次予算 100、10日経過、実績 1500（予算 1000 より上）
    // 残予算 1500、残期間予算 2000 → 75%
    const input: RemainingBudgetRateInput = {
      budget: 3000,
      totalSales: 1500,
      budgetDaily: makeBudgetDaily(100, 30),
      elapsedDays: 10,
      daysInMonth: 30,
    }
    expect(calculateRemainingBudgetRate(input)).toBe(75)
  })

  it('進捗不足 → 100% 超過', () => {
    // 30日月、日次予算 100、10日経過、実績 500（予算 1000 より下）
    // 残予算 2500、残期間予算 2000 → 125%
    const input: RemainingBudgetRateInput = {
      budget: 3000,
      totalSales: 500,
      budgetDaily: makeBudgetDaily(100, 30),
      elapsedDays: 10,
      daysInMonth: 30,
    }
    expect(calculateRemainingBudgetRate(input)).toBe(125)
  })

  it('残期間予算 0 → 0 を返す（0除算防止）', () => {
    // 月末到達 → 残期間なし
    const input: RemainingBudgetRateInput = {
      budget: 3000,
      totalSales: 2500,
      budgetDaily: makeBudgetDaily(100, 30),
      elapsedDays: 30,
      daysInMonth: 30,
    }
    expect(calculateRemainingBudgetRate(input)).toBe(0)
  })

  it('日別予算マップが空 → 残期間予算 0 → 0 を返す', () => {
    const input: RemainingBudgetRateInput = {
      budget: 3000,
      totalSales: 1000,
      budgetDaily: new Map(),
      elapsedDays: 10,
      daysInMonth: 30,
    }
    expect(calculateRemainingBudgetRate(input)).toBe(0)
  })

  it('達成済み（残予算マイナス）→ 負の%', () => {
    // 残予算 -500、残期間予算 2000 → -25%
    const input: RemainingBudgetRateInput = {
      budget: 3000,
      totalSales: 3500,
      budgetDaily: makeBudgetDaily(100, 30),
      elapsedDays: 10,
      daysInMonth: 30,
    }
    expect(calculateRemainingBudgetRate(input)).toBe(-25)
  })

  it('部分的な日別予算（欠損あり）は欠損日を 0 として扱う', () => {
    // 30日月、11-20 のみ予算あり（各 100）、それ以外 0
    const map = new Map<number, number>()
    for (let d = 11; d <= 20; d++) map.set(d, 100)
    const input: RemainingBudgetRateInput = {
      budget: 3000,
      totalSales: 1000,
      budgetDaily: map,
      elapsedDays: 10,
      daysInMonth: 30,
    }
    // 残予算 2000、残期間予算 = 11..30 のうち値ある日 = 11..20 の 10日 × 100 = 1000
    // 2000 / 1000 × 100 = 200
    expect(calculateRemainingBudgetRate(input)).toBe(200)
  })

  it('elapsedDays === 0 → 全期間の予算で割る', () => {
    // 30日月、日次 100、未経過、実績 0
    // 残予算 3000、残期間予算 = 1..30 = 3000 → 100%
    const input: RemainingBudgetRateInput = {
      budget: 3000,
      totalSales: 0,
      budgetDaily: makeBudgetDaily(100, 30),
      elapsedDays: 0,
      daysInMonth: 30,
    }
    expect(calculateRemainingBudgetRate(input)).toBe(100)
  })
})
