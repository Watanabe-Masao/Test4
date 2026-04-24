/**
 * Screen Runtime 許可リスト — pair handler 消費側の分類
 *
 * @invariant INV-RUN-02 Comparison Integrity — pair handler 消費側の分類を追跡
 */
import type { AllowlistEntry } from './types'

// ════════════════════════════════════════════════════════════════════
// §1. pair handler 消費側
// ════════════════════════════════════════════════════════════════════

/**
 * 単一呼び出しで比較なし。base handler の直接使用が正当。
 * pair handler への移行は不要（比較意味論がない）。
 */
export const pairJustifiedSingle: readonly AllowlistEntry[] = [
  // ── 以下5件は plan hook 経由に移行済みのため除去 ──
  // CumulativeChart.tsx → useCumulativeChartPlan 経由
  // WeatherAnalysisPanel.tsx → useWeatherAnalysisPlan 経由
  // useDeptHourlyChartData.ts → useDeptHourlyChartPlan 経由
  // CategoryHourlyChart.tsx → useCategoryHourlyChartPlan 経由
  // CategoryMixChart.tsx → useCategoryMixChartPlan 経由
  {
    path: 'application/hooks/useHeatmapPlan.ts',
    reason: 'levelAggregationHandler × 3 ドロップダウン用（比較なし）。plan hook が一元管理',
    category: 'justified',
    removalCondition: '除去不要 — ドロップダウン候補取得は pair 不要',
    lifecycle: 'permanent',
    ruleId: 'AR-STRUCT-QUERY-PATTERN',
    createdAt: '2026-04-24',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  {
    path: 'application/hooks/usePerformanceIndexPlan.ts',
    reason: 'storeCategoryPIHandler 単一呼び出し（比較なし）。levelAggregation は pair 化済み',
    category: 'justified',
    removalCondition: '除去不要 — 比較なしの正当な base handler 使用',
    lifecycle: 'permanent',
    ruleId: 'AR-STRUCT-QUERY-PATTERN',
    createdAt: '2026-04-24',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  {
    path: 'application/hooks/categoryLeafDaily/useCategoryLeafDailyBundle.ts',
    reason:
      'bundle 内部の comparison fallback 用途で categoryTimeRecordsHandler を単発呼び出し。pair handler は current + comparison の二項同時取得専用で、fallback（comparison 空時の当年同日付救済）は別ランジで単発取得する必要がある。fallback の意味論は bundle 内に畳み込まれており、consumer からは意識しない',
    category: 'justified',
    removalCondition:
      '除去不要 — comparison fallback は「当年 scope を同一日付範囲でもう一度取る」設計上 pair 化不能（pair は date range 一致の同時取得）',
    lifecycle: 'permanent',
    ruleId: 'AR-STRUCT-QUERY-PATTERN',
    createdAt: '2026-04-24',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
]

/**
 * 後方互換: Gate 4 enforcement guard が参照する統合リスト。
 * pairJustifiedSingle のみ（pairExceptionDesign は全件卒業済み）。
 */
export const nonPairableConsumers: readonly AllowlistEntry[] = [...pairJustifiedSingle]
