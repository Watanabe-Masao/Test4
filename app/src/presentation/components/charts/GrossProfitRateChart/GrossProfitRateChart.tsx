/**
 * GrossProfitRateChart — 粗利率推移チャート（累計ベース）
 *
 * 描画のみ。データ変換は GrossProfitRateChart.vm.ts に委譲。
 */
import { memo, useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart, type EChartsOption } from '../EChart'
import { standardGrid, standardTooltip } from '../echartsOptionBuilders'
import { toPct } from '../chartTheme'
import { DualPeriodSlider } from '../DualPeriodSlider'
import { useDualPeriodRange } from '../useDualPeriodRange'
import type { DailyRecord } from '@/domain/models'
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
    xAxis: {
      type: 'category' as const,
      data: days,
      axisLabel: {
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
        fontFamily: theme.typography.fontFamily.mono,
      },
      axisLine: { lineStyle: { color: theme.colors.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      min: 0,
      max: yMax,
      axisLabel: {
        formatter: (v: number) => toPct(v, 0),
        color: theme.colors.text3,
        fontSize: chartFontSize.axis,
        fontFamily: theme.typography.fontFamily.mono,
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
}: Props) {
  const theme = useTheme() as AppTheme
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)

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
      <DualPeriodSlider
        min={1}
        max={daysInMonth}
        p1Start={rangeStart}
        p1End={rangeEnd}
        onP1Change={setRange}
        p2Start={p2Start}
        p2End={p2End}
        onP2Change={onP2Change}
        p2Enabled={p2Enabled}
      />
    </ChartCard>
  )
})
