/**
 * ストア計算結果・設定型エクスポート
 */
export type {
  StoreConfigData,
  StoreAggregatedData,
  StoreDerivedData,
  StoreResult,
} from './StoreResult'
export type { StoreResultSlice } from './StoreResultSlice'
export { storeResultData, readyStoreResult, EMPTY_STORE_RESULT_SLICE } from './StoreResultSlice'
export type {
  StoreSalesView,
  StoreInventoryView,
  StoreBudgetView,
  StoreForecastView,
  StoreMarginView,
  StoreCategoryView,
} from './StoreResultSubsets'
export type { AppSettings, ViewType, DataType, StorageDataType, CustomCategory } from './Settings'
export { CUSTOM_CATEGORIES } from './Settings'
export type { ImportedData } from './ImportedData'
export { createEmptyImportedData } from './ImportedData'
export type { DataOrigin, DataEnvelope } from './DataOrigin'
export { isEnvelope } from './DataOrigin'
export type { MonthlyData, AppData } from './MonthlyData'
export { createEmptyMonthlyData } from './MonthlyData'
export type { LegacyComparisonSlices } from './monthlyDataAdapter'
export { toMonthlyData, toAppData, toLegacyImportedData } from './monthlyDataAdapter'
export type { StoreMetrics } from './StoreMetrics'
