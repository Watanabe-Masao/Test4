/**
 * 売上×CV二軸グラフビュー (ECharts) — CvTimeSeriesChart のサブコンポーネント
 */
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { CATEGORY_COLORS } from './ChartParts'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { chartFontSize } from '@/presentation/theme/tokens'

interface Props {
  readonly data: readonly Record<string, number | string>[]
  readonly topCodes: readonly string[]
  readonly categoryNames: ReadonlyMap<string, string>
  readonly fmtCurrency: (v: number | null) => string
}

export function CvSalesCvView({ data, topCodes, categoryNames, fmtCurrency }: Props) {
  const theme = useTheme() as AppTheme

  const option = useMemo<EChartsOption>(() => {
    const dates = data.map((d) => d.dateKey as string)
    const series: EChartsOption['series'] = []

    topCodes.forEach((code, i) => {
      series.push({
        name: `${categoryNames.get(code) ?? code} (売上)`,
        type: 'bar',
        yAxisIndex: 0,
        stack: 'sales',
        data: data.map((d) => (d[`sales_${code}`] as number) ?? 0),
        itemStyle: { color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], opacity: 0.3 },
      })
    })

    topCodes.forEach((code, i) => {
      series.push({
        name: `${categoryNames.get(code) ?? code} (CV)`,
        type: 'line',
        yAxisIndex: 1,
        data: data.map((d) => (d[`cv_${code}`] as number) ?? null),
        lineStyle: { color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], width: 2 },
        itemStyle: { color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] },
        symbol: 'none',
        connectNulls: true,
      })
    })

    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: { ...standardLegend(theme), type: 'scroll' },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: [
        {
          type: 'value',
          name: '売上',
          nameLocation: 'middle',
          nameGap: 50,
          axisLabel: {
            formatter: (v: number) => fmtCurrency(v),
            color: theme.colors.text3,
            fontSize: chartFontSize.axis,
          },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' } },
        },
        {
          type: 'value',
          name: 'CV',
          nameLocation: 'middle',
          nameGap: 40,
          position: 'right',
          min: 0,
          axisLabel: { color: theme.colors.text3, fontSize: chartFontSize.axis },
          axisLine: { show: false },
          splitLine: { show: false },
        },
      ],
      series,
    }
  }, [data, topCodes, categoryNames, fmtCurrency, theme])

  return <EChart option={option} height={300} ariaLabel="売上×CV二軸グラフ" />
}
