/**
 * YoYVarianceChart — ECharts オプションビルダー
 *
 * 純粋関数のみ。コンポーネント本体から分離（C1: 1ファイル = 1変更理由）。
 *
 * @responsibility R:unclassified
 */
import type { EChartsOption } from 'echarts'
import type { AppTheme } from '@/presentation/theme/theme'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { valueYAxis } from './builders'
import { toComma, toPct, toAxisYen, type ChartTheme } from './chartTheme'

export type ViewType = 'salesGap' | 'multiGap' | 'growthRate'
export type GrowthSubMode = 'daily' | 'cumulative' | 'ma7'

export const VIEW_LABELS: Record<ViewType, string> = {
  salesGap: '売上差異',
  multiGap: '複合差異',
  growthRate: '成長率',
}

export const GROWTH_SUB_LABELS: Record<GrowthSubMode, string> = {
  daily: '日別',
  cumulative: '累計',
  ma7: '7日移動平均',
}

export const allLabels: Record<string, string> = {
  salesDiff: '売上差異',
  discountDiff: '売変差異',
  customerDiff: '客数差異',
  cumSalesDiff: '累計売上差異',
  cumDiscountDiff: '累計売変差異',
  cumCustomerDiff: '累計客数差異',
  salesGrowth: '売上成長率',
  customerGrowth: '客数成長率',
  txValueGrowth: '客単価成長率',
  cumSalesGrowth: '売上成長率(累計)',
  cumCustomerGrowth: '客数成長率(累計)',
  cumTxValueGrowth: '客単価成長率(累計)',
  salesGrowthMa7: '売上成長率(7日MA)',
  customerGrowthMa7: '客数成長率(7日MA)',
  txValueGrowthMa7: '客単価成長率(7日MA)',
}

/** NaN → null  *
 * @responsibility R:unclassified
 */
export function maToNull(values: number[]): (number | null)[] {
  return values.map((v) => (isNaN(v) ? null : v))
}

/** ECharts tooltip formatter for all views  *
 * @responsibility R:unclassified
 */
export function buildTooltipFormatter(view: ViewType): (params: unknown) => string {
  return (params: unknown) => {
    const items = params as { seriesName: string; value: unknown; marker: string }[]
    if (!Array.isArray(items) || items.length === 0) return ''
    const first = items[0]
    const dayVal = (first as unknown as { axisValue: string }).axisValue
    let html = `<div style="font-weight:600;margin-bottom:4px">${dayVal}日</div>`
    for (const item of items) {
      const val = item.value as number | null | undefined
      const name = item.seriesName
      let formatted: string
      if (val == null) {
        formatted = '-'
      } else if (view === 'growthRate') {
        formatted = toPct(val)
      } else {
        const key = name
        if (
          key.includes('customer') ||
          key.includes('Customer') ||
          key === allLabels.customerDiff
        ) {
          formatted = `${val >= 0 ? '+' : ''}${toComma(val)}人`
        } else {
          formatted = `${val >= 0 ? '+' : ''}${toComma(val)}`
        }
      }
      html += `<div>${item.marker} ${name}: <strong>${formatted}</strong></div>`
    }
    return html
  }
}

/** Build ECharts option for salesGap view  *
 * @responsibility R:unclassified
 */
export function buildSalesGapOption(
  data: Record<string, unknown>[],
  ct: ChartTheme,
  theme: AppTheme,
): EChartsOption {
  const days = data.map((d) => String(d.day))
  const salesDiffData = data.map((d) => d.salesDiff as number)
  const cumSalesDiffData = data.map((d) => d.cumSalesDiff as number)
  const barColors = data.map((d) =>
    (d.salesDiff as number) >= 0 ? ct.semantic.positive : ct.semantic.negative,
  )

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: buildTooltipFormatter('salesGap'),
    },
    legend: {
      ...standardLegend(theme),
      data: [allLabels.salesDiff, allLabels.cumSalesDiff],
    },
    xAxis: {
      type: 'category' as const,
      data: days,
      axisLabel: {
        color: ct.textMuted,
        fontSize: ct.fontSize.micro,
        fontFamily: ct.monoFamily,
      },
      axisLine: { lineStyle: { color: ct.grid } },
      axisTick: { show: false },
    },
    yAxis: [
      valueYAxis(theme, { formatter: (v: number) => toAxisYen(v) }),
      valueYAxis(theme, {
        formatter: (v: number) => toAxisYen(v),
        position: 'right',
        showSplitLine: false,
      }),
    ],
    series: [
      {
        name: allLabels.salesDiff,
        type: 'bar' as const,
        yAxisIndex: 0,
        data: salesDiffData.map((v, i) => ({
          value: v,
          itemStyle: { color: barColors[i], opacity: 0.7 },
        })),
        barMaxWidth: 16,
        itemStyle: { borderRadius: [2, 2, 0, 0] },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: ct.grid, opacity: 0.7, type: 'solid' as const },
          data: [{ yAxis: 0 }],
          label: { show: false },
        },
      },
      {
        name: allLabels.cumSalesDiff,
        type: 'line' as const,
        yAxisIndex: 1,
        data: cumSalesDiffData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2, color: ct.semantic.sales },
        itemStyle: { color: ct.semantic.sales },
      },
    ],
  }
}

