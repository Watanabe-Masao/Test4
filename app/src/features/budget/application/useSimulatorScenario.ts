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
  const { result, prevYear, year, month } = input

  return useMemo<SimulatorScenario>(() => {
    const daysInMonth = new Date(year, month, 0).getDate()

    const dailyBudget = new Array<number>(daysInMonth)
    const lyDaily = new Array<number>(daysInMonth)
    const actualDaily = new Array<number>(daysInMonth)

    let lyMonthly = 0
    for (let i = 0; i < daysInMonth; i++) {
      const day = i + 1
      dailyBudget[i] = result.budgetDaily.get(day) ?? 0
      const ly = getPrevYearDailySales(prevYear, year, month, day)
      lyDaily[i] = ly
      lyMonthly += ly
      actualDaily[i] = result.daily.get(day)?.sales ?? 0
    }

    return {
      year,
      month,
      daysInMonth,
      monthlyBudget: result.budget,
      lyMonthly,
      dailyBudget,
      lyDaily,
      actualDaily,
    }
  }, [result, prevYear, year, month])
}
