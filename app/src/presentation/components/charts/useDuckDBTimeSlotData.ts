/**
 * TimeSlotChart のデータロジックフック（thin wrapper）
 *
 * R11準拠: 純粋計算は useDuckDBTimeSlotDataLogic.ts に分離。
 * 本ファイルは DuckDB クエリ発行 + 状態管理 + 計算結果の memo のみ。
 */
import { useState, useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models'
import {
  useDuckDBHourlyAggregation,
  useDuckDBDistinctDayCount,
  useDuckDBLevelAggregation,
} from '@/application/hooks/useDuckDBQuery'
import {
  type ViewMode,
  type MetricMode,
  type HierarchyOption,
  buildWowRange,
  computeChartDataAndKpi,
  computeYoYData,
  computeInsights,
} from './useDuckDBTimeSlotDataLogic'

// Re-export types for consumers
export type {
  ViewMode,
  MetricMode,
  TimeSlotKpi,
  YoYRow,
  YoYData,
  HierarchyOption,
} from './useDuckDBTimeSlotDataLogic'

// ── Hook ──

interface Params {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

export function useDuckDBTimeSlotData({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
}: Params) {
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [metricMode, setMetricMode] = useState<MetricMode>('amount')
  const [compMode, setCompMode] = useState<'yoy' | 'wow'>('yoy')
  const [showPrev, setShowPrev] = useState(true)
  const [mode, setMode] = useState<'total' | 'daily'>('total')
  const [deptCode, setDeptCode] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [klassCode, setKlassCode] = useState('')

  const hierarchy = useMemo(
    () => ({
      deptCode: deptCode || undefined,
      lineCode: lineCode || undefined,
      klassCode: klassCode || undefined,
    }),
    [deptCode, lineCode, klassCode],
  )

  const wowRange = useMemo(() => buildWowRange(currentDateRange), [currentDateRange])
  const compRange = compMode === 'wow' ? wowRange : prevYearScope?.dateRange
  const compIsPrevYear = compMode === 'yoy'

  // ── DuckDB queries ──

  const {
    data: currentHourly,
    isLoading,
    error,
  } = useDuckDBHourlyAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    hierarchy,
    false,
  )
  const { data: compHourly } = useDuckDBHourlyAggregation(
    duckConn,
    duckDataVersion,
    compRange,
    selectedStoreIds,
    hierarchy,
    compIsPrevYear,
  )
  const { data: currentDayCount } = useDuckDBDistinctDayCount(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    false,
  )
  const { data: compDayCount } = useDuckDBDistinctDayCount(
    duckConn,
    duckDataVersion,
    compRange,
    selectedStoreIds,
    compIsPrevYear,
  )

  // Hierarchy dropdowns
  const { data: departments } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'department',
    undefined,
    false,
  )
  const { data: lines } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'line',
    deptCode ? { deptCode } : undefined,
    false,
  )
  const { data: klasses } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'klass',
    deptCode || lineCode
      ? { deptCode: deptCode || undefined, lineCode: lineCode || undefined }
      : undefined,
    false,
  )

  const hasPrev = (compHourly?.length ?? 0) > 0
  const compLabel = compMode === 'wow' ? '前週' : '前年'
  const curLabel = compMode === 'wow' ? '当週' : '当年'

  // ── Computed values (delegated to Logic) ──

  const { chartData, kpi } = useMemo(
    () =>
      computeChartDataAndKpi({
        currentHourly,
        compHourly,
        mode,
        currentDayCount,
        compDayCount,
        hasPrev,
      }),
    [currentHourly, compHourly, mode, currentDayCount, compDayCount, hasPrev],
  )

  const yoyData = useMemo(
    () => computeYoYData(currentHourly, compHourly),
    [currentHourly, compHourly],
  )

  const insights = useMemo(
    () => computeInsights(kpi, compHourly, yoyData, compLabel),
    [kpi, compHourly, yoyData, compLabel],
  )

  // ── Hierarchy helpers ──

  const deptOptions: HierarchyOption[] = useMemo(
    () => departments?.map((d) => ({ code: d.code, name: d.name, amount: d.amount })) ?? [],
    [departments],
  )
  const lineOptions: HierarchyOption[] = useMemo(
    () => lines?.map((l) => ({ code: l.code, name: l.name, amount: l.amount })) ?? [],
    [lines],
  )
  const klassOptions: HierarchyOption[] = useMemo(
    () => klasses?.map((k) => ({ code: k.code, name: k.name, amount: k.amount })) ?? [],
    [klasses],
  )

  const wrappedSetDept = (code: string) => {
    setDeptCode(code)
    setLineCode('')
    setKlassCode('')
  }
  const wrappedSetLine = (code: string) => {
    setLineCode(code)
    setKlassCode('')
  }

  return {
    chartData,
    kpi,
    yoyData,
    insights,
    isLoading,
    error,
    viewMode,
    setViewMode,
    metricMode,
    setMetricMode,
    compMode,
    setCompMode,
    showPrev,
    setShowPrev,
    mode,
    setMode,
    hasPrev,
    compLabel,
    curLabel,
    deptCode,
    lineCode,
    klassCode,
    setDeptCode: wrappedSetDept,
    setLineCode: wrappedSetLine,
    setKlassCode: setKlassCode,
    deptOptions,
    lineOptions,
    klassOptions,
  }
}
