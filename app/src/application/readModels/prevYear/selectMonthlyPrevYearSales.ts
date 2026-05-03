/**
 * selectMonthlyPrevYearSales — 月間粒度の前年売上 projection
 *
 * 「月間前年売上」「予算前年比」「前年合計（月）」など **月間粒度のラベル**
 * で表示する前年売上を `PrevYearMonthlyKpi` から射影する pure selector。
 *
 * ## なぜこの selector が必要か
 *
 * 前年売上には 2 つのスコープがある（`PrevYearMonthlyTotal` 型定義参照）:
 *
 * - **月間**: 前年の全日合計。取り込み期間 (elapsedDays / dataEndDay) に影響
 *   されない固定値。月間ラベルで使用。
 * - **期間**: 当期の取り込み期間に対応する前年日のみ合計。elapsed cap される。
 *   日別比較・期間比較で使用。
 *
 * これらを混同すると「取り込み期間フィルターが暗黙適用される」バグが発生する。
 * 具体例: `ConditionSummaryEnhanced` のヘッダー「月間前年売上」が
 * `FreePeriodReadModel.comparisonSummary.totalSales` (= 期間スコープ) で
 * 上書きされ、月間ラベルにもかかわらず elapsed 日までの値が表示される回帰。
 *
 * 本 selector は「月間」ラベル用の **単一 API** を提供し、以下の値を禁止する:
 *
 * - `FreePeriodReadModel.comparisonSummary.totalSales` (analysis frame scope)
 * - `selectPrevYearSummaryFromFreePeriod(...).totalSales` (同上)
 * - `prevYear.totalSales` (PrevYearData; elapsed cap あり)
 *
 * ## 配置の理由 (application 層)
 *
 * 本 selector は `presentation/` (ConditionSummaryEnhanced) と
 * `features/budget` (useFullMonthLyDaily) の両方から共有される。feature 間の
 * 直接 import はアーキテクチャ規約 (AR-CONVENTION-FEATURE-BOUNDARY) で
 * 禁止されているため、両者が参照できる application 層に配置する。
 * `selectPrevYearSummaryFromFreePeriod` (`application/readModels/freePeriod/`)
 * と対をなす配置。
 *
 * ## mode semantics
 *
 * - `'sameDate'`: 前年同月の全日合計 (`kpi.monthlyTotal.sales`)。
 *                 alignment 非経由 = 真の月固定値。
 * - `'sameDow'` : 前年同曜日 alignment 経由の月全体合計 (`kpi.sameDow.sales`)。
 *                 `PrevYearMonthlyKpi` は `fullMonthPeriod1` で構築されるため
 *                 sameDow も elapsed cap 非経由。
 *
 * ## 利用箇所
 *
 * - `presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced` — 月間前年売上
 * - `features/budget/application/useFullMonthLyDaily` — 予算シミュレーター前年合計
 *
 * @see references/01-foundation/temporal-scope-semantics.md
 * @see features/comparison/application/comparisonTypes.ts `PrevYearMonthlyTotal`
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'
import type { PrevYearMonthlyKpi } from '@/application/comparison/comparisonTypes'

export const MonthlyPrevYearSalesModeSchema = z.enum(['sameDate', 'sameDow'])
export type MonthlyPrevYearSalesMode = z.infer<typeof MonthlyPrevYearSalesModeSchema>

export const MonthlyPrevYearSalesSourceSchema = z.enum(['kpi-sameDate', 'kpi-sameDow', 'none'])
export type MonthlyPrevYearSalesSource = z.infer<typeof MonthlyPrevYearSalesSourceSchema>

export const MonthlyPrevYearSalesProjectionSchema = z.object({
  /** 前年データが利用可能で `monthlySales > 0` のときのみ true */
  hasPrevYear: z.boolean(),
  /** 月間粒度の前年売上（alignment mode 別、取り込み期間キャップなし） */
  monthlySales: z.number(),
  /** 射影に使った alignment mode */
  mode: MonthlyPrevYearSalesModeSchema,
  /** どの経路で値を取ったか (debug / guard 観測専用、業務分岐には使わない) */
  source: MonthlyPrevYearSalesSourceSchema,
})
export type MonthlyPrevYearSalesProjection = z.infer<typeof MonthlyPrevYearSalesProjectionSchema>

const noneProjection = (mode: MonthlyPrevYearSalesMode): MonthlyPrevYearSalesProjection =>
  MonthlyPrevYearSalesProjectionSchema.parse({
    hasPrevYear: false,
    monthlySales: 0,
    mode,
    source: 'none',
  })

/**
 * 月間粒度の前年売上を `PrevYearMonthlyKpi` から射影する。
 *
 * ```ts
 * const prev = selectMonthlyPrevYearSales(kpi, 'sameDate')
 * // prev.monthlySales = 月全体の前年売上（elapsed cap なし）
 * ```
 */
/** @rm-id RM-010 */
export function selectMonthlyPrevYearSales(
  kpi: PrevYearMonthlyKpi | null | undefined,
  mode: MonthlyPrevYearSalesMode = 'sameDate',
): MonthlyPrevYearSalesProjection {
  if (!kpi || !kpi.hasPrevYear) return noneProjection(mode)
  const raw = mode === 'sameDow' ? kpi.sameDow.sales : kpi.monthlyTotal.sales
  if (raw <= 0) return noneProjection(mode)
  return MonthlyPrevYearSalesProjectionSchema.parse({
    hasPrevYear: true,
    monthlySales: raw,
    mode,
    source: mode === 'sameDow' ? 'kpi-sameDow' : 'kpi-sameDate',
  })
}
