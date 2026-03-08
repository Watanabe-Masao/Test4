import { memo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme, useCurrencyFormatter, toComma, toPct, toAxisYen } from './chartTheme'
import { createChartTooltip } from './ChartTooltip'
import { DayRangeSlider } from './DayRangeSlider'
import {
  Wrapper,
  Title,
  SummaryRow,
  Metric,
  MetricLabel,
  MetricValue,
  ProgressBarWrap,
  ProgressTrack,
  ProgressFill,
  ProgressLabel,
  ChartArea,
} from './PrevYearComparisonChart.styles'
import { useDayRange } from './useDayRange'

interface Props {
  currentDaily: ReadonlyMap<number, { sales: number }>
  prevYearDaily: ReadonlyMap<number, { sales: number }>
  daysInMonth: number
}

export const PrevYearComparisonChart = memo(function PrevYearComparisonChart({
  currentDaily,
  prevYearDaily,
  daysInMonth,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  // 累計データ構築
  let currentCum = 0
  let prevCum = 0

  const allData = []
  for (let d = 1; d <= daysInMonth; d++) {
    currentCum += currentDaily.get(d)?.sales ?? 0
    prevCum += prevYearDaily.get(d)?.sales ?? 0
    allData.push({
      day: d,
      currentCum,
      prevYearCum: prevCum > 0 ? prevCum : null,
    })
  }

  const data = allData.filter((d) => d.day >= rangeStart && d.day <= rangeEnd)

  // 前年の同時点累計（実績のある最終日まで）
  const latestDay =
    [...currentDaily.keys()]
      .filter((d) => (currentDaily.get(d)?.sales ?? 0) > 0)
      .sort((a, b) => b - a)[0] ?? 0
  let prevCumAtLatest = 0
  for (let d = 1; d <= latestDay; d++) {
    prevCumAtLatest += prevYearDaily.get(d)?.sales ?? 0
  }

  // ループ後の prevCum が前年月間合計
  const prevTotal = prevCum
  const latestCurrentCum =
    latestDay > 0 ? (data.find((d) => d.day === latestDay)?.currentCum ?? 0) : 0

  // 前年比（同時点比較）
  const yoyRatio = prevCumAtLatest > 0 ? latestCurrentCum / prevCumAtLatest : 0
  const yoyDiff = latestCurrentCum - prevCumAtLatest

  const yoyColor = yoyRatio >= 1.0 ? ct.colors.success : ct.colors.danger

  const hasSummary = latestCurrentCum > 0 && prevCumAtLatest > 0

  return (
    <Wrapper aria-label="前年比較チャート">
      <Title>当年 vs 前年同曜日（累計売上推移）</Title>
      {hasSummary && (
        <SummaryRow>
          <Metric>
            <MetricLabel>当年累計</MetricLabel>
            <MetricValue>{fmt(latestCurrentCum)}円</MetricValue>
          </Metric>
          <ProgressBarWrap>
            <ProgressLabel>
              <span>前年比 {toPct(yoyRatio)}</span>
              <span>
                {yoyDiff >= 0 ? '+' : ''}
                {fmt(yoyDiff)}円
              </span>
            </ProgressLabel>
            <ProgressTrack>
              <ProgressFill $pct={yoyRatio * 100} $color={yoyColor} />
            </ProgressTrack>
          </ProgressBarWrap>
          <Metric>
            <MetricLabel>前年同時点</MetricLabel>
            <MetricValue $color={ct.colors.slate}>{fmt(prevCumAtLatest)}円</MetricValue>
          </Metric>
        </SummaryRow>
      )}
      <ChartArea>
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="currentCumArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.3} />
                <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="prevCumArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.colors.slate} stopOpacity={0.15} />
                <stop offset="100%" stopColor={ct.colors.slate} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={toAxisYen}
              width={55}
            />
            <Tooltip
              content={createChartTooltip({
                ct,
                formatter: (value, name) => {
                  const label = name === 'currentCum' ? '当年累計' : '前年同曜日累計'
                  return [value != null ? toComma(value as number) : '-', label]
                },
                labelFormatter: (label) => `${label}日`,
              })}
            />
            <Legend
              wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  currentCum: '当年累計',
                  prevYearCum: '前年同曜日累計',
                }
                return labels[value] ?? value
              }}
            />
            <Area
              type="monotone"
              dataKey="prevYearCum"
              stroke={ct.colors.slate}
              strokeWidth={2}
              strokeDasharray="4 3"
              fill="url(#prevCumArea)"
              dot={false}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="currentCum"
              stroke={ct.colors.primary}
              strokeWidth={2.5}
              fill="url(#currentCumArea)"
              dot={false}
              activeDot={{ r: 4, fill: ct.colors.primary, stroke: ct.bg2, strokeWidth: 2 }}
            />
            {prevTotal > 0 && (
              <ReferenceLine
                y={prevTotal}
                stroke={ct.colors.slate}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `前年同曜日月間 ${fmt(prevTotal)}`,
                  position: 'right',
                  fill: ct.colors.slate,
                  fontSize: ct.fontSize.xs,
                  fontFamily: ct.monoFamily,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </ChartArea>
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
