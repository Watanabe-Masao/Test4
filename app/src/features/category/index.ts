/**
 * features/category — カテゴリ分析スライス
 */
export * from './ui'
export {
  computeCategoryTotals,
  computeRowMetrics,
  computeStoreGrossProfit,
  buildUnifiedCategoryData,
  buildParetoData,
  CATEGORY_COLORS,
  CUSTOM_CATEGORY_COLORS,
  type CategoryTotals,
  type CategoryChartItem,
  type PieMode,
  type ChartView,
  useCategoryBarChartPlan,
  type CategoryDailyTrendInput,
  type PairedInput,
  useCategoryDiscountChartPlan,
  type CategoryDiscountInput,
  useCategoryHourlyChartPlan,
  type CategoryHourlyInput,
  useCategoryMixChartPlan,
  type CategoryMixWeeklyInput,
  useCategoryTrendPlan,
  type CategoryTrendPlanResult,
  useCategoryHierarchyPlan,
} from './application'
