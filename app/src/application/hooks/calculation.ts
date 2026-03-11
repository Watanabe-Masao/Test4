/**
 * 計算系フック — 要因分解・予測・在庫推定・感度分析
 *
 * domain 純粋関数の re-export は hooks 個別ファイルではなくここに集約。
 * presentation 層はこのバレル経由でアクセスする（architectureGuard 準拠）。
 */
export { useCalculation } from './useCalculation'
export {
  useDecompose2,
  useDecompose3,
  useDecompose5,
  useDecomposePriceMix,
} from './useFactorDecomposition'
export type {
  TwoFactorResult,
  ThreeFactorResult,
  FiveFactorResult,
  CategoryQtyAmt,
  PriceMixResult,
} from './useFactorDecomposition'
// domain 純粋関数: hooks ファイルではなく domain から直接 re-export
export {
  decompose2,
  decompose3,
  decompose5,
  decomposePriceMix,
} from '@/domain/calculations/factorDecomposition'
export { useForecast, useWeekRanges } from './useForecast'
export type { ForecastInput, ForecastResult, WeeklySummary, DayOfWeekAverage } from './useForecast'
export { calculateForecast, getWeekRanges } from '@/domain/calculations/forecast'
export { useEstimatedInventory, useEstimatedInventoryDetails } from './useInventoryEstimation'
export type { InventoryPoint, InventoryDetailRow } from './useInventoryEstimation'
export {
  computeEstimatedInventory,
  computeEstimatedInventoryDetails,
} from '@/domain/calculations/inventoryCalc'
export { useSensitivityBase, useSensitivityAnalysis, useElasticity } from './useSensitivity'
export type {
  SensitivityBase,
  SensitivityDeltas,
  SensitivityResult,
  ElasticityResult,
} from './useSensitivity'
export { useBudgetChartData } from './useBudgetChartData'
export type { BudgetChartDataPoint } from './useBudgetChartData'
export { usePinIntervals } from './usePinIntervals'
export type { PinInterval } from './usePinIntervals'
export { calculatePinIntervals } from '@/domain/calculations/pinIntervals'
export { useCausalChain, storeResultToCausalPrev } from './useCausalChain'
export type { CausalStep, CausalChainPrevInput, CausalFactor, ColorHint } from './useCausalChain'
export { useWorkerCalculation } from '@/application/workers'
