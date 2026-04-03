# Architecture State Snapshot

> Generated: 2026-04-03T06:11:34.697Z

## Allowlist Summary

| 指標 | 値 |
|---|---|
| 総エントリ数 | 42 |
| アクティブリスト数 | 12 |
| 凍結リスト数 | 9 |
| .vm.ts ファイル数 | 28 |
| 互換 re-export 残数 | 2 |

## Category Breakdown

| カテゴリ | 件数 |
|---|---|
| structural | 35 |
| adapter | 5 |
| lifecycle | 2 |


## Active Bridges

- application/services/budgetAnalysisBridge.ts (194 lines)
- application/services/factorDecompositionBridge.ts (322 lines)
- application/services/forecastBridge.ts (437 lines)
- application/services/grossProfitBridge.ts (473 lines)
- application/services/timeSlotBridge.ts (174 lines)

## Facade Hooks

- application/hooks/duckdb/useAdvancedQueries.ts
- application/hooks/duckdb/useAsyncQuery.ts
- application/hooks/duckdb/useCtsAggregationQueries.ts
- application/hooks/duckdb/useCtsHierarchyQueries.ts
- application/hooks/duckdb/useDailyRecordQueries.ts
- application/hooks/duckdb/useDeptKpiQueries.ts
- application/hooks/duckdb/useFeatureQueries.ts
- application/hooks/duckdb/useJsAggregationQueries.ts
- application/hooks/duckdb/useJsFeatureQueries.ts
- application/hooks/duckdb/useJsSalesCompQueries.ts
- application/hooks/duckdb/useMetricsQueries.ts
- application/hooks/duckdb/usePurchaseComparisonQuery.ts
- application/hooks/duckdb/useStoreCostPriceQuery.ts
- application/hooks/duckdb/useStoreDailyMarkupRateQuery.ts
- application/hooks/duckdb/useSummaryQueries.ts
- application/hooks/duckdb/useYoyQueries.ts
- application/hooks/useAnalysisInput.ts
- application/hooks/useAnalyticsResolver.ts
- application/hooks/useAppShortcuts.ts
- application/hooks/useAutoBackup.ts
- application/hooks/useAutoImport.ts
- application/hooks/useAutoLoadPrevYear.ts
- application/hooks/useBackup.ts
- application/hooks/useCalculation.ts
- application/hooks/useComparisonContext.ts
- application/hooks/useComparisonModule.ts
- application/hooks/useDataRecovery.ts
- application/hooks/useDeviceSync.ts
- application/hooks/useDrillAction.ts
- application/hooks/useDuckDB.ts
- application/hooks/useEngineLifecycle.ts
- application/hooks/useEtrnStationSearch.ts
- application/hooks/useExplanation.ts
- application/hooks/useFactorDecomposition.ts
- application/hooks/useFilterSelectors.ts
- application/hooks/useGeocode.ts
- application/hooks/useHierarchySelection.ts
- application/hooks/useImport.ts
- application/hooks/useLoadComparisonData.ts
- application/hooks/useMetricBreakdown.ts
- application/hooks/useMonthSwitcher.ts
- application/hooks/useMonthlyHistory.ts
- application/hooks/useMultiMovingAverage.ts
- application/hooks/usePeriodAwareKpi.ts
- application/hooks/usePersistence.ts
- application/hooks/usePrevYearWeather.ts
- application/hooks/usePurchaseAnalysis.ts
- application/hooks/useQueryWithHandler.ts
- application/hooks/useRawDataFetch.ts
- application/hooks/useRouteSync.ts
- application/hooks/useSensitivity.ts
- application/hooks/useSettings.ts
- application/hooks/useStoragePersistence.ts
- application/hooks/useStoreSelection.ts
- application/hooks/useStoredMonthsMonitor.ts
- application/hooks/useTemporalAnalysis.ts
- application/hooks/useTimeSlotData.ts
- application/hooks/useUndoRedo.ts
- application/hooks/useWeather.ts
- application/hooks/useWeatherFallback.ts
- application/hooks/useWeatherForecast.ts
- application/hooks/useWeatherHourlyOnDemand.ts
- application/hooks/useWeatherStoreId.ts
- application/hooks/useWidgetQueryContext.ts

