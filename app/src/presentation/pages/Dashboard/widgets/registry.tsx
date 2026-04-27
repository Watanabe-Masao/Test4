/**
 * @responsibility R:unclassified
 */

import type { DashboardWidgetDef } from './types'
import { WIDGETS_KPI } from './registryKpiWidgets'
import { WIDGETS_CHART } from './registryChartWidgets'
import { WIDGETS_EXEC } from './registryExecWidgets'
import { WIDGETS_ANALYSIS } from './registryAnalysisWidgets'
import { WIDGETS_DUCKDB } from './registryDuckDBWidgets'

/**
 * ウィジェットレジストリ（全ウィジェット定義の統合配列）
 *
 * 情報階層に沿った表示順:
 *   1. 予算進捗 + 収益概況 (KPI)
 *   2. モニタリング + トレンド (EXEC)
 *   3. チャート (CHART)
 *   4. 分析 (ANALYSIS)
 *   5. DuckDB探索 (DUCKDB)
 *
 * chart-sales-purchase-comparison は exec ウィジェット群の中間に位置するため、
 * WIDGETS_CHART / WIDGETS_EXEC をスライスして正確な順序を維持している。
 */
export const WIDGET_REGISTRY: readonly DashboardWidgetDef[] = [
  ...WIDGETS_KPI,
  ...WIDGETS_CHART.slice(0, 4), // daily-sales, gross-profit, heatmap, store-timeslot
  ...WIDGETS_EXEC.slice(0, 6),
  WIDGETS_CHART[4], // chart-sales-purchase-comparison
  ...WIDGETS_EXEC.slice(6),
  ...WIDGETS_ANALYSIS,
  ...WIDGETS_DUCKDB,
  ...WIDGETS_CHART.slice(5), // chart-weather-correlation
]
