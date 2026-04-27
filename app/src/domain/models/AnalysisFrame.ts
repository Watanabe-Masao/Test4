/**
 * AnalysisFrame — 分析の入力契約
 *
 * 分析ロジックの「何を・どの期間・どの粒度で分析するか」を型で表現する。
 * temporal（移動平均・累積）と free-period（自由期間分析）を分離し、
 * 共通部分のみ BaseAnalysisFrame に上げる。
 *
 * ## 型の階層
 *
 * BaseAnalysisFrame
 *   ├── TemporalAnalysisFrame（既存: TemporalFrameTypes.ts で定義）
 *   │     ├── RollingAnalysisFrame
 *   │     └── NonRollingAnalysisFrame
 *   └── FreePeriodAnalysisFrame（新規: 自由期間分析用）
 *
 * ## 使い分け
 *
 * - temporal: 移動平均・ローリング合計・累積・トレンド
 * - free-period: 任意日付範囲の分析（比較付き）
 *
 * @responsibility R:unclassified
 */
import type { DateRange } from '@/domain/models/CalendarDate'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type {
  RollingAnalysisFrame,
  NonRollingAnalysisFrame,
} from '@/application/usecases/temporal/TemporalFrameTypes'

// ─── 基底型 ──────────────────────────────────────────

/** 全分析フレームの共通フィールド */
export interface BaseAnalysisFrame {
  /** 分析対象の日付範囲 */
  readonly anchorRange: DateRange
  /** 対象店舗ID集合 */
  readonly storeIds: readonly string[]
  /** 集計粒度 */
  readonly granularity: 'day' | 'week' | 'month'
}

// ─── 自由期間分析フレーム ──────────────────────────────

/** 自由期間分析の入力契約 */
export interface FreePeriodAnalysisFrame extends BaseAnalysisFrame {
  readonly kind: 'free-period'
  /** 比較条件（null = 比較なし） */
  readonly comparison: ComparisonScope | null
}

// ─── 統合型 ──────────────────────────────────────────

/** Temporal 系の分析フレーム（既存型の re-export） */
export type TemporalAnalysisFrame = RollingAnalysisFrame | NonRollingAnalysisFrame

/** 全分析フレームの union */
export type AnalysisFrame = TemporalAnalysisFrame | FreePeriodAnalysisFrame

// ─── Re-export ──────────────────────────────────────

export type { RollingAnalysisFrame, NonRollingAnalysisFrame }
