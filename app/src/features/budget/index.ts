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
  useSimulatorState,
  useBudgetSimulatorWidgetPlan,
  buildBudgetSimulatorSource,
  buildBudgetSimulatorScenario,
  extractFullMonthLyDaily,
  type BudgetChartDataPoint,
  type SimulatorState,
  type SimulatorStateApi,
  type BudgetSimulatorSource,
  type BudgetSimulatorWidgetPlan,
} from './application'
