/**
 * features/budget — 予算分析スライス
 */
export { BudgetTabContent, GrossProfitTabContent, BudgetSimulatorWidget } from './ui'
export {
  buildBudgetTableRows,
  buildSimulatorWidgetVm,
  type BudgetTableRow,
  type SimulatorWidgetVm,
  type SimulatorWidgetRow,
  type DrillKey,
} from './ui'
export {
  useBudgetChartData,
  useSimulatorScenario,
  useSimulatorState,
  type BudgetChartDataPoint,
  type SimulatorState,
  type SimulatorStateApi,
} from './application'
