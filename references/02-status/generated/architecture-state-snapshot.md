# Architecture State Snapshot

> Generated: 2026-04-08T13:58:08.848Z

## Allowlist Summary

| 指標 | 値 |
|---|---|
| 総エントリ数 | 13 |
| アクティブリスト数 | 6 |
| 凍結リスト数 | 15 |
| .vm.ts ファイル数 | 27 |
| 互換 re-export 残数 | 2 |

## Category Breakdown

| カテゴリ | 件数 |
|---|---|
| structural | 12 |
| adapter | 1 |


## Active Bridges


## Facade Hooks

- application/hooks/duckdb/useAdvancedQueries.ts
- application/hooks/duckdb/useAsyncQuery.ts
- application/hooks/duckdb/useCtsAggregationQueries.ts
- application/hooks/duckdb/useCtsHierarchyQueries.ts
- application/hooks/duckdb/useDailyRecordQueries.ts
- application/hooks/duckdb/useDeptKpiQueries.ts
- application/hooks/duckdb/useFeatureQueries.ts
- application/hooks/duckdb/useJsFeatureQueries.ts
- application/hooks/duckdb/useJsSalesCompQueries.ts
- application/hooks/duckdb/useMetricsQueries.ts
- application/hooks/duckdb/usePurchaseComparisonQuery.ts
- application/hooks/duckdb/useStoreCostPriceQuery.ts
- application/hooks/duckdb/useStoreDailyMarkupRateQuery.ts
- application/hooks/duckdb/useSummaryQueries.ts
- application/hooks/duckdb/useYoyQueries.ts
- application/hooks/plans/useIntegratedSalesPlan.ts
- application/hooks/useAnalysisInput.ts
- application/hooks/useAnalyticsResolver.ts
- application/hooks/useAppShortcuts.ts
- application/hooks/useAutoBackup.ts
- application/hooks/useAutoImport.ts
- application/hooks/useAutoLoadPrevYear.ts
- application/hooks/useBackup.ts
- application/hooks/useCalculation.ts
- application/hooks/useClipExport.ts
- application/hooks/useComparisonContext.ts
- application/hooks/useDeviceSync.ts
- application/hooks/useDrillAction.ts
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
- application/hooks/useWeatherTriple.ts
- application/hooks/useWidgetQueryContext.ts

## Complexity Hotspots (Top 10)

| ファイル | useMemo | useState | 行数 |
|---|---|---|---|
| presentation/pages/Dashboard/widgets/HourlyChart.tsx | 9 | 6 | 502 |
| presentation/components/charts/TimeSlotChart.tsx | 8 | 6 | 216 |
| presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx | 7 | 7 | 484 |
| presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx | 9 | 5 | 434 |
| presentation/pages/Weather/WeatherPage.tsx | 9 | 5 | 411 |
| presentation/pages/Insight/useInsightData.ts | 5 | 7 | 217 |
| application/hooks/useMetricBreakdown.ts | 7 | 5 | 282 |
| presentation/pages/Dashboard/widgets/DayDetailModal.tsx | 7 | 4 | 343 |
| presentation/components/charts/CvTimeSeriesChart.tsx | 5 | 5 | 247 |
| presentation/pages/Dashboard/widgets/DrilldownWaterfall.tsx | 7 | 3 | 440 |

## Near-Limit Files (≥80%)

| ファイル | 指標 | 実測 | 上限 | % |
|---|---|---|---|---|

## Frozen Lists

- presentationToInfrastructure
- infrastructureToApplication
- presentationToUsecases
- presentationDuckdbHook
- presentationMemoLimits
- presentationStateLimits
- largeComponentTier2
- infraLargeFiles
- usecasesLargeFiles
- cmpPrevYearDaily
- cmpFramePrevious
- cmpDailyMapping
- dowCalcOverride
- vmReactImport
- sideEffectChain

## Per-List Detail

| リスト名 | 件数 | カテゴリ内訳 |
|---|---|---|
| domainLargeFiles | 6 | structural:6 |
| useStateLimits | 3 | structural:3 |
| applicationToInfrastructure | 1 | adapter:1 |
| useMemoLimits | 1 | structural:1 |
| hookLineLimits | 1 | structural:1 |
| ctxHook | 1 | structural:1 |
| presentationToInfrastructure | 0 | - |
| infrastructureToApplication | 0 | - |
| presentationToUsecases | 0 | - |
| presentationDuckdbHook | 0 | - |
| presentationMemoLimits | 0 | - |
| presentationStateLimits | 0 | - |
| largeComponentTier2 | 0 | - |
| infraLargeFiles | 0 | - |
| usecasesLargeFiles | 0 | - |
| cmpPrevYearDaily | 0 | - |
| cmpFramePrevious | 0 | - |
| cmpDailyMapping | 0 | - |
| dowCalcOverride | 0 | - |
| vmReactImport | 0 | - |
| sideEffectChain | 0 | - |