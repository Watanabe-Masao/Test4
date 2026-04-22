/**
 * 予算達成シミュレーター Widget
 *
 * reboot plan Phase C 後の役割: **entrypoint のみ**。
 * `UnifiedWidgetContext` を受け取り、scenario / state / vm を組み立て、
 * 表示は `BudgetSimulatorView` に委譲する。
 *
 * - 取得経路 (PrevYearMonthlyKpi, ComparisonScope など) は Phase E で
 *   `useBudgetSimulatorWidgetPlan` に切り出す予定
 * - 現状は `useSimulatorScenario` + `useFullMonthLyDaily` + `useSimulatorState`
 *   を直接呼ぶ形で中継する
 *
 * @responsibility R:widget
 */
import { useMemo, useState } from 'react'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import { useSimulatorScenario } from '../application/useSimulatorScenario'
import { useSimulatorState } from '../application/useSimulatorState'
import { useFullMonthLyDaily } from '../application/useFullMonthLyDaily'
import { buildSimulatorWidgetVm, type DrillKey } from './BudgetSimulatorWidget.vm'
import { BudgetSimulatorView } from './BudgetSimulatorView'

interface Props {
  readonly ctx: UnifiedWidgetContext
}

export function BudgetSimulatorWidget({ ctx }: Props) {
  const { result, prevYear, year, month, fmtCurrency } = ctx

  // full-month 前年日別売上 — `prevYearMonthlyKpi.{sameDate|sameDow}.dailyMapping`
  // は elapsedDays / スライダー cap の影響を受けず、header の alignmentMode
  // (同日 / 同曜日) で選択される full-month 分を常に保持する。
  const { daily: fullMonthLyDaily, monthlyTotal: fullMonthLyTotalFromKpi } = useFullMonthLyDaily(
    ctx.prevYearMonthlyKpi,
    ctx.comparisonScope,
  )

  const fullMonthLyTotal = useMemo<number | null>(() => {
    if (fullMonthLyTotalFromKpi != null && fullMonthLyTotalFromKpi > 0) {
      return fullMonthLyTotalFromKpi
    }
    return ctx.freePeriodLane?.bundle?.fact?.comparisonSummary?.totalSales ?? null
  }, [fullMonthLyTotalFromKpi, ctx.freePeriodLane])

  const scenario = useSimulatorScenario({
    result,
    prevYear,
    year,
    month,
    fullMonthLyTotal,
    fullMonthLyDaily,
  })
  const state = useSimulatorState(result.elapsedDays || 1, scenario.daysInMonth)
  const vm = useMemo(() => buildSimulatorWidgetVm({ scenario, state }), [scenario, state])

  const [drill, setDrill] = useState<DrillKey | null>(null)
  const toggleDrill = (key: DrillKey) => setDrill((prev) => (prev === key ? null : key))

  return (
    <BudgetSimulatorView
      scenario={scenario}
      state={state}
      vm={vm}
      fmtCurrency={fmtCurrency}
      drill={drill}
      onToggleDrill={toggleDrill}
    />
  )
}
