/**
 * 予算達成シミュレーター — Scenario 構築 hook
 *
 * StoreResult + PrevYearData + year/month から Phase 1 domain 関数の入力となる
 * SimulatorScenario を組み立てる。
 *
 * 既存の `useBudgetChartData` と同じデータソース経路を使うことで、
 * 同一 InsightPage 上で表示されるウィジェット間の整合性を保つ。
 *
 * @responsibility R:transform
 */
import { useMemo } from 'react'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData } from '@/application/comparison/comparisonTypes'
import { getPrevYearDailySales } from '@/application/comparison/comparisonAccessors'
import type { SimulatorScenario } from '@/domain/calculations/budgetSimulator'

export interface UseSimulatorScenarioInput {
  readonly result: StoreResult
  readonly prevYear: PrevYearData
  readonly year: number
  readonly month: number
  /**
   * full-month 前年売上の override (円)。
   * PrevYearData は経過日数 alignment のためキャップ済み。本 override を指定すると
   * lyMonthly を full-month 値に置換する (ConditionSummary と同じ
   * FreePeriodReadModel.comparisonSummary.totalSales を推奨)。
   */
  readonly fullMonthLyTotal?: number | null
}

/**
 * SimulatorScenario を構築する React hook。
 *
 * - dailyBudget / lyDaily / actualDaily は長さ daysInMonth の配列
 *   (0-indexed で index i = day i+1)
 * - 未経過日の actualDaily は 0 として扱う (Phase 1 schema も nonnegative を許容)
 * - prevYear.hasPrevYear === false の場合でも lyDaily は 0 埋め配列で構築する
 *   (呼び出し側が表示を分岐する責務)
 */
export function useSimulatorScenario(input: UseSimulatorScenarioInput): SimulatorScenario {
  const { result, prevYear, year, month, fullMonthLyTotal } = input

  return useMemo<SimulatorScenario>(() => {
    const daysInMonth = new Date(year, month, 0).getDate()

    const dailyBudget = new Array<number>(daysInMonth)
    const lyDaily = new Array<number>(daysInMonth)
    const actualDaily = new Array<number>(daysInMonth)

    let lyDailySum = 0
    let lastLyNonZeroDay = 0
    for (let i = 0; i < daysInMonth; i++) {
      const day = i + 1
      dailyBudget[i] = result.budgetDaily.get(day) ?? 0
      const ly = getPrevYearDailySales(prevYear, year, month, day)
      lyDaily[i] = ly
      lyDailySum += ly
      if (ly > 0) lastLyNonZeroDay = day
      actualDaily[i] = result.daily.get(day)?.sales ?? 0
    }

    // lyMonthly の決定:
    // - fullMonthLyTotal が明示指定されていればそれを使う (full month 値)
    // - なければ lyDaily の合計 (alignment 済み経過日キャップに依存)
    const lyMonthly =
      fullMonthLyTotal != null && fullMonthLyTotal > 0 ? fullMonthLyTotal : lyDailySum

    // lyCoverageDay: lyDaily の最終有効日。full month 判定は fullMonthLyTotal があるか、
    // lyDaily の最終日まで非 0 の場合 null (full coverage)。
    const hasFullMonthOverride = fullMonthLyTotal != null && fullMonthLyTotal > 0
    const lyCoverageDay: number | null = hasFullMonthOverride
      ? null
      : prevYear.hasPrevYear && lastLyNonZeroDay === daysInMonth
        ? null
        : lastLyNonZeroDay || null

    return {
      year,
      month,
      daysInMonth,
      monthlyBudget: result.budget,
      lyMonthly,
      dailyBudget,
      lyDaily,
      actualDaily,
      lyCoverageDay,
    }
  }, [result, prevYear, year, month, fullMonthLyTotal])
}
