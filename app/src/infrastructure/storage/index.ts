// Infrastructure - 永続化
export {
  saveImportedData,
  loadImportedData,
  getPersistedMeta,
  clearMonthData,
  clearAllData,
  isIndexedDBAvailable,
  saveDataSlice,
} from './IndexedDBStore'
export type { PersistedMeta } from './IndexedDBStore'
export {
  calculateDiff,
  summarizeDiff,
} from './diffCalculator'
export type {
  FieldChange,
  ChangeType,
  DataTypeDiff,
  DiffResult,
} from './diffCalculator'
