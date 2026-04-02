/**
 * Category 複合チャート群 — バレル export
 *
 * 5 つの複合チャート単位 + 補助コンポーネントを公開。
 * 外部からは @/features/category 経由でアクセスする。
 */

// ── 複合チャート ──
export { IntegratedCategoryAnalysis } from './IntegratedCategoryAnalysis'
export { CategoryTrendChart } from './CategoryTrendChart'
export { CategoryMixChart } from './CategoryMixChart'
export { CategoryBenchmarkChart } from './CategoryBenchmarkChart'
export { CategoryBoxPlotChart } from './CategoryBoxPlotChart'
export { CategoryPerformanceChart } from './CategoryPerformanceChart'
export { CategoryHourlyChart } from './CategoryHourlyChart'

// ── 補助コンポーネント ──
export { CategoryPieChart } from './CategoryPieChart'
export { CategoryRankingCard } from './CategoryRankingCard'
export { CategoryBarChart } from './CategoryBarChart'
export { CategoryDiscountChart } from './CategoryDiscountChart'
export { CategoryDiscountTable } from './CategoryDiscountTable'
export { CategoryHierarchyExplorer } from './CategoryHierarchyExplorer'
export { CategoryHierarchyProvider } from './CategoryHierarchyContext'
export { CategoryHeatmapPanel } from './CategoryHeatmapPanel'
export { CategoryTimeHeatmap } from './CategoryTimeHeatmap'
export type { CategoryHourlyItem } from './CategoryTimeHeatmap'

// ── Logic / 型 export ──
export {
  buildCategoryTrendData,
  buildPrevYearTrendData,
  buildCategoryTrendOption,
  PREV_YEAR_SUFFIX,
  type TrendMetric,
} from './CategoryTrendChartLogic'
