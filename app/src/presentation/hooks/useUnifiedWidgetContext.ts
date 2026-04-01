/**
 * 統一ウィジェットコンテキストを構築するフック
 *
 * 全ページで共通のコンテキストを構築する。
 * ページ固有のデータ（insightData, costDetailData 等）は
 * 各ページから追加で注入する。
 *
 * 比較関連は useComparisonModule() 1本に統合済み。
 */
import { useState, useCallback, useMemo } from 'react'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import type { MetricId } from '@/domain/models/analysis'
import type { DateRange } from '@/domain/models/calendar'
import { useCalculation } from '@/application/hooks/calculation'
import { useStoreSelection, useExplanations } from '@/application/hooks/ui'
import { useComparisonModule } from '@/application/hooks/useComparisonModule'
import {
  useMonthlyHistory,
  currentResultToMonthlyPoint,
  useMonthlyDataPoints,
} from '@/application/hooks/useMonthlyHistory'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useRepository } from '@/application/context/useRepository'
import { detectDataMaxDay } from '@/application/services/dataDetection'
import { useWidgetQueryContext } from '@/application/hooks/useWidgetQueryContext'
import { useDeptKpiView } from '@/application/hooks/useDeptKpiView'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { useWeatherData } from '@/application/hooks/useWeather'
import { useWeatherStoreId } from '@/application/hooks/useWeatherStoreId'
import { usePrevYearWeather } from '@/application/hooks/usePrevYearWeather'
import { useCtsQuantity } from '@/application/hooks/useCtsQuantity'
import { useWidgetDataOrchestrator } from '@/application/hooks/useWidgetDataOrchestrator'
import type { WidgetDataOrchestratorParams } from '@/application/hooks/useWidgetDataOrchestrator'
import { useDualPeriodRange } from '@/presentation/components/charts/useDualPeriodRange'
import { buildChartPeriodProps } from '@/presentation/hooks/dualPeriod'

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
  const { isCalculated, isComputing, daysInMonth } = useCalculation()
  const { currentResult, selectedResults, storeName, stores, selectedStoreIds } =
    useStoreSelection()
  const currentMonthData = useDataStore((s) => s.currentMonthData)
  const storeResults = useDataStore((s) => s.storeResults)
  const settings = useSettingsStore((s) => s.settings)
  const periodSelection = usePeriodSelectionStore((s) => s.selection)

  // ── 比較サブシステム（1フックで全比較データを取得） ──
  const comparison = useComparisonModule(
    periodSelection,
    currentResult?.elapsedDays,
    currentResult?.averageDailySales ?? 0,
  )

  // 過去月データ（季節性分析用）
  const repo = useRepository()
  const targetYear = settings.targetYear
  const targetMonth = settings.targetMonth
  const historicalMonths = useMonthlyHistory(repo, targetYear, targetMonth)
  const currentMonthlyPoint = useMemo(() => {
    if (!currentResult) return null
    return currentResultToMonthlyPoint(targetYear, targetMonth, currentResult, stores.size)
  }, [currentResult, targetYear, targetMonth, stores.size])
  const monthlyHistory = useMonthlyDataPoints(
    historicalMonths,
    targetYear,
    targetMonth,
    currentMonthlyPoint,
  )

  // ── 当年 CTS 販売点数の事前集計（Application 層フック経由） ──
  const effectiveDayForCts =
    currentResult?.elapsedDays != null && currentResult.elapsedDays > 0
      ? Math.min(currentResult.elapsedDays, daysInMonth)
      : daysInMonth
  const currentCtsQuantity = useCtsQuantity(effectiveDayForCts, selectedStoreIds)

  // 指標説明（comparison module と同じデータソースを使う）
  const explanations = useExplanations(comparison.kpi, comparison.dowGap)
  const [explainMetric, setExplainMetric] = useState<MetricId | null>(null)
  const handleExplain = useCallback((metricId: MetricId) => {
    setExplainMetric(metricId)
  }, [])

  // 前年詳細パネル
  const [prevYearDetailType, setPrevYearDetailType] = useState<'sameDow' | 'sameDate' | null>(null)
  const handlePrevYearDetail = useCallback((type: 'sameDow' | 'sameDate') => {
    setPrevYearDetailType(type)
  }, [])

  // データ存在範囲
  const dataMaxDay = useMemo(
    () => (currentMonthData ? detectDataMaxDay(currentMonthData) : 0),
    [currentMonthData],
  )

  // 部門KPIインデックス
  const deptKpiIndex = useDeptKpiView()

  // 通貨フォーマッタ（千円/円切替対応）
  const { format: fmtCurrency } = useCurrencyFormat()

  // DuckDB クエリコンテキスト（エンジン初期化 + queryExecutor + 天気永続化 + 前年仕入額）
  const duckCtx = useWidgetQueryContext(
    targetYear,
    targetMonth,
    repo,
    comparison.prevYearScope?.dateRange ?? null,
  )
  const { queryExecutor, weatherPersist, prevYearStoreCostPrice } = duckCtx

  // ── 正本化 readModels（orchestrator 経由） ──
  const orchestratorParams = useMemo<WidgetDataOrchestratorParams | null>(
    () =>
      duckCtx.dataVersion > 0
        ? {
            executor: queryExecutor,
            dateFrom: `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`,
            dateTo: `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
            storeIds: selectedStoreIds.size > 0 ? Array.from(selectedStoreIds) : undefined,
            dataVersion: duckCtx.dataVersion,
          }
        : null,
    [queryExecutor, targetYear, targetMonth, daysInMonth, selectedStoreIds, duckCtx.dataVersion],
  )
  const readModels = useWidgetDataOrchestrator(
    orchestratorParams ?? {
      executor: null,
      dateFrom: '',
      dateTo: '',
      dataVersion: 0,
    },
  )

  // ── ページレベル比較期間（全チャートで共有） ──
  const dualPeriodRange = useDualPeriodRange(daysInMonth)
  const chartPeriodProps = useMemo(
    () => buildChartPeriodProps(dualPeriodRange, periodSelection.activePreset),
    [dualPeriodRange, periodSelection.activePreset],
  )

  // ── 天気データ（選択店舗の代表1店から取得） ──
  const weatherStoreId = useWeatherStoreId(selectedStoreIds, stores)
  const { daily: weatherDaily } = useWeatherData(targetYear, targetMonth, weatherStoreId)
  const prevYearWeatherDaily = usePrevYearWeather({
    prevYearDateRange: comparison.prevYearScope?.dateRange,
    targetYear,
    targetMonth,
    weatherStoreId,
  })

  // Store name map for category comparison
  const storeNames = useMemo(() => {
    const map = new Map<string, string>()
    selectedResults.forEach((sr) => {
      map.set(sr.storeId, stores.get(sr.storeId)?.name ?? sr.storeId)
    })
    return map
  }, [selectedResults, stores])

  const effectiveEndDay = currentResult
    ? currentResult.elapsedDays != null && currentResult.elapsedDays > 0
      ? Math.min(currentResult.elapsedDays, daysInMonth)
      : daysInMonth
    : daysInMonth

  const ctx: UnifiedWidgetContext | null = useMemo(() => {
    if (!currentResult) return null
    const r = currentResult
    const currentDateRange: DateRange = {
      from: { year: targetYear, month: targetMonth, day: 1 },
      to: { year: targetYear, month: targetMonth, day: effectiveEndDay },
    }
    return {
      // コア
      result: r,
      daysInMonth: effectiveEndDay,
      targetRate: settings.targetGrossProfitRate,
      warningRate: settings.warningThreshold,
      year: targetYear,
      month: targetMonth,
      settings,
      prevYear: comparison.daily,
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
      monthlyHistory,
      queryExecutor,
      duckDataVersion: duckCtx.dataVersion,
      loadedMonthCount: duckCtx.loadedMonthCount,
      weatherPersist,
      prevYearMonthlyKpi: comparison.kpi,
      comparisonScope: comparison.scope,
      dowGap: comparison.dowGap,
      onPrevYearDetail: handlePrevYearDetail,

      // Category 固有
      selectedResults,
      storeNames,

      // 前年仕入額（額で持つ、率は domain/calculations で算出）
      prevYearStoreCostPrice,

      // 天気データ
      weatherDaily,
      prevYearWeatherDaily,

      // 販売点数（CTS）事前集計値
      currentCtsQuantity,

      // 正本化 readModels（orchestrator 経由）
      readModels,

      // 比較期間入力（ページレベル DualPeriodSlider）
      chartPeriodProps,
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
    monthlyHistory,
    queryExecutor,
    duckCtx.dataVersion,
    duckCtx.loadedMonthCount,
    weatherPersist,
    handlePrevYearDetail,
    selectedResults,
    storeNames,
    prevYearStoreCostPrice,
    weatherDaily,
    prevYearWeatherDaily,
    currentCtsQuantity,
    readModels,
    chartPeriodProps,
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
