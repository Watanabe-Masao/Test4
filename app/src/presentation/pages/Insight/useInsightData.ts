import { useState, useMemo } from 'react'
import { useCalculation, useBudgetChartData } from '@/application/hooks/calculation'
import { useStoreSelection } from '@/application/hooks/ui'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { usePageComparisonModule } from '@/application/hooks/usePageComparisonModule'
import { extractPrevYearCustomerCount } from '@/features/comparison'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import {
  safeDivide,
  calculateTransactionValue,
  calculateYoYRatio,
} from '@/domain/calculations/utils'
import {
  getEffectiveGrossProfitRate,
  getEffectiveGrossProfit,
} from '@/application/readModels/grossProfit'
import { calculateForecast } from '@/application/hooks/calculation'
import {
  DOW_LABELS,
  DEFAULT_DOW_COLORS,
  buildForecastInput,
  computeStackedWeekData,
  buildDailyCustomerData,
  buildDowCustomerAverages,
  buildMovingAverages,
  buildRelationshipData,
  buildRelationshipDataFromPrev,
  buildDailyDecomposition,
  buildDowDecomposition,
  buildWeeklyDecomposition,
} from '@/presentation/pages/Forecast/ForecastPage.helpers'

export type InsightTab = 'budget' | 'grossProfit' | 'forecast' | 'decomposition'
export type ChartMode = 'budget-vs-actual' | 'prev-year' | 'all-three'
export type ViewMode = 'total' | 'comparison'

