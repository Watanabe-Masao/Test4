/**
 * ComparisonWindow — Screen Plan 層の比較契約型
 *
 * plan hook が「どの種類の比較窓でデータを取得したか」を型安全に表現する。
 * features/comparison 層の MatchStatus / ResolvedComparisonRow が
 * 「比較結果の事実」を表すのに対し、ComparisonWindow は
 * 「比較要求とその由来」を表す。
 *
 * ## 棲み分け
 *
 * | 層 | 型 | 責務 |
 * |---|---|---|
 * | domain/models (本ファイル) | ComparisonWindow / ComparisonProvenance | 比較要求の契約 |
 * | application/queries | PrevYearFlag / CompMode / PairedInput | DuckDB クエリの入力 |
 * | features/comparison | MatchStatus / ResolvedComparisonRow | 比較結果の事実 |
 *
 * @see references/03-guides/safety-first-architecture-plan.md Phase 3
 */
import type { DateRange } from './CalendarDate'

// ── Window 型 ──

/** 比較なし（当期データのみ） */
export interface CurrentOnlyWindow {
  readonly kind: 'current-only'
}

/** 前年同期比較（YoY） */
export interface YoYWindow {
  readonly kind: 'yoy'
  /** 比較先の日付範囲 */
  readonly comparisonRange: DateRange
  /** 曜日オフセット（0-6） */
  readonly dowOffset?: number
}

/** 前週比較（WoW） — 7日前の同一曜日範囲 */
export interface WoWWindow {
  readonly kind: 'wow'
  /** 比較先の日付範囲（当期 - 7日） */
  readonly comparisonRange: DateRange
}

/**
 * ComparisonWindow — plan が要求した比較窓の discriminated union
 *
 * 将来の拡張:
 * - AlignedComparisonWindow（日単位アライメント）
 * - FallbackAwareComparisonWindow（欠損時フォールバック付き）
 */
export type ComparisonWindow = CurrentOnlyWindow | YoYWindow | WoWWindow

// ── Provenance ──

/**
 * ComparisonProvenance — plan output に付与される比較由来情報
 *
 * consumer（Chart VM 等）が「このデータはどの比較窓で取得されたか」を
 * 参照できるようにする。計算を再実行せずに由来を追跡する。
 */
export interface ComparisonProvenance {
  /** 要求された比較窓 */
  readonly window: ComparisonWindow
  /** 比較データが実際に取得できたか */
  readonly comparisonAvailable: boolean
}

// ── ファクトリ ──

/** 当期のみ window を構築 */
export function currentOnly(): CurrentOnlyWindow {
  return { kind: 'current-only' }
}

/** YoY window を構築 */
export function yoyWindow(comparisonRange: DateRange, dowOffset?: number): YoYWindow {
  return { kind: 'yoy', comparisonRange, dowOffset }
}

/** WoW window を構築 */
export function wowWindow(comparisonRange: DateRange): WoWWindow {
  return { kind: 'wow', comparisonRange }
}
