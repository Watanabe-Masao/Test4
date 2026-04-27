/**
 * features/sales/domain — 売上指標の純粋計算関数
 *
 * 縦スライスの domain 層。フレームワーク非依存。
 * 既存 domain/calculations/ の売上関連計算を段階的にここに集約する。
 *
 * @guard A2 Domain は純粋
 *
 * @responsibility R:unclassified
 */
import {
  safeDivide,
  calculateAchievementRate,
  calculateGrowthRate,
} from '@/domain/calculations/utils'

/** 日別達成率を計算する（正本関数 calculateAchievementRate に委譲） */
export function computeDailyAchievementRate(actual: number, budget: number): number {
  return calculateAchievementRate(actual, budget)
}

/** 予算消化ペースを計算する（elapsed / total に対する actual / budget の比） */
export function computeBudgetPace(
  actualCum: number,
  budgetTotal: number,
  elapsedDays: number,
  totalDays: number,
): number {
  if (budgetTotal <= 0 || totalDays <= 0) return 0
  const expectedRatio = elapsedDays / totalDays
  const actualRatio = actualCum / budgetTotal
  return safeDivide(actualRatio, expectedRatio, 0)
}

/** 前年成長率を計算する（正本関数 calculateGrowthRate に委譲） */
export function computeYoYGrowthRate(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return calculateGrowthRate(current, previous)
}
