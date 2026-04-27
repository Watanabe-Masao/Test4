import type { DateRange } from '@/domain/models/CalendarDate'

/**
 * Minimal contract for comparison KPI projection.
 * @responsibility R:unclassified
 *
 * Replaces direct `PeriodSelection` dependency in `buildKpiProjection`.
 * Only the fields actually consumed by projection logic are included.
 *
 * Excluded fields (with reason):
 * - `activePreset`: overwritten to `prevYearSameDow` / `prevYearSameMonth`
 *   in both `buildComparisonScope` call sites — original value is never read
 * - `comparisonEnabled`: `useComparisonModule` side responsibility (disable-path),
 *   not projection's concern
 * - `period1` (full DateRange): only `from.year` / `from.month` are used
 *   (to construct `fullMonthPeriod1`). Carrying the full DateRange would expose
 *   elapsedDays cap details that projection explicitly overrides
 * - All other PeriodSelection fields: not referenced by `buildKpiProjection`
 */
export interface ComparisonProjectionContext {
  /**
   * 基準年 — `periodSelection.period1.from.year` から抽出。
   * `fullMonthPeriod1` の構築に使用: 当月 1 日から月末までの
   * 完全月 DateRange を再構築する起点。
   */
  readonly basisYear: number

  /**
   * 基準月 — `periodSelection.period1.from.month` から抽出。
   * `fullMonthPeriod1` の構築に使用: `basisYear` と組み合わせて
   * 月全体の DateRange を作る。elapsedDays cap で period1 が
   * 月途中で切れていても、KPI projection は月全体で集計する。
   */
  readonly basisMonth: number

  /**
   * 比較期間ヒント — `periodSelection.period2` から抽出。
   * `applyPreset(fullMonthPeriod1, preset, period2)` の第 3 引数として、
   * sameDow / sameDate scope 再構築の基準入力に使用。
   */
  readonly period2: DateRange
}
