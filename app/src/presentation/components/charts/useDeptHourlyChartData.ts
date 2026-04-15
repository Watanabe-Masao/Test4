/**
 * useDeptHourlyChartData — 部門別時間帯パターンチャートのデータ取得・加工
 *
 * DeptHourlyChart.tsx から分離。
 * クエリ・データ変換を担い、UI は DeptHourlyChart に残す。
 * drill 状態管理は useDeptHourlyDrillState に分離。
 *
 * @responsibility R:orchestration
 */
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { HOUR_MIN, HOUR_MAX } from './HeatmapChart.helpers'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { buildBaseQueryInput } from '@/application/hooks/plans/buildBaseQueryInput'
import { buildPairedQueryInput } from '@/application/hooks/plans/buildPairedQueryInput'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import {
  useDeptHourlyChartPlan,
  type CategoryHourlyInput,
  type HourlyAggregationInput,
  type PairedInput,
} from '@/application/hooks/plans/useDeptHourlyChartPlan'
import { useCurrencyFormatter } from './chartTheme'
import {
  buildDeptHourlyData,
  detectCannibalization,
  buildDeptHourlyOption,
  TOP_N_OPTIONS,
} from './DeptHourlyChartLogic'
import { useI18n } from '@/application/hooks/useI18n'
import type { HourlyOverlayData } from './DeptHourlyChart'
import { useDeptHourlyDrillState } from './useDeptHourlyDrillState'

export type { ViewMode, HierarchyLevel, DrillState } from './useDeptHourlyDrillState'

interface UseDeptHourlyChartDataParams {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  readonly weatherOverlay?: readonly HourlyOverlayData[]
}

export { TOP_N_OPTIONS }

export function useDeptHourlyChartData(params: UseDeptHourlyChartDataParams) {
  const { queryExecutor, currentDateRange, selectedStoreIds, prevYearScope, weatherOverlay } =
    params

  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  // drill + UI state
  const drillState = useDeptHourlyDrillState()
  const { topN, activeDepts, viewMode, drill, rightMode } = drillState

  // ── 部門別時間帯データ（第1軸） ──
  // Phase 5 横展開 第 2 バッチ: query input 組み立ては共通 builder 経由
  const input = useMemo<CategoryHourlyInput | null>(() => {
    const base = buildBaseQueryInput(currentDateRange, selectedStoreIds)
    if (!base) return null
    return {
      ...base,
      level: drill.level,
      deptCode: drill.deptCode,
      lineCode: drill.lineCode,
    }
  }, [currentDateRange, selectedStoreIds, drill.level, drill.deptCode, drill.lineCode])

  // ── 時間帯別点数データ（第2軸: quantity モード用 — pair handler） ──
  const prevDateRange = prevYearScope?.dateRange
  const qtyPairInput = useMemo<PairedInput<HourlyAggregationInput> | null>(() => {
    if (rightMode !== 'quantity') return null
    return buildPairedQueryInput(currentDateRange, prevDateRange, selectedStoreIds)
  }, [currentDateRange, prevDateRange, selectedStoreIds, rightMode])

  const { hourlyResult, qtyPairResult } = useDeptHourlyChartPlan(queryExecutor, input, qtyPairInput)
  const { data: hourlyOutput, error, isLoading } = hourlyResult
  const { data: qtyPairOut } = qtyPairResult
  const categoryHourlyRows = hourlyOutput?.records ?? null
  const curQtyOut = qtyPairOut?.current ?? null
  const prevQtyOut = qtyPairOut?.comparison ?? null

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

  return {
    // theme / formatting
    theme,
    fmt,
    errorMessage: messages.errors.dataFetchFailed,
    // state (spread drill state)
    ...drillState,
    // data
    chartData,
    departments,
    cannibalization,
    option,
    error,
    isLoading,
    categoryHourlyRows,
    queryExecutor,
  }
}
