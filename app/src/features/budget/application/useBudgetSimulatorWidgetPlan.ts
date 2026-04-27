/**
 * useBudgetSimulatorWidgetPlan — widget の取得経路 orchestrator
 *
 * reboot plan Phase E の唯一の取得経路差し替え点。
 *
 * 責務:
 *   1. `UnifiedWidgetContext` → `BudgetSimulatorSource` (adapter 抽出)
 *   2. source → `SimulatorScenario` (pure builder)
 *   3. `useSimulatorState` で UI state を初期化
 *   4. `buildSimulatorWidgetVm` で view 描画用の vm を導出
 *
 * drill (UI 開閉) state は view ローカルの責務なので widget 側に保持する。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { RenderUnifiedWidgetContext } from '@/presentation/components/widgets'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import { buildSimulatorWidgetVm, type SimulatorWidgetVm } from '../ui/BudgetSimulatorWidget.vm'
import { buildBudgetSimulatorSource } from './buildBudgetSimulatorSource'
import { buildBudgetSimulatorScenario } from './buildBudgetSimulatorScenario'
import { useSimulatorState, type SimulatorStateApi } from './useSimulatorState'

export interface BudgetSimulatorWidgetPlan {
  readonly scenario: SimulatorScenario
  readonly state: SimulatorStateApi
  readonly vm: SimulatorWidgetVm
  readonly fmtCurrency: CurrencyFormatter
}

export function useBudgetSimulatorWidgetPlan(
  ctx: RenderUnifiedWidgetContext,
): BudgetSimulatorWidgetPlan {
  const source = useMemo(() => buildBudgetSimulatorSource(ctx), [ctx])
  const scenario = useMemo(() => buildBudgetSimulatorScenario(source), [source])
  const state = useSimulatorState(source.result.elapsedDays || 1, scenario.daysInMonth)
  const vm = useMemo(() => buildSimulatorWidgetVm({ scenario, state }), [scenario, state])

  return {
    scenario,
    state,
    vm,
    fmtCurrency: ctx.fmtCurrency,
  }
}
