/**
 * 統一ウィジェットコンテキストを構築するフック
 *
 * 全ページで共通のコンテキストを構築する。
 * ページ固有のデータ（insightData, costDetailData 等）は
 * 各ページから追加で注入する。
 */
import { useState, useCallback, useMemo } from 'react'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import type { MetricId, DateRange, ComparisonFrame } from '@/domain/models'
import {
  useCalculation,
  useStoreSelection,
  usePrevYearData,
  useExplanations,
  useAutoLoadPrevYear,
  usePrevYearMonthlyKpi,
  useDowGapAnalysis,
} from '@/application/hooks'
import { buildPrevYearScopeFromSelection, deriveDowOffset } from '@/domain/models/PeriodSelection'
import { usePeriodAwareKpi } from '@/application/hooks/usePeriodAwareKpi'
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
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'

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

  // 期間連動 KPI（DuckDB ベース）— period1 + period2 独立テーブル
  // カレンダーで選択した期間をそのまま使う。
  // elapsedDays（有効取り込み期間）はデータ存在範囲の参考値であり、
  // DuckDB クエリ範囲を制限しない（データが無い日は集計結果が0になるだけ）。
  const periodAwareKpi = usePeriodAwareKpi(
    duck.conn,
    duck.dataVersion,
    currentResult ? periodSelection.period1 : undefined,
    periodSelection.comparisonEnabled ? periodSelection.period2 : undefined,
    periodSelection.comparisonEnabled,
    selectedStoreIds,
    daysInMonth,
    settings.targetGrossProfitRate,
  )

  // 比較フレーム — periodSelection から導出（useComparisonFrame を置換）
  const frame: ComparisonFrame = useMemo(() => {
    const p = periodSelection
    const dowOffset = deriveDowOffset(p.period1, p.period2, p.activePreset)
    const policy = p.activePreset === 'prevYearSameDow' ? 'sameDayOfWeek' : 'sameDate'
    return {
      current: p.period1,
      previous: p.period2,
      dowOffset,
      policy,
    } satisfies ComparisonFrame
  }, [periodSelection])

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

  // period1 の日範囲を尊重しつつ、effectiveEndDay でキャップ
  const p1From = periodSelection.period1.from
  const p1To = periodSelection.period1.to
  const currentDateRange: DateRange = {
    from: {
      year: p1From.year,
      month: p1From.month,
      day: p1From.day,
    },
    to: {
      year: p1To.year,
      month: p1To.month,
      day: Math.min(p1To.day, effectiveEndDay),
    },
  }
  // 月全体の範囲（予算・前年表示用。期間ピッカーでトリミングされない）
  const fullMonthRange: DateRange = {
    from: { year: targetYear, month: targetMonth, day: 1 },
    to: { year: targetYear, month: targetMonth, day: daysInMonth },
  }
  // prevYearScope: DOW offset + periodSelection.period1 の有効範囲で調整済みの前年日付範囲と客数。
  // periodSelection から導出。effectiveEndDay でキャップして
  // JS エンジンの有効範囲と DuckDB クエリ範囲を一致させる。
  const prevYearScope = prevYear.hasPrevYear
    ? buildPrevYearScopeFromSelection(periodSelection, prevYear.totalCustomers, effectiveEndDay)
    : undefined

  // 比較期間: periodSelection.period2 を直接使用（プリセットにより自動算出済み）
  const prevYearDateRange: DateRange | undefined = prevYear.hasPrevYear
    ? prevYearScope?.dateRange
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

    // 期間選択
    periodSelection,
    periodMetrics: periodAwareKpi.periodMetrics ?? undefined,
    period2Metrics: periodAwareKpi.period2Metrics ?? undefined,
    isPeriodFullMonth: periodAwareKpi.isFullMonth,

    // Dashboard 固有
    storeKey: storeName,
    allStoreResults: storeResults,
    currentDateRange,
    fullMonthRange,
    prevYearDateRange,
    prevYearScope,
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
