/**
 * periodSummary — 期間 (days: number[]) から集計 KPI を算出する pure 関数
 *
 * `PeriodDetailModal` の表示ロジックから集計計算を切り出し、テストと再利用を
 * しやすくする。UI / state / DOM は含まない。
 *
 * @responsibility R:calculation
 */
import type { SimulatorScenario } from '@/domain/calculations/budgetSimulator'

export interface PeriodSummary {
  /** 対象日数 (入力 days.length と一致) */
  readonly dayCount: number
  /** 対象日のうち currentDay 以下の日数 (実績が確定している日数) */
  readonly elapsedDays: number
  readonly budgetSum: number
  readonly lySum: number
  /** actualDaily を currentDay 以下に限定した合計 */
  readonly actualSum: number
  /** actualSum - budgetSum */
  readonly actualMinusBudget: number
  /** budgetSum - lySum */
  readonly budgetMinusLy: number
  /** actualSum / budgetSum (0 除算時 null) */
  readonly achievementRate: number | null
  /** actualSum / lySum (0 除算時 null) */
  readonly yoyRatio: number | null
  /** budgetSum / lySum (0 除算時 null) */
  readonly budgetYoyRatio: number | null
  /** actualSum > 0 (grayscale 判定の入力) */
  readonly hasActual: boolean
}

function sumBy(days: readonly number[], series: readonly number[]): number {
  let sum = 0
  for (const d of days) sum += series[d - 1] ?? 0
  return sum
}

export function computePeriodSummary(
  days: readonly number[],
  scenario: SimulatorScenario,
  currentDay: number,
): PeriodSummary {
  const { dailyBudget, lyDaily, actualDaily } = scenario
  const budgetSum = sumBy(days, dailyBudget)
  const lySum = sumBy(days, lyDaily)

  let actualSum = 0
  let elapsedDays = 0
  for (const d of days) {
    if (d <= currentDay) {
      actualSum += actualDaily[d - 1] ?? 0
      elapsedDays++
    }
  }

  return {
    dayCount: days.length,
    elapsedDays,
    budgetSum,
    lySum,
    actualSum,
    actualMinusBudget: actualSum - budgetSum,
    budgetMinusLy: budgetSum - lySum,
    achievementRate: budgetSum > 0 ? actualSum / budgetSum : null,
    yoyRatio: lySum > 0 ? actualSum / lySum : null,
    budgetYoyRatio: lySum > 0 ? budgetSum / lySum : null,
    hasActual: actualSum > 0,
  }
}
