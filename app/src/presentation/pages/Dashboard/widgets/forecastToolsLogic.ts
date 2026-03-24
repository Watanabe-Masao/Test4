import {
  calculateAchievementRate,
  calculateYoYRatio,
  calculateGrossProfitRate,
  getEffectiveGrossProfitRate,
} from '@/domain/calculations/utils'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData } from '@/application/hooks/analytics'
import type { ObservationStatus } from '@/domain/models/analysis'

// ─── Derived context from WidgetContext ─────────────────

export interface ForecastBaseValues {
  readonly actualSales: number
  readonly actualGP: number
  readonly actualGPRate: number
  readonly remainingBudget: number
  readonly hasBudget: boolean
  readonly hasRemainingBudget: boolean
  readonly budget: number
  readonly hasPrevYear: boolean
  readonly prevYearTotalSales: number
  readonly defaultSalesLanding: number
  readonly defaultRemainGPRate: number
  readonly defaultTargetGPRate: number
}

export function deriveBaseValues(r: StoreResult, prevYear: PrevYearData): ForecastBaseValues {
  const actualSales = r.totalSales
  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = getEffectiveGrossProfitRate(r)
  const remainingBudget = r.remainingBudget
  const hasBudget = r.budget > 0
  const hasRemainingBudget = remainingBudget > 0
  const hasPrevYear = prevYear.hasPrevYear && prevYear.totalSales > 0
  const prevYearTotalSales = prevYear.totalSales

  return {
    actualSales,
    actualGP,
    actualGPRate,
    remainingBudget,
    hasBudget,
    hasRemainingBudget,
    budget: r.budget,
    hasPrevYear,
    prevYearTotalSales,
    defaultSalesLanding: Math.round(r.projectedSales),
    defaultRemainGPRate: actualGPRate,
    defaultTargetGPRate: r.grossProfitRateBudget,
  }
}

// ─── Slider ranges ──────────────────────────────────────

export interface SliderRange {
  readonly min: number
  readonly max: number
  readonly step: number
}

export function salesSliderRange(actualSales: number, defaultLanding: number): SliderRange {
  const min = Math.round(actualSales)
  const max = Math.round(defaultLanding * 1.5)
  const step = Math.round((max - min) / 100) || 1000
  return { min, max, step }
}

export function goalSalesSliderRange(actualSales: number, defaultTarget: number): SliderRange {
  const min = Math.round(actualSales)
  const max = Math.round(defaultTarget * 1.5)
  const step = Math.round((max - min) / 100) || 1000
  return { min, max, step }
}

// ─── Tool 1: Landing simulation ─────────────────────────

export interface Tool1Results {
  readonly tool1Valid: boolean
  readonly remainingSales1: number
  readonly remainingGP1: number
  readonly totalGP1: number
  readonly landingGPRate1: number
  readonly salesDiff: number
  readonly gpRateDiff: number
  readonly tool1RemainingBudgetRate: number
  readonly tool1BudgetAchievement: number
  readonly tool1YoyRate: number
}

export function computeTool1(
  salesLanding: number,
  remainGPRateDecimal: number,
  base: ForecastBaseValues,
): Tool1Results {
  const tool1Valid = salesLanding > 0 && remainGPRateDecimal > 0
  const remainingSales1 = salesLanding - base.actualSales
  const remainingGP1 = remainingSales1 * remainGPRateDecimal
  const totalGP1 = base.actualGP + remainingGP1
  const landingGPRate1 = calculateGrossProfitRate(totalGP1, salesLanding)
  const salesDiff = salesLanding - base.defaultSalesLanding
  const gpRateDiff = remainGPRateDecimal - base.defaultRemainGPRate

  return {
    tool1Valid,
    remainingSales1,
    remainingGP1,
    totalGP1,
    landingGPRate1,
    salesDiff,
    gpRateDiff,
    tool1RemainingBudgetRate: calculateAchievementRate(remainingSales1, base.remainingBudget),
    tool1BudgetAchievement: calculateAchievementRate(salesLanding, base.budget),
    tool1YoyRate: calculateYoYRatio(salesLanding, base.prevYearTotalSales),
  }
}

