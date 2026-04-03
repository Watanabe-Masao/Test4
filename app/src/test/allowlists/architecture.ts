/**
 * ガードテスト許可リスト — アーキテクチャ（層境界）
 */
import type { AllowlistEntry } from './types'

/**
 * application/ → infrastructure/ の直接依存（adapter パターン）
 *
 * Sprint 2 で runtime hooks 6件を application/runtime-adapters/ へ移動。
 * runtime-adapters/ は layerBoundaryGuard で infrastructure 依存許可パスとして登録済み。
 * 残存は FileImportService のみ。
 */
export const applicationToInfrastructure: readonly AllowlistEntry[] = [
  // useDuckDB, useEngineLifecycle, useRawDataFetch, useDataRecovery, useI18n, useAppLifecycle:
  // → application/runtime-adapters/ へ移動完了。guard の exclusion path で許可。
  // useImport: DI 化完了（rawFileStore → AdapterContext.rawFile 経由）。削除済み。
  {
    path: 'application/usecases/import/FileImportService.ts',
    reason: 'ファイルインポートサービス',
    category: 'adapter',
    removalCondition: 'インポートが adapter 層に完全移行されたとき',
    lifecycle: 'permanent',
  },
  // ExportService: DI 化完了（AdapterContext.export 経由）。useExport は Port のみ参照。
  // readSalesFact / readDiscountFact: pure builder 化完了。
  // handler が infra query を呼び、readModel は raw data を受け取る形に変更済み。
  // readFreePeriodFact / BudgetFact / DeptKPI: pure builder 化完了。
  // handler が infra query を呼び、readModel は raw data を受け取る形に変更済み。
  // weatherAdapter: DI 化完了（useWeatherAdapter → AdapterContext 経由）。削除済み。
] as const

/** presentation/ → infrastructure/（Phase 3 で全件解消済み。凍結） */
export const presentationToInfrastructure: readonly AllowlistEntry[] = [] as const

/** infrastructure/ → application/（逆方向依存 — RawDataPort を domain/ に移動し全件解消。凍結） */
export const infrastructureToApplication: readonly AllowlistEntry[] = [] as const

/** presentation/ から application/usecases/ 直接参照（全件解消済み。凍結） */
export const presentationToUsecases: readonly AllowlistEntry[] = [] as const
