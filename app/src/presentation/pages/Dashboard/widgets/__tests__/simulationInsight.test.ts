/**
 * simulationInsight — 判定ロジックのテスト
 *
 * 閾値判定が正しいことを検証する。
 * UIテストではなく純粋関数テスト。
 */
import { describe, it, expect } from 'vitest'
import { getTool1Insight, getTool2Insight, getSensitivityInsight } from '../simulationInsight'

describe('getTool1Insight', () => {
  const base = {
    tool1BudgetAchievement: 1.0,
    landingGPRate1: 0.25,
    actualGPRate: 0.24,
    tool1YoyRate: 1.02,
    hasBudget: true,
    hasPrevYear: true,
  }

  it('positive: 予算達成 + 粗利率改善', () => {
    const result = getTool1Insight(base)
    expect(result.level).toBe('positive')
  })

  it('caution: 予算達成だが粗利率低下', () => {
    const result = getTool1Insight({ ...base, landingGPRate1: 0.22 })
    expect(result.level).toBe('caution')
  })

  it('caution: 予算未達だが90%以上', () => {
    const result = getTool1Insight({ ...base, tool1BudgetAchievement: 0.95 })
    expect(result.level).toBe('caution')
  })

  it('negative: 予算達成率90%未満', () => {
    const result = getTool1Insight({ ...base, tool1BudgetAchievement: 0.85 })
    expect(result.level).toBe('negative')
  })

  it('予算なし + 前年超え → positive', () => {
    const result = getTool1Insight({ ...base, hasBudget: false, tool1YoyRate: 1.05 })
    expect(result.level).toBe('positive')
  })

  it('予算なし + 前年割れ → negative', () => {
    const result = getTool1Insight({ ...base, hasBudget: false, tool1YoyRate: 0.9 })
    expect(result.level).toBe('negative')
  })

  it('予算なし + ほぼ同水準 → caution', () => {
    const result = getTool1Insight({ ...base, hasBudget: false, tool1YoyRate: 0.97 })
    expect(result.level).toBe('caution')
  })
})

describe('getTool2Insight', () => {
  it('positive: 必要粗利率 <= 現在粗利率', () => {
    const result = getTool2Insight({ requiredRemainingGPRate2: 0.22, actualGPRate: 0.25 })
    expect(result.level).toBe('positive')
  })

  it('caution: 必要粗利率が現在の5%以内', () => {
    const result = getTool2Insight({ requiredRemainingGPRate2: 0.26, actualGPRate: 0.25 })
    expect(result.level).toBe('caution')
  })

  it('negative: 必要粗利率が現在の5%超', () => {
    const result = getTool2Insight({ requiredRemainingGPRate2: 0.30, actualGPRate: 0.25 })
    expect(result.level).toBe('negative')
  })
})

describe('getSensitivityInsight', () => {
  it('positive: 粗利・達成率ともに改善', () => {
    const result = getSensitivityInsight({ grossProfitDelta: 10000, budgetAchievementDelta: 0.01 })
    expect(result.level).toBe('positive')
  })

  it('negative: 粗利・達成率ともに悪化', () => {
    const result = getSensitivityInsight({
      grossProfitDelta: -10000,
      budgetAchievementDelta: -0.01,
    })
    expect(result.level).toBe('negative')
  })

  it('caution: パラメータ未変更', () => {
    const result = getSensitivityInsight({ grossProfitDelta: 0, budgetAchievementDelta: 0 })
    expect(result.level).toBe('caution')
  })

  it('caution: 改善と悪化が混在', () => {
    const result = getSensitivityInsight({
      grossProfitDelta: 10000,
      budgetAchievementDelta: -0.01,
    })
    expect(result.level).toBe('caution')
  })
})
