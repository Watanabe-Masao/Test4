/**
 * ガードテスト許可リスト — ファイルサイズ
 */
import type { AllowlistEntry } from './types'

// WeatherTemperatureChart.tsx — option builder 分離で 602→200 行。許可リスト卒業
/** Presentation コンポーネント Tier 2（600行超の大規模コンポーネント） */
export const largeComponentTier2: readonly AllowlistEntry[] = [] as const

/** Infrastructure ファイルサイズ除外（400行超） — 全件解消済み。凍結 */
export const infraLargeFiles: readonly AllowlistEntry[] = [] as const

/** Domain ファイルサイズ除外（300行超） */
export const domainLargeFiles: readonly AllowlistEntry[] = [
  {
    path: 'domain/constants/metricDefs.ts',
    ruleId: 'AR-G5-DOMAIN-LINES',
    reason: 'メトリック定義一覧',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
  {
    path: 'domain/constants/metricResolver.ts',
    ruleId: 'AR-G5-DOMAIN-LINES',
    reason: 'メトリック解決',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
  {
    path: 'domain/models/PeriodSelection.ts',
    ruleId: 'AR-G5-DOMAIN-LINES',
    reason: '期間選択モデル',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
  // rawAggregation.ts — application/query-bridge/ へ移動済みで domain guard 対象外。orphan 削除
  {
    path: 'domain/models/ComparisonScope.ts',
    ruleId: 'AR-G5-DOMAIN-LINES',
    reason: '比較スコープモデル',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
  {
    path: 'domain/calculations/algorithms/advancedForecast.ts',
    ruleId: 'AR-G5-DOMAIN-LINES',
    reason: '高度予測アルゴリズム',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
  {
    path: 'domain/constants/formulaRegistryBusiness.ts',
    ruleId: 'AR-G5-DOMAIN-LINES',
    reason: '数式レジストリ',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
] as const

/** Application usecases ファイルサイズ除外（400行超） — 全件解消済み。凍結 */
export const usecasesLargeFiles: readonly AllowlistEntry[] = [] as const
