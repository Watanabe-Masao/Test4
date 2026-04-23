/**
 * periodSummary 単体テスト
 *
 * - 含まれる日の予算・前年・実績の合算
 * - currentDay を越える日は actualSum に加算しない
 * - 0 除算時は比率が null
 */
import { describe, it, expect } from 'vitest'
import { computePeriodSummary } from '../periodSummary'
import type { SimulatorScenario } from '@/domain/calculations/budgetSimulator'

function makeScenario(): SimulatorScenario {
  return {
    year: 2026,
    month: 4,
    daysInMonth: 30,
    monthlyBudget: 3_000_000,
    lyMonthly: 2_000_000,
    dailyBudget: Array.from({ length: 30 }, () => 100_000),
    lyDaily: Array.from({ length: 30 }, () => 80_000),
    actualDaily: Array.from({ length: 30 }, (_, i) => (i < 10 ? 120_000 : 0)),
    lyCoverageDay: null,
  }
}

describe('computePeriodSummary', () => {
  it('全日指定で合計を正しく返す (currentDay=10)', () => {
    const s = makeScenario()
    const days = Array.from({ length: 30 }, (_, i) => i + 1)
    const r = computePeriodSummary(days, s, 10)
    expect(r.dayCount).toBe(30)
    expect(r.elapsedDays).toBe(10)
    expect(r.budgetSum).toBe(3_000_000)
    expect(r.lySum).toBe(2_400_000)
    expect(r.actualSum).toBe(1_200_000) // 10 × 120,000
    expect(r.hasActual).toBe(true)
  })

  it('未経過範囲のみ (currentDay=10, days=[11..20]) → actualSum = 0 / hasActual=false', () => {
    const s = makeScenario()
    const days = Array.from({ length: 10 }, (_, i) => i + 11)
    const r = computePeriodSummary(days, s, 10)
    expect(r.actualSum).toBe(0)
    expect(r.elapsedDays).toBe(0)
    expect(r.hasActual).toBe(false)
    expect(r.achievementRate).toBe(0) // actual=0, budget=1M → 0
    expect(r.yoyRatio).toBe(0) // actual=0, ly=800k → 0
  })

  it('lySum = 0 なら yoy 系は null', () => {
    const s: SimulatorScenario = { ...makeScenario(), lyDaily: Array(30).fill(0) }
    const days = [1, 2, 3]
    const r = computePeriodSummary(days, s, 30)
    expect(r.yoyRatio).toBeNull()
    expect(r.budgetYoyRatio).toBeNull()
  })

  it('budgetSum = 0 なら achievementRate は null', () => {
    const s: SimulatorScenario = { ...makeScenario(), dailyBudget: Array(30).fill(0) }
    const days = [1, 2, 3]
    const r = computePeriodSummary(days, s, 30)
    expect(r.achievementRate).toBeNull()
  })

  it('差額は符号付きで返る', () => {
    const s = makeScenario()
    const days = [1, 2, 3] // 予算 300k / 実績 360k
    const r = computePeriodSummary(days, s, 30)
    expect(r.actualMinusBudget).toBe(60_000)
    expect(r.budgetMinusLy).toBe(60_000) // 300k - 240k
  })
})
