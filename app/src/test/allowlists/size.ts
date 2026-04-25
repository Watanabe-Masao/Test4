/**
 * ガードテスト許可リスト — ファイルサイズ
 */
import type { AllowlistEntry } from './types'

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
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  {
    path: 'domain/constants/metricResolver.ts',
    ruleId: 'AR-G5-DOMAIN-LINES',
    reason: 'メトリック解決',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  {
    path: 'domain/models/PeriodSelection.ts',
    ruleId: 'AR-G5-DOMAIN-LINES',
    reason: '期間選択モデル',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
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
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  {
    path: 'domain/calculations/algorithms/advancedForecast.ts',
    ruleId: 'AR-G5-DOMAIN-LINES',
    reason: '高度予測アルゴリズム',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  {
    path: 'domain/constants/formulaRegistryBusiness.ts',
    ruleId: 'AR-G5-DOMAIN-LINES',
    reason: '数式レジストリ',
    category: 'structural',
    removalCondition: '分割時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
] as const
