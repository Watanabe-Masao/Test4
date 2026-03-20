/**
 * DailySalesChart 描画コンポーネント
 *
 * ECharts による日別チャート描画のみを担う。
 * データ変換・状態管理は親コンポーネントと useDailySalesData が担当。
 *
 * ビュー構成:
 * - standard: 売上棒+前年棒+売変線+移動平均線
 * - cumulative: 実績・前年・予算の累計Area
 * - difference: 前年差累計ウォーターフォール
 */
import { memo, useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from './EChart'
import { standardGrid, lineDefaults } from './builders'
import { type ChartTheme, toAxisYen, toComma } from './chartTheme'
import type { DailySalesDataResult } from './useDailySalesData'

export type ViewType = 'standard' | 'cumulative' | 'difference'

interface Props {
  data: DailySalesDataResult['data']
  view: ViewType
  isWf: boolean
  hasPrev: boolean
  ct: ChartTheme
  needRightAxis: boolean
  wfLegendPayload: { value: string; type: 'rect'; color: string }[] | undefined
}

const ALL_LABELS: Record<string, string> = {
  sales: '売上',
  prevYearSales: '比較期売上',
  discount: '売変額',
  prevYearDiscount: '比較期売変額',
  salesMa7: '売上7日移動平均',
  currentCum: '当期累計',
  prevYearCum: '比較期累計',
  budgetCum: '予算累計',
  wfYoyUp: '比較期差+',
  wfYoyDown: '比較期差-',
}

/** 隠しシリーズ名（ツールチップから除外） */
const HIDDEN_NAMES = new Set(['wfYoyBase', 'wfYoyCum'])

/** ECharts 用 linearGradient ヘルパー */
function grad(color: string, o1: number, o2: number): object {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: withAlpha(color, o1) },
      { offset: 1, color: withAlpha(color, o2) },
    ],
  }
}

/** rgba ヘルパー — hex色にアルファを付与 */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** データ配列からキーの値配列を取り出す */
function pluck(arr: readonly Record<string, unknown>[], key: string): (number | null)[] {
  return arr.map((d) => {
    const v = d[key]
    return v == null ? null : (v as number)
  })
}

