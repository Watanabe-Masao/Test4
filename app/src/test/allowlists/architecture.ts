/**
 * ガードテスト許可リスト — アーキテクチャ（層境界）
 */
import type { AllowlistEntry } from './types'

/** application/ → infrastructure/ の直接依存（adapter パターン） */
export const applicationToInfrastructure: readonly AllowlistEntry[] = [
  {
    path: 'application/hooks/useDuckDB.ts',
    reason: 'DuckDB 接続ライフサイクル管理（composition root）',
    category: 'adapter',
    removalCondition: 'DuckDB adapter 層が確立されたとき',
  },
  {
    path: 'application/hooks/useEngineLifecycle.ts',
    reason: 'DuckDB エンジン初期化（useDuckDB から分離）',
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
    reason:
      'DuckDB recovery（rebuildFromIndexedDB/deleteDatabaseFile）— rawFileStore は Port 化済み',
    category: 'lifecycle',
    removalCondition: 'DuckDB recovery が engine boundary に閉じられたとき',
  },
  // useImport: DI 化完了（rawFileStore → AdapterContext.rawFile 経由）。削除済み。
  {
    path: 'application/usecases/import/FileImportService.ts',
    reason: 'ファイルインポートサービス',
    category: 'adapter',
    removalCondition: 'インポートが adapter 層に完全移行されたとき',
  },
  // ExportService: DI 化完了（AdapterContext.export 経由）。useExport は Port のみ参照。
  {
    path: 'application/hooks/useI18n.ts',
    reason: 'i18n インフラ初期化',
    category: 'adapter',
    removalCondition: 'i18n が adapter 層に移行されたとき',
  },
  {
    path: 'application/readModels/salesFact/readSalesFact.ts',
    reason: '売上・販売点数の正本（infrastructure/duckdb/queries/ 経由で取得）',
    category: 'adapter',
    removalCondition: 'readModel が infra query を直接呼ばず QueryHandler 経由になった時',
  },
  {
    path: 'application/readModels/discountFact/readDiscountFact.ts',
    reason: '値引き（売変）の正本（infrastructure/duckdb/queries/ 経由で取得）',
    category: 'adapter',
    removalCondition: 'readModel が infra query を直接呼ばず QueryHandler 経由になった時',
  },
  // readFreePeriodFact / BudgetFact / DeptKPI: pure builder 化完了。
  // handler が infra query を呼び、readModel は raw data を受け取る形に変更済み。
  // weatherAdapter: DI 化完了（useWeatherAdapter → AdapterContext 経由）。削除済み。
  {
    path: 'application/lifecycle/useAppLifecycle.ts',
    reason: 'DuckDB エンジン状態の購読（App Lifecycle 統合に必要）',
    category: 'lifecycle',
    removalCondition: 'DuckDB adapter 層が確立されたとき',
  },
] as const

/** presentation/ → infrastructure/（Phase 3 で全件解消済み。凍結） */
export const presentationToInfrastructure: readonly AllowlistEntry[] = [] as const

/** infrastructure/ → application/（逆方向依存 — RawDataPort を domain/ に移動し全件解消。凍結） */
export const infrastructureToApplication: readonly AllowlistEntry[] = [] as const

/** presentation/ から application/usecases/ 直接参照（全件解消済み。凍結） */
export const presentationToUsecases: readonly AllowlistEntry[] = [] as const
