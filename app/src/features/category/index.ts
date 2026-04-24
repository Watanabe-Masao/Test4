/**
 * features/category — カテゴリ分析スライス
 * @sunsetCondition 本 barrel は永続的構造（モジュール entry point / 後方互換 re-export）
 * @expiresAt 2099-12-31
 * @reason ADR-C-004 / F1 原則: モジュール entry の後方互換 barrel re-export
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
