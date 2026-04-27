/**
 * @responsibility R:unclassified
 */

import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '@/presentation/components/charts/EChart'
import {
  standardGrid,
  standardTooltip,
} from '@/presentation/components/charts/echartsOptionBuilders'
import { toCommaYen } from '@/presentation/components/charts/echartsOptionBuilders'
import { ChartCard, ChartTitle } from './MobileDashboardPage.styles'

export type DailySalesEntry = {
  readonly day: number
  readonly sales: number
  readonly budget: number
  readonly dow: number
}

export type ChartTabContentProps = {
  readonly dailySalesData: readonly DailySalesEntry[]
}

export function ChartTabContent({ dailySalesData }: ChartTabContentProps) {
  const theme = useTheme() as AppTheme

  const option = useMemo((): EChartsOption => {
    const days = (dailySalesData as DailySalesEntry[]).map((e) => String(e.day))
    const salesValues = (dailySalesData as DailySalesEntry[]).map((e) => e.sales)
    const colors = (dailySalesData as DailySalesEntry[]).map((entry) =>
      entry.sales === 0
        ? `${theme.colors.palette.slate}40`
        : entry.dow === 0 || entry.dow === 6
          ? theme.colors.palette.warning
          : theme.colors.palette.primary,
    )

    return {
      grid: standardGrid(),
      tooltip: {
        ...standardTooltip(theme),
        formatter: (params: unknown) => {
          const p = (Array.isArray(params) ? params : [params]) as {
            name: string
            value: number
            seriesName: string
            marker: string
          }[]
          const first = p[0]
          if (!first) return ''
          return `${first.name}日<br/>${first.marker} ${first.seriesName}: ${toCommaYen(first.value)}`
        },
      },
      xAxis: {
        type: 'category' as const,
        data: days,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          interval: 6,
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: theme.colors.border } },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: 10,
          formatter: (v: number) => `${Math.round(v / 10000)}`,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' as const },
        },
      },
      series: [
        {
          type: 'bar' as const,
          name: '売上',
          data: salesValues.map((v, i) => ({
            value: v,
            itemStyle: { color: colors[i], borderRadius: [2, 2, 0, 0] },
          })),
        },
      ],
    }
  }, [dailySalesData, theme])

  return (
    <ChartCard>
      <ChartTitle>日別売上</ChartTitle>
      <EChart option={option} height={200} />
    </ChartCard>
  )
}
