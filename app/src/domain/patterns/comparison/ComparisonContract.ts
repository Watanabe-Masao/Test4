/**
 * ComparisonContract — 比較の横断的関心事を型で管理する
 *
 * @guard F5 横断的関心事は Contract で管理
 *
 * 新しい比較モードを追加する場合の変更箇所を限定する:
 *   1. AlignmentPolicy に新モード追加
 *   2. resolveComparisonFrame() に新ロジック追加
 *   3. ComparisonContext に新 PeriodSnapshot 追加
 *   4. useComparisonContextQuery に新クエリ追加
 *
 * Presentation 層は ComparisonEntry[] を受け取り、モード名を知らずに描画する。
 */
import type { AlignmentPolicy, DowGapAnalysis } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'

/**
 * 比較エントリ — 1つの比較モードのデータ
 *
 * Presentation 層はこの型の配列を受け取り、
 * 個別のモード名（sameDow, sameDate等）を知る必要がない。
 */
export interface ComparisonEntry<T> {
  /** 比較モード識別子 */
  readonly policy: AlignmentPolicy
  /** 表示ラベル */
  readonly label: string
  /** 短縮ラベル（タブ・チップ用） */
  readonly shortLabel: string
  /** データ */
  readonly data: T
  /** データが利用可能か */
  readonly hasData: boolean
}

/**
 * 比較結果 — 全モードのデータをまとめた構造
 *
 * 型パラメータ T は各消費者が必要とするデータ型。
 * 例: PeriodSnapshot, PrevYearMonthlyKpiEntry, etc.
 */
export interface ComparisonResult<T> {
  /** 当年データ */
  readonly current: T
  /** 各比較モードのエントリ（モード数に依存しないループ処理が可能） */
  readonly entries: readonly ComparisonEntry<T>[]
  /** 曜日ギャップ分析（存在しない場合は null） */
  readonly dowGap: DowGapAnalysis | null
  /** 適用された比較スコープ */
  readonly scope: ComparisonScope | null
}

// ── ユーティリティ ──

/** 比較モードのラベル定義 */
const ALIGNMENT_LABELS: Record<AlignmentPolicy, { label: string; shortLabel: string }> = {
  sameDayOfWeek: { label: '前年同曜日', shortLabel: '同曜日' },
  sameDate: { label: '前年同日', shortLabel: '同日' },
}

/**
 * ComparisonEntry を構築するヘルパー
 */
export function createComparisonEntry<T>(
  policy: AlignmentPolicy,
  data: T,
  hasData: boolean,
): ComparisonEntry<T> {
  const labels = ALIGNMENT_LABELS[policy]
  return {
    policy,
    label: labels.label,
    shortLabel: labels.shortLabel,
    data,
    hasData,
  }
}

/**
 * ComparisonResult を構築するヘルパー
 */
export function createComparisonResult<T>(
  current: T,
  entries: readonly ComparisonEntry<T>[],
  dowGap: DowGapAnalysis | null = null,
  scope: ComparisonScope | null = null,
): ComparisonResult<T> {
  return { current, entries, dowGap, scope }
}

/**
 * 特定のポリシーのエントリを取得する（後方互換用）
 */
export function findEntry<T>(
  result: ComparisonResult<T>,
  policy: AlignmentPolicy,
): ComparisonEntry<T> | undefined {
  return result.entries.find((e) => e.policy === policy)
}
