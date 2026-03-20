/**
 * IndexedDB 永続化層 — 公開 API ファサード
 *
 * 実装は internal/ 配下に分割されている。
 * このファイルは既存の import パスを維持するための re-export のみを行う。
 */
export {
  saveImportedData,
  loadImportedData,
  saveDataSlice,
  loadMonthlySlice,
  clearMonthData,
  clearAllData,
  getMonthDataSummary,
} from './internal/monthlyDataOperations'
export { getPersistedMeta, listStoredMonths } from './internal/metaOperations'
export { saveImportHistory, loadImportHistory } from './internal/importHistoryOperations'
export {
  saveStoreDaySummaryCache,
  loadStoreDaySummaryCache,
} from './internal/summaryCacheOperations'
export { isIndexedDBAvailable } from './internal/dbHelpers'
export type { PersistedMeta } from '@/domain/models/analysis'
