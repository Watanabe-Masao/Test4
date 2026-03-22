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
import { useDuckDB } from '@/application/hooks/useDuckDB'
import { useComparisonModule } from '@/application/hooks/useComparisonModule'
import {
  useMonthlyHistory,
  currentResultToMonthlyPoint,
  useMonthlyDataPoints,
} from '@/application/hooks/useMonthlyHistory'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useRepository } from '@/application/context/useRepository'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import { useDeptKpiView } from '@/application/hooks/useDeptKpiView'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { useStoreCostPriceQuery } from '@/application/hooks/duckdb/useStoreCostPriceQuery'
import { useWeatherData } from '@/application/hooks/useWeather'

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
  const data = useDataStore((s) => s.data)
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
  const dataMaxDay = useMemo(() => detectDataMaxDay(data), [data])

  // 部門KPIインデックス
  const deptKpiIndex = useDeptKpiView()

  // 通貨フォーマッタ（千円/円切替対応）
  const { format: fmtCurrency } = useCurrencyFormat()

  // DuckDB エンジン初期化
  const duck = useDuckDB(data, targetYear, targetMonth, repo)

  // ── 前年店舗別仕入額（application hook 経由、額で保持 — 禁止事項 #10） ──
  const { data: prevYearStoreCostPrice } = useStoreCostPriceQuery(
    duck.conn,
    duck.dataVersion,
    comparison.prevYearDateRange ?? null,
  )

  // ── 天気データ（選択店舗の代表1店から取得） ──
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const weatherStoreId = useMemo(() => {
    const ids = selectedStoreIds.size > 0 ? [...selectedStoreIds] : [...stores.keys()]
    return ids.find((id) => storeLocations[id]) ?? ids[0] ?? ''
  }, [selectedStoreIds, stores, storeLocations])
  const { daily: weatherDaily } = useWeatherData(targetYear, targetMonth, weatherStoreId)

  // 前年天気データ（比較期間の年月から取得）
  // 同曜日比較で月跨ぎする場合、from月とto月の両方を取得して結合する
  const prevYearMonths = useMemo(() => {
    const dr = comparison.prevYearDateRange
    if (!dr) return { from: { year: targetYear - 1, month: targetMonth }, to: null }
    const from = { year: dr.from.year, month: dr.from.month }
    const to = { year: dr.to.year, month: dr.to.month }
    const spansTwoMonths = from.year !== to.year || from.month !== to.month
    return { from, to: spansTwoMonths ? to : null }
  }, [comparison.prevYearDateRange, targetYear, targetMonth])
  const { daily: prevYearWeatherBase } = useWeatherData(
    prevYearMonths.from.year,
    prevYearMonths.from.month,
    weatherStoreId,
  )
  const { daily: prevYearWeatherOverflow } = useWeatherData(
    prevYearMonths.to?.year ?? prevYearMonths.from.year,
    prevYearMonths.to?.month ?? prevYearMonths.from.month,
    weatherStoreId,
  )
  const prevYearWeatherDaily = useMemo(
    () =>
      prevYearMonths.to
        ? ([...prevYearWeatherBase, ...prevYearWeatherOverflow] as const)
        : prevYearWeatherBase,
    [prevYearWeatherBase, prevYearWeatherOverflow, prevYearMonths.to],
  )

  // Store name map for category comparison
  const storeNames = useMemo(() => {
    const map = new Map<string, string>()
    selectedResults.forEach((sr) => {
      map.set(sr.storeId, stores.get(sr.storeId)?.name ?? sr.storeId)
    })
    return map
  }, [selectedResults, stores])

  if (!currentResult) {
    return {
      ctx: null,
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

  const r = currentResult
  const effectiveEndDay =
    r.elapsedDays != null && r.elapsedDays > 0 ? Math.min(r.elapsedDays, daysInMonth) : daysInMonth

  const currentDateRange: DateRange = {
    from: { year: targetYear, month: targetMonth, day: 1 },
    to: { year: targetYear, month: targetMonth, day: effectiveEndDay },
  }

  const ctx: UnifiedWidgetContext = {
    // コア
    result: r,
    daysInMonth: effectiveEndDay,
    targetRate: settings.targetGrossProfitRate,
    warningRate: settings.warningThreshold,
    year: targetYear,
    month: targetMonth,
    settings,
    prevYear: comparison.daily,
    stores: data.stores,
    selectedStoreIds,
    explanations,
    onExplain: handleExplain,
    departmentKpi: deptKpiIndex,
    fmtCurrency,

    // 期間選択
    periodSelection,

    // Dashboard 固有
    storeKey: storeName,
    allStoreResults: storeResults,
    currentDateRange,
    prevYearDateRange: comparison.prevYearDateRange,
    prevYearScope: comparison.prevYearScope,
    dataEndDay: settings.dataEndDay,
    dataMaxDay,
    elapsedDays: r.elapsedDays,
    monthlyHistory,
    duckConn: duck.conn,
    duckDb: duck.db,
    duckDataVersion: duck.dataVersion,
    duckLoadedMonthCount: duck.loadedMonthCount,
    prevYearMonthlyKpi: comparison.kpi,
    comparisonFrame: comparison.comparisonFrame,
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
  }

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
