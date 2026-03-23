/**
 * ガードテスト許可リスト — ファイルサイズ
 */
import type { AllowlistEntry } from './types'

/** Presentation コンポーネント Tier 2（600行超の大規模コンポーネント） */
export const largeComponentTier2: readonly AllowlistEntry[] = [
  {
    path: 'presentation/components/charts/TimeSlotChart.tsx',
    reason: '時間帯チャート（660行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/components/charts/BudgetVsActualChart.tsx',
    reason: '予実チャート（696行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/components/charts/PerformanceIndexChart.tsx',
    reason: '指標チャート（610行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/components/charts/YoYVarianceChart.tsx',
    reason: '前年差チャート（668行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/CategoryFactorBreakdown.tsx',
    reason: 'カテゴリ要因分解（654行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailModal.tsx',
    reason: '日次詳細モーダル（689行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx',
    reason: '月間カレンダー（625行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/pages/Forecast/ForecastChartsCustomer.tsx',
    reason: '予測チャート（756行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
] as const

/** Infrastructure ファイルサイズ除外（400行超） */
export const infraLargeFiles: readonly AllowlistEntry[] = [
  {
    path: 'infrastructure/duckdb/dataConversions.ts',
    reason: 'DuckDB データ変換',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'infrastructure/duckdb/queries/purchaseComparison.ts',
    reason: '仕入比較クエリ',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'infrastructure/weather/jmaEtrnClient.ts',
    reason: 'JMA ETRN クライアント',
    category: 'structural',
    removalCondition: '分割時',
  },
] as const

/** Domain ファイルサイズ除外（300行超） */
export const domainLargeFiles: readonly AllowlistEntry[] = [
  {
    path: 'domain/constants/metricDefs.ts',
    reason: 'メトリック定義一覧',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/constants/metricResolver.ts',
    reason: 'メトリック解決',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/models/PeriodSelection.ts',
    reason: '期間選択モデル',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/calculations/rawAggregation.ts',
    reason: 'Raw 集計',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/models/ComparisonScope.ts',
    reason: '比較スコープモデル',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/calculations/algorithms/advancedForecast.ts',
    reason: '高度予測アルゴリズム',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/constants/formulaRegistryBusiness.ts',
    reason: '数式レジストリ',
    category: 'structural',
    removalCondition: '分割時',
  },
] as const

/** Application usecases ファイルサイズ除外（400行超） */
export const usecasesLargeFiles: readonly AllowlistEntry[] = [
  {
    path: 'application/usecases/import/importValidation.ts',
    reason: 'インポートバリデーション',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'application/usecases/clipExport/clipJs.ts',
    reason: 'クリップボードエクスポート',
    category: 'structural',
    removalCondition: '分割時',
  },
] as const
