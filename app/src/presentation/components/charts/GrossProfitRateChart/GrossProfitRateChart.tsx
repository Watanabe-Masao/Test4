/**
 * GrossProfitRateChart — 粗利率推移チャート（累計ベース）
 *
 * 描画のみ。データ変換は GrossProfitRateChart.vm.ts に委譲。
 * 期間選択はページレベルの DualPeriodSlider から props で受け取る。
 */
import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '../EChart'
import { standardGrid, standardTooltip, categoryXAxis, valueYAxis } from '../builders'
import { toPct } from '../chartTheme'
import type { DailyRecord } from '@/domain/models/record'
import { ChartCard } from '../ChartCard'
import { chartFontSize } from '@/presentation/theme/tokens'
import {
  buildGrossProfitRateViewModel,
  getBarColor,
  type GrossProfitRateDataPoint,
} from './GrossProfitRateChart.vm'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  targetRate: number
  warningRate: number
  /** 表示開始日（ページレベル Slider から） */
  rangeStart?: number
  /** 表示終了日（ページレベル Slider から） */
  rangeEnd?: number
}

function buildOption(
  data: readonly GrossProfitRateDataPoint[],
  yMax: number,
  targetRate: number,
  warningRate: number,
  theme: AppTheme,
): EChartsOption {
  const days = data.map((d) => String(d.day))
  const colors = {
    success: theme.colors.palette.success,
    warning: theme.colors.palette.warning,
    danger: theme.colors.palette.danger,
  }

  return {
    grid: standardGrid(),
    tooltip: {
      ...standardTooltip(theme),
      trigger: 'axis' as const,
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number }[]
        if (!Array.isArray(p) || !p[0]) return ''
        return `${p[0].name}日<br/>粗利率: ${toPct(p[0].value)}`
      },
    },
    xAxis: categoryXAxis(days, theme),
    yAxis: {
      ...valueYAxis(theme, {
        min: 0,
        max: yMax,
        formatter: (v: number) => toPct(v, 0),
      }),
    },
    series: [
      {
        type: 'bar' as const,
        data: (data as unknown as Record<string, unknown>[]).map((entry) => {
          const d = entry as unknown as GrossProfitRateDataPoint
          return {
            value: d.rate,
            itemStyle: {
              color: d.hasSales
                ? getBarColor(d.rate, targetRate, warningRate, colors)
                : 'transparent',
              opacity: d.hasSales ? 0.8 : 0,
              borderRadius: [3, 3, 0, 0],
            },
          }
        }),
        barMaxWidth: 16,
        markLine: {
          silent: true,
          symbol: 'none' as const,
          data: [
            {
              yAxis: targetRate,
              label: {
                formatter: `目標 ${toPct(targetRate)}`,
                position: 'end' as const,
                color: theme.colors.palette.success,
                fontSize: chartFontSize.axis,
                fontFamily: theme.typography.fontFamily.mono,
              },
              lineStyle: {
                color: theme.colors.palette.success,
                type: 'dashed' as const,
                width: 1.5,
              },
            },
            {
              yAxis: warningRate,
              label: {
                formatter: `警告 ${toPct(warningRate)}`,
                position: 'end' as const,
                color: theme.colors.palette.warning,
                fontSize: chartFontSize.axis,
                fontFamily: theme.typography.fontFamily.mono,
              },
              lineStyle: {
                color: theme.colors.palette.warning,
                type: 'dashed' as const,
                width: 1,
              },
            },
          ],
        },
      },
    ],
  }
}

export const GrossProfitRateChart = memo(function GrossProfitRateChart({
  daily,
  daysInMonth,
  targetRate,
  warningRate,
  rangeStart: rangeStartProp,
  rangeEnd: rangeEndProp,
}: Props) {
  const theme = useTheme() as AppTheme
  const rangeStart = rangeStartProp ?? 1
  const rangeEnd = rangeEndProp ?? daysInMonth

  const { data, yMax } = useMemo(
    () => buildGrossProfitRateViewModel(daily, daysInMonth, rangeStart, rangeEnd),
    [daily, daysInMonth, rangeStart, rangeEnd],
  )

  const option = useMemo(
    () => buildOption(data, yMax, targetRate, warningRate, theme),
    [data, yMax, targetRate, warningRate, theme],
  )

  return (
    <ChartCard title="粗利率推移（累計ベース）" ariaLabel="粗利率チャート">
      <EChart option={option} height={280} ariaLabel="粗利率チャート" />
    </ChartCard>
  )
})
