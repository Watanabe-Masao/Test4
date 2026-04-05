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
  useCategoryDiscountChartPlan,
  useCategoryHourlyChartPlan,
  useCategoryMixChartPlan,
  useCategoryTrendPlan,
  type CategoryTrendPlanResult,
  useCategoryHierarchyPlan,
} from './application'
