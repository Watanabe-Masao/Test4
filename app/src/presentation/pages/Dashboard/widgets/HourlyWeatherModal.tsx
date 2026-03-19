/**
 * 時間別天気モーダル — 折れ線グラフで気温・降水量・湿度を表示
 *
 * 日付セルをクリックすると開き、その日の時間帯ごとの天気データを
 * recharts の折れ線グラフ（気温）+ 棒グラフ（降水量）で可視化する。
 */
import { memo, useMemo } from 'react'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { useChartTheme } from '@/presentation/components/charts/chartTheme'
import { createChartTooltip } from '@/presentation/components/charts/createChartTooltip'
import type { HourlyWeatherRecord } from '@/domain/models'
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalCloseBtn,
  ChartContainer,
  SummaryGrid,
  SummaryItem,
  SummaryLabel,
  SummaryValue,
} from './HourlyWeatherModal.styles'

interface Props {
  readonly dateKey: string
  readonly records: readonly HourlyWeatherRecord[]
  readonly onClose: () => void
}

interface ChartPoint {
  readonly hour: string
  readonly temperature: number
  readonly humidity: number
  readonly precipitation: number
}

export const HourlyWeatherModal = memo(function HourlyWeatherModal({
  dateKey,
  records,
  onClose,
}: Props) {
  const chartTheme = useChartTheme()

  const chartData = useMemo<readonly ChartPoint[]>(
    () =>
      records.map((r) => ({
        hour: `${String(r.hour).padStart(2, '0')}時`,
        temperature: r.temperature,
        humidity: r.humidity,
        precipitation: r.precipitation,
      })),
    [records],
  )

  const summary = useMemo(() => {
    if (records.length === 0) return null
    const temps = records.map((r) => r.temperature)
    const totalPrecip = records.reduce((s, r) => s + r.precipitation, 0)
    const avgHumidity = records.reduce((s, r) => s + r.humidity, 0) / records.length
    return {
      maxTemp: Math.max(...temps),
      minTemp: Math.min(...temps),
      totalPrecip,
      avgHumidity,
    }
  }, [records])

  const dayLabel = dateKey.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日')

  const tooltipContent = useMemo(
    () =>
      createChartTooltip({
        ct: chartTheme,
        formatter: (value, name) => {
          const v = value as number
          if (name === '気温') return [`${v.toFixed(1)}°C`, name]
          if (name === '湿度') return [`${v.toFixed(0)}%`, name]
          if (name === '降水量') return [`${v.toFixed(1)}mm`, name]
          return [String(v), name]
        },
      }),
    [chartTheme],
  )

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{dayLabel} の時間別天気</ModalTitle>
          <ModalCloseBtn onClick={onClose}>&times;</ModalCloseBtn>
        </ModalHeader>

        <ChartContainer>
          <ResponsiveContainer>
            <ComposedChart data={chartData as ChartPoint[]} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: chartTheme.textMuted }}
                interval={2}
              />
              <YAxis
                yAxisId="temp"
                tick={{ fontSize: 10, fill: chartTheme.textMuted }}
                tickFormatter={(v: number) => `${v}°`}
                width={40}
              />
              <YAxis
                yAxisId="precip"
                orientation="right"
                tick={{ fontSize: 10, fill: chartTheme.textMuted }}
                tickFormatter={(v: number) => `${v}mm`}
                width={45}
              />
              <Tooltip content={tooltipContent} />
              <Legend wrapperStyle={{ fontSize: '0.65rem' }} />
              <Bar
                yAxisId="precip"
                dataKey="precipitation"
                fill="#3b82f6"
                opacity={0.3}
                name="降水量"
              />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="temperature"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3, fill: '#ef4444' }}
                name="気温"
              />
              <Line
                yAxisId="temp"
                type="monotone"
                dataKey="humidity"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
                name="湿度"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

        {summary && (
          <SummaryGrid>
            <SummaryItem>
              <SummaryLabel>最高気温</SummaryLabel>
              <SummaryValue style={{ color: '#ef4444' }}>
                {summary.maxTemp.toFixed(1)}°C
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>最低気温</SummaryLabel>
              <SummaryValue style={{ color: '#3498db' }}>
                {summary.minTemp.toFixed(1)}°C
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>降水量合計</SummaryLabel>
              <SummaryValue style={{ color: '#3b82f6' }}>
                {summary.totalPrecip.toFixed(1)}mm
              </SummaryValue>
            </SummaryItem>
            <SummaryItem>
              <SummaryLabel>平均湿度</SummaryLabel>
              <SummaryValue style={{ color: '#8b5cf6' }}>
                {summary.avgHumidity.toFixed(0)}%
              </SummaryValue>
            </SummaryItem>
          </SummaryGrid>
        )}
      </ModalContent>
    </ModalOverlay>
  )
})
