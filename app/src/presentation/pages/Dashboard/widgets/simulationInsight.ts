/**
 * simulationInsight — シミュレーション結果の判定ロジック
 *
 * 既存の forecastToolsLogic の派生値に対して閾値判定のみ行う。
 * 新しい計算はしない。
 *
 * @responsibility R:unclassified
 */
import { formatPercent, formatPointDiff } from '@/domain/formatting'

export type InsightLevel = 'positive' | 'caution' | 'negative'

export interface InsightResult {
  readonly level: InsightLevel
  readonly message: string
}

/**
 * 着地見込みシミュレーションの判定
 */
export function getTool1Insight(params: {
  readonly tool1BudgetAchievement: number
  readonly landingGPRate1: number
  readonly actualGPRate: number
  readonly tool1YoyRate: number
  readonly hasBudget: boolean
  readonly hasPrevYear: boolean
}): InsightResult {
  const { tool1BudgetAchievement, landingGPRate1, actualGPRate, tool1YoyRate, hasBudget } = params

  if (!hasBudget) {
    // 予算なし → 前年比で判定
    if (tool1YoyRate >= 1.0) {
      return {
        level: 'positive',
        message: `前年超え見込み（前年比 ${formatPercent(tool1YoyRate)}）`,
      }
    }
    if (tool1YoyRate >= 0.95) {
      return {
        level: 'caution',
        message: `前年とほぼ同水準（前年比 ${formatPercent(tool1YoyRate)}）`,
      }
    }
    return { level: 'negative', message: `前年割れ見込み（前年比 ${formatPercent(tool1YoyRate)}）` }
  }

  // 予算あり → 達成率 + 粗利率で判定
  if (tool1BudgetAchievement >= 1.0 && landingGPRate1 >= actualGPRate) {
    return {
      level: 'positive',
      message: `達成圏内。売上・粗利率ともに現状条件で到達可能です`,
    }
  }
  if (tool1BudgetAchievement >= 1.0 && landingGPRate1 < actualGPRate) {
    return {
      level: 'caution',
      message: `売上は達成見込みですが、粗利率が低下傾向です（${formatPercent(landingGPRate1)}）`,
    }
  }
  if (tool1BudgetAchievement >= 0.9) {
    return {
      level: 'caution',
      message: `あと一歩。達成率 ${formatPercent(tool1BudgetAchievement)} で予算に近いです`,
    }
  }
  return {
    level: 'negative',
    message: `予算未達見込み（達成率 ${formatPercent(tool1BudgetAchievement)}）`,
  }
}

/**
 * ゴールシーク（必要粗利率逆算）の判定
 */
export function getTool2Insight(params: {
  readonly requiredRemainingGPRate2: number
  readonly actualGPRate: number
}): InsightResult {
  const { requiredRemainingGPRate2, actualGPRate } = params
  const diff = requiredRemainingGPRate2 - actualGPRate

  if (requiredRemainingGPRate2 <= actualGPRate) {
    return {
      level: 'positive',
      message: `現在の粗利率で目標達成可能です`,
    }
  }
  if (requiredRemainingGPRate2 <= actualGPRate * 1.05) {
    return {
      level: 'caution',
      message: `粗利率を少し改善すれば目標達成可能（必要改善 ${formatPointDiff(diff)}）`,
    }
  }
  return {
    level: 'negative',
    message: `目標達成には粗利率の大幅改善が必要（必要改善 ${formatPointDiff(diff)}）`,
  }
}

/**
 * SensitivityDashboard の判定
 */
export function getSensitivityInsight(params: {
  readonly grossProfitDelta: number
  readonly budgetAchievementDelta: number
}): InsightResult {
  const { grossProfitDelta, budgetAchievementDelta } = params

  if (grossProfitDelta > 0 && budgetAchievementDelta >= 0) {
    return { level: 'positive', message: '粗利・達成率ともに改善方向です' }
  }
  if (grossProfitDelta === 0 && budgetAchievementDelta === 0) {
    return { level: 'caution', message: 'パラメータを変更してシミュレーションしてください' }
  }
  if (grossProfitDelta < 0 && budgetAchievementDelta < 0) {
    return { level: 'negative', message: '粗利・達成率ともに悪化する条件です' }
  }
  return { level: 'caution', message: '改善と悪化が混在する条件です' }
}
