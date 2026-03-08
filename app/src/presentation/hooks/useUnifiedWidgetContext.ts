/**
 * 統一ウィジェットコンテキストを構築するフック
 *
 * 全ページで共通のコンテキストを構築する。
 * ページ固有のデータ（insightData, costDetailData 等）は
 * 各ページから追加で注入する。
 */
import { useState, useCallback, useMemo } from 'react'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import type { MetricId, DateRange } from '@/domain/models'
import {
  useCalculation,
  useStoreSelection,
  usePrevYearData,
  useExplanations,
  useAutoLoadPrevYear,
  useComparisonFrame,
  usePrevYearMonthlyKpi,
  useDowGapAnalysis,
} from '@/application/hooks'
import { useDuckDB } from '@/application/hooks/useDuckDB'
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
  const prevYear = usePrevYearData(currentResult?.elapsedDays)
  const prevYearMonthlyKpi = usePrevYearMonthlyKpi()

  // 曜日ギャップ分析用
  const prevDowSales = useMemo(() => {
    if (!prevYearMonthlyKpi.hasPrevYear) return undefined
    const srcYear = prevYearMonthlyKpi.sourceYear
    if (srcYear === 0) return undefined
    const srcMonth = prevYearMonthlyKpi.sourceMonth
    const sales = [0, 0, 0, 0, 0, 0, 0]
    for (const row of prevYearMonthlyKpi.sameDate.dailyMapping) {
      const dow = new Date(srcYear, srcMonth - 1, row.prevDay).getDay()
      sales[dow] += row.prevSales
    }
    return sales
  }, [prevYearMonthlyKpi])

  const dowGap = useDowGapAnalysis(
    settings.targetYear,
    settings.targetMonth,
    prevYearMonthlyKpi.sourceYear,
    prevYearMonthlyKpi.sourceMonth,
    currentResult?.averageDailySales ?? 0,
    prevYearMonthlyKpi.hasPrevYear,
    prevDowSales,
    prevYearMonthlyKpi.hasPrevYear ? prevYearMonthlyKpi.sameDate.dailyMapping : undefined,
    prevYearMonthlyKpi.hasPrevYear ? prevYearMonthlyKpi.sameDow.dailyMapping : undefined,
  )

  useAutoLoadPrevYear()

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

  // 指標説明
  const explanations = useExplanations()
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

  // DuckDB エンジン初期化
  const duck = useDuckDB(data, targetYear, targetMonth, repo)

  // 比較フレーム
  const baseRange: DateRange = useMemo(
    () => ({
      from: { year: targetYear, month: targetMonth, day: 1 },
      to: { year: targetYear, month: targetMonth, day: daysInMonth },
    }),
    [targetYear, targetMonth, daysInMonth],
  )
  const frame = useComparisonFrame(baseRange)

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
  // prevTotalCustomers（JS エンジン）は elapsedDays 分のみの客数。
  // DuckDB 側の prevYearDateRange も同じ日数にクリップしないと
  // PI = 全月売上 ÷ 一部客数 × 1000 で前年値が膨張する。
  const prevYearDateRange: DateRange | undefined = prevYear.hasPrevYear
    ? {
        from: frame.previous.from,
        to: { ...frame.previous.to, day: Math.min(frame.previous.to.day, effectiveEndDay) },
      }
    : undefined

  const ctx: UnifiedWidgetContext = {
    // コア
    result: r,
    daysInMonth,
    targetRate: settings.targetGrossProfitRate,
    warningRate: settings.warningThreshold,
    year: targetYear,
    month: targetMonth,
    settings,
    prevYear,
    stores: data.stores,
    selectedStoreIds,
    explanations,
    onExplain: handleExplain,
    departmentKpi: deptKpiIndex,

    // Dashboard 固有
    storeKey: storeName,
    allStoreResults: storeResults,
    currentDateRange,
    prevYearDateRange,
    dataEndDay: settings.dataEndDay,
    dataMaxDay,
    elapsedDays: r.elapsedDays,
    monthlyHistory,
    duckConn: duck.conn,
    duckDataVersion: duck.dataVersion,
    duckLoadedMonthCount: duck.loadedMonthCount,
    prevYearMonthlyKpi,
    comparisonFrame: frame,
    dowGap,
    onPrevYearDetail: handlePrevYearDetail,

    // Category 固有
    selectedResults,
    storeNames,
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
