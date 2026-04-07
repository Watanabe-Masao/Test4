/**
 * useCategoryTrendChartData — カテゴリ別日次売上推移のデータ取得・状態管理
 *
 * CategoryTrendChart.tsx から分離。
 * 状態管理・クエリ・データ変換を担い、UI は CategoryTrendChart に残す。
 *
 * @migration P5: plan hook — useCategoryTrendPlan 経由でクエリ取得
 * @responsibility R:orchestration
 */
import { useMemo, useCallback } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useCategoryTrendPlan } from '@/features/category'
import {
  buildCategoryTrendData,
  buildPrevYearTrendData,
  buildCategoryTrendOption,
  PREV_YEAR_SUFFIX,
} from '@/features/category'
import { useCurrencyFormatter } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { useCategoryTrendDrillState } from './useCategoryTrendDrillState'

interface UseCategoryTrendChartDataParams {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

export type { HierarchyLevel, DrillState } from './useCategoryTrendDrillState'
export type { TrendMetric } from '@/features/category'

export function useCategoryTrendChartData(params: UseCategoryTrendChartDataParams) {
  const { queryExecutor, currentDateRange, selectedStoreIds, prevYearScope } = params

  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  // drill + UI state
  const drillState = useCategoryTrendDrillState()
  const { level, topN, selectedDows, drill, metric, showYoY, setDrill, setLevel } = drillState

  const dowParam = useMemo(
    () => (selectedDows.length > 0 ? selectedDows : undefined),
    [selectedDows],
  )

  // ── Screen Query Plan（非対称比較: current topN ≠ prev topN） ──
  const prevYearDateRange = prevYearScope?.dateRange
  const plan = useCategoryTrendPlan(queryExecutor, {
    currentDateRange,
    selectedStoreIds,
    level,
    topN,
    deptCode: drill.deptCode,
    lineCode: drill.lineCode,
    dow: dowParam,
    prevYearDateRange,
    showYoY,
  })
  const trendRows = plan.currentData?.records ?? null
  const prevTrendRows = plan.prevData?.records ?? null
  const { error, isLoading } = plan

  const emptyExcluded = useMemo(() => new Set<string>(), [])
  const { chartData, categories } = useMemo(
    () =>
      trendRows
        ? buildCategoryTrendData(trendRows, emptyExcluded, metric)
        : { chartData: [], categories: [] },
    [trendRows, emptyExcluded, metric],
  )

  const prevYearMapped = useMemo(() => {
    if (!showYoY || !prevTrendRows || !prevYearDateRange || chartData.length === 0) return undefined
    const currentDates = chartData.map((d) => d.date)
    return buildPrevYearTrendData(prevTrendRows, currentDates, categories, metric)
  }, [showYoY, prevTrendRows, prevYearDateRange, chartData, categories, metric])

  const isQuantityMode = metric === 'quantity'
  const prevYearLabelStr = useMemo(() => {
    if (!prevYearDateRange) return undefined
    const from = prevYearDateRange.from
    const to = prevYearDateRange.to
    return `${from.year}/${from.month}/${from.day}〜${to.month}/${to.day}`
  }, [prevYearDateRange])

  const option = useMemo(
    () =>
      buildCategoryTrendOption(
        chartData,
        categories,
        theme,
        prevYearMapped,
        isQuantityMode,
        prevYearLabelStr,
      ),
    [chartData, categories, theme, prevYearMapped, isQuantityMode, prevYearLabelStr],
  )

  // ECharts クリックでドリルダウン
  const canDrill = level !== 'klass'
  const handleChartClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!canDrill) return
      const seriesName = params.seriesName as string
      if (seriesName.endsWith(PREV_YEAR_SUFFIX)) return
      const cat = categories.find((c) => c.name === seriesName)
      if (!cat) return
      if (level === 'department') {
        setDrill({ deptCode: cat.code, deptName: cat.name })
        setLevel('line')
      } else if (level === 'line') {
        setDrill((prev) => ({ ...prev, lineCode: cat.code, lineName: cat.name }))
        setLevel('klass')
      }
    },
    [canDrill, categories, level, setDrill, setLevel],
  )

  return {
    // theme / formatting
    fmt,
    errorMessage: messages.errors.dataFetchFailed,
    // state (spread drill state)
    ...drillState,
    // data
    chartData,
    categories,
    option,
    error,
    isLoading,
    trendRows,
    queryExecutor,
    prevYearScope,
    isQuantityMode,
    canDrill,
    // handlers
    handleChartClick,
  }
}
