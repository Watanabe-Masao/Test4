/**
 * widgetMigration — 旧ウィジェット ID → 統合ウィジェット ID のマイグレーション。
 * widgetLayout.ts から分離した純粋変換ロジック。
 */

/**
 * 旧 DuckDB 専用ウィジェット ID → 統合ウィジェット ID へのマイグレーションマップ。
 * ユーザーの保存済みレイアウトに旧 ID が含まれている場合、自動的に統合 ID に変換する。
 */
export const WIDGET_ID_MIGRATION: ReadonlyMap<string, string> = new Map([
  ['duckdb-timeslot', 'chart-timeslot-sales'],
  ['duckdb-heatmap', 'chart-timeslot-heatmap'],
  ['duckdb-dept-hourly', 'chart-dept-hourly-pattern'],
  ['duckdb-store-hourly', 'chart-store-timeslot-comparison'],
  ['analysis-duckdb-yoy', 'analysis-yoy-variance'],
  // Daily KPI → ConditionSummaryEnhanced に吸収
  ['daily-kpi-sales', 'widget-budget-achievement'],
  ['daily-kpi-cost', 'widget-budget-achievement'],
  ['daily-kpi-discount', 'widget-budget-achievement'],
  ['daily-kpi-gp-rate', 'widget-budget-achievement'],
  ['daily-kpi-markup', 'widget-budget-achievement'],
  ['daily-kpi-cost-inclusion', 'widget-budget-achievement'],
  ['daily-chart-sales', 'chart-daily-sales'],
  // KPIカード → ConditionSummaryEnhanced に吸収
  ['kpi-core-sales', 'widget-budget-achievement'],
  ['kpi-total-cost', 'widget-budget-achievement'],
  ['kpi-inv-gross-profit', 'widget-budget-achievement'],
  ['kpi-est-margin', 'widget-budget-achievement'],
  ['kpi-inventory-cost', 'widget-budget-achievement'],
  ['kpi-delivery-sales', 'widget-budget-achievement'],
  ['kpi-cost-inclusion', 'widget-budget-achievement'],
  ['kpi-discount-loss', 'widget-budget-achievement'],
  ['kpi-core-markup', 'widget-budget-achievement'],
  // 前年比較 → ConditionSummaryEnhancedヘッダに吸収
  ['kpi-py-same-dow', 'widget-budget-achievement'],
  ['kpi-py-same-date', 'widget-budget-achievement'],
  ['kpi-dow-gap', 'widget-budget-achievement'],
  // ExecSummaryBar → ConditionSummaryEnhanced に吸収
  ['exec-summary-bar', 'widget-budget-achievement'],
  // 収益概況テーブル → ConditionSummaryEnhanced に吸収
  ['kpi-summary-table', 'widget-budget-achievement'],
  // コンディションサマリー → widget-budget-achievement に統合
  ['analysis-condition-summary', 'widget-budget-achievement'],
  // PLAN/ACTUAL/FORECAST → exec-forecast-tools に統合
  ['exec-plan-actual-forecast', 'exec-forecast-tools'],
  // カテゴリ偏り・カテゴリ分析 → chart-daily-sales に統合
  ['chart-category-pie', 'chart-daily-sales'],
  ['chart-category-hierarchy-explorer', 'chart-daily-sales'],
  ['chart-category-analysis', 'chart-daily-sales'],
  // 売変内訳 → chart-daily-sales 売変モードに統合
  ['chart-discount-breakdown', 'chart-daily-sales'],
  ['chart-dept-hourly-pattern', 'chart-daily-sales'],
  // 部門別KPIトレンド → exec-department-kpi に統合
  ['analysis-duckdb-dept-trend', 'exec-department-kpi'],
])

/** 旧 ID を統合 ID に変換し、重複を除去する */
export function migrateWidgetIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    const migrated = WIDGET_ID_MIGRATION.get(id) ?? id
    if (!seen.has(migrated)) {
      seen.add(migrated)
      result.push(migrated)
    }
  }
  return result
}
