/**
 * 統一ウィジェットコンテキストを構築するフック
 *
 * 全ページで共通のコンテキストを構築する。
 * ページ固有のデータ（insightData, costDetailData 等）は
 * 各ページから追加で注入する。
 *
 * 内部は 4 つの context slice に分割されている:
 *   useComparisonSlice       — 比較期間・モード
 *   useQuerySlice            — query 実行・readModel アクセス
 *   useWeatherSlice          — 天気データ
 *   useChartInteractionSlice — 月次履歴 / CTS / チャート期間
 * @responsibility R:orchestration
 */
import { useState, useCallback, useMemo } from 'react'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import type { MetricId } from '@/domain/models/analysis'
import type { DateRange } from '@/domain/models/calendar'
import { readyStoreResult } from '@/domain/models/storeTypes'
import { readyPrevYearData } from '@/features/comparison'
import { useCalculation } from '@/application/hooks/calculation'
import { useStoreSelection, useExplanations } from '@/application/hooks/ui'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useRepository } from '@/application/context/useRepository'
import { detectDataMaxDay } from '@/application/services/dataDetection'
import { useDeptKpiView } from '@/application/hooks/useDeptKpiView'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { buildFreePeriodFrame } from '@/domain/models/buildFreePeriodFrame'
import { useFreePeriodAnalysisBundle } from '@/application/hooks/useFreePeriodAnalysisBundle'
import { useTimeSlotBundle } from '@/application/hooks/timeSlot/useTimeSlotBundle'
import type { TimeSlotFrame } from '@/application/hooks/timeSlot/TimeSlotBundle.types'
import { useStoreDailyBundle } from '@/application/hooks/storeDaily/useStoreDailyBundle'
import type { StoreDailyFrame } from '@/application/hooks/storeDaily/StoreDailyBundle.types'
import { useCategoryDailyBundle } from '@/application/hooks/categoryDaily/useCategoryDailyBundle'
import type { CategoryDailyFrame } from '@/application/hooks/categoryDaily/CategoryDailyBundle.types'
import { useComparisonSlice } from './slices/useComparisonSlice'
import { useQuerySlice } from './slices/useQuerySlice'
import { useWeatherSlice } from './slices/useWeatherSlice'
import { useChartInteractionSlice } from './slices/useChartInteractionSlice'

interface UseUnifiedWidgetContextResult {
  /** 統一コンテキスト（currentResult が null の場合は null） */
  ctx: UnifiedWidgetContext | null
  /** 計算中かどうか */
  isComputing: boolean
  /** 計算済みかどうか */
  isCalculated: boolean
  /** 選択中の店舗名 */
  storeName: string
  /** 計算月の日数 */
  daysInMonth: number
  /** 指標説明パネルの state */
  explainMetric: MetricId | null
  setExplainMetric: (id: MetricId | null) => void
  /** 前年詳細パネルの state */
  prevYearDetailType: 'sameDow' | 'sameDate' | null
  setPrevYearDetailType: (type: 'sameDow' | 'sameDate' | null) => void
}

