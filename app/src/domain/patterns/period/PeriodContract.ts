/**
 * PeriodContract — 期間の横断的関心事を型で管理する
 *
 * 設計原則 #12: 横断的関心事は Contract で管理
 *
 * ComparisonContract と同じ思想で、期間選択の関心事を一箇所に集約する。
 * ウィジェットは PeriodNeed を宣言し、仕分け層（usePeriodResolver）が
 * 必要な期間のみ解決する。Presentation 層は PeriodEntry[] をループし、
 * 個別の期間種別を知らずに描画する。
 *
 * ## 変更箇所の限定
 *
 * 新しいプリセットを追加する場合:
 *   1. ComparisonPreset に新モード追加（PeriodSelection.ts）
 *   2. applyPreset() に算出ロジック追加（PeriodSelection.ts）
 *   3. PRESET_LABELS にラベル追加（本ファイル）
 *
 * 新しい PeriodNeed を追加する場合:
 *   1. PeriodNeed に新種別追加（本ファイル）
 *   2. usePeriodResolver に解決ロジック追加
 *   3. usePeriodQueries にクエリ追加
 */
import type { DateRange } from '@/domain/models/CalendarDate'
import type {
  PeriodSelection,
  ComparisonPreset,
  AdjacentMonths,
} from '@/domain/models/PeriodSelection'

// ── 期間要求の宣言 ──

/**
 * ウィジェットが必要とする期間の種類
 *
 * 仕分け層は need に応じて必要最小限のデータのみ取得する。
 * 不要なクエリを発行しないことでパフォーマンスを最適化する。
 */
export type PeriodNeed =
  | 'current' // period1 のみ
  | 'comparison' // period1 + period2
  | 'adjacent' // period1 + 前後1ヶ月（移動平均用）
  | 'comparisonFull' // period1 + period2 + 両方の隣接月

/**
 * WidgetDef に付与する期間要求
 *
 * 各ウィジェットが「何が必要か」を宣言する。
 * 仕分け層（usePeriodResolver）がこれを受け取り、必要な期間のみ解決する。
 */
export interface PeriodRequirement {
  /** 必要な期間の種類 */
  readonly need: PeriodNeed
  /** デバッグ用の識別ラベル（ウィジェット名等） */
  readonly label: string
}

// ── 解決済み期間 ──

/**
 * 1つの期間のデータ + メタ情報
 *
 * ComparisonEntry<T> と同じ思想。
 * Presentation 層はこの型の配列を受け取り、
 * 個別の期間種別（current, comparison 等）を知る必要がない。
 */
export interface PeriodEntry<T> {
  /** 期間の識別キー */
  readonly key: 'current' | 'comparison'
  /** 期間の日付範囲 */
  readonly period: DateRange
  /** データ */
  readonly data: T
  /** データが利用可能か（false = ゼロ値） */
  readonly hasData: boolean
  /** 表示ラベル */
  readonly label: string
  /** 短縮ラベル（タブ・チップ用） */
  readonly shortLabel: string
}

/**
 * 複数期間をまとめた構造
 *
 * ComparisonResult<T> と同じ思想。
 * entries をループすることでモード非依存の描画が可能。
 *
 * ## ゼロ値パターン
 *
 * - 比較 OFF: comparison = undefined, entries は current のみ
 * - データなし: hasData = false + ゼロ値メトリクス
 * - 消費側は `if (data)` チェック不要
 */
export interface PeriodResult<T> {
  /** 当期のデータ */
  readonly current: PeriodEntry<T>
  /** 比較期のデータ（comparison OFF なら undefined） */
  readonly comparison?: PeriodEntry<T>
  /** モード非依存のループ用（current + comparison）。comparison OFF 時は current のみ */
  readonly entries: readonly PeriodEntry<T>[]
  /** 入力元の PeriodSelection */
  readonly selection: PeriodSelection
}

/**
 * 隣接月データ（PeriodNeed: adjacent / comparisonFull 時のみ使用）
 *
 * 移動平均・月跨ぎ計算で period の前後1ヶ月のデータが必要な場合に使用する。
 */
