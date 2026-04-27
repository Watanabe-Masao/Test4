/**
 * 月間粒度の前年 projection selector 群。
 *
 * 月間ラベル（月間前年売上・予算前年比・前年合計 (月)）で使う前年値の単一入口。
 * 期間スコープの `FreePeriodReadModel.comparisonSummary` とは明確に分離する
 * （取り込み期間キャップの暗黙適用を防ぐため）。
 *
 * @responsibility R:unclassified
 */
export {
  selectMonthlyPrevYearSales,
  MonthlyPrevYearSalesModeSchema,
  MonthlyPrevYearSalesSourceSchema,
  MonthlyPrevYearSalesProjectionSchema,
} from './selectMonthlyPrevYearSales'
export type {
  MonthlyPrevYearSalesMode,
  MonthlyPrevYearSalesSource,
  MonthlyPrevYearSalesProjection,
} from './selectMonthlyPrevYearSales'
