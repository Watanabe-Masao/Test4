/**
 * Temporal Analysis — Frame / Fetch Plan 型定義
 *
 * Phase 1: AnalysisRequest を実行可能な最小 frame に変換し、
 * requiredRange / requiredMonths を導出するための型。
 */
import type { DateRange } from '@/domain/models/CalendarDate'
import type { AnalysisMetric } from '@/domain/models/temporal'

// ── YearMonthKey ──

type TwoDigitMonth =
  | '01'
  | '02'
  | '03'
  | '04'
  | '05'
  | '06'
  | '07'
  | '08'
  | '09'
  | '10'
  | '11'
  | '12'

/** 年月キー（'YYYY-MM' 形式、月は01-12の2桁固定） */
export type YearMonthKey = `${number}-${TwoDigitMonth}`

// ── MonthlyFrame ──

/** 月次パスの frame（既存 monthly path の入力を明示化） */
export interface MonthlyFrame {
  readonly kind: 'monthly-frame'
  readonly monthRange: DateRange
  readonly storeIds: readonly string[]
  readonly missingnessPolicy: 'strict'
}

// ── AnalysisFrame（rolling / non-rolling union） ──

/** rolling 系（movingAverage / rollingSum）— windowSize + direction 必須 */
export interface RollingAnalysisFrame {
  readonly kind: 'analysis-frame'
  readonly anchorRange: DateRange
  readonly storeIds: readonly string[]
  readonly metric: AnalysisMetric
  readonly granularity: 'day' | 'week' | 'month'
  readonly analysisMode: 'movingAverage' | 'rollingSum'
  readonly windowSize: number
  readonly direction: 'trailing' | 'centered' | 'leading'
}

/** non-rolling 系（cumulative / trend）— windowSize 不要 */
export interface NonRollingAnalysisFrame {
  readonly kind: 'analysis-frame'
  readonly anchorRange: DateRange
  readonly storeIds: readonly string[]
  readonly metric: AnalysisMetric
  readonly granularity: 'day' | 'week' | 'month'
  readonly analysisMode: 'cumulative' | 'trend'
}

/** 分析 frame の union（rolling と non-rolling を型で区別） */
export type AnalysisFrame = RollingAnalysisFrame | NonRollingAnalysisFrame

// ── TemporalFetchPlan ──

/** 実行前に「どこまで要るか」を決める計画 */
export interface TemporalFetchPlan {
  readonly anchorRange: DateRange
  readonly requiredRange: DateRange
  /** 昇順・重複なしの年月キー */
  readonly requiredMonths: readonly YearMonthKey[]
}
