/**
 * features/storage-admin — データ管理スライス
 *
 * IndexedDB のデータ管理・バックアップ・デバイス同期・DuckDB キャッシュなど、
 * Admin ページのストレージ管理機能を縦スライスとして集約する。
 *
 * @responsibility R:unclassified
 */

// ─── Application（hooks） ──────────────────────────────
export { useMonthDataManagement } from './application'

// ─── UI（section components） ──────────────────────────
export {
  StorageStatusSection,
  BackupSection,
  DeviceSyncSection,
  DuckDbCacheSection,
  MonthDataSection,
  ClearAllDataSection,
} from './ui'

export type { MonthEntry, LoadSliceFn } from './ui'
