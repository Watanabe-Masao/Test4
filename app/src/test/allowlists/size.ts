/**
 * ガードテスト許可リスト — ファイルサイズ
 */
import type { AllowlistEntry } from './types'

/** Presentation コンポーネント Tier 2（600行超の大規模コンポーネント — 全件解消済み。凍結） */
export const largeComponentTier2: readonly AllowlistEntry[] = [] as const

/** Infrastructure ファイルサイズ除外（400行超） */
export const infraLargeFiles: readonly AllowlistEntry[] = [
  {
    path: 'infrastructure/duckdb/queries/purchaseComparison.ts',
    reason: '仕入比較クエリ',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'active-debt',
  },
] as const

/** Domain ファイルサイズ除外（300行超） */
export const domainLargeFiles: readonly AllowlistEntry[] = [
  {
    path: 'domain/constants/metricDefs.ts',
    reason: 'メトリック定義一覧',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
  },
  {
    path: 'domain/constants/metricResolver.ts',
    reason: 'メトリック解決',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
  },
  {
    path: 'domain/models/PeriodSelection.ts',
    reason: '期間選択モデル',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
  },
  {
    path: 'application/query-bridge/rawAggregation.ts',
    reason: 'Raw 集計（application/query-bridge/ へ移動済み）',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'active-debt',
  },
  {
    path: 'domain/models/ComparisonScope.ts',
    reason: '比較スコープモデル',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
  },
  {
    path: 'domain/calculations/algorithms/advancedForecast.ts',
    reason: '高度予測アルゴリズム',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
  },
  {
    path: 'domain/constants/formulaRegistryBusiness.ts',
    reason: '数式レジストリ',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
  },
] as const

/** Application usecases ファイルサイズ除外（400行超） */
export const usecasesLargeFiles: readonly AllowlistEntry[] = [
  {
    path: 'application/usecases/import/importValidation.ts',
    reason: 'インポートバリデーション',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'active-debt',
  },
] as const
