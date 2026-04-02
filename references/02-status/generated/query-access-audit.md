# Query Access Audit Report

> Generated: 2026-04-02T14:36:49.388Z

## Route Summary

| 経路種別 | 件数 | 状態 |
|---|---|---|
| QueryHandler 定義 | 30 | 基盤 |
| useQueryWithHandler（正規） | 29 | 正規 |
| comparisonAccessors（正規） | 10 | 正規 |
| facade / bundle hook 使用（正規） | 4 | 正規 |
| bundle hook 定義 | 1 | 基盤 |
| executor.execute 直呼び（要注意） | 0 | 要注意 |
| useAsyncQuery 直 import（互換） | 0 | 互換 |
| infrastructure/duckdb 直 import（禁止） | 0 | 禁止 |

## Detail

### queryWithHandler

- presentation/components/charts/CumulativeChart.tsx
- presentation/components/charts/CvTimeSeriesChart.tsx
- presentation/components/charts/DeptTrendChart.tsx
- presentation/components/charts/DowPatternChart.tsx
- presentation/components/charts/FactorDecompositionPanel.tsx
- presentation/components/charts/FeatureChart.tsx
- presentation/components/charts/HeatmapChart.tsx
- presentation/components/charts/PiCvBubbleChart.tsx
- presentation/components/charts/StoreHourlyChart.tsx
- presentation/components/charts/StorePIComparisonChart.tsx
- presentation/components/charts/WeatherAnalysisPanel.tsx
- presentation/components/charts/YoYChart.tsx
- presentation/components/charts/useCategoryHierarchyData.ts
- presentation/components/charts/useCategoryTrendChartData.ts
- presentation/components/charts/useDeptHourlyChartData.ts
- presentation/components/charts/useIntegratedSalesState.ts
- presentation/components/widgets/PageWidgetContainer.tsx
- presentation/components/widgets/types.ts
- presentation/pages/Dashboard/widgets/ConditionMatrixTable.tsx
- presentation/pages/Dashboard/widgets/ConditionSummaryBudgetDrill.tsx
- presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx
- features/category/ui/charts/CategoryBarChart.tsx
- features/category/ui/charts/CategoryBenchmarkChart.vm.ts
- features/category/ui/charts/CategoryBoxPlotChart.vm.ts
- features/category/ui/charts/CategoryDiscountChart.tsx
- features/category/ui/charts/CategoryHierarchyExplorer.tsx
- features/category/ui/charts/CategoryHourlyChart.tsx
- features/category/ui/charts/CategoryMixChart.tsx
- features/category/ui/charts/CategoryPerformanceChart.tsx

### queryHandlers

- application/queries/advanced/CategoryBenchmarkHandler.ts
- application/queries/advanced/CategoryBenchmarkTrendHandler.ts
- application/queries/advanced/CategoryHierarchyHandler.ts
- application/queries/advanced/CategoryMixWeeklyHandler.ts
- application/queries/advanced/ConditionMatrixHandler.ts
- application/queries/comparison/YoyDailyHandler.ts
- application/queries/cts/CategoryDailyTrendHandler.ts
- application/queries/cts/CategoryDiscountHandler.ts
- application/queries/cts/CategoryHourlyHandler.ts
- application/queries/cts/CategoryTimeRecordsHandler.ts
- application/queries/cts/DistinctDayCountHandler.ts
- application/queries/cts/HourDowMatrixHandler.ts
- application/queries/cts/HourlyAggregationHandler.ts
- application/queries/cts/LevelAggregationHandler.ts
- application/queries/cts/StoreAggregationHandler.ts
- application/queries/cts/StoreCategoryPIHandler.ts
- application/queries/dailyRecords/DailyRecordsHandler.ts
- application/queries/dept/DeptKpiTrendHandler.ts
- application/queries/features/DailyFeaturesHandler.ts
- application/queries/features/DowPatternHandler.ts
- application/queries/freePeriodBudgetHandler.ts
- application/queries/freePeriodDeptKPIHandler.ts
- application/queries/freePeriodHandler.ts
- application/queries/purchase/StoreDailyMarkupRateHandler.ts
- application/queries/summary/AggregatedRatesHandler.ts
- application/queries/summary/DailyCumulativeHandler.ts
- application/queries/summary/DailyQuantityHandler.ts
- application/queries/summary/StoreDaySummaryHandler.ts
- application/queries/temporal/MovingAverageHandler.ts
- application/queries/weather/WeatherHourlyHandler.ts

### comparisonAccessor

- presentation/pages/Daily/DailyPage.tsx
- presentation/pages/Dashboard/widgets/AlertPanel.tsx
- presentation/pages/Dashboard/widgets/DayDetailModal.tsx
- presentation/pages/Dashboard/widgets/DayDetailModal.vm.ts
- presentation/pages/Dashboard/widgets/calendarUtils.ts
- presentation/pages/Dashboard/widgets/useMonthlyCalendarState.ts
- presentation/pages/Forecast/ForecastPage.helpers.ts
- features/budget/ui/InsightTabBudget.tsx
- features/budget/ui/InsightTabBudget.vm.ts
- application/usecases/clipExport/buildClipBundle.ts

### facadeHook

- presentation/hooks/useChartInteractionBundle.ts
- presentation/hooks/useComparisonBundle.ts
- presentation/hooks/useQueryBundle.ts
- presentation/hooks/useUnifiedWidgetContext.ts

### bundleHookDef

- application/hooks/useFreePeriodAnalysisBundle.ts

### weatherRoutes

- presentation/components/charts/WeatherAnalysisPanel.tsx
- presentation/components/charts/WeatherCorrelationChart.tsx
- presentation/components/charts/WeatherCorrelationChart.vm.ts
- presentation/hooks/useQueryBundle.ts
- presentation/pages/Dashboard/widgets/EtrnTestWidget.tsx
- presentation/pages/Dashboard/widgets/WeatherWidget.tsx