## Complexity Hotspots (Top 10)

| ファイル | useMemo | useState | 行数 |
|---|---|---|---|
| application/hooks/useTimeSlotData.ts | 20 | 8 | 372 |
| presentation/pages/Dashboard/widgets/useDrilldownData.ts | 14 | 10 | 413 |
| presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx | 15 | 5 | 517 |
| presentation/pages/CostDetail/useCostDetailData.ts | 13 | 6 | 210 |
| presentation/components/charts/TimeSlotChart.tsx | 10 | 6 | 209 |
| presentation/components/charts/useCategoryTrendChartData.ts | 9 | 7 | 225 |
| presentation/pages/Dashboard/widgets/HourlyChart.tsx | 10 | 6 | 514 |
| presentation/components/charts/useDeptHourlyChartData.ts | 9 | 6 | 247 |
| presentation/pages/Admin/RawDataTab.tsx | 13 | 2 | 335 |
| presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx | 7 | 7 | 480 |

## Near-Limit Files (≥80%)

| ファイル | 指標 | 実測 | 上限 | % |
|---|---|---|---|---|
| application/hooks/usePeriodAwareKpi.ts | lines | 301 | 310 | 97% |
| application/hooks/useTimeSlotData.ts | lines | 372 | 390 | 95% |
| presentation/pages/CostDetail/useCostDetailData.ts | useMemo | 12 | 13 | 92% |
| presentation/pages/Dashboard/widgets/useDrilldownData.ts | useMemo | 12 | 13 | 92% |
| presentation/pages/Admin/RawDataTab.tsx | useMemo | 12 | 13 | 92% |
| presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx | useMemo | 11 | 12 | 92% |
| presentation/pages/Dashboard/widgets/HourlyChart.tsx | useMemo | 9 | 10 | 90% |
| application/hooks/duckdb/categoryBenchmarkLogic.ts | lines | 401 | 450 | 89% |
| application/hooks/useTimeSlotData.ts | useMemo | 7 | 8 | 88% |
| presentation/pages/Dashboard/widgets/DrilldownWaterfall.tsx | useMemo | 7 | 8 | 88% |
| presentation/components/charts/TimeSlotChart.tsx | useMemo | 7 | 8 | 88% |
| presentation/pages/Dashboard/widgets/useMonthlyCalendarState.ts | useState | 9 | 11 | 82% |
| presentation/components/charts/DailySalesChartBody.tsx | useMemo | 8 | 10 | 80% |

## Frozen Lists

- presentationToInfrastructure
- infrastructureToApplication
- presentationToUsecases
- presentationDuckdbHook
- largeComponentTier2
- cmpPrevYearDaily
- cmpFramePrevious
- cmpDailyMapping
- dowCalcOverride

## Per-List Detail

| リスト名 | 件数 | カテゴリ内訳 |
|---|---|---|
| presentationMemoLimits | 8 | structural:8 |
| applicationToInfrastructure | 7 | adapter:5, lifecycle:2 |
| domainLargeFiles | 7 | structural:7 |
| presentationStateLimits | 4 | structural:4 |
| useStateLimits | 3 | structural:3 |
| hookLineLimits | 3 | structural:3 |
| ctxHook | 3 | structural:3 |
| useMemoLimits | 2 | structural:2 |
| vmReactImport | 2 | structural:2 |
| infraLargeFiles | 1 | structural:1 |
| usecasesLargeFiles | 1 | structural:1 |
| sideEffectChain | 1 | structural:1 |
| presentationToInfrastructure | 0 | - |
| infrastructureToApplication | 0 | - |
| presentationToUsecases | 0 | - |
| presentationDuckdbHook | 0 | - |
| largeComponentTier2 | 0 | - |
| cmpPrevYearDaily | 0 | - |
| cmpFramePrevious | 0 | - |
| cmpDailyMapping | 0 | - |
| dowCalcOverride | 0 | - |