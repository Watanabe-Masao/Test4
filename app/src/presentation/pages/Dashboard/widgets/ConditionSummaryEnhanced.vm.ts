/**
 * コンディションサマリー強化版 — ViewModel (バレル)
 *
 * WidgetContext + StoreResult から店別予算達成メトリクスを導出する純粋関数群。
 * Presentation 層の描画ロジックからデータ変換を分離する（原則#9: 描画は純粋）。
 *
 * @guard F7 View は ViewModel のみ受け取る
 * @guard F1 バレルで後方互換
 */

// ─── Types + Metric Definitions ─────────────────────────
export type {
  MetricKey,
  PeriodTab,
  BudgetMetricKey,
  RateOnlyMetricKey,
  MetricDef,
  EnhancedRow,
  EnhancedTotal,
} from './conditionSummaryTypes'
export { isBudgetMetric, METRIC_DEFS } from './conditionSummaryTypes'

// ─── Row / Total Builders ───────────────────────────────
export type { BuildRowsInput } from './conditionSummaryRowBuilders'
export { buildRows, buildTotal, buildTotalFromResult } from './conditionSummaryRowBuilders'

// ─── Daily Detail Builders ──────────────────────────────
export type {
  DailyDetailRow,
  DailyYoYRow,
  DailyDiscountRow,
  DailyDiscountRateYoYRow,
  DailyMarkupRateYoYRow,
} from './conditionSummaryDailyBuilders'
export {
  buildDailyDetailRows,
  buildDailyYoYRows,
  buildDailyDiscountRows,
  buildDailyDiscountRateYoYRows,
  buildDailyMarkupRateYoYRows,
} from './conditionSummaryDailyBuilders'

// ─── Formatters + Signal Colors ─────────────────────────
export {
  achievementColor,
  rateDiffColor,
  resultColor,
  fmtValue,
  fmtAchievement,
  formatPercent100,
} from './conditionSummaryFormatters'

// ─── Card / Header / Badge Builders ─────────────────────
export type {
  CardSummary,
  DowGapSummary,
  BudgetHeaderData,
  YoYCardKey,
  YoYCardSummary,
  BuildYoYCardsInput,
  ConditionCardId,
  UnifiedCardData,
} from './conditionSummaryCardBuilders'
export {
  buildCardSummaries,
  buildBudgetHeader,
  buildYoYCards,
  CONDITION_CARD_ORDER,
  CONDITION_CARD_GROUP,
  buildUnifiedCards,
} from './conditionSummaryCardBuilders'
