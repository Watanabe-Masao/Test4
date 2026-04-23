/**
 * DowAverageRow — 日別カレンダー最下段の「曜日平均」行
 *
 * 各曜日ごとに、月内の予算平均 / 前年平均を表示。経過分がある曜日には
 * 実績平均 + 予算達成率平均 + 前年比平均 も併記する。
 * 右端の「日平均」セルは月全体の合計平均。
 *
 * DayCalendarInput 本体からサイズ制約 (G5 ≤300 行) を外すために分離。
 *
 * @responsibility R:chart-view
 */
import { useMemo } from 'react'
import type { SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import { dowOf } from '@/domain/calculations/budgetSimulator'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import {
  DowAverageCell,
  DowAverageLabel,
  DowAverageRatio,
  DowAverageSub,
  DowAverageValue,
} from './BudgetSimulatorWidget.styles'

type Fmt = UnifiedWidgetContext['fmtCurrency']

interface DowStat {
  readonly budget: number
  readonly ly: number
  readonly actual: number
  readonly dayCount: number
  readonly elapsedCount: number
}

interface Props {
  readonly scenario: SimulatorScenario
  readonly currentDay: number
  readonly weekStart: 0 | 1
  readonly fmtCurrency: Fmt
}

export function DowAverageRow({ scenario, currentDay, weekStart, fmtCurrency }: Props) {
  const { year, month, daysInMonth, dailyBudget, lyDaily, actualDaily } = scenario

  const dowStats = useMemo<readonly DowStat[]>(() => {
    const stats: DowStat[] = Array.from({ length: 7 }, () => ({
      budget: 0,
      ly: 0,
      actual: 0,
      dayCount: 0,
      elapsedCount: 0,
    }))
    for (let d = 1; d <= daysInMonth; d++) {
      const dw = dowOf(year, month, d)
      const s = stats[dw] as {
        budget: number
        ly: number
        actual: number
        dayCount: number
        elapsedCount: number
      }
      s.budget += dailyBudget[d - 1] ?? 0
      s.ly += lyDaily[d - 1] ?? 0
      s.dayCount++
      if (d <= currentDay) {
        s.actual += actualDaily[d - 1] ?? 0
        s.elapsedCount++
      }
    }
    return stats
  }, [year, month, daysInMonth, currentDay, dailyBudget, lyDaily, actualDaily])

  const totalStats = useMemo(() => {
    let budget = 0
    let ly = 0
    let actual = 0
    let elapsed = 0
    for (let d = 1; d <= daysInMonth; d++) {
      budget += dailyBudget[d - 1] ?? 0
      ly += lyDaily[d - 1] ?? 0
      if (d <= currentDay) {
        actual += actualDaily[d - 1] ?? 0
        elapsed++
      }
    }
    return { budget, ly, actual, dayCount: daysInMonth, elapsedCount: elapsed }
  }, [daysInMonth, currentDay, dailyBudget, lyDaily, actualDaily])

  const dwOrder = weekStart === 0 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0]

  return (
    <>
      {dwOrder.map((dw) => {
        const s = dowStats[dw]
        const avgBudget = s.dayCount > 0 ? s.budget / s.dayCount : 0
        const avgLy = s.dayCount > 0 ? s.ly / s.dayCount : 0
        const avgActual = s.elapsedCount > 0 ? s.actual / s.elapsedCount : null
        const ach = avgActual != null && avgBudget > 0 ? (avgActual / avgBudget) * 100 : null
        const yoy = avgActual != null && avgLy > 0 ? (avgActual / avgLy) * 100 : null
        return (
          <DowAverageCell key={`avg-${dw}`}>
            <DowAverageLabel>
              <span>平均</span>
              <span className="cnt">{s.dayCount}日</span>
            </DowAverageLabel>
            <DowAverageValue>予算 ¥{fmtCurrency(Math.round(avgBudget))}</DowAverageValue>
            <DowAverageSub>前年 ¥{fmtCurrency(Math.round(avgLy))}</DowAverageSub>
            {avgActual != null && (
              <DowAverageSub>実績 ¥{fmtCurrency(Math.round(avgActual))}</DowAverageSub>
            )}
            {(ach != null || yoy != null) && (
              <DowAverageRatio $good={ach != null && ach >= 100} $bad={ach != null && ach < 100}>
                <span>達成 {ach != null ? `${ach.toFixed(0)}%` : '—'}</span>
                <span>前年比 {yoy != null ? `${yoy.toFixed(0)}%` : '—'}</span>
              </DowAverageRatio>
            )}
          </DowAverageCell>
        )
      })}
      <DowAverageCell>
        <DowAverageLabel>
          <span>日平均</span>
          <span className="cnt">{totalStats.dayCount}日</span>
        </DowAverageLabel>
        <DowAverageValue>
          予算 ¥{fmtCurrency(Math.round(totalStats.budget / totalStats.dayCount))}
        </DowAverageValue>
        <DowAverageSub>
          前年 ¥{fmtCurrency(Math.round(totalStats.ly / totalStats.dayCount))}
        </DowAverageSub>
        {totalStats.elapsedCount > 0 && (
          <DowAverageSub>
            実績 ¥{fmtCurrency(Math.round(totalStats.actual / totalStats.elapsedCount))}
          </DowAverageSub>
        )}
      </DowAverageCell>
    </>
  )
}
