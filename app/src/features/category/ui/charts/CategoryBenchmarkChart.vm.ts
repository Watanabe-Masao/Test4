/**
 * カテゴリベンチマーク — ViewModel
 *
 * 状態管理・データ変換を担う。型・定数・純粋関数は CategoryBenchmarkChartLogic.ts に分離。
 * .tsx 側は描画のみに集中する。
 *
 * @guard F7 View は ViewModel のみ受け取る
 * @guard H1 Screen Plan 経由のみ
 * @guard H4 component に acquisition logic 禁止
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo, useCallback } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useCategoryBenchmarkPlan } from '@/application/hooks/useCategoryBenchmarkPlan'
import {
  buildCategoryBenchmarkScores,
  buildCategoryTrendData,
  buildCategoryBenchmarkScoresByDate,
  type CategoryBenchmarkScore,
  type BenchmarkMetric,
  type CategoryTrendPoint,
} from '@/application/queries/advanced'
import { useChartTheme, useCurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import { useI18n } from '@/application/hooks/useI18n'

// ── re-export（後方互換） ──
export {
  type CategoryLevel,
  type ViewMode,
  type AnalysisAxis,
  type KpiSummary,
  type ScatterDataPoint,
  type TrendChartRow,
  LEVEL_LABELS,
  VIEW_LABELS,
  ANALYSIS_AXIS_LABELS,
  BENCHMARK_METRIC_LABELS,
  TYPE_LABELS,
  TYPE_COLORS,
  TREND_COLORS,
  indexColor,
  computeKpis,
  buildScatterData,
  computeChartHeight,
  buildTrendPivotData,
  buildNameMap,
  getSubtitle,
  getTableMetricLabel,
  getMetricDisplayName,
  extractTopCodes,
  resolveEffectiveAxis,
} from '@/features/category/ui/charts/CategoryBenchmarkChartLogic'

import type {
  CategoryLevel,
  ViewMode,
  AnalysisAxis,
} from '@/features/category/ui/charts/CategoryBenchmarkChartLogic'
import {
  computeKpis,
  extractTopCodes,
  getSubtitle,
  getTableMetricLabel,
  resolveEffectiveAxis,
} from '@/features/category/ui/charts/CategoryBenchmarkChartLogic'

// ── Props ──

export interface CategoryBenchmarkChartProps {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

// ── Hierarchy item (from duckdb query) ──

interface HierarchyItem {
  readonly code: string
  readonly name: string
}

// ── Drill state (consolidated) ──

interface DrillHierarchy {
  readonly level: CategoryLevel
  readonly deptCode: string
  readonly lineCode: string
}

// ── ViewModel hook return type ──

export interface CategoryBenchmarkChartVm {
  readonly ct: ReturnType<typeof useChartTheme>
  readonly fmt: (v: number) => string
  readonly errorMessage: string

  readonly level: CategoryLevel
  readonly setLevel: (l: CategoryLevel) => void
  readonly view: ViewMode
  readonly setView: (v: ViewMode) => void
  readonly minStores: number
  readonly setMinStores: (n: number) => void
  readonly analysisAxis: AnalysisAxis
  readonly setAnalysisAxis: (a: AnalysisAxis) => void
  readonly benchmarkMetric: BenchmarkMetric
  readonly setBenchmarkMetric: (m: BenchmarkMetric) => void
  readonly parentDeptCode: string
  readonly setParentDeptCode: (code: string) => void
  readonly parentLineCode: string
  readonly setParentLineCode: (code: string) => void

  readonly isSingleStore: boolean
  readonly effectiveAxis: AnalysisAxis
  readonly deptList: readonly HierarchyItem[] | null
  readonly lineList: readonly HierarchyItem[] | null

  readonly scores: readonly CategoryBenchmarkScore[]
  readonly topCodes: readonly string[]
  readonly trendData: readonly CategoryTrendPoint[]
  readonly kpis: import('./CategoryBenchmarkChartLogic').KpiSummary | null
  readonly subtitle: string
  readonly tableMetricLabel: string

  readonly error: string | null
  readonly isLoading: boolean
  readonly hasRawData: boolean
  readonly hasConnection: boolean
}

// ── ViewModel Hook ──

export function useCategoryBenchmarkChartVm(
  props: CategoryBenchmarkChartProps,
): CategoryBenchmarkChartVm {
  const { queryExecutor, currentDateRange, selectedStoreIds } = props

  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  // consolidated drill hierarchy state (3 → 1)
  const [drillHierarchy, setDrillHierarchy] = useState<DrillHierarchy>({
    level: 'department',
    deptCode: '',
    lineCode: '',
  })
  const [view, setView] = useState<ViewMode>('chart')
  const [minStores, setMinStores] = useState(2)
  const [analysisAxis, setAnalysisAxis] = useState<AnalysisAxis>('store')
  const [benchmarkMetric, setBenchmarkMetric] = useState<BenchmarkMetric>('share')

  const { level, deptCode: parentDeptCode, lineCode: parentLineCode } = drillHierarchy

  const setLevel = useCallback((l: CategoryLevel) => {
    setDrillHierarchy((prev) => {
      if (l === 'department') return { level: l, deptCode: '', lineCode: '' }
      if (l === 'line') return { level: l, deptCode: prev.deptCode, lineCode: '' }
      return { ...prev, level: l }
    })
  }, [])

  const setParentDeptCode = useCallback((code: string) => {
    setDrillHierarchy((prev) => ({ ...prev, deptCode: code, lineCode: '' }))
  }, [])

  const setParentLineCode = useCallback((code: string) => {
    setDrillHierarchy((prev) => ({ ...prev, lineCode: code }))
  }, [])

  const isSingleStore = selectedStoreIds.size === 1
  const effectiveAxis = resolveEffectiveAxis(analysisAxis, isSingleStore)

  // Screen Plan: 全クエリを一元管理
  const plan = useCategoryBenchmarkPlan({
    executor: queryExecutor,
    currentDateRange,
    selectedStoreIds,
    level,
    parentDeptCode,
    parentLineCode,
  })

  const { isLoading } = plan
  const error = plan.error
  const deptList = plan.deptList?.records ?? null
  const lineList = plan.lineList?.records ?? null
  const rawRows = plan.benchmarkData.data?.records ?? null
  const trendRows = plan.trendData.data?.records ?? null

  const totalStoreCount = selectedStoreIds.size

  const storeScores = useMemo(
    () =>
      rawRows
        ? buildCategoryBenchmarkScores(rawRows, minStores, totalStoreCount, benchmarkMetric)
        : [],
    [rawRows, minStores, totalStoreCount, benchmarkMetric],
  )

  const dateScores = useMemo(
    () =>
      trendRows && rawRows
        ? buildCategoryBenchmarkScoresByDate(trendRows, rawRows, minStores, totalStoreCount)
        : [],
    [trendRows, rawRows, minStores, totalStoreCount],
  )

  const scores = effectiveAxis === 'store' ? storeScores : dateScores

  const topCodes = useMemo(() => extractTopCodes(scores), [scores])

  const trendData = useMemo(
    () => (trendRows ? buildCategoryTrendData(trendRows, topCodes, totalStoreCount) : []),
    [trendRows, topCodes, totalStoreCount],
  )

  const kpis = useMemo(() => computeKpis(scores), [scores])

  const subtitle = getSubtitle(effectiveAxis, benchmarkMetric)
  const tableMetricLabel = getTableMetricLabel(effectiveAxis, benchmarkMetric)

  return {
    ct,
    fmt,
    errorMessage: messages.errors.dataFetchFailed,

    level,
    setLevel,
    view,
    setView,
    minStores,
    setMinStores,
    analysisAxis,
    setAnalysisAxis,
    benchmarkMetric,
    setBenchmarkMetric,
    parentDeptCode,
    setParentDeptCode,
    parentLineCode,
    setParentLineCode,

    isSingleStore,
    effectiveAxis,
    deptList: deptList ?? null,
    lineList: lineList ?? null,

    scores,
    topCodes,
    trendData,
    kpis,
    subtitle,
    tableMetricLabel,

    error: error?.message ?? null,
    isLoading,
    hasRawData: rawRows != null,
    hasConnection: queryExecutor != null,
  }
}
