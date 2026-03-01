/**
 * チャートデータソースマッピング
 *
 * 各チャートが DuckDB パスと JS パスのどちらを使うべきかを定義する。
 * Phase 10 の段階的移行で使用し、全チャートが DuckDB に移行完了したら
 * このファイルは不要になる。
 *
 * - 'duckdb': DuckDB SQL クエリで集約（推奨パス）
 * - 'js': 既存の JS 集約パス（StoreResult ベース）
 * - 'both': ユーザー設定で切替可能
 */

export type DataSource = 'duckdb' | 'js' | 'both'

export interface ChartDataSourceConfig {
  /** チャートコンポーネント名 */
  readonly chartName: string
  /** 使用するデータソース */
  readonly source: DataSource
  /** DuckDB 版のコンポーネント名（source=duckdb or both 時） */
  readonly duckdbComponent?: string
  /** JS 版のコンポーネント名（source=js or both 時） */
  readonly jsComponent?: string
}

/**
 * チャートデータソースマッピング
 *
 * DuckDB 置換対象（15個）: DuckDB SQL クエリで集約
 * StoreResult ベース維持: 既存の JS 集約パスを継続使用
 */
export const CHART_DATA_SOURCE_MAP: readonly ChartDataSourceConfig[] = [
  // ── DuckDB 専用チャート（15個）──
  { chartName: 'FeatureChart', source: 'duckdb', duckdbComponent: 'DuckDBFeatureChart' },
  { chartName: 'CumulativeChart', source: 'duckdb', duckdbComponent: 'DuckDBCumulativeChart' },
  { chartName: 'YoYChart', source: 'duckdb', duckdbComponent: 'DuckDBYoYChart' },
  { chartName: 'DeptTrendChart', source: 'duckdb', duckdbComponent: 'DuckDBDeptTrendChart' },
  { chartName: 'DowPatternChart', source: 'duckdb', duckdbComponent: 'DuckDBDowPatternChart' },
  { chartName: 'HourlyProfileChart', source: 'duckdb', duckdbComponent: 'DuckDBHourlyProfileChart' },
  { chartName: 'TimeSlotChart', source: 'duckdb', duckdbComponent: 'DuckDBTimeSlotChart' },
  { chartName: 'HeatmapChart', source: 'duckdb', duckdbComponent: 'DuckDBHeatmapChart' },
  { chartName: 'DeptHourlyChart', source: 'duckdb', duckdbComponent: 'DuckDBDeptHourlyChart' },
  { chartName: 'StoreHourlyChart', source: 'duckdb', duckdbComponent: 'DuckDBStoreHourlyChart' },
  { chartName: 'CategoryTrendChart', source: 'duckdb', duckdbComponent: 'DuckDBCategoryTrendChart' },
  { chartName: 'CategoryHourlyChart', source: 'duckdb', duckdbComponent: 'DuckDBCategoryHourlyChart' },
  { chartName: 'CategoryMixChart', source: 'duckdb', duckdbComponent: 'DuckDBCategoryMixChart' },
  { chartName: 'StoreBenchmarkChart', source: 'duckdb', duckdbComponent: 'DuckDBStoreBenchmarkChart' },

  // ── Phase 3.3: JS 版削除済み → DuckDB 専用 ──
  { chartName: 'TimeSlotSalesChart', source: 'duckdb', duckdbComponent: 'DuckDBTimeSlotChart' },
  { chartName: 'TimeSlotHeatmapChart', source: 'duckdb', duckdbComponent: 'DuckDBHeatmapChart' },
  { chartName: 'StoreTimeSlotComparisonChart', source: 'duckdb', duckdbComponent: 'DuckDBStoreHourlyChart' },
  { chartName: 'DeptHourlyPatternChart', source: 'duckdb', duckdbComponent: 'DuckDBDeptHourlyChart' },
  { chartName: 'YoYVarianceChart', source: 'duckdb', duckdbComponent: 'DuckDBYoYChart' },

  // ── JS 専用チャート（StoreResult ベース）──
  { chartName: 'DailySalesChart', source: 'js', jsComponent: 'DailySalesChart' },
  { chartName: 'BudgetVsActualChart', source: 'js', jsComponent: 'BudgetVsActualChart' },
  { chartName: 'GrossProfitRateChart', source: 'js', jsComponent: 'GrossProfitRateChart' },
  { chartName: 'CategoryPieChart', source: 'js', jsComponent: 'CategoryPieChart' },
  { chartName: 'SalesPurchaseComparisonChart', source: 'js', jsComponent: 'SalesPurchaseComparisonChart' },
  { chartName: 'EstimatedInventoryDetailChart', source: 'js', jsComponent: 'EstimatedInventoryDetailChart' },
  { chartName: 'PrevYearComparisonChart', source: 'js', jsComponent: 'PrevYearComparisonChart' },
  { chartName: 'GrossProfitAmountChart', source: 'js', jsComponent: 'GrossProfitAmountChart' },
  { chartName: 'DiscountTrendChart', source: 'js', jsComponent: 'DiscountTrendChart' },
  { chartName: 'BudgetDiffTrendChart', source: 'js', jsComponent: 'BudgetDiffTrendChart' },
  { chartName: 'CustomerTrendChart', source: 'js', jsComponent: 'CustomerTrendChart' },
  { chartName: 'TransactionValueChart', source: 'js', jsComponent: 'TransactionValueChart' },
]

/**
 * チャート名からデータソース設定を取得する
 */
export function getChartDataSource(chartName: string): ChartDataSourceConfig | undefined {
  return CHART_DATA_SOURCE_MAP.find((c) => c.chartName === chartName)
}

/**
 * DuckDB パスで動作するチャート一覧
 */
export function getDuckDBCharts(): readonly ChartDataSourceConfig[] {
  return CHART_DATA_SOURCE_MAP.filter((c) => c.source === 'duckdb' || c.source === 'both')
}

/**
 * JS パスで動作するチャート一覧
 */
export function getJSCharts(): readonly ChartDataSourceConfig[] {
  return CHART_DATA_SOURCE_MAP.filter((c) => c.source === 'js' || c.source === 'both')
}
