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
import { type ChartTheme, toAxisYen, toComma, toPct } from './chartTheme'
import type { DailySalesDataResult } from './useDailySalesData'

export type ViewType = 'standard' | 'cumulative' | 'difference' | 'rate'

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
  discountCum: '売変累計（当期）',
  prevYearDiscountCum: '売変累計（前年）',
  wfYoyUp: '差分+',
  wfYoyDown: '差分-',
  discountDiffCum: '売変差累計',
  budgetRate: '予算達成率',
  prevYearRate: '前年比',
  rateBand: '達成率帯',
}

/** 隠しシリーズ名（ツールチップから除外） */
const HIDDEN_NAMES = new Set(['wfYoyBase', 'bandUpper', 'bandLower'])

/** パーセント表示するシリーズ名 */
const PERCENT_SERIES = new Set(['budgetRate', 'prevYearRate'])

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

  const yAxisPercent = {
    type: 'value' as const,
    axisLabel: {
      formatter: (v: number) => `${v.toFixed(1)}%`,
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

  const yAxes: EChartsOption['yAxis'] =
    view === 'rate'
      ? yAxisPercent
      : needRightAxis
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
          const val =
            item.value == null
              ? '-'
              : PERCENT_SERIES.has(item.seriesName)
                ? toPct(item.value / 100)
                : toComma(item.value)
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

  // ─── Cumulative: 実績・前年・予算の累計Area + 帯グラフ + 売変累計（右軸） ───
  if (view === 'cumulative') {
    // 帯グラフ: 予算と実績の間を塗りつぶし（達成=青帯、未達=赤帯）
    const budgetVals = pluck(rows, 'budgetCum')
    const currentVals = pluck(rows, 'currentCum')
    // 上側（max）と下側（min）で band を構成
    const bandUpper = budgetVals.map((b, i) => {
      const c = currentVals[i]
      if (b == null || c == null) return null
      return Math.max(b, c)
    })
    const bandLower = budgetVals.map((b, i) => {
      const c = currentVals[i]
      if (b == null || c == null) return null
      return Math.min(b, c)
    })
    // 帯の色: 実績 >= 予算 なら success、実績 < 予算 なら danger
    const bandColors = budgetVals.map((b, i) => {
      const c = currentVals[i]
      if (b == null || c == null) return ct.colors.success
      return c >= b ? ct.colors.success : ct.colors.danger
    })
    // 帯の下半分（透明エリアで底上げ）
    series.push({
      name: 'bandLower',
      type: 'line' as const,
      data: bandLower,
      lineStyle: { width: 0 },
      itemStyle: { color: 'transparent' },
      areaStyle: { color: 'transparent' },
      symbol: 'none',
      stack: 'band',
      silent: true,
    })
    // 帯の上半分（下半分からの差分を塗りつぶし）
    series.push({
      name: 'bandUpper',
      type: 'line' as const,
      data: bandUpper.map((u, i) => {
        const l = bandLower[i]
        if (u == null || l == null) return null
        return u - l
      }),
      lineStyle: { width: 0 },
      itemStyle: {
        color: bandColors[bandColors.length - 1] ?? ct.colors.success,
      },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: bandColors.flatMap((c, i) => [
            { offset: Math.max(0, i / bandColors.length), color: withAlpha(c, 0.15) },
            { offset: Math.min(1, (i + 1) / bandColors.length), color: withAlpha(c, 0.15) },
          ]),
        },
      },
      symbol: 'none',
      stack: 'band',
      silent: true,
    })

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
      data: budgetVals,
      lineStyle: { color: ct.colors.success, width: 2, type: 'dashed' as const },
      itemStyle: { color: ct.colors.success },
      areaStyle: { color: grad(ct.colors.success, 0.15, 0.02) },
      symbol: 'none',
      connectNulls: true,
    })
    series.push({
      name: 'currentCum',
      type: 'line' as const,
      data: currentVals,
      lineStyle: { color: ct.colors.primary, width: 2.5 },
      itemStyle: { color: ct.colors.primary },
      areaStyle: { color: grad(ct.colors.primary, 0.3, 0.02) },
      symbol: 'none',
    })
    // 売変累計（右軸）
    series.push({
      name: 'discountCum',
      type: 'line' as const,
      yAxisIndex: 1,
      data: pluck(rows, 'discountCum'),
      ...lineDefaults({ color: ct.colors.danger, width: 2 }),
      connectNulls: true,
    })
    if (hasPrev) {
      series.push({
        name: 'prevYearDiscountCum',
        type: 'line' as const,
        yAxisIndex: 1,
        data: pluck(rows, 'prevYearDiscountCum'),
        ...lineDefaults({ color: ct.colors.orange, dashed: true, width: 1.5 }),
        connectNulls: true,
      })
    }
  }

  // ─── Rate: 予算達成率・前年比の推移（%表示） ───
  if (view === 'rate') {
    const budgetVals = pluck(rows, 'budgetCum')
    const currentVals = pluck(rows, 'currentCum')
    const prevVals = pluck(rows, 'prevYearCum')

    // 予算達成率 = currentCum / budgetCum * 100
    const budgetRateData = currentVals.map((c, i) => {
      const b = budgetVals[i]
      if (c == null || b == null || b === 0) return null
      return Math.round((c / b) * 10000) / 100
    })
    series.push({
      name: 'budgetRate',
      type: 'line' as const,
      data: budgetRateData,
      lineStyle: { color: ct.colors.success, width: 2.5 },
      itemStyle: { color: ct.colors.success },
      symbol: 'none',
      smooth: true,
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: ct.colors.success, opacity: 0.4, type: 'dashed' as const },
        data: [{ yAxis: 100 }],
        label: { formatter: '100%', fontSize: ct.fontSize.xs },
      },
    })

    // 前年比 = currentCum / prevYearCum * 100
    if (hasPrev) {
      const prevRateData = currentVals.map((c, i) => {
        const p = prevVals[i]
        if (c == null || p == null || p === 0) return null
        return Math.round((c / p) * 10000) / 100
      })
      series.push({
        name: 'prevYearRate',
        type: 'line' as const,
        data: prevRateData,
        lineStyle: { color: ct.colors.slate, width: 2, type: 'dashed' as const },
        itemStyle: { color: ct.colors.slate },
        symbol: 'none',
        smooth: true,
      })
    }
  }

  // ─── Difference: 差分ウォーターフォール + 売変差累計（右軸） ───
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
      // 売変差累計（右軸）
      {
        name: 'discountDiffCum',
        type: 'line' as const,
        yAxisIndex: 1,
        data: pluck(rows, 'discountDiffCum'),
        ...lineDefaults({ color: ct.colors.orange, width: 1.5 }),
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
