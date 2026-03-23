/**
 * カテゴリベンチマーク — ViewModel
 *
 * 状態管理・データ変換・計算・定数定義を集約。
 * .tsx 側は描画のみに集中する。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
/**
 * @migration P5: useQueryWithHandler 経由に移行済み
 */
import { useState, useMemo } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryBenchmarkHandler,
  type CategoryBenchmarkInput,
} from '@/application/queries/advanced/CategoryBenchmarkHandler'
import {
  categoryBenchmarkTrendHandler,
  type CategoryBenchmarkTrendInput,
} from '@/application/queries/advanced/CategoryBenchmarkTrendHandler'
import {
  categoryHierarchyHandler,
  type CategoryHierarchyInput,
} from '@/application/queries/advanced/CategoryHierarchyHandler'
import {
  buildCategoryBenchmarkScores,
  buildCategoryTrendData,
  buildCategoryBenchmarkScoresByDate,
  type CategoryBenchmarkScore,
  type BenchmarkMetric,
  type ProductType,
  type CategoryTrendPoint,
} from '@/application/queries/advanced'
import { useChartTheme, useCurrencyFormatter } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { palette } from '@/presentation/theme/tokens'

// ── Types ──

export type CategoryLevel = 'department' | 'line' | 'klass'
export type ViewMode = 'chart' | 'table' | 'map' | 'trend'
export type AnalysisAxis = 'store' | 'date'

// ── Constants ──

export const LEVEL_LABELS: Record<CategoryLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

export const VIEW_LABELS: Record<ViewMode, string> = {
  chart: 'チャート',
  table: 'テーブル',
  map: 'マップ',
  trend: 'トレンド',
}

export const ANALYSIS_AXIS_LABELS: Record<AnalysisAxis, string> = {
  store: '店舗別',
  date: '期間別',
}

export const BENCHMARK_METRIC_LABELS: Record<BenchmarkMetric, string> = {
  share: '構成比',
  salesPi: '金額PI値',
  quantityPi: '数量PI値',
}

export const TYPE_LABELS: Record<ProductType, string> = {
  flagship: '主力',
  regional: '地域特化',
  standard: '普通',
  unstable: '不安定',
}

export const TYPE_COLORS: Record<ProductType, string> = {
  flagship: '#22c55e',
  regional: '#3b82f6',
  standard: '#9ca3af',
  unstable: '#ef4444',
}

export const TREND_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
  '#64748b', // slate
] as const

// ── Color helpers ──

export function indexColor(index: number): string {
  if (index >= 70) return palette.positive
  if (index >= 40) return palette.caution
  return palette.negative
}

// ── KPI Summary ──

export interface KpiSummary {
  readonly top: CategoryBenchmarkScore
  readonly bottom: CategoryBenchmarkScore
  readonly flagshipCount: number
  readonly unstableCount: number
  readonly avgIndex: number
}

export function computeKpis(scores: readonly CategoryBenchmarkScore[]): KpiSummary | null {
  if (scores.length === 0) return null
  const sorted = [...scores].sort((a, b) => b.index - a.index)
  const top = sorted[0]
  const bottom = sorted[sorted.length - 1]
  const flagshipCount = scores.filter((s) => s.productType === 'flagship').length
  const unstableCount = scores.filter((s) => s.productType === 'unstable').length
  const avgIndex = scores.reduce((s, v) => s + v.index, 0) / scores.length
  return { top, bottom, flagshipCount, unstableCount, avgIndex }
}

// ── Scatter data (Map view) ──

export interface ScatterDataPoint extends CategoryBenchmarkScore {
  readonly x: number
  readonly y: number
}

export function buildScatterData(
  scores: readonly CategoryBenchmarkScore[],
): readonly ScatterDataPoint[] {
  return scores.map((s) => ({
    ...s,
    x: s.index,
    y: s.stability * 100,
  }))
}

// ── Chart height ──

export function computeChartHeight(scoreCount: number): number {
  return Math.max(200, scoreCount * 28 + 40)
}

// ── Trend pivot data ──

export interface TrendChartRow {
  readonly dateKey: string
  readonly [code: string]: string | number
}

export function buildTrendPivotData(
  trendData: readonly {
    readonly dateKey: string
    readonly code: string
    readonly compositeScore: number
  }[],
): readonly TrendChartRow[] {
  const dateMap = new Map<string, Record<string, string | number>>()
  for (const p of trendData) {
    let entry = dateMap.get(p.dateKey)
    if (!entry) {
      entry = { dateKey: p.dateKey }
      dateMap.set(p.dateKey, entry)
    }
    entry[p.code] = p.compositeScore
  }
  const arr = Array.from(dateMap.values())
  arr.sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)))
  return arr as unknown as readonly TrendChartRow[]
}

