/**
 * useUnifiedWidgetContext — ctx pure builder
 *
 * useMemo body の pure 計算抽出 (ADR-D-003 PR4)。
 * useUnifiedWidgetContext.ts の `ctx` useMemo body を本 builder に抽出して
 * body 行数を削減する。本関数は完全 pure data composition であり、
 * React hooks や I/O を含まない。
 *
 * @responsibility R:utility
 */
import type { MetricId, StoreExplanations } from '@/domain/models/analysis'
import type { DateRange } from '@/domain/models/calendar'
import type { StoreResult, AppSettings } from '@/domain/models/storeTypes'
import { readyStoreResult } from '@/domain/models/storeTypes'
import { readyPrevYearData } from '@/features/comparison'
import type { Store } from '@/domain/models/record'
import type { DepartmentKpiIndex } from '@/domain/models/DepartmentKpiIndex'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { FreePeriodAnalysisFrame } from '@/domain/models/AnalysisFrame'
import type { FreePeriodAnalysisBundle } from '@/application/hooks/useFreePeriodAnalysisBundle'
import type {
  TimeSlotFrame,
  TimeSlotBundle,
} from '@/application/hooks/timeSlot/TimeSlotBundle.types'
import type {
  StoreDailyFrame,
  StoreDailyBundle,
} from '@/application/hooks/storeDaily/StoreDailyBundle.types'
import type {
  CategoryDailyFrame,
  CategoryDailyBundle,
} from '@/application/hooks/categoryDaily/CategoryDailyBundle.types'
import type { ComparisonSlice } from './slices/useComparisonSlice'
import type { QuerySlice } from './slices/useQuerySlice'
import type { WeatherSlice } from './slices/useWeatherSlice'
import type { ChartInteractionSlice } from './slices/useChartInteractionSlice'

export interface BuildUnifiedWidgetContextInput {
  readonly currentResult: StoreResult | null
  readonly effectiveEndDay: number
  readonly targetYear: number
  readonly targetMonth: number
  readonly settings: AppSettings
  readonly comparison: ComparisonSlice
  readonly stores: ReadonlyMap<string, Store>
  readonly selectedStoreIds: ReadonlySet<string>
  readonly explanations: StoreExplanations
  readonly handleExplain: (metricId: MetricId) => void
  readonly deptKpiIndex: DepartmentKpiIndex
  readonly fmtCurrency: CurrencyFormatter
  readonly periodSelection: PeriodSelection
  readonly storeName: string
  readonly storeResults: ReadonlyMap<string, StoreResult>
  readonly dataMaxDay: number
  readonly handlePrevYearDetail: (type: 'sameDow' | 'sameDate') => void
  readonly query: QuerySlice
  readonly weather: WeatherSlice
  readonly chart: ChartInteractionSlice
  readonly selectedResults: readonly StoreResult[]
  readonly storeNames: ReadonlyMap<string, string>
  readonly analysisFrame: FreePeriodAnalysisFrame
  readonly freePeriodBundle: FreePeriodAnalysisBundle
  readonly timeSlotFrame: TimeSlotFrame | null
  readonly timeSlotBundle: TimeSlotBundle
  readonly storeDailyFrame: StoreDailyFrame | null
  readonly storeDailyBundle: StoreDailyBundle
  readonly categoryDailyFrame: CategoryDailyFrame | null
  readonly categoryDailyBundle: CategoryDailyBundle
}

/**
 * 戻り値型は意図的に省略している。
 * 元の useMemo 本体は `UnifiedWidgetContext` に宣言されていない Dashboard 固有
 * field (`storeKey` / `dataEndDay` / `monthlyHistory` 等) も同居して返しており、
 * useMemo 経由の代入では excess property check が走らないため通っていた。
 * builder 関数で `: UnifiedWidgetContext | null` と annotate すると object
 * literal return の excess property check で型エラーになるため、戻り値型は
 * 推論に委ね、呼び出し側 (useMemo の代入位置) で `UnifiedWidgetContext | null`
 * へ widen する従来の振る舞いを維持する。
 */
export function buildUnifiedWidgetContext(input: BuildUnifiedWidgetContextInput) {
  const {
    currentResult,
    effectiveEndDay,
    targetYear,
    targetMonth,
    settings,
    comparison,
    stores,
    selectedStoreIds,
    explanations,
    handleExplain,
    deptKpiIndex,
    fmtCurrency,
    periodSelection,
    storeName,
    storeResults,
    dataMaxDay,
    handlePrevYearDetail,
    query,
    weather,
    chart,
    selectedResults,
    storeNames,
    analysisFrame,
    freePeriodBundle,
    timeSlotFrame,
    timeSlotBundle,
    storeDailyFrame,
    storeDailyBundle,
    categoryDailyFrame,
    categoryDailyBundle,
  } = input
  if (!currentResult) return null
  const r = currentResult
  const currentDateRange: DateRange = {
    from: { year: targetYear, month: targetMonth, day: 1 },
    to: { year: targetYear, month: targetMonth, day: effectiveEndDay },
  }
  return {
    // コア — ADR-A-004 PR3: slice (status='ready') で wrap
    result: readyStoreResult(r),
    daysInMonth: effectiveEndDay,
    targetRate: settings.targetGrossProfitRate,
    warningRate: settings.warningThreshold,
    year: targetYear,
    month: targetMonth,
    settings,
    prevYear: readyPrevYearData(comparison.daily),
    stores,
    selectedStoreIds,
    explanations,
    onExplain: handleExplain,
    observationStatus: r.observationPeriod.status,
    departmentKpi: deptKpiIndex,
    fmtCurrency,

    // 期間選択
    periodSelection,

    // Dashboard 固有
    storeKey: storeName,
    allStoreResults: storeResults,
    currentDateRange,
    prevYearScope: comparison.prevYearScope,
    dataEndDay: settings.dataEndDay,
    dataMaxDay,
    elapsedDays: r.elapsedDays,
    onPrevYearDetail: handlePrevYearDetail,

    // 比較 slice
    prevYearMonthlyKpi: comparison.kpi,
    comparisonScope: comparison.scope,
    dowGap: comparison.dowGap,

    // クエリ slice
    queryExecutor: query.queryExecutor,
    duckDataVersion: query.duckDataVersion,
    loadedMonthCount: query.loadedMonthCount,
    weatherPersist: query.weatherPersist,
    prevYearStoreCostPrice: query.prevYearStoreCostPrice,
    readModels: query.readModels,

    // 自由期間分析レーン (unify-period-analysis Phase 1)
    freePeriodLane: { frame: analysisFrame, bundle: freePeriodBundle },

    // 時間帯比較レーン (unify-period-analysis Phase 6 Step C)
    timeSlotLane: { frame: timeSlotFrame, bundle: timeSlotBundle },

    // 店舗別日次レーン (unify-period-analysis Phase 6.5 Step B)
    storeDailyLane: { frame: storeDailyFrame, bundle: storeDailyBundle },

    // 部門×日次レーン (unify-period-analysis Phase 6.5 Step B)
    categoryDailyLane: { frame: categoryDailyFrame, bundle: categoryDailyBundle },

    // 天気 slice
    weatherDaily: weather.weatherDaily,
    prevYearWeatherDaily: weather.prevYearWeatherDaily,

    // チャート操作 slice
    monthlyHistory: chart.monthlyHistory,
    currentCtsQuantity: chart.currentCtsQuantity,
    chartPeriodProps: chart.chartPeriodProps,

    // Category 固有
    selectedResults,
    storeNames,
  }
}
