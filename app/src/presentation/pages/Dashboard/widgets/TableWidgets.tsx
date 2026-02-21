/**
 * TableWidgets – barrel re-export
 *
 * 元の 1038 行ファイルを以下に分割:
 *   - SalesAnalysisWidgets.tsx  (曜日平均・週別サマリー)
 *   - DataTableWidgets.tsx      (日別×店舗売上・日別推定在庫)
 *   - KpiTableWidgets.tsx       (店舗別KPI・部門別KPI)
 */
export { renderDowAverage, renderWeeklySummary } from './SalesAnalysisWidgets'
export { renderDailyStoreSalesTable, renderDailyInventoryTable } from './DataTableWidgets'
export { renderStoreKpiTable, renderDepartmentKpiTable } from './KpiTableWidgets'
