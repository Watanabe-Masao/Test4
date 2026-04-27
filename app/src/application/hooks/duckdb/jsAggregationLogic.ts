/**
 * JS 集約計算の純粋関数群
 *
 * 曜日パターン・日別特徴量・時間帯プロファイルは domain/calculations/rawAggregation に移管済み。
 * このファイルは後方互換 re-export + YoY 比較（Application 調整）を担当する。
 *
 * @guard G5 hook ≤300行 — 純粋関数を分離
 *
 * @responsibility R:unclassified
 */
import type { StoreDaySummaryRow } from '@/infrastructure/duckdb/queries/storeDaySummary'
import type { YoyDailyRow } from '@/infrastructure/duckdb/queries/yoyComparison'
import { alignRows, toYoyDailyRows, type CompareMode } from '@/application/comparison/alignRows'
import type { CompareModeV2, MatchableRow } from '@/application/comparison/comparisonTypes'
import { resolveComparisonRows } from '@/application/comparison/resolveComparisonRows'
import { toYoyDailyRowVm, type YoyDailyRowVm } from '@/application/comparison/comparisonVm'

// ─── domain 関数の re-export（後方互換）──────────────────

export {
  computeDowPattern,
  computeDailyFeatures,
  computeHourlyProfile,
} from '@/application/query-bridge/rawAggregation'

// ─── YoY 日別比較 ───────────────────────────────────────

/**
 * 当期と前期の生データから YoY 日別比較を計算する純粋関数。
 *
 * Comparison/Alignment 層（alignRows）で整列し、
 * Chart VM 変換（toYoyDailyRows）で YoyDailyRow 互換 shape に戻す。
 *
 * compareMode と dowOffset を渡すと、current 行ごとに比較先を解決する。
 * 省略時は sameDate / offset=0（後方互換）。
 */
export function computeYoyDaily(
  curRows: readonly StoreDaySummaryRow[],
  prevRows: readonly StoreDaySummaryRow[],
  compareMode: CompareMode = 'sameDate',
  dowOffset: number = 0,
): YoyDailyRow[] {
  const aligned = alignRows(curRows, prevRows, compareMode, dowOffset)
  return toYoyDailyRows(aligned)
}

// ─── YoY 日別比較 V2 ────────────────────────────────────

/**
 * V2: 当期と前期の生データから YoY 日別比較を計算する純粋関数。
 *
 * Comparison/Alignment V2（resolveComparisonRows）で日単位比較先を解決し、
 * Chart VM 変換（toYoyDailyRowVm）で YoyDailyRow 互換 shape に戻す。
 *
 * V1 との違い:
 * - dowOffset を受け取らない（sameDayOfWeek は日単位で解決）
 * - missing_previous / ambiguous_previous を明示的に返す
 * - 返り値は YoyDailyRowVm[]（YoyDailyRow 上位互換 + matchStatus）
 */
export function computeYoyDailyV2(
  curRows: readonly StoreDaySummaryRow[],
  prevRows: readonly StoreDaySummaryRow[],
  compareMode: CompareModeV2,
): YoyDailyRowVm[] {
  // StoreDaySummaryRow → MatchableRow 変換（フィールド互換）
  const toMatchable = (r: StoreDaySummaryRow): MatchableRow => {
    const parts = r.dateKey.split('-')
    return {
      dateKey: r.dateKey,
      year: Number(parts[0]),
      month: Number(parts[1]),
      day: Number(parts[2]),
      storeId: r.storeId,
      sales: r.sales,
      customers: r.customers,
    }
  }

  const resolved = resolveComparisonRows(
    curRows.map(toMatchable),
    prevRows.map(toMatchable),
    compareMode,
  )
  return toYoyDailyRowVm(resolved)
}
