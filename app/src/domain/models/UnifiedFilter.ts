/**
 * 統一フィルタ型定義
 *
 * UIからの絞り込み条件を一箇所に集約する型群。
 * JS計算エンジン・DuckDB探索エンジンの両方がこの型を経由してフィルタ条件を受け取る。
 *
 * ## 設計原則
 *
 * - 全フィルタ条件の正規定義場所（Single Source of Truth）
 * - domain 層のためフレームワーク非依存（純粋な型＋値のみ）
 * - readonly で不変性を保証
 * - 整合性はこの型を介して保証される
 */
import type { DateRange } from './CalendarDate'

// ─── 集計モード ──────────────────────────────────────

/** 集計モード（除数計算の基準） */
export type AggregateMode = 'total' | 'dailyAvg' | 'dowAvg'

// ─── 階層フィルタ ────────────────────────────────────

/** 部門/ライン/クラスの階層フィルタ */
export interface HierarchyFilter {
  /** 部門コード（null = フィルタなし） */
  readonly deptCode: string | null
  /** ラインコード（null = フィルタなし） */
  readonly lineCode: string | null
  /** クラスコード（null = フィルタなし） */
  readonly klassCode: string | null
}

/** 階層フィルタの初期値 */
export const EMPTY_HIERARCHY: HierarchyFilter = {
  deptCode: null,
  lineCode: null,
  klassCode: null,
} as const

// ─── 統一フィルタ状態 ────────────────────────────────

/**
 * 統一フィルタ状態 — UI からの絞り込み条件の完全な表現
 *
 * JS計算エンジンとDuckDB探索エンジンの両方が参照する。
 * filterStore がこの型の状態を保持し、セレクタフックが
 * 各エンジンに必要な形式に変換する。
 */
export interface UnifiedFilterState {
  // ── 期間 ──

  /** 日付範囲（inclusive: from/to 両端含む） */
  readonly dateRange: DateRange
  /** 月内の日範囲 [from, to]（1-based） */
  readonly dayRange: readonly [number, number]

  // ── 店舗 ──

  /** 選択中の店舗ID集合（空 = 全店舗） */
  readonly storeIds: ReadonlySet<string>

  // ── 集計 ──

  /** 集計モード */
  readonly aggregateMode: AggregateMode
  /** 選択中の曜日（0=日〜6=土、空 = 全曜日）。dowAvg モード時に使用 */
  readonly selectedDows: ReadonlySet<number>

  // ── 階層 ──

  /** 部門/ライン/クラスの階層フィルタ */
  readonly hierarchy: HierarchyFilter

  // ── 分析コンテキスト ──

  /** カテゴリフィルタ（null = フィルタなし） */
  readonly categoryFilter: string | null
  /** 部門フィルタ（null = フィルタなし） */
  readonly departmentFilter: string | null
}
