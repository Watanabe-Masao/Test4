/**
 * features/budget — 予算分析スライス
 */
export {
  BudgetTabContent,
  GrossProfitTabContent,
  BudgetSimulatorWidget,
  BudgetSimulatorView,
  type BudgetSimulatorViewProps,
} from './ui'
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
  computePeriodSummary,
  type BudgetChartDataPoint,
  type SimulatorState,
  type SimulatorStateApi,
  type BudgetSimulatorSource,
  type BudgetSimulatorWidgetPlan,
  type PeriodSummary,
} from './application'