export function useUnifiedWidgetContext(): UseUnifiedWidgetContextResult {
  // ── コア（計算・店舗・設定） ──
  const { isCalculated, isComputing, daysInMonth } = useCalculation()
  const { currentResult, selectedResults, storeName, stores, selectedStoreIds } =
    useStoreSelection()
  const currentMonthData = useDataStore((s) => s.currentMonthData)
  const storeResults = useDataStore((s) => s.storeResults)
  const settings = useSettingsStore((s) => s.settings)
  const periodSelection = usePeriodSelectionStore((s) => s.selection)
  const repo = useRepository()
  const targetYear = settings.targetYear
  const targetMonth = settings.targetMonth

  // ── 自由期間分析レーン (unify-period-analysis Phase 1) ──
  // PeriodSelection → FreePeriodAnalysisFrame adapter を経由して frame を構築し、
  // useFreePeriodAnalysisBundle で 3 readModel (fact / budget / deptKPI) を
  // 一括取得する。既存の query slice と並置し、widget は段階的に bundle 経由に
  // 移行する。presentation 配下で buildFreePeriodFrame を呼ぶ唯一の場所。
  const analysisFrame = useMemo(
    () =>
      buildFreePeriodFrame(
        periodSelection,
        Array.from(selectedStoreIds).sort(),
        currentResult?.elapsedDays,
      ),
    [periodSelection, selectedStoreIds, currentResult?.elapsedDays],
  )

  // ── 比較 slice (Phase 1: frame 経由入口) ──
  const comparison = useComparisonSlice(
    analysisFrame,
    periodSelection,
    currentResult?.elapsedDays,
    currentResult?.averageDailySales ?? 0,
  )

  // ── クエリ / readModels slice ──
  const query = useQuerySlice(
    targetYear,
    targetMonth,
    daysInMonth,
    selectedStoreIds,
    repo,
    comparison.prevYearScope?.dateRange,
  )

  // ── 天気 slice ──
  const weather = useWeatherSlice(
    targetYear,
    targetMonth,
    selectedStoreIds,
    stores,
    comparison.prevYearScope?.dateRange,
  )

  // ── チャート操作 slice ──
  const chart = useChartInteractionSlice(
    repo,
    targetYear,
    targetMonth,
    daysInMonth,
    stores.size,
    selectedStoreIds,
    currentResult,
    periodSelection.activePreset,
  )

  // ── 自由期間分析 bundle (unify-period-analysis Phase 1) ──
  // analysisFrame は先に構築済み (useComparisonSlice の入口用)。ここでは
  // query.queryExecutor と組み合わせて 3 readModel (fact / budget / deptKPI)
  // を取得する。既存の query slice と並置され、widget は段階的に bundle 経由に
  // 移行する。
  const freePeriodBundle = useFreePeriodAnalysisBundle(query.queryExecutor, analysisFrame)

  // ── effective 最終日 (経過日数 cap、elapsedDays が設定されていれば優先) ──
  // timeSlotFrame / ctx.currentDateRange で共通使用する唯一の計算点。
  const effectiveEndDay = currentResult
    ? currentResult.elapsedDays != null && currentResult.elapsedDays > 0
      ? Math.min(currentResult.elapsedDays, daysInMonth)
      : daysInMonth
    : daysInMonth

  // ── 時間帯比較レーン (unify-period-analysis Phase 6 Step C) ──
  // FreePeriodReadModel と sibling 関係。raw 時間帯 row を presentation に
  // 漏らさず、TimeSlotSeries (projection 済み) を bundle 経由で配布する。
  // 比較期間は freePeriodLane と同じ comparison scope を流用する。
  const timeSlotFrame = useMemo<TimeSlotFrame | null>(() => {
    if (!currentResult) return null
    return {
      dateRange: {
        from: { year: targetYear, month: targetMonth, day: 1 },
        to: { year: targetYear, month: targetMonth, day: effectiveEndDay },
      },
      storeIds: [...selectedStoreIds].sort(),
      comparison: comparison.scope,
    }
  }, [currentResult, effectiveEndDay, targetYear, targetMonth, selectedStoreIds, comparison.scope])

  const timeSlotBundle = useTimeSlotBundle(query.queryExecutor, timeSlotFrame)

  // ── 店舗別日次レーン (unify-period-analysis Phase 6.5 Step B) ──
  // timeSlotLane の sibling。raw StoreResult.daily を presentation に
  // 漏らさず、StoreDailySeries (projection 済み) を bundle 経由で配布する。
  // 比較期間は timeSlotLane と同じ comparison scope を流用する。
  const storeDailyFrame = useMemo<StoreDailyFrame | null>(() => {
    if (!currentResult) return null
    return {
      dateRange: {
        from: { year: targetYear, month: targetMonth, day: 1 },
        to: { year: targetYear, month: targetMonth, day: effectiveEndDay },
      },
      storeIds: [...selectedStoreIds].sort(),
      comparison: comparison.scope,
    }
  }, [currentResult, effectiveEndDay, targetYear, targetMonth, selectedStoreIds, comparison.scope])

  const storeDailyBundle = useStoreDailyBundle(query.queryExecutor, storeDailyFrame)

  // ── 部門×日次レーン (unify-period-analysis Phase 6.5 Step B) ──
  // storeDailyLane の sibling。raw CTS レコードを presentation
  // に漏らさず、CategoryDailySeries (projection 済み) を bundle 経由で
  // 配布する。比較期間は同 comparison scope を流用。
  const categoryDailyFrame = useMemo<CategoryDailyFrame | null>(() => {
    if (!currentResult) return null
    return {
      dateRange: {
        from: { year: targetYear, month: targetMonth, day: 1 },
        to: { year: targetYear, month: targetMonth, day: effectiveEndDay },
      },
      storeIds: [...selectedStoreIds].sort(),
      comparison: comparison.scope,
    }
  }, [currentResult, effectiveEndDay, targetYear, targetMonth, selectedStoreIds, comparison.scope])

  const categoryDailyBundle = useCategoryDailyBundle(query.queryExecutor, categoryDailyFrame)

  // ── コア: 説明・パネル状態 ──
  const explanations = useExplanations(comparison.kpi, comparison.dowGap)
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])
  const [prevYearDetailType, setPrevYearDetailType] = useState<'sameDow' | 'sameDate' | null>(null)
  const handlePrevYearDetail = useCallback((type: 'sameDow' | 'sameDate') => {
    setPrevYearDetailType(type)
  }, [])

  // ── コア: 派生値 ──
  const dataMaxDay = useMemo(
    () => (currentMonthData ? detectDataMaxDay(currentMonthData) : 0),
    [currentMonthData],
  )
  const deptKpiIndex = useDeptKpiView()
  const { format: fmtCurrency } = useCurrencyFormat()

  // effectiveEndDay は上で timeSlotFrame 構築前に宣言済み (共通計算点)

  const storeNames = useMemo(() => {
    const map = new Map<string, string>()
    selectedResults.forEach((sr) => {
      map.set(sr.storeId, stores.get(sr.storeId)?.name ?? sr.storeId)
    })
    return map
  }, [selectedResults, stores])

  // ── ctx 組み立て（bundle の結果を合成） ──
  const ctx: UnifiedWidgetContext | null = useMemo(() => {
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
  }, [
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
  ])

  return {
    ctx,
    isComputing,
    isCalculated,
    storeName,
    daysInMonth,
    explainMetric,
    setExplainMetric,
    prevYearDetailType,
    setPrevYearDetailType,
  }
}