/** option 生成の本体 */
function buildOption(
  data: DailySalesDataResult['data'],
  view: ViewType,
  isWf: boolean,
  hasPrev: boolean,
  ct: ChartTheme,
  needRightAxis: boolean,
  wfLegendPayload: Props['wfLegendPayload'],
): EChartsOption {
  const rows = data as unknown as Record<string, unknown>[]
  const days = rows.map((d) => d.day as string | number)

  // ── 共通軸 ──
  const xAxis: EChartsOption['xAxis'] = {
    type: 'category' as const,
    data: days as string[],
    axisLabel: {
      color: ct.textMuted,
      fontSize: ct.fontSize.xs,
      fontFamily: ct.monoFamily,
    },
    axisLine: { lineStyle: { color: ct.grid } },
    axisTick: { show: false },
  }

  const yAxisLeft = {
    type: 'value' as const,
    axisLabel: {
      formatter: (v: number) => toAxisYen(v),
      color: ct.textMuted,
      fontSize: ct.fontSize.xs,
      fontFamily: ct.monoFamily,
    },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      lineStyle: { color: ct.grid, opacity: 0.3, type: 'dashed' as const },
    },
  }

  const yAxes: EChartsOption['yAxis'] = needRightAxis
    ? [
        yAxisLeft,
        {
          type: 'value' as const,
          position: 'right' as const,
          axisLabel: {
            formatter: (v: number) => toAxisYen(v),
            color: ct.textMuted,
            fontSize: ct.fontSize.xs,
            fontFamily: ct.monoFamily,
          },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      ]
    : yAxisLeft

  // ── ツールチップ ──
  const tooltip: EChartsOption['tooltip'] = {
    trigger: 'axis' as const,
    backgroundColor: ct.bg2,
    borderColor: ct.grid,
    textStyle: {
      color: ct.text,
      fontSize: ct.fontSize.sm,
      fontFamily: ct.fontFamily,
    },
    formatter: (params: unknown) => {
      const items = params as {
        seriesName: string
        value: number | null
        color: string
        marker: string
      }[]
      if (!Array.isArray(items) || items.length === 0) return ''
      const day = (items[0] as unknown as { name: string }).name
      const header = `<div style="font-weight:600;margin-bottom:4px">${day}日</div>`
      const lines = items
        .filter((item) => !HIDDEN_NAMES.has(item.seriesName))
        .map((item) => {
          const label = ALL_LABELS[item.seriesName] ?? item.seriesName
          const val = item.value == null ? '-' : toComma(item.value)
          return (
            `<div style="display:flex;justify-content:space-between;gap:12px">` +
            `${item.marker}<span>${label}</span>` +
            `<span style="font-weight:600;font-family:monospace">${val}</span></div>`
          )
        })
        .join('')
      return header + lines
    },
  }

  // ── 凡例 ──
  const legendData: { name: string; icon?: string; itemStyle?: object }[] = []
  if (wfLegendPayload) {
    for (const item of wfLegendPayload) {
      legendData.push({
        name: ALL_LABELS[item.value] ?? item.value,
        icon: 'rect',
        itemStyle: { color: item.color },
      })
    }
  }
  const legend: EChartsOption['legend'] = wfLegendPayload
    ? {
        data: legendData,
        bottom: 0,
        textStyle: { fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily },
      }
    : {
        bottom: 0,
        textStyle: { fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily },
        formatter: (name: string) => ALL_LABELS[name] ?? name,
      }

  // ── シリーズ構築 ──
  const series: EChartsOption['series'] = []

  // ─── Standard: 売上+前年売上=棒、売変=点線、移動平均線 ───
  if (view === 'standard') {
    series.push({
      name: 'sales',
      type: 'bar' as const,
      yAxisIndex: 0,
      data: pluck(rows, 'sales'),
      itemStyle: {
        color: grad(ct.colors.primary, 0.9, 0.5),
        borderRadius: [3, 3, 0, 0],
      },
      barMaxWidth: 18,
    })
    if (hasPrev) {
      series.push({
        name: 'prevYearSales',
        type: 'bar' as const,
        yAxisIndex: 0,
        data: pluck(rows, 'prevYearSales'),
        itemStyle: {
          color: grad(ct.colors.slate, 0.7, 0.3),
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 14,
      })
    }
    series.push({
      name: 'discount',
      type: 'line' as const,
      yAxisIndex: 1,
      data: pluck(rows, 'discount'),
      ...lineDefaults({ color: ct.colors.danger, dashed: true }),
      connectNulls: true,
    })
    if (hasPrev) {
      series.push({
        name: 'prevYearDiscount',
        type: 'line' as const,
        yAxisIndex: 1,
        data: pluck(rows, 'prevYearDiscount'),
        ...lineDefaults({ color: ct.colors.orange, dashed: true, width: 1.5 }),
        connectNulls: true,
      })
    }
    series.push({
      name: 'salesMa7',
      type: 'line' as const,
      yAxisIndex: 0,
      data: pluck(rows, 'salesMa7'),
      ...lineDefaults({ color: ct.colors.cyanDark }),
      connectNulls: true,
    })
  }

  // ─── Cumulative: 実績・前年・予算の累計Area ───
  if (view === 'cumulative') {
    if (hasPrev) {
      series.push({
        name: 'prevYearCum',
        type: 'line' as const,
        data: pluck(rows, 'prevYearCum'),
        lineStyle: { color: ct.colors.slate, width: 2, type: 'dashed' as const },
        itemStyle: { color: ct.colors.slate },
        areaStyle: { color: grad(ct.colors.slate, 0.15, 0.02) },
        symbol: 'none',
        connectNulls: true,
      })
    }
    series.push({
      name: 'budgetCum',
      type: 'line' as const,
      data: pluck(rows, 'budgetCum'),
      lineStyle: { color: ct.colors.success, width: 2, type: 'dashed' as const },
      itemStyle: { color: ct.colors.success },
      areaStyle: { color: grad(ct.colors.success, 0.15, 0.02) },
      symbol: 'none',
      connectNulls: true,
    })
    series.push({
      name: 'currentCum',
      type: 'line' as const,
      data: pluck(rows, 'currentCum'),
      lineStyle: { color: ct.colors.primary, width: 2.5 },
      itemStyle: { color: ct.colors.primary },
      areaStyle: { color: grad(ct.colors.primary, 0.3, 0.02) },
      symbol: 'none',
    })
  }

  // ─── Difference: 前年差累計ウォーターフォール ───
  if (view === 'difference' && isWf) {
    series.push(
      {
        name: 'wfYoyBase',
        type: 'bar' as const,
        stack: 'wfY',
        data: pluck(rows, 'wfYoyBase'),
        itemStyle: { color: 'transparent' },
        barMaxWidth: 16,
        emphasis: { disabled: true },
      },
      {
        name: 'wfYoyUp',
        type: 'bar' as const,
        stack: 'wfY',
        data: pluck(rows, 'wfYoyUp'),
        itemStyle: { color: withAlpha(ct.colors.success, 0.75), borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 16,
      },
      {
        name: 'wfYoyDown',
        type: 'bar' as const,
        stack: 'wfY',
        data: pluck(rows, 'wfYoyDown'),
        itemStyle: { color: withAlpha(ct.colors.danger, 0.75), borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 16,
      },
      {
        name: 'wfYoyCum',
        type: 'line' as const,
        data: pluck(rows, 'wfYoyCum'),
        ...lineDefaults({ color: ct.colors.primary, dashed: true, width: 1.5 }),
        connectNulls: true,
      },
    )
  }

  // ─── WF 用ゼロ基準線 ───
  if (isWf && series.length > 0) {
    ;(series[series.length - 1] as Record<string, unknown>).markLine = {
      silent: true,
      symbol: 'none',
      lineStyle: { color: ct.grid, opacity: 0.5, type: 'solid' as const },
      data: [{ yAxis: 0 }],
    }
  }

  return {
    grid: { ...standardGrid(), top: 4, right: 12, left: 0, bottom: 30 },
    tooltip,
    legend,
    xAxis,
    yAxis: yAxes,
    series,
  }
}

export const DailySalesChartBody = memo(function DailySalesChartBody({
  data,
  view,
  isWf,
  hasPrev,
  ct,
  needRightAxis,
  wfLegendPayload,
}: Props) {
  const option = useMemo(
    () => buildOption(data, view, isWf, hasPrev, ct, needRightAxis, wfLegendPayload),
    [data, view, isWf, hasPrev, ct, needRightAxis, wfLegendPayload],
  )

  return <EChart option={option} height={300} ariaLabel="日別売上チャート" />
})