// ─── Tool 2: Goal seek ──────────────────────────────────

export interface Tool2Results {
  readonly tool2Valid: boolean
  readonly targetTotalSales2: number
  readonly targetTotalGP2: number
  readonly requiredRemainingGP2: number
  readonly remainingSales2: number
  readonly requiredRemainingGPRate2: number
  readonly goalDiff: number
  readonly goalSalesDiff: number
  readonly salesBudget: number
  readonly projectedTotalSales2: number
  readonly projectedSalesAchievement: number
  readonly targetSalesAchievement: number
  readonly gpBudget: number
  readonly projectedTotalGP2: number
  readonly projectedGPAchievement: number
  readonly targetGPAchievement: number
  readonly tool2RemainingBudgetRate: number
  readonly tool2YoyRate: number
}

export function computeTool2(
  targetMonthlySales: number,
  targetGPRateDecimal: number,
  defaultTargetMonthlySales: number,
  r: StoreResult,
  base: ForecastBaseValues,
): Tool2Results {
  const tool2Valid = targetGPRateDecimal > 0
  const targetTotalSales2 = targetMonthlySales
  const targetTotalGP2 = targetGPRateDecimal * targetTotalSales2
  const requiredRemainingGP2 = targetTotalGP2 - base.actualGP
  const remainingSales2 = targetTotalSales2 - base.actualSales
  const requiredRemainingGPRate2 = calculateGrossProfitRate(requiredRemainingGP2, remainingSales2)
  const goalDiff = targetGPRateDecimal - base.defaultTargetGPRate
  const goalSalesDiff = targetMonthlySales - defaultTargetMonthlySales

  const salesBudget = r.budget
  const projectedTotalSales2 = r.projectedSales
  const projectedSalesAchievement = calculateAchievementRate(projectedTotalSales2, salesBudget)
  const targetSalesAchievement = calculateAchievementRate(targetTotalSales2, salesBudget)

  const gpBudget = r.grossProfitBudget
  const projectedTotalGP2 =
    base.actualGP + (remainingSales2 > 0 ? remainingSales2 * base.actualGPRate : 0)
  const projectedGPAchievement = calculateAchievementRate(projectedTotalGP2, gpBudget)
  const targetGPAchievement = calculateAchievementRate(targetTotalGP2, gpBudget)

  return {
    tool2Valid,
    targetTotalSales2,
    targetTotalGP2,
    requiredRemainingGP2,
    remainingSales2,
    requiredRemainingGPRate2,
    goalDiff,
    goalSalesDiff,
    salesBudget,
    projectedTotalSales2,
    projectedSalesAchievement,
    targetSalesAchievement,
    gpBudget,
    projectedTotalGP2,
    projectedGPAchievement,
    targetGPAchievement,
    tool2RemainingBudgetRate: calculateAchievementRate(remainingSales2, base.remainingBudget),
    tool2YoyRate: calculateYoYRatio(targetTotalSales2, base.prevYearTotalSales),
  }
}

// ─── Observation warning ────────────────────────────────

export function getObsWarning(obsStatus: ObservationStatus): string | null {
  if (obsStatus === 'partial') {
    return '観測日数が少ないため、シミュレーションの初期値（日販ベース着地予測）の精度が低下しています'
  }
  if (obsStatus === 'invalid' || obsStatus === 'undefined') {
    return '観測期間が不十分なため、シミュレーションの初期値は参考値です'
  }
  return null
}

// ─── Percent step helpers ───────────────────────────────

export function stepPercent(current: number, delta: number, min: number, max: number): number {
  const next = Math.round((current + delta) * 10) / 10
  return Math.max(min, Math.min(max, next))
}