export function useInsightData(opts?: {
  /** CustomerFact 由来の客数（指定時は StoreResult 集計値より優先） */
  curCustomerCount?: number
  prevCustomerCount?: number
}) {
  const { format: fmtCurrency } = useCurrencyFormat()
  const { daysInMonth } = useCalculation()
  const { currentResult, selectedResults, storeName, stores, selectedStoreIds } =
    useStoreSelection()
  const settings = useSettingsStore((s) => s.settings)
  const periodSelection = usePeriodSelectionStore((s) => s.selection)
  // Phase 6b: frame ベースの page-level wrapper 経由で comparison module を取得
  // (内部で buildFreePeriodFrame → useComparisonModule(..., frame.comparison))
  const comparison = usePageComparisonModule(
    periodSelection,
    currentResult?.elapsedDays,
    currentResult?.averageDailySales ?? 0,
    selectedStoreIds,
  )
  const prevYear = comparison.daily
  const { targetYear, targetMonth } = settings

  const [activeTab, setActiveTab] = useState<InsightTab>('budget')
  const [viewMode, setViewMode] = useState<ViewMode>('total')
  const [chartMode, setChartMode] = useState<ChartMode>('budget-vs-actual')
  const [compareMode, setCompareMode] = useState(false)
  const [dowColors, setDowColors] = useState<string[]>([...DEFAULT_DOW_COLORS])
  const [relViewMode, setRelViewMode] = useState<'current' | 'prev' | 'compare'>('current')

  // ─── 予算分析データ ─────────────────────────────────────
  const salesDaily = useMemo(() => {
    if (!currentResult) return new Map<number, number>()
    const m = new Map<number, number>()
    for (const [d, rec] of currentResult.daily) m.set(d, rec.sales)
    return m
  }, [currentResult])

  const chartData = useBudgetChartData(
    currentResult,
    daysInMonth,
    prevYear,
    targetYear,
    targetMonth,
  )

  // ─── 予測データ ─────────────────────────────────────────
  const forecastData = useMemo(() => {
    if (!currentResult) return null
    const year = targetYear
    const month = targetMonth
    const forecastInput = buildForecastInput(currentResult, year, month)
    const forecast = calculateForecast(forecastInput)
    const stackedData = computeStackedWeekData(
      forecast.weeklySummaries,
      forecastInput.dailySales,
      year,
      month,
    )
    const activeWeeks = forecast.weeklySummaries.filter((w) => w.totalSales > 0)
    const bestWeek =
      activeWeeks.length > 0
        ? activeWeeks.reduce((a, b) => (a.totalSales > b.totalSales ? a : b))
        : null
    const worstWeek =
      activeWeeks.length > 0
        ? activeWeeks.reduce((a, b) => (a.totalSales < b.totalSales ? a : b))
        : null
    return { forecast, stackedData, bestWeek, worstWeek, year, month }
  }, [currentResult, targetYear, targetMonth])

  // ─── 客数・要因分解データ ───────────────────────────────
  const customerData = useMemo(() => {
    if (!currentResult || !forecastData) return null
    const { year, month } = forecastData
    const customerEntries = buildDailyCustomerData(currentResult.daily, prevYear, year, month)
    const hasCustomerData = customerEntries.some((e) => e.customers > 0)
    const dowCustomerAvg = buildDowCustomerAverages(customerEntries, year, month)
    const movingAvgData = buildMovingAverages(customerEntries, 5)
    const relationshipData = buildRelationshipData(customerEntries)
    const prevRelationshipData = buildRelationshipDataFromPrev(customerEntries)
    const hasPrevCustomers = customerEntries.some((e) => e.prevCustomers > 0)

    const dailyDecomp = buildDailyDecomposition(customerEntries)
    const hasDecompData = dailyDecomp.length > 0
    const dowDecomp = hasDecompData ? buildDowDecomposition(dailyDecomp, year, month) : []
    const weeklyDecomp = hasDecompData
      ? buildWeeklyDecomposition(dailyDecomp, forecastData.forecast.weeklySummaries)
      : []

    return {
      customerEntries,
      hasCustomerData,
      dowCustomerAvg,
      movingAvgData,
      relationshipData,
      prevRelationshipData,
      hasPrevCustomers,
      dailyDecomp,
      hasDecompData,
      dowDecomp,
      weeklyDecomp,
    }
  }, [currentResult, prevYear, forecastData])

  const storeForecasts = useMemo(() => {
    if (!compareMode || !forecastData) return []
    const { year, month } = forecastData
    return selectedResults.map((sr) => {
      const input = buildForecastInput(sr, year, month)
      const fc = calculateForecast(input)
      const name = stores.get(sr.storeId)?.name ?? sr.storeId
      return { storeId: sr.storeId, storeName: name, forecast: fc }
    })
  }, [compareMode, forecastData, selectedResults, stores])

  // ─── 派生値 ─────────────────────────────────────────────
  const r = currentResult
  const actualGrossProfit = r ? getEffectiveGrossProfit(r) : 0
  const actualGrossProfitRate = r ? getEffectiveGrossProfitRate(r) : 0

  const totalCustomers = opts?.curCustomerCount ?? 0
  const avgDailyCustomers = r?.averageCustomersPerDay ?? 0
  const avgTxValue = r ? calculateTransactionValue(r.totalSales, totalCustomers) : 0
  const prevTotalCustomers = opts?.prevCustomerCount ?? extractPrevYearCustomerCount(prevYear)
  const customerYoY =
    prevTotalCustomers > 0 ? calculateYoYRatio(totalCustomers, prevTotalCustomers) : 0
  const prevAvgTxValue = calculateTransactionValue(prevYear.totalSales, prevTotalCustomers)
  const txValueYoY = prevAvgTxValue > 0 ? calculateYoYRatio(avgTxValue, prevAvgTxValue) : 0

  const handleDowColorChange = (index: number, color: string) => {
    setDowColors((prev) => {
      const next = [...prev]
      next[index] = color
      return next
    })
  }

  return {
    // Core data
    currentResult,
    selectedResults,
    storeName,
    stores,
    prevYear,
    daysInMonth,
    year: targetYear,
    month: targetMonth,
    // State
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    chartMode,
    setChartMode,
    compareMode,
    setCompareMode,
    dowColors,
    relViewMode,
    setRelViewMode,
    // Computed data
    salesDaily,
    chartData,
    forecastData,
    customerData,
    storeForecasts,
    // Derived
    actualGrossProfit,
    actualGrossProfitRate,
    totalCustomers,
    avgDailyCustomers,
    avgTxValue,
    prevTotalCustomers,
    customerYoY,
    prevAvgTxValue,
    txValueYoY,
    // Handlers
    handleDowColorChange,
    // Re-exports for sub-components
    DOW_LABELS,
    fmtCurrency,
    formatPercent,
    safeDivide,
    calculateTransactionValue,
  } as const
}

export type InsightData = ReturnType<typeof useInsightData>
