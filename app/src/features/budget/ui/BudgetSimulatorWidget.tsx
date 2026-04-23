/**
 * 予算達成シミュレーター Widget — entrypoint
 *
 * reboot plan Phase E 以降:
 *   widget は `useBudgetSimulatorWidgetPlan` に取得経路を委譲し、
 *   結果を `BudgetSimulatorView` に渡すだけの薄い connector に徹する。
 *   drill (UI 開閉) state だけは widget 側で保持する。
 *
 * @responsibility R:widget
 */
import { useState } from 'react'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import { useBudgetSimulatorWidgetPlan } from '../application/useBudgetSimulatorWidgetPlan'
import { BudgetSimulatorView } from './BudgetSimulatorView'
import type { DrillKey } from './BudgetSimulatorWidget.vm'

interface Props {
  readonly ctx: UnifiedWidgetContext
}

export function BudgetSimulatorWidget({ ctx }: Props) {
  const plan = useBudgetSimulatorWidgetPlan(ctx)
  const [drill, setDrill] = useState<DrillKey | null>(null)
  const toggleDrill = (key: DrillKey) => setDrill((prev) => (prev === key ? null : key))

  return (
    <BudgetSimulatorView
      scenario={plan.scenario}
      state={plan.state}
      vm={plan.vm}
      fmtCurrency={plan.fmtCurrency}
      drill={drill}
      onToggleDrill={toggleDrill}
    />
  )
}
