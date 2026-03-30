export {
  categoryMixWeeklyHandler,
  type CategoryMixWeeklyInput,
  type CategoryMixWeeklyOutput,
  type CategoryMixWeeklyRow,
} from './CategoryMixWeeklyHandler'

export {
  categoryBenchmarkHandler,
  type CategoryBenchmarkInput,
  type CategoryBenchmarkOutput,
  type CategoryBenchmarkRow,
} from './CategoryBenchmarkHandler'

export {
  categoryBenchmarkTrendHandler,
  type CategoryBenchmarkTrendInput,
  type CategoryBenchmarkTrendOutput,
  type CategoryBenchmarkTrendRow,
} from './CategoryBenchmarkTrendHandler'

// categoryBenchmarkLogic の純粋関数・型を QueryHandler barrel 経由で公開
// presentation/ は hooks/duckdb/ を直接 import できない（ガード制約）ため
export {
  buildCategoryBenchmarkScores,
  buildCategoryBenchmarkScoresByDate,
  buildCategoryTrendData,
  classifyProductType,
  type BenchmarkMetric,
  type CategoryBenchmarkScore,
  type CategoryTrendPoint,
  type ProductType,
} from '@/application/hooks/duckdb/categoryBenchmarkLogic'

// categoryBoxPlotLogic の純粋関数・型を QueryHandler barrel 経由で公開
export {
  buildBoxPlotData,
  buildBoxPlotDataByDate,
  buildStoreBreakdown,
  buildDateBreakdown,
  type BoxPlotStats,
  type StoreBreakdownItem,
  type DateBreakdownItem,
} from '@/application/hooks/duckdb/categoryBoxPlotLogic'

export {
  categoryHierarchyHandler,
  type CategoryHierarchyInput,
  type CategoryHierarchyOutput,
  type CategoryHierarchyItem,
} from './CategoryHierarchyHandler'

export {
  conditionMatrixHandler,
  type ConditionMatrixInput,
  type ConditionMatrixOutput,
  type ConditionMatrixRow,
} from './ConditionMatrixHandler'

// conditionMatrixLogic の純粋関数・型を barrel 経由で公開
export {
  buildConditionMatrix,
  type MatrixCell,
  type MatrixRowData,
  type TrendDirection,
  type TrendDirectionRow,
} from '@/application/hooks/duckdb/conditionMatrixLogic'
