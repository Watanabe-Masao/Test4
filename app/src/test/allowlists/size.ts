/**
 * ガードテスト許可リスト — ファイルサイズ
 */
import type { AllowlistEntry } from './types'

/** Presentation コンポーネント Tier 2（600行超の大規模コンポーネント） */
export const largeComponentTier2: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Weather/WeatherTemperatureChart.tsx',
    reason:
      '前年天気アイコン2段表示 + 日照/湿度切替追加で 602 行。次回改修時に option builder を分離',
    category: 'structural',
    removalCondition: 'option builder 分離時',
    lifecycle: 'active-debt',
  },
] as const

/** Infrastructure ファイルサイズ除外（400行超） — 全件解消済み。凍結 */
export const infraLargeFiles: readonly AllowlistEntry[] = [] as const

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
  // rawAggregation.ts — application/query-bridge/ へ移動済みで domain guard 対象外。orphan 削除
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

/** Application usecases ファイルサイズ除外（400行超） — 全件解消済み。凍結 */
export const usecasesLargeFiles: readonly AllowlistEntry[] = [] as const