/** Build ECharts option for multiGap view  *
 * @responsibility R:unclassified
 */
export function buildMultiGapOption(
  data: Record<string, unknown>[],
  ct: ChartTheme,
  theme: AppTheme,
): EChartsOption {
  const days = data.map((d) => String(d.day))
  const salesDiffData = data.map((d) => d.salesDiff as number)
  const discountDiffData = data.map((d) => d.discountDiff as number)
  const customerDiffData = data.map((d) => d.customerDiff as number)
  const barColors = data.map((d) =>
    (d.salesDiff as number) >= 0 ? ct.semantic.positive : ct.semantic.neutral,
  )

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: buildTooltipFormatter('multiGap'),
    },
    legend: {
      ...standardLegend(theme),
      data: [allLabels.salesDiff, allLabels.discountDiff, allLabels.customerDiff],
    },
    xAxis: {
      type: 'category' as const,
      data: days,
      axisLabel: {
        color: ct.textMuted,
        fontSize: ct.fontSize.micro,
        fontFamily: ct.monoFamily,
      },
      axisLine: { lineStyle: { color: ct.grid } },
      axisTick: { show: false },
    },
    yAxis: [
      valueYAxis(theme, { formatter: (v: number) => toAxisYen(v) }),
      valueYAxis(theme, {
        formatter: (v: number) => `${toComma(v)}人`,
        position: 'right',
        showSplitLine: false,
      }),
    ],
    series: [
      {
        name: allLabels.salesDiff,
        type: 'bar' as const,
        yAxisIndex: 0,
        data: salesDiffData.map((v, i) => ({
          value: v,
          itemStyle: { color: barColors[i], opacity: 0.7 },
        })),
        barMaxWidth: 12,
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: ct.grid, opacity: 0.7, type: 'solid' as const },
          data: [{ yAxis: 0 }],
          label: { show: false },
        },
      },
      {
        name: allLabels.discountDiff,
        type: 'line' as const,
        yAxisIndex: 0,
        data: discountDiffData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2, color: ct.semantic.discount },
        itemStyle: { color: ct.semantic.discount },
      },
      {
        name: allLabels.customerDiff,
        type: 'line' as const,
        yAxisIndex: 1,
        data: customerDiffData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2, color: ct.semantic.customers, type: 'dashed' as const },
        itemStyle: { color: ct.semantic.customers },
      },
    ],
  }
}

/** Build ECharts option for growthRate view  *
 * @responsibility R:unclassified
 */
export function buildGrowthRateOption(
  data: Record<string, unknown>[],
  growthKeys: { sales: string; customer: string; txValue: string },
  ct: ChartTheme,
  theme: AppTheme,
): EChartsOption {
  const days = data.map((d) => String(d.day))
  const salesData = data.map((d) => (d[growthKeys.sales] as number | null) ?? null)
  const customerData = data.map((d) => (d[growthKeys.customer] as number | null) ?? null)
  const txValueData = data.map((d) => (d[growthKeys.txValue] as number | null) ?? null)

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: buildTooltipFormatter('growthRate'),
    },
    legend: {
      ...standardLegend(theme),
      data: [
        allLabels[growthKeys.sales] ?? growthKeys.sales,
        allLabels[growthKeys.customer] ?? growthKeys.customer,
        allLabels[growthKeys.txValue] ?? growthKeys.txValue,
      ],
    },
    xAxis: {
      type: 'category' as const,
      data: days,
      axisLabel: {
        color: ct.textMuted,
        fontSize: ct.fontSize.micro,
        fontFamily: ct.monoFamily,
      },
      axisLine: { lineStyle: { color: ct.grid } },
      axisTick: { show: false },
    },
    yAxis: valueYAxis(theme, { formatter: (v: number) => toPct(v, 0) }),
    series: [
      {
        name: allLabels[growthKeys.sales] ?? growthKeys.sales,
        type: 'line' as const,
        data: salesData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2.5, color: ct.semantic.sales },
        itemStyle: { color: ct.semantic.sales },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: ct.grid, opacity: 0.7, type: 'solid' as const },
          data: [{ yAxis: 0 }],
          label: { show: false },
        },
      },
      {
        name: allLabels[growthKeys.customer] ?? growthKeys.customer,
        type: 'line' as const,
        data: customerData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2, color: ct.semantic.customers },
        itemStyle: { color: ct.semantic.customers },
      },
      {
        name: allLabels[growthKeys.txValue] ?? growthKeys.txValue,
        type: 'line' as const,
        data: txValueData,
        smooth: true,
        symbol: 'none',
        connectNulls: true,
        lineStyle: { width: 2, color: ct.semantic.transactionValue, type: 'dashed' as const },
        itemStyle: { color: ct.semantic.transactionValue },
      },
    ],
  }
}
