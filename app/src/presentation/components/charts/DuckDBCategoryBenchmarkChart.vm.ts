/**
 * DuckDB カテゴリベンチマーク — ViewModel
 *
 * データ変換・計算・定数定義など、Reactに依存しない純粋ロジック。
 * .tsx 側は描画のみに集中する。
 */
import type { CategoryBenchmarkScore, BenchmarkMetric, ProductType } from '@/application/hooks/useDuckDBQuery'
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
  trendData: readonly { readonly dateKey: string; readonly code: string; readonly compositeScore: number }[],
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

export function getSubtitle(
  effectiveAxis: AnalysisAxis,
  benchmarkMetric: BenchmarkMetric,
): string {
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
