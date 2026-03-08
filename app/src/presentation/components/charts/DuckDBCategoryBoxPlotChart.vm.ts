/**
 * DuckDBCategoryBoxPlotChart ViewModel
 *
 * データ変換・レイアウト計算・フォーマット判定を分離する。
 * React / styled-components に依存しない純粋関数群。
 */
import type {
  BoxPlotStats,
  StoreBreakdownItem,
  DateBreakdownItem,
} from '@/application/hooks/useDuckDBQuery'

// ── Types ──

export type CategoryLevel = 'department' | 'line' | 'klass'
export type BoxMetric = 'sales' | 'quantity'
export type AnalysisAxis = 'store' | 'date'

// ── Label Constants ──

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

// ── Chart Layout ──

export interface ChartMargins {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

export const BREAKDOWN_MARGINS: ChartMargins = {
  left: 90,
  right: 40,
  top: 10,
  bottom: 30,
}

export const BREAKDOWN_ROW_HEIGHT = 28

export const BOX_PLOT_MARGINS: ChartMargins = {
  left: 90,
  right: 40,
  top: 10,
  bottom: 30,
}

export const BOX_PLOT_ROW_HEIGHT = 36

// ── Axis Scale ──

/**
 * 値の配列からXの最大値を求める（きりのよい数字に丸める）。
 */
export function computeXMax(values: readonly number[]): number {
  if (values.length === 0) return 100
  const m = Math.max(...values)
  if (m === 0) return 100
  const mag = Math.pow(10, Math.floor(Math.log10(m)))
  return Math.ceil(m / mag) * mag * 1.05
}

/**
 * 箱ひげ図用のXMax（max値ベース）。
 */
export function computeBoxPlotXMax(boxData: readonly BoxPlotStats[]): number {
  if (boxData.length === 0) return 100
  return computeXMax(boxData.map((d) => d.max))
}

/**
 * ブレイクダウン用のXMax（value値ベース）。
 */
export function computeBreakdownXMax(
  items: readonly { readonly value: number }[],
): number {
  if (items.length === 0) return 100
  return computeXMax(items.map((d) => d.value))
}

// ── Chart Height ──

export function computeChartHeight(
  itemCount: number,
  rowHeight: number,
  margins: ChartMargins,
  minHeight: number,
): number {
  return Math.max(minHeight, itemCount * rowHeight + margins.top + margins.bottom)
}

// ── Axis Label Formatting ──

export function formatAxisValue(val: number): string {
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`
  return String(Math.round(val))
}

// ── Grid Fractions ──

export const GRID_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const

/**
 * グリッド分率からX座標のピクセル位置を計算する。
 */
export function gridFracToXPx(
  frac: number,
  totalWidth: number,
  margins: ChartMargins,
): number {
  return margins.left + frac * (totalWidth - margins.left - margins.right)
}

// ── Bar Geometry ──

export interface BarGeometry {
  readonly yCenter: number
  readonly barH: number
  readonly barW: number
  readonly scale: number
  readonly plotW: number
}

export function computeBarGeometry(
  index: number,
  rowHeight: number,
  barHeightRatio: number,
  value: number,
  xMax: number,
  totalWidth: number,
  margins: ChartMargins,
): BarGeometry {
  const plotW = totalWidth - margins.left - margins.right
  const yCenter = margins.top + index * rowHeight + rowHeight / 2
  const barH = rowHeight * barHeightRatio
  const scale = xMax > 0 ? plotW / xMax : 0
  const barW = Math.max(value * scale, 1)
  return { yCenter, barH, barW, scale, plotW }
}

// ── Box Plot Pixel Positions ──

export interface BoxPlotPixels {
  readonly xMinPx: number
  readonly xQ1Px: number
  readonly xMedianPx: number
  readonly xMeanPx: number
  readonly xQ3Px: number
  readonly xMaxPx: number
  readonly whiskerH: number
  readonly yCenter: number
  readonly barH: number
}

export function computeBoxPlotPixels(
  d: BoxPlotStats,
  index: number,
  xMax: number,
  totalWidth: number,
  margins: ChartMargins,
  rowHeight: number,
): BoxPlotPixels {
  const plotW = totalWidth - margins.left - margins.right
  const yCenter = margins.top + index * rowHeight + rowHeight / 2
  const barH = rowHeight * 0.55
  const scale = xMax > 0 ? plotW / xMax : 0

  return {
    xMinPx: margins.left + d.min * scale,
    xQ1Px: margins.left + d.q1 * scale,
    xMedianPx: margins.left + d.median * scale,
    xMeanPx: margins.left + d.mean * scale,
    xQ3Px: margins.left + d.q3 * scale,
    xMaxPx: margins.left + d.max * scale,
    whiskerH: barH * 0.5,
    yCenter,
    barH,
  }
}

// ── Name Truncation ──

export function truncateName(name: string, maxLen: number = 10): string {
  return name.length > maxLen ? name.slice(0, maxLen) + '…' : name
}

// ── Date Label ──

export function formatDateLabel(dateKey: string): string {
  return dateKey.length >= 10 ? dateKey.slice(5) : dateKey
}

// ── Background Fill ──

export function rowBgFill(
  isSelected: boolean,
  isHovered: boolean,
  isLightTheme: boolean,
): string {
  if (isSelected) {
    return isLightTheme ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.15)'
  }
  if (isHovered) {
    return isLightTheme ? '#f3f4f6' : 'rgba(255,255,255,0.05)'
  }
  return 'transparent'
}

export function breakdownRowBgFill(isHovered: boolean, isLightTheme: boolean): string {
  return rowBgFill(false, isHovered, isLightTheme)
}

export function closeButtonBgColor(isLightTheme: boolean): string {
  return isLightTheme ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'
}

// ── Subtitle ──

export function buildSubtitle(effectiveAxis: AnalysisAxis, boxMetric: BoxMetric): string {
  return effectiveAxis === 'date'
    ? 'カテゴリ別 日別販売金額の分布'
    : `カテゴリ別 店舗間${BOX_METRIC_LABELS[boxMetric]}の分布`
}

// ── Metric Label ──

export function buildMetricLabel(effectiveAxis: AnalysisAxis, boxMetric: BoxMetric): string {
  return effectiveAxis === 'date' ? '販売金額（日別）' : BOX_METRIC_LABELS[boxMetric]
}

// ── Effective Axis ──

export function resolveEffectiveAxis(
  isSingleStore: boolean,
  analysisAxis: AnalysisAxis,
): AnalysisAxis {
  return isSingleStore ? 'date' : analysisAxis
}

// ── Store Name Map ──

export function buildStoreNameMap(
  storesMap: ReadonlyMap<string, { readonly name: string }>,
): Map<string, string> {
  const m = new Map<string, string>()
  for (const [id, store] of storesMap) m.set(id, store.name)
  return m
}

// ── Count Label ──

export function countLabel(boxAxis: AnalysisAxis): string {
  return boxAxis === 'store' ? '店舗数' : '日数'
}

// ── Formatter selection ──

export function selectFormatter(
  boxMetric: BoxMetric,
  effectiveAxis: AnalysisAxis,
  currencyFmt: (v: number) => string,
): (v: number) => string {
  return boxMetric === 'sales' || effectiveAxis === 'date'
    ? currencyFmt
    : (v: number) => v.toLocaleString()
}

// ── Tooltip data ──

export interface BoxPlotTooltipData {
  readonly name: string
  readonly code: string
  readonly metricLabel: string
  readonly max: string
  readonly q3: string
  readonly median: string
  readonly q1: string
  readonly min: string
  readonly mean: string
  readonly countLabel: string
  readonly count: number
}

export function buildTooltipData(
  d: BoxPlotStats,
  metric: string,
  boxAxis: AnalysisAxis,
  fmt: (v: number) => string,
): BoxPlotTooltipData {
  return {
    name: d.name,
    code: d.code,
    metricLabel: metric,
    max: fmt(d.max),
    q3: fmt(d.q3),
    median: fmt(d.median),
    q1: fmt(d.q1),
    min: fmt(d.min),
    mean: fmt(d.mean),
    countLabel: countLabel(boxAxis),
    count: d.count,
  }
}

// ── Find selected name ──

export function findSelectedName(
  boxData: readonly BoxPlotStats[],
  selectedCode: string | null,
): string {
  if (!selectedCode) return ''
  return boxData.find((d) => d.code === selectedCode)?.name ?? ''
}

// ── Re-export types used by the component (convenience) ──

export type { StoreBreakdownItem, DateBreakdownItem }
