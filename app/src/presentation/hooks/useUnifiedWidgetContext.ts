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
 */
import { useState, useCallback, useMemo } from 'react'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import type { MetricId } from '@/domain/models/analysis'
import type { DateRange } from '@/domain/models/calendar'
import { useCalculation } from '@/application/hooks/calculation'
import { useStoreSelection, useExplanations } from '@/application/hooks/ui'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useRepository } from '@/application/context/useRepository'
import { detectDataMaxDay } from '@/application/services/dataDetection'
import { useDeptKpiView } from '@/application/hooks/useDeptKpiView'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
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

  // ── 比較 slice ──
  const comparison = useComparisonSlice(
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

  const effectiveEndDay = currentResult
    ? currentResult.elapsedDays != null && currentResult.elapsedDays > 0
      ? Math.min(currentResult.elapsedDays, daysInMonth)
      : daysInMonth
    : daysInMonth

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
