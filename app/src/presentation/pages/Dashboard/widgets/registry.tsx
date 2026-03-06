import type { WidgetDef } from './types'
import { WIDGETS_KPI } from './registryKpiWidgets'
import { WIDGETS_CHART } from './registryChartWidgets'
import { WIDGETS_EXEC } from './registryExecWidgets'
import { WIDGETS_ANALYSIS } from './registryAnalysisWidgets'
import { WIDGETS_DUCKDB } from './registryDuckDBWidgets'

/**
 * ウィジェットレジストリ（全ウィジェット定義の統合配列）
 *
 * 順序はダッシュボード上の表示順と一致する。
 * chart-sales-purchase-comparison は exec ウィジェット群の中間に位置するため、
 * WIDGETS_CHART / WIDGETS_EXEC をスライスして正確な順序を維持している。
 */
export const WIDGET_REGISTRY: readonly WidgetDef[] = [
  ...WIDGETS_KPI,
  ...WIDGETS_CHART.slice(0, 9),
  ...WIDGETS_EXEC.slice(0, 9),
  WIDGETS_CHART[9], // chart-sales-purchase-comparison
  ...WIDGETS_EXEC.slice(9),
  ...WIDGETS_ANALYSIS,
  ...WIDGETS_DUCKDB,
]