export function buildNameMap(scores: readonly CategoryBenchmarkScore[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const s of scores) map.set(s.code, s.name)
  return map
}

// ── Subtitle ──

export function getSubtitle(effectiveAxis: AnalysisAxis, benchmarkMetric: BenchmarkMetric): string {
  if (effectiveAxis === 'date') {
    return '期間別分析 | 日別構成比の変動 × バラツキ(CV) × カバー率'
  }
  if (benchmarkMetric === 'share') {
    return '構成比ベース商品力分析 | 平均構成比 × バラツキ(CV) × カバー率'
  }
  return `${BENCHMARK_METRIC_LABELS[benchmarkMetric]}ベース商品力分析 | PI値 = 値÷客数×1000`
}

// ── Table metric label ──

export function getTableMetricLabel(
  effectiveAxis: AnalysisAxis,
  benchmarkMetric: BenchmarkMetric,
): string {
  return effectiveAxis === 'date' ? '日別構成比' : BENCHMARK_METRIC_LABELS[benchmarkMetric]
}

// ── Tooltip metric display name ──

export function getMetricDisplayName(metric: BenchmarkMetric): string {
  if (metric === 'share') return '平均構成比'
  if (metric === 'salesPi') return '金額PI値'
  return '数量PI値'
}

// ── Top codes extraction ──

export function extractTopCodes(
  scores: readonly CategoryBenchmarkScore[],
  count: number = 10,
): readonly string[] {
  return scores.slice(0, count).map((s) => s.code)
}

// ── Effective axis ──

export function resolveEffectiveAxis(
  analysisAxis: AnalysisAxis,
  isSingleStore: boolean,
): AnalysisAxis {
  return isSingleStore ? 'date' : analysisAxis
}

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
  readonly kpis: KpiSummary | null
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

  const [level, setLevelRaw] = useState<CategoryLevel>('department')
  const [view, setView] = useState<ViewMode>('chart')
  const [minStores, setMinStores] = useState(2)
  const [analysisAxis, setAnalysisAxis] = useState<AnalysisAxis>('store')
  const [benchmarkMetric, setBenchmarkMetric] = useState<BenchmarkMetric>('share')
  const [parentDeptCode, setParentDeptCodeRaw] = useState<string>('')
  const [parentLineCode, setParentLineCode] = useState<string>('')

  const setLevel = (l: CategoryLevel) => {
    setLevelRaw(l)
    if (l === 'department') {
      setParentDeptCodeRaw('')
      setParentLineCode('')
    } else if (l === 'line') {
      setParentLineCode('')
    }
  }

  const setParentDeptCode = (code: string) => {
    setParentDeptCodeRaw(code)
    setParentLineCode('')
  }

  const isSingleStore = selectedStoreIds.size === 1
  const effectiveAxis = resolveEffectiveAxis(analysisAxis, isSingleStore)

  // QueryHandler inputs
  const deptHierarchyInput = useMemo<CategoryHierarchyInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level: 'department' as const,
    }
  }, [currentDateRange, selectedStoreIds])

  const lineHierarchyInput = useMemo<CategoryHierarchyInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level: 'line' as const,
      parentDeptCode: parentDeptCode || undefined,
    }
  }, [currentDateRange, selectedStoreIds, parentDeptCode])

  const benchmarkInput = useMemo<CategoryBenchmarkInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level,
      parentDeptCode: parentDeptCode || undefined,
      parentLineCode: parentLineCode || undefined,
    }
  }, [currentDateRange, selectedStoreIds, level, parentDeptCode, parentLineCode])

  const trendInput = useMemo<CategoryBenchmarkTrendInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level,
      parentDeptCode: parentDeptCode || undefined,
      parentLineCode: parentLineCode || undefined,
    }
  }, [currentDateRange, selectedStoreIds, level, parentDeptCode, parentLineCode])

  const { data: deptOutput } = useQueryWithHandler(
    queryExecutor,
    categoryHierarchyHandler,
    deptHierarchyInput,
  )
  const deptList = deptOutput?.records ?? null

  const { data: lineOutput } = useQueryWithHandler(
    queryExecutor,
    categoryHierarchyHandler,
    lineHierarchyInput,
  )
  const lineList = lineOutput?.records ?? null

  const {
    data: benchmarkOutput,
    error,
    isLoading,
  } = useQueryWithHandler(queryExecutor, categoryBenchmarkHandler, benchmarkInput)
  const rawRows = benchmarkOutput?.records ?? null

  const { data: trendOutput } = useQueryWithHandler(
    queryExecutor,
    categoryBenchmarkTrendHandler,
    trendInput,
  )
  const trendRows = trendOutput?.records ?? null

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
