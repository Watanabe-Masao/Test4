/**
 * @responsibility R:unclassified
 */

// Infrastructure - 永続化
export {
  saveMonthlyDataInternal,
  loadMonthlyDataInternal,
  getPersistedMeta,
  clearMonthData,
  clearAllData,
  isIndexedDBAvailable,
  saveDataSlice,
} from './IndexedDBStore'
export type { PersistedMeta } from './IndexedDBStore'
