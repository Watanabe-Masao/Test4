/**
 * カテゴリ箱ひげ図 — ViewModel
 *
 * 全ての状態管理・データ変換・フック呼び出しを集約する。
 * プレゼンテーション層は描画のみ。
 */
import { useState, useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import {
  useDuckDBCategoryBenchmark,
  useDuckDBCategoryBenchmarkTrend,
  useDuckDBCategoryHierarchy,
  buildBoxPlotData,
  buildBoxPlotDataByDate,
  type CategoryBenchmarkRow,
  type CategoryBenchmarkTrendRow,
  type BoxPlotStats,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { useDataStore } from '@/application/stores'

// ── Types ──

export interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

export type CategoryLevel = 'department' | 'line' | 'klass'
export type BoxMetric = 'sales' | 'quantity'
export type AnalysisAxis = 'store' | 'date'

export type ChartTheme = ReturnType<typeof useChartTheme>

export const LEVEL_LABELS: Record<CategoryLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

export const BOX_METRIC_LABELS: Record<BoxMetric, string> = {
  sales: '販売金額',
  quantity: '販売数量',
}

export const ANALYSIS_AXIS_LABELS: Record<AnalysisAxis, string> = {
  store: '店舗別',
  date: '期間別',
}

// ── ViewModel Hook ──

export function useCategoryBoxPlotChartVm({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const currencyFmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const storesMap = useDataStore((s) => s.data.stores)

  const storeNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const [id, store] of storesMap) m.set(id, store.name)
    return m
  }, [storesMap])

  const [level, setLevel] = useState<CategoryLevel>('department')
  const [minStores, setMinStores] = useState(2)
  const [boxMetric, setBoxMetric] = useState<BoxMetric>('sales')
  const [analysisAxis, setAnalysisAxis] = useState<AnalysisAxis>('store')
  const [parentDeptCode, setParentDeptCode] = useState<string>('')
  const [parentLineCode, setParentLineCode] = useState<string>('')

  const isSingleStore = selectedStoreIds.size === 1
  const effectiveAxis: AnalysisAxis = isSingleStore ? 'date' : analysisAxis

  const { data: deptList } = useDuckDBCategoryHierarchy(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'department',
  )

  const { data: lineList } = useDuckDBCategoryHierarchy(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'line',
    parentDeptCode || undefined,
  )

  const {
    data: rawRows,
    error,
    isLoading,
  } = useDuckDBCategoryBenchmark(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
    parentDeptCode || undefined,
    parentLineCode || undefined,
  )

  const { data: trendRows } = useDuckDBCategoryBenchmarkTrend(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
    parentDeptCode || undefined,
    parentLineCode || undefined,
  )

  const totalStoreCount = selectedStoreIds.size

  const boxPlotDataByStore = useMemo(
    () => (rawRows ? buildBoxPlotData(rawRows, boxMetric, 20, minStores, totalStoreCount) : []),
    [rawRows, boxMetric, minStores, totalStoreCount],
  )

  const boxPlotDataByDate = useMemo(
    () =>
      trendRows && rawRows
        ? buildBoxPlotDataByDate(trendRows, rawRows, boxMetric, 20, minStores, totalStoreCount)
        : [],
    [trendRows, rawRows, boxMetric, minStores, totalStoreCount],
  )

  const boxPlotData: readonly BoxPlotStats[] =
    effectiveAxis === 'store' ? boxPlotDataByStore : boxPlotDataByDate

  const fmt: (v: number) => string =
    boxMetric === 'sales' || effectiveAxis === 'date'
      ? currencyFmt
      : (v: number) => v.toLocaleString()

  const metricLabel = effectiveAxis === 'date' ? '販売金額（日別）' : BOX_METRIC_LABELS[boxMetric]

  const subtitle =
    effectiveAxis === 'date'
      ? 'カテゴリ別 日別販売金額の分布'
      : `カテゴリ別 店舗間${BOX_METRIC_LABELS[boxMetric]}の分布`

  const handleLevelChange = (l: CategoryLevel) => {
    setLevel(l)
    if (l === 'department') {
      setParentDeptCode('')
      setParentLineCode('')
    } else if (l === 'line') {
      setParentLineCode('')
    }
  }

  const handleDeptChange = (value: string) => {
    setParentDeptCode(value)
    setParentLineCode('')
  }

  const handleLineChange = (value: string) => {
    setParentLineCode(value)
  }

  return {
    ct,
    fmt,
    messages,
    storeNameMap,

    level,
    minStores,
    boxMetric,
    effectiveAxis,
    isSingleStore,
    parentDeptCode,
    parentLineCode,

    deptList,
    lineList,
    rawRows: (rawRows ?? null) as readonly CategoryBenchmarkRow[] | null,
    trendRows: (trendRows ?? null) as readonly CategoryBenchmarkTrendRow[] | null,
    error,
    isLoading,

    boxPlotData,
    metricLabel,
    subtitle,

    handleLevelChange,
    handleDeptChange,
    handleLineChange,
    setBoxMetric,
    setMinStores,
    setAnalysisAxis,
  } as const
}

export type CategoryBoxPlotChartVm = ReturnType<typeof useCategoryBoxPlotChartVm>
