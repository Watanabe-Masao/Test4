/**
 * 時間帯別売上チャート — ViewModel
 *
 * 描画に必要なデータ変換・フォーマット・ラベル生成をすべてここに集約する。
 * React / styled-components に依存しない純粋関数群。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import type { ViewMode, MetricMode, TimeSlotKpi, YoYData } from './useDuckDBTimeSlotData'
import { toComma, toPct, toAxisYen } from './chartTheme'
import { formatCoreTime, formatTurnaroundHour } from './timeSlotUtils'

// ── Title / Label ──

export function buildModeLabel(mode: 'total' | 'daily'): string {
  return mode === 'daily' ? '（日平均）' : ''
}

export function buildTitleText(
  viewMode: ViewMode,
  metricMode: MetricMode,
  compLabel: string,
): string {
  if (viewMode === 'yoy') return `時間帯別 ${compLabel}比較`
  const metricText = metricMode === 'amount' ? '売上' : '数量'
  const suffix = viewMode === 'kpi' ? ' サマリー' : ''
  return `時間帯別${metricText}${suffix}`
}

// ── Tooltip / Legend label maps ──

export function buildChartLabelMap(
  showPrev: boolean,
  curLabel: string,
  compLabel: string,
): Record<string, string> {
  return {
    amount: showPrev ? `${curLabel}売上` : '売上金額',
    quantity: showPrev ? `${curLabel}数量` : '数量',
    prevAmount: `${compLabel}売上`,
    prevQuantity: `${compLabel}数量`,
  }
}

export function buildYoYLabelMap(curLabel: string, compLabel: string): Record<string, string> {
  return {
    current: curLabel,
    prevYear: compLabel,
    diff: '差分',
  }
}

// ── Tooltip formatters (return [formattedValue, label]) ──

export function formatChartTooltipEntry(
  value: unknown,
  name: string,
  labelMap: Record<string, string>,
): [string, string] {
  const label = labelMap[name] ?? String(name)
  if (name === 'amount' || name === 'prevAmount') {
    return [toComma(value as number) + '円', label]
  }
  return [toComma(value as number) + '点', label]
}

export function formatYoYTooltipEntry(
  value: unknown,
  name: string,
  labelMap: Record<string, string>,
): [string, string] {
  const label = labelMap[name] ?? String(name)
  const v = (value as number) ?? 0
  if (name === 'diff') return [`${v >= 0 ? '+' : ''}${toComma(v)}円`, label]
  return [`${toComma(v)}円`, label]
}

// ── Legend formatter ──

export function formatLegendLabel(value: string, labelMap: Record<string, string>): string {
  return labelMap[value] ?? value
}

// ── Chart config helpers ──

export function getBarFill(metricMode: MetricMode): string {
  return metricMode === 'amount' ? 'url(#duckTimeAmtGrad)' : 'url(#duckTimeQtyGrad)'
}

export function getPrevDataKey(metricMode: MetricMode): string {
  return metricMode === 'amount' ? 'prevAmount' : 'prevQuantity'
}

export function getYAxisTickFormatter(metricMode: MetricMode): (v: number) => string {
  return metricMode === 'amount' ? toAxisYen : (v: number) => toComma(v)
}

// ── KPI display helpers ──

export function formatManYen(value: number): string {
  return Math.round(value / 10000).toLocaleString() + '万円'
}

export function formatManYenShort(value: number): string {
  return Math.round(value / 10000).toLocaleString() + '万'
}

export function formatYen(value: number): string {
  return value.toLocaleString() + '円'
}

export function formatQuantity(value: number): string {
  return value.toLocaleString() + '点'
}

export function formatPeakHour(hour: number): string {
  return `${hour}時台`
}

export function formatYoYBadgeText(ratio: number): string {
  return `${ratio >= 1 ? '+' : ''}${toPct(ratio - 1)}`
}

export function formatDiffManYen(value: number): string {
  return `${value >= 0 ? '+' : ''}${Math.round(value / 10000).toLocaleString()}万円`
}

export function formatDiffQuantity(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toLocaleString()}点`
}

export function formatCompRatio(compLabel: string, ratio: number): string {
  return `${compLabel}比 ${toPct(ratio)}`
}

// ── YoY summary helpers ──

export function formatYoYDiffYen(diff: number, fmt: (v: number) => string): string {
  return `${diff >= 0 ? '+' : ''}${fmt(diff)}円`
}

export function formatMaxChangeHour(
  hour: number,
  diff: number,
  fmt: (v: number) => string,
  isIncrease: boolean,
): string {
  return isIncrease ? `${hour}時 (+${fmt(diff)})` : `${hour}時 (${fmt(diff)})`
}

// ── YoY table row helpers ──

export function formatYoYTableDiff(diff: number): string {
  return `${diff >= 0 ? '+' : ''}${toComma(diff)}円`
}

export function formatYoYTableRatio(ratio: number | null): string {
  return ratio != null ? toPct(ratio) : '-'
}

// ── Re-exports for convenience (used in rendering) ──

export { toComma, toPct, formatCoreTime, formatTurnaroundHour }
export type { ViewMode, MetricMode, TimeSlotKpi, YoYData }
