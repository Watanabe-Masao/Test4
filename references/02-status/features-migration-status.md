# features/ 縦スライス移行 進捗管理表

## ステータス定義

- ✅ 完了
- n/a 対象外（shared-core を使用 / feature 固有ロジックなし）

## 進捗表

| Feature | Domain | Application | UI | Page Shell | Barrel | Done |
|---------|--------|-------------|-----|------------|--------|------|
| sales | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| storage-admin | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| budget | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| forecast | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| purchase | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| category | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| cost-detail | n/a | ✅ | ✅ | ✅ | ✅ | ✅ |
| reports | n/a | n/a | ✅ | ✅ | ✅ | ✅ |

## 全8 feature 完了

- **sales**: domain(3 pure関数) + application(dailySalesTransform) + ui(SalesAnalysisWidgets)
- **storage-admin**: application(useMonthDataManagement) + ui(6 sections + styles + types)
- **budget**: application(useBudgetChartData) + ui(InsightTabBudget + vm)
- **forecast**: application(useForecast) + ui(InsightTabForecast + vm)
- **purchase**: application(purchaseAnalysisHelpers) + ui(PurchaseDailyPivot + PurchaseTables + Chart)
- **category**: application(categoryData + CategoryTotalView.vm) + ui(8 components + styles + widgets)
- **cost-detail**: application(useCostDetailData + helpers + types) + ui(3 tabs + widgets + styles)
- **reports**: ui(ReportSummaryGrid + ReportDeptTable + widgets + styles) — application 固有ロジックなし

## 後方互換

全移動ファイルの旧パスに barrel re-export を配置。既存の import パスは変更不要。

## Dashboard Widget Ownership

全 31 widget に owner が定義済み（`test/widgetOwnershipRegistry.ts`）。

| Owner | Count | Widget IDs |
|-------|-------|-----------|
| sales | 7 | chart-daily-sales, chart-timeslot-heatmap, chart-store-timeslot-comparison, analysis-customer-scatter, exec-dow-average, exec-daily-store-sales, duckdb-dow-pattern |
| budget | 3 | chart-gross-profit-amount, analysis-waterfall, analysis-gp-heatmap |
| forecast | 2 | analysis-seasonal-benchmark, exec-forecast-tools |
| category | 4 | analysis-category-pi, duckdb-category-mix, duckdb-category-benchmark, duckdb-category-boxplot |
| purchase | 1 | chart-sales-purchase-comparison |
| cost-detail | 1 | exec-daily-inventory |
| shared | 12 | widget-budget-achievement, chart-weather-correlation, chart-etrn-test, analysis-performance-index, analysis-causal-chain, analysis-sensitivity, analysis-regression-insight, analysis-duckdb-features, analysis-alert-panel, exec-monthly-calendar, exec-store-kpi, duckdb-cv-timeseries |
| exec-weekly-summary | — | sales owner (exec-weekly-summary) |

Guard: `structuralConventionGuard.test.ts` — 未登録 widget / orphan / shared 理由なし を CI で検出。

## 次の移行対象（別 Epic）

- owner 付き widget の正本を feature 配下へ実体移動
- domain/calculations/ の feature 移動
- charts/ 配下の category 系チャートの feature 回収
