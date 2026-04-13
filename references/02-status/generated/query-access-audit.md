# Query Access Audit Report

> Generated: 2026-04-13T22:10:43.754Z

## Route Summary

| 経路種別 | 件数 | 状態 |
|---|---|---|
| QueryHandler 定義 | 47 | 基盤 |
| PairedQueryHandler（pair 化済み） | 13 | 基盤 |
| Screen Plan hook（plan 化済み） | 28 | 基盤 |
| useQueryWithHandler（正規） | 0 | 正規 |
| comparisonAccessors（正規） | 10 | 正規 |
| facade / bundle hook 使用（正規） | 5 | 正規 |
| bundle hook 定義 | 1 | 基盤 |
| executor.execute 直呼び（要注意） | 0 | 要注意 |
| useAsyncQuery 直 import（互換） | 0 | 互換 |
| infrastructure/duckdb 直 import（禁止） | 0 | 禁止 |

## Detail

### queryHandlers

- application/queries/advanced/CategoryBenchmarkHandler.ts
- application/queries/advanced/CategoryBenchmarkTrendHandler.ts
- application/queries/advanced/CategoryHierarchyHandler.ts
- application/queries/advanced/CategoryMixWeeklyHandler.ts
- application/queries/advanced/CategoryMixWeeklyPairHandler.ts
- application/queries/advanced/ConditionMatrixHandler.ts
- application/queries/comparison/YoyDailyHandler.ts
- application/queries/createPairedHandler.ts
- application/queries/cts/CategoryDailyTrendHandler.ts
- application/queries/cts/CategoryDailyTrendPairHandler.ts
- application/queries/cts/CategoryDiscountHandler.ts
- application/queries/cts/CategoryDiscountPairHandler.ts
- application/queries/cts/CategoryHourlyHandler.ts
- application/queries/cts/CategoryHourlyPairHandler.ts
- application/queries/cts/CategoryTimeRecordsHandler.ts
- application/queries/cts/CategoryTimeRecordsPairHandler.ts
- application/queries/cts/DistinctDayCountHandler.ts
- application/queries/cts/DistinctDayCountPairHandler.ts
- application/queries/cts/HourDowMatrixHandler.ts
- application/queries/cts/HourDowMatrixPairHandler.ts
- application/queries/cts/HourlyAggregationHandler.ts
- application/queries/cts/HourlyAggregationPairHandler.ts
- application/queries/cts/LevelAggregationHandler.ts
- application/queries/cts/LevelAggregationPairHandler.ts
- application/queries/cts/StoreAggregationHandler.ts
- application/queries/cts/StoreCategoryPIHandler.ts
- application/queries/cts/StoreCategoryPIPairHandler.ts
- application/queries/dailyRecords/DailyRecordsHandler.ts
- application/queries/dept/DeptKpiTrendHandler.ts
- application/queries/discountFactHandler.ts
- application/queries/features/DailyFeaturesHandler.ts
- application/queries/features/DowPatternHandler.ts
- application/queries/freePeriodBudgetHandler.ts
- application/queries/freePeriodDeptKPIHandler.ts
- application/queries/freePeriodHandler.ts
- application/queries/purchase/StoreDailyMarkupRateHandler.ts
- application/queries/salesFactHandler.ts
- application/queries/summary/AggregatedRatesHandler.ts
- application/queries/summary/AggregatedRatesPairHandler.ts
- application/queries/summary/DailyCumulativeHandler.ts
- application/queries/summary/DailyCumulativePairHandler.ts
- application/queries/summary/DailyQuantityHandler.ts
- application/queries/summary/DailyQuantityPairHandler.ts
- application/queries/summary/StoreDaySummaryHandler.ts
- application/queries/summary/StoreDaySummaryPairHandler.ts
- application/queries/temporal/MovingAverageHandler.ts
- application/queries/weather/WeatherHourlyHandler.ts

### pairHandlers

- application/queries/advanced/CategoryMixWeeklyPairHandler.ts
- application/queries/cts/CategoryDailyTrendPairHandler.ts
- application/queries/cts/CategoryDiscountPairHandler.ts
- application/queries/cts/CategoryHourlyPairHandler.ts
- application/queries/cts/CategoryTimeRecordsPairHandler.ts
- application/queries/cts/DistinctDayCountPairHandler.ts
- application/queries/cts/HourDowMatrixPairHandler.ts
- application/queries/cts/HourlyAggregationPairHandler.ts
- application/queries/cts/LevelAggregationPairHandler.ts
- application/queries/cts/StoreCategoryPIPairHandler.ts
- application/queries/summary/AggregatedRatesPairHandler.ts
- application/queries/summary/DailyCumulativePairHandler.ts
- application/queries/summary/StoreDaySummaryPairHandler.ts

### screenPlanHooks

- application/hooks/plans/useConditionBudgetDrillPlan.ts
- application/hooks/plans/useConditionMatrixPlan.ts
- application/hooks/plans/useCumulativeChartPlan.ts
- application/hooks/plans/useDayDetailPlan.ts
- application/hooks/plans/useDeptHourlyChartPlan.ts
- application/hooks/plans/useDeptTrendChartPlan.ts
- application/hooks/plans/useDowPatternChartPlan.ts
- application/hooks/plans/useFactorDecompositionPlan.ts
- application/hooks/plans/useFeatureChartPlan.ts
- application/hooks/plans/useIntegratedSalesPlan.ts
- application/hooks/plans/useStoreHourlyChartPlan.ts
- application/hooks/plans/useYoYChartPlan.ts
- application/hooks/plans/useYoYWaterfallPlan.ts
- application/hooks/useCategoryBenchmarkPlan.ts
- application/hooks/useHeatmapPlan.ts
- application/hooks/usePerformanceIndexPlan.ts
- presentation/components/charts/useIntegratedSalesPlan.ts
- features/category/application/plans/useCategoryBarChartPlan.ts
- features/category/application/plans/useCategoryDiscountChartPlan.ts
- features/category/application/plans/useCategoryHierarchyPlan.ts
- features/category/application/plans/useCategoryHourlyChartPlan.ts
- features/category/application/plans/useCategoryMixChartPlan.ts
- features/category/application/plans/useCategoryTrendPlan.ts
- features/clip-export/application/plans/useClipExportPlan.ts
- features/time-slot/application/plans/useTimeSlotHierarchyPlan.ts
- features/time-slot/application/plans/useTimeSlotPlan.ts
- features/time-slot/application/plans/useTimeSlotWeatherPlan.ts
- features/weather/application/plans/useWeatherAnalysisPlan.ts

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

- presentation/hooks/slices/useChartInteractionSlice.ts
- presentation/hooks/slices/useComparisonSlice.ts
- presentation/hooks/slices/useQuerySlice.ts
- presentation/hooks/slices/useWeatherSlice.ts
- presentation/hooks/useUnifiedWidgetContext.ts

### bundleHookDef

- application/hooks/useFreePeriodAnalysisBundle.ts

### weatherRoutes

- presentation/components/charts/WeatherAnalysisPanel.tsx
- presentation/components/charts/WeatherCorrelationChart.tsx
- presentation/components/charts/WeatherCorrelationChart.vm.ts
- presentation/hooks/slices/useWeatherSlice.ts
- presentation/pages/Dashboard/widgets/WeatherWidget.tsx
- presentation/pages/Weather/WeatherPage.tsx
