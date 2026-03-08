/**
 * 計算系フック — 要因分解・予測・在庫推定・感度分析
 */
export { useCalculation } from './useCalculation'
export {
  useDecompose2,
  useDecompose3,
  useDecompose5,
  useDecomposePriceMix,
  decompose2,
  decompose3,
  decompose5,
  decomposePriceMix,
} from './useFactorDecomposition'
export type {
  TwoFactorResult,
  ThreeFactorResult,
  FiveFactorResult,
  CategoryQtyAmt,
  PriceMixResult,
} from './useFactorDecomposition'
export { useForecast, useWeekRanges, calculateForecast, getWeekRanges } from './useForecast'
export type { ForecastInput, ForecastResult, WeeklySummary, DayOfWeekAverage } from './useForecast'
export {
  useEstimatedInventory,
  useEstimatedInventoryDetails,
  computeEstimatedInventory,
  computeEstimatedInventoryDetails,
} from './useInventoryEstimation'
export type { InventoryPoint, InventoryDetailRow } from './useInventoryEstimation'
export { useSensitivityBase, useSensitivityAnalysis, useElasticity } from './useSensitivity'
export type {
  SensitivityBase,
  SensitivityDeltas,
  SensitivityResult,
  ElasticityResult,
} from './useSensitivity'
export { useBudgetChartData } from './useBudgetChartData'
export type { BudgetChartDataPoint } from './useBudgetChartData'
export { usePinIntervals, calculatePinIntervals } from './usePinIntervals'
export type { PinInterval } from './usePinIntervals'
export { useCausalChain, storeResultToCausalPrev } from './useCausalChain'
export type { CausalStep, CausalChainPrevInput, CausalFactor, ColorHint } from './useCausalChain'
export { useWorkerCalculation } from '@/application/workers'
