/**
 * selectPrevYearSummaryFromFreePeriod — Phase 6 Step A summary projection
 *
 * unify-period-analysis Phase 6 Step A:
 * 旧 `PrevYearData` / `PrevYearMonthlyKpi` 命名で widget が消費している
 * summary 値を `FreePeriodReadModel.comparisonSummary` から射影する pure
 * selector。`ConditionSummaryEnhanced` / `ExecSummaryBarWidget` の summary
 * 差し替えで共通利用する。
 *
 * ## 射影対象 (Step A 範囲)
 *
 * - `prevYear.totalSales`               → `comparisonSummary.totalSales`
 * - `prevYear.totalCustomers`           → `comparisonSummary.totalCustomers`
 * - `prevYearMonthlyKpi.monthlyTotal.sales` (= legacy "prevYearMonthlySales")
 *                                        → `comparisonSummary.totalSales`
 *
 * ## 射影しないもの (Step A 範囲外)
 *
 * - `prevYear.daily` / `dailyMapping` — 日別粒度。Step B (readModel 次元拡張)
 *   待ち
 * - `dowGap` — alignmentMap ベースの曜日別計算。Step B 以降
 * - `prevYearStoreCostPrice` — store-level cost。Step B 以降
 * - 7-day trend 計算 — daily 必須。Step B 以降
 *
 * ## hasPrevYear のセマンティクス
 *
 * `comparisonSummary` が null (= frame.comparison が無効) または totalSales が 0
 * の場合は `hasPrevYear: false` を返す。caller 側で legacy fallback の判断に
 * 使える。
 *
 * @see projects/unify-period-analysis/inventory/05-phase6-widget-consumers.md
 */
import type { FreePeriodReadModel } from './FreePeriodTypes'

export interface PrevYearSummaryProjection {
  /** comparisonSummary が存在し、totalSales > 0 のときのみ true */
  readonly hasPrevYear: boolean
  /** comparisonSummary.totalSales (= legacy `prevYear.totalSales` 相当) */
  readonly totalSales: number
  /** comparisonSummary.totalCustomers (= legacy `prevYear.totalCustomers` 相当) */
  readonly totalCustomers: number
  /** comparisonSummary.totalSales を旧命名でも公開 (= legacy `prevYearMonthlySales`) */
  readonly prevYearMonthlySales: number
}

const ZERO_PROJECTION: PrevYearSummaryProjection = {
  hasPrevYear: false,
  totalSales: 0,
  totalCustomers: 0,
  prevYearMonthlySales: 0,
}

/**
 * `FreePeriodReadModel.comparisonSummary` を「旧 prev-year summary 命名」に
 * 射影する pure selector。
 *
 * caller の使い方:
 *
 * ```ts
 * const fp = selectPrevYearSummaryFromFreePeriod(ctx.freePeriodLane?.bundle.fact ?? null)
 * const pyRatio = fp.hasPrevYear ? r.totalSales / fp.totalSales : null
 * ```
 */
export function selectPrevYearSummaryFromFreePeriod(
  fact: FreePeriodReadModel | null,
): PrevYearSummaryProjection {
  const cs = fact?.comparisonSummary ?? null
  if (!cs || cs.totalSales <= 0) return ZERO_PROJECTION
  return {
    hasPrevYear: true,
    totalSales: cs.totalSales,
    totalCustomers: cs.totalCustomers,
    prevYearMonthlySales: cs.totalSales,
  }
}
