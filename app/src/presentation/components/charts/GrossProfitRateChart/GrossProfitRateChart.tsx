/**
 * GrossProfitRateChart — 粗利率推移チャート（累計ベース）
 *
 * 描画のみ。データ変換は GrossProfitRateChart.vm.ts に委譲。
 */
import { memo, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, toPct } from '../chartTheme'
import { createChartTooltip } from '../createChartTooltip'
import { DayRangeSlider } from '../DayRangeSlider'
import { useDayRange } from '../useDayRange'
import type { DailyRecord } from '@/domain/models'
import { Wrapper, Title } from './GrossProfitRateChart.styles'
import { buildGrossProfitRateViewModel, getBarColor } from './GrossProfitRateChart.vm'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  targetRate: number
  warningRate: number
}

export const GrossProfitRateChart = memo(function GrossProfitRateChart({
  daily,
  daysInMonth,
  targetRate,
  warningRate,
}: Props) {
  const ct = useChartTheme()
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  const { data, yMax } = useMemo(
    () => buildGrossProfitRateViewModel(daily, daysInMonth, rangeStart, rangeEnd),
    [daily, daysInMonth, rangeStart, rangeEnd],
  )

  return (
    <Wrapper aria-label="粗利率チャート">
      <Title>粗利率推移（累計ベース）</Title>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="84%">
        <BarChart data={[...data]} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => toPct(v, 0)}
            width={40}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value: unknown) => [toPct(value as number), '粗利率'],
              labelFormatter: (label) => `${label}日`,
            })}
          />
          <ReferenceLine
            y={targetRate}
            stroke={ct.colors.success}
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `目標 ${toPct(targetRate)}`,
              position: 'right',
              fill: ct.colors.success,
              fontSize: ct.fontSize.xs,
              fontFamily: ct.monoFamily,
            }}
          />
          <ReferenceLine
            y={warningRate}
            stroke={ct.colors.warning}
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: `警告 ${toPct(warningRate)}`,
              position: 'right',
              fill: ct.colors.warning,
              fontSize: ct.fontSize.xs,
              fontFamily: ct.monoFamily,
            }}
          />
          <Bar dataKey="rate" radius={[3, 3, 0, 0]} maxBarSize={16}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.hasSales
                    ? getBarColor(entry.rate, targetRate, warningRate, ct.colors)
                    : 'transparent'
                }
                fillOpacity={entry.hasSales ? 0.8 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <DayRangeSlider
        min={1}
        max={daysInMonth}
        start={rangeStart}
        end={rangeEnd}
        onChange={setRange}
      />
    </Wrapper>
  )
})
