/**
 * Temporal Analysis — 入力型定義
 *
 * 月跨ぎ分析基盤の3系統入力を discriminated union で分離する。
 *
 * - MonthlyContext: ヘッダ月次指定（既存 monthly path）
 * - AnalysisRequest: 自由期間分析（moving average, rolling sum 等）
 * - ComparisonPresetRequest: 比較プリセット（既存 ComparisonScope への bridge）
 *
 * これらは互いに混同できないようにするための型境界。
 * Frame / FetchPlan / DailySeries は Phase 1-2 で導入する。
 */
import type { DateRange } from '@/domain/models/CalendarDate'

// ── 分析モード・指標 ──

/** 分析モード */
export type AnalysisMode = 'movingAverage' | 'rollingSum' | 'cumulative' | 'trend'

/** 分析指標 */
export type AnalysisMetric = 'sales' | 'customers' | 'transactionValue' | 'grossProfitRate'

// ── 3系統の入力型 ──

/**
 * ヘッダ月次指定（既存 monthly path の入力）
 *
 * Header monthly selector が生成する。
 * AnalysisRequest / ComparisonPresetRequest とは独立。
 */
export interface MonthlyContext {
  readonly kind: 'monthly'
  readonly year: number
  readonly month: number
  readonly storeIds: readonly string[]
}

/**
 * 自由期間分析の要求
 *
 * 月次ヘッダとは独立した期間指定。
 * anchorRange を基準に requiredRange / requiredMonths を導出する（Phase 1）。
 */
export interface AnalysisRequest {
  readonly kind: 'analysis'
  readonly anchorRange: DateRange
  readonly storeIds: readonly string[]
  readonly metric: AnalysisMetric
  readonly granularity: 'day' | 'week' | 'month'
  readonly analysisMode: AnalysisMode
  readonly windowSize?: number
  readonly direction?: 'trailing' | 'centered' | 'leading'
}

/**
 * 比較プリセット要求
 *
 * 既存 ComparisonScope との bridge。
 * ComparisonScope を一般化するのではなく、bridge として接続する。
 */
export interface ComparisonPresetRequest {
  readonly kind: 'comparison'
  readonly targetRange: DateRange
  readonly storeIds: readonly string[]
  readonly preset: 'prevYearSameMonth' | 'prevYearSameDow'
}

/**
 * 3系統の入力を区別する discriminated union
 *
 * kind フィールドで入力概念を一意に識別する。
 * ヘッダ月次指定と自由分析を取り違えるバグを型レベルで防止する。
 */
export type TemporalInput = MonthlyContext | AnalysisRequest | ComparisonPresetRequest
