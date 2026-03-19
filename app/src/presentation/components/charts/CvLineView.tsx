/**
 * CV折れ線グラフビュー (ECharts) — CvTimeSeriesChart のサブコンポーネント
 */
import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { CATEGORY_COLORS } from './ChartParts'
import { EChart, type EChartsOption } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'

interface Props {
  readonly data: readonly Record<string, number | string>[]
  readonly topCodes: readonly string[]
  readonly categoryNames: ReadonlyMap<string, string>
  readonly showCv: boolean
  readonly showPi: boolean
}

export function CvLineView({ data, topCodes, categoryNames, showCv, showPi }: Props) {
  const theme = useTheme() as AppTheme

  const option = useMemo<EChartsOption>(() => {
    const dates = data.map((d) => d.dateKey as string)
    const yAxes: Record<string, unknown>[] = []
    const series: EChartsOption['series'] = []

    if (showCv) {
      yAxes.push({
        type: 'value',
        name: 'CV',
        nameLocation: 'middle',
        nameGap: 40,
        min: 0,
        axisLabel: { color: theme.colors.text3, fontSize: 10 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' } },
      })
      topCodes.forEach((code, i) => {
        series.push({
          name: categoryNames.get(code) ?? code,
          type: 'line',
          yAxisIndex: 0,
          data: data.map((d) => (d[`cv_${code}`] as number) ?? null),
          lineStyle: { color: CATEGORY_COLORS[i % CATEGORY_COLORS.length], width: 2 },
          itemStyle: { color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] },
          symbol: 'none',
          connectNulls: true,
        })
      })
    }

    if (showPi) {
      yAxes.push({
        type: 'value',
        name: 'PI',
        nameLocation: 'middle',
        nameGap: 40,
        position: 'right',
        min: 0,
        axisLabel: { color: theme.colors.text3, fontSize: 10 },
        axisLine: { show: false },
        splitLine: { show: false },
      })
      const piAxisIdx = showCv ? 1 : 0
      topCodes.forEach((code, i) => {
        series.push({
          name: `${categoryNames.get(code) ?? code} (PI)`,
          type: 'line',
          yAxisIndex: piAxisIdx,
          data: data.map((d) => (d[`pi_${code}`] as number) ?? null),
          lineStyle: {
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
            width: 1.5,
            type: 'dashed',
          },
          itemStyle: { color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] },
          symbol: 'none',
          connectNulls: true,
        })
      })
    }

    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: { ...standardLegend(theme), type: 'scroll' },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          fontFamily: theme.typography.fontFamily.mono,
        },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: yAxes.length > 0 ? (yAxes as EChartsOption['yAxis']) : { type: 'value' },
      series,
    }
  }, [data, topCodes, categoryNames, showCv, showPi, theme])

  return <EChart option={option} height={300} ariaLabel="CV折れ線グラフ" />
}