export interface AdjacentPeriodData<T> {
  /** period1 の前月データ */
  readonly period1Prev: PeriodEntry<T>
  /** period1 の翌月データ */
  readonly period1Next: PeriodEntry<T>
  /** period2 の前月データ（comparisonFull 時のみ） */
  readonly period2Prev?: PeriodEntry<T>
  /** period2 の翌月データ（comparisonFull 時のみ） */
  readonly period2Next?: PeriodEntry<T>
}

/**
 * usePeriodResolver の返却型
 *
 * PeriodNeed に応じて必要な期間のみ populated される。
 */
export interface ResolvedPeriods {
  /** period1 の DateRange（常に存在） */
  readonly period1: DateRange
  /** period2 の DateRange（comparison / comparisonFull 時のみ） */
  readonly period2?: DateRange
  /** period1 の隣接月（adjacent / comparisonFull 時のみ） */
  readonly period1Adjacent?: AdjacentMonths
  /** period2 の隣接月（comparisonFull 時のみ） */
  readonly period2Adjacent?: AdjacentMonths
  /** 比較が有効か */
  readonly comparisonEnabled: boolean
  /** 元の PeriodSelection */
  readonly selection: PeriodSelection
}

// ── ラベル定義 ──

/** プリセットの表示ラベル（i18n 対応の拡張ポイント） */
export const PRESET_LABELS: Readonly<
  Record<ComparisonPreset, { readonly label: string; readonly shortLabel: string }>
> = {
  prevYearSameMonth: { label: '比較期（前年同月）', shortLabel: '前年同月' },
  prevYearSameDow: { label: '比較期（前年同曜日）', shortLabel: '前年同曜日' },
  prevMonth: { label: '比較期（前月）', shortLabel: '前月' },
  prevWeek: { label: '比較期（前週）', shortLabel: '前週' },
  prevYearNextWeek: { label: '比較期（前年翌週）', shortLabel: '前年翌週' },
  custom: { label: '比較期（カスタム）', shortLabel: 'カスタム' },
}

// ── ヘルパー関数 ──

/**
 * PeriodEntry を構築する
 */
export function createPeriodEntry<T>(
  key: 'current' | 'comparison',
  period: DateRange,
  data: T,
  hasData: boolean,
  label: string,
  shortLabel: string,
): PeriodEntry<T> {
  return { key, period, data, hasData, label, shortLabel }
}

/**
 * 当期の PeriodEntry を構築する
 */
export function createCurrentEntry<T>(
  period: DateRange,
  data: T,
  hasData: boolean,
): PeriodEntry<T> {
  return createPeriodEntry('current', period, data, hasData, '当期', '当期')
}

/**
 * 比較期の PeriodEntry を構築する（プリセットラベルを自動適用）
 */
export function createComparisonPeriodEntry<T>(
  period: DateRange,
  data: T,
  hasData: boolean,
  preset: ComparisonPreset,
): PeriodEntry<T> {
  const labels = PRESET_LABELS[preset]
  return createPeriodEntry('comparison', period, data, hasData, labels.label, labels.shortLabel)
}

/**
 * PeriodResult を構築する
 *
 * comparison が undefined の場合、entries は current のみ。
 */
export function createPeriodResult<T>(
  current: PeriodEntry<T>,
  selection: PeriodSelection,
  comparison?: PeriodEntry<T>,
): PeriodResult<T> {
  const entries: PeriodEntry<T>[] = [current]
  if (comparison) {
    entries.push(comparison)
  }
  return { current, comparison, entries, selection }
}

/**
 * PeriodNeed に比較期が含まれるか判定する
 */
export function needsComparison(need: PeriodNeed): boolean {
  return need === 'comparison' || need === 'comparisonFull'
}

/**
 * PeriodNeed に隣接月が含まれるか判定する
 */
export function needsAdjacent(need: PeriodNeed): boolean {
  return need === 'adjacent' || need === 'comparisonFull'
}
