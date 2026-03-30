/**
 * useDeptHourlyChartData — 部門別時間帯パターンチャートのデータ取得・加工
 *
 * DeptHourlyChart.tsx から分離。
 * 状態管理・クエリ・データ変換を担い、UI は DeptHourlyChart に残す。
 */
import React, { useState, useMemo, useCallback } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { HOUR_MIN, HOUR_MAX } from './HeatmapChart.helpers'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryHourlyHandler,
  type CategoryHourlyInput,
} from '@/application/queries/cts/CategoryHourlyHandler'
import {
  hourlyAggregationHandler,
  type HourlyAggregationInput,
} from '@/application/queries/cts/HourlyAggregationHandler'
import { useCurrencyFormatter } from './chartTheme'
import {
  buildDeptHourlyData,
  detectCannibalization,
  buildDeptHourlyOption,
  TOP_N_OPTIONS,
} from './DeptHourlyChartLogic'
import { useI18n } from '@/application/hooks/useI18n'
import type { HourlyOverlayData, RightOverlayMode } from './DeptHourlyChart'

type ViewMode = 'stacked' | 'separate'
type HierarchyLevel = 'department' | 'line' | 'klass'

interface DrillState {
  readonly level: HierarchyLevel
  readonly deptCode?: string
  readonly deptName?: string
  readonly lineCode?: string
  readonly lineName?: string
}

interface UseDeptHourlyChartDataParams {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly weatherOverlay?: readonly HourlyOverlayData[]
}

export { TOP_N_OPTIONS }
export type { ViewMode, HierarchyLevel, DrillState }

export function useDeptHourlyChartData(params: UseDeptHourlyChartDataParams) {
  const { queryExecutor, currentDateRange, selectedStoreIds, prevYearScope, weatherOverlay } =
    params

  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const [topN, setTopN] = useState(5)
  const [activeDepts, setActiveDepts] = useState<ReadonlySet<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('stacked')
  const [drill, setDrill] = useState<DrillState>({ level: 'department' })
  const [rightMode, setRightMode] = useState<RightOverlayMode>('quantity')

  // ── 部門別時間帯データ（第1軸） ──
  const input = useMemo<CategoryHourlyInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level: drill.level,
      deptCode: drill.deptCode,
      lineCode: drill.lineCode,
    }
  }, [currentDateRange, selectedStoreIds, drill.level, drill.deptCode, drill.lineCode])

  const {
    data: output,
    error,
    isLoading,
  } = useQueryWithHandler(queryExecutor, categoryHourlyHandler, input)

  const categoryHourlyRows = output?.records ?? null

  // ── 時間帯別点数データ（第2軸: quantity モード用） ──
  const storeIds = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )
  const qtyInput = useMemo<HourlyAggregationInput | null>(() => {
    if (rightMode !== 'quantity') return null
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, isPrevYear: false }
  }, [currentDateRange, storeIds, rightMode])

  const prevDateRange = prevYearScope?.dateRange
  const prevQtyInput = useMemo<HourlyAggregationInput | null>(() => {
    if (rightMode !== 'quantity' || !prevDateRange) return null
    const { fromKey, toKey } = dateRangeToKeys(prevDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, isPrevYear: true }
  }, [prevDateRange, storeIds, rightMode])

  const { data: curQtyOut } = useQueryWithHandler(queryExecutor, hourlyAggregationHandler, qtyInput)
  const { data: prevQtyOut } = useQueryWithHandler(
    queryExecutor,
    hourlyAggregationHandler,
    prevQtyInput,
  )

  // 天気・点数 → hourMap
  const overlayByHour = useMemo(() => {
    const m = new Map<number, HourlyOverlayData>()
    if (curQtyOut?.records) {
      for (const r of curQtyOut.records) {
        m.set(r.hour, { hour: r.hour, quantity: r.totalQuantity })
      }
    }
    if (weatherOverlay) {
      for (const w of weatherOverlay) {
        const existing = m.get(w.hour) ?? { hour: w.hour }
        m.set(w.hour, { ...existing, temperature: w.temperature, precipitation: w.precipitation })
      }
    }
    return m
  }, [curQtyOut, weatherOverlay])

  const prevQtyByHour = useMemo(() => {
    if (!prevQtyOut?.records) return undefined
    const m = new Map<number, number>()
    for (const r of prevQtyOut.records) m.set(r.hour, r.totalQuantity)
    return m
  }, [prevQtyOut])

  const { chartData, departments, hourlyPatterns } = useMemo(
    () =>
      categoryHourlyRows
        ? buildDeptHourlyData(categoryHourlyRows, topN, activeDepts, HOUR_MIN, HOUR_MAX)
        : { chartData: [], departments: [], hourlyPatterns: new Map<string, number[]>() },
    [categoryHourlyRows, topN, activeDepts],
  )

  const cannibalization = useMemo(
    () => detectCannibalization(departments, hourlyPatterns),
    [departments, hourlyPatterns],
  )

  const option = useMemo(
    () =>
      buildDeptHourlyOption(
        chartData,
        departments,
        viewMode,
        theme,
        rightMode,
        overlayByHour,
        prevQtyByHour,
      ),
    [chartData, departments, viewMode, theme, rightMode, overlayByHour, prevQtyByHour],
  )

  // ── callbacks ──
  const handleTopNChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTopN(Number(e.target.value))
    setActiveDepts(new Set())
  }, [])

  const handleChipClick = useCallback((code: string) => {
    setActiveDepts((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  const handleDrillDown = useCallback(
    (code: string, name: string) => {
      setActiveDepts(new Set())
      if (drill.level === 'department') {
        setDrill({ level: 'line', deptCode: code, deptName: name })
      } else if (drill.level === 'line') {
        setDrill({
          level: 'klass',
          deptCode: drill.deptCode,
          deptName: drill.deptName,
          lineCode: code,
          lineName: name,
        })
      }
    },
    [drill],
  )

  const handleDrillUp = useCallback(() => {
    setActiveDepts(new Set())
    if (drill.level === 'klass') {
      setDrill({ level: 'line', deptCode: drill.deptCode, deptName: drill.deptName })
    } else if (drill.level === 'line') {
      setDrill({ level: 'department' })
    }
  }, [drill])

  const handleLevelChange = useCallback((level: HierarchyLevel) => {
    setActiveDepts(new Set())
    setDrill({ level })
  }, [])

  return {
    // theme / formatting
    theme,
    fmt,
    errorMessage: messages.errors.dataFetchFailed,
    // state
    topN,
    viewMode,
    setViewMode,
    drill,
    setDrill,
    rightMode,
    setRightMode,
    activeDepts,
    // data
    chartData,
    departments,
    cannibalization,
    option,
    error,
    isLoading,
    categoryHourlyRows,
    queryExecutor,
    // handlers
    handleTopNChange,
    handleChipClick,
    handleDrillDown,
    handleDrillUp,
    handleLevelChange,
  }
}
