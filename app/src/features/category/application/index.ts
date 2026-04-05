export {
  computeCategoryTotals,
  computeRowMetrics,
  computeStoreGrossProfit,
  type CategoryTotals,
} from './CategoryTotalView.vm'
export {
  buildUnifiedCategoryData,
  buildParetoData,
  CATEGORY_COLORS,
  CUSTOM_CATEGORY_COLORS,
  type CategoryChartItem,
  type PieMode,
  type ChartView,
} from './categoryData'

// ── Plan Hooks (feature ownership) ──
export { useCategoryBarChartPlan } from './plans/useCategoryBarChartPlan'
export { useCategoryDiscountChartPlan } from './plans/useCategoryDiscountChartPlan'
export { useCategoryHourlyChartPlan } from './plans/useCategoryHourlyChartPlan'
export { useCategoryMixChartPlan } from './plans/useCategoryMixChartPlan'
export { useCategoryTrendPlan } from './plans/useCategoryTrendPlan'
export type { CategoryTrendPlanResult } from './plans/useCategoryTrendPlan'
export { useCategoryHierarchyPlan } from './plans/useCategoryHierarchyPlan'
