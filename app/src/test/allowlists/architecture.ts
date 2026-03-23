/**
 * ガードテスト許可リスト — アーキテクチャ（層境界）
 */
import type { AllowlistEntry } from './types'

/** application/ → infrastructure/ の直接依存（adapter パターン） */
export const applicationToInfrastructure: readonly AllowlistEntry[] = [
  {
    path: 'application/hooks/useDuckDB.ts',
    reason: 'DuckDB 接続ライフサイクル管理',
    category: 'adapter',
    removalCondition: 'DuckDB adapter 層が確立されたとき',
  },
  {
    path: 'application/hooks/useRawDataFetch.ts',
    reason: 'ETRN データ取得の調停',
    category: 'adapter',
    removalCondition: 'データ取得が adapter 層に移行されたとき',
  },
  {
    path: 'application/hooks/useDataRecovery.ts',
    reason: 'IndexedDB リカバリ処理',
    category: 'lifecycle',
    removalCondition: 'リカバリが adapter 層に移行されたとき',
  },
  {
    path: 'application/hooks/useImport.ts',
    reason: 'ファイルインポート処理',
    category: 'adapter',
    removalCondition: 'インポートが adapter 層に完全移行されたとき',
  },
  {
    path: 'application/usecases/import/FileImportService.ts',
    reason: 'ファイルインポートサービス',
    category: 'adapter',
    removalCondition: 'インポートが adapter 層に完全移行されたとき',
  },
  {
    path: 'application/usecases/export/ExportService.ts',
    reason: 'エクスポートサービス',
    category: 'adapter',
    removalCondition: 'エクスポートが adapter 層に完全移行されたとき',
  },
  {
    path: 'application/hooks/useI18n.ts',
    reason: 'i18n インフラ初期化',
    category: 'adapter',
    removalCondition: 'i18n が adapter 層に移行されたとき',
  },
  {
    path: 'application/adapters/weatherAdapter.ts',
    reason: 'adapter パターン — 正当な例外',
    category: 'adapter',
    removalCondition: '構造上不要にならない限り維持',
  },
  {
    path: 'application/adapters/storagePersistenceAdapter.ts',
    reason: 'adapter パターン — 正当な例外',
    category: 'adapter',
    removalCondition: '構造上不要にならない限り維持',
  },
  {
    path: 'application/adapters/backupAdapter.ts',
    reason: 'adapter パターン — 正当な例外',
    category: 'adapter',
    removalCondition: '構造上不要にならない限り維持',
  },
  {
    path: 'application/adapters/fileSystemAdapter.ts',
    reason: 'adapter パターン — 正当な例外',
    category: 'adapter',
    removalCondition: '構造上不要にならない限り維持',
  },
] as const

/** presentation/ → infrastructure/（Phase 3 で全件解消済み。凍結） */
export const presentationToInfrastructure: readonly AllowlistEntry[] = [] as const

/** infrastructure/ → application/（逆方向依存 — RawDataPort を domain/ に移動し全件解消。凍結） */
export const infrastructureToApplication: readonly AllowlistEntry[] = [] as const

/** presentation/ から application/usecases/ 直接参照 */
export const presentationToUsecases: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Admin/ClearAllDataSection.tsx',
    reason: '管理画面の特殊操作',
    category: 'structural',
    removalCondition: 'Admin 操作が hook 経由に移行されたとき',
  },
] as const
