import { calculateForecast } from '@/domain/calculations/forecast'
import type { DayOfWeekAverage } from '@/domain/calculations/forecast'
import { formatPercent, safeDivide } from '@/domain/calculations/utils'
import { useChartTheme, tooltipStyle, toManYen, toComma, STORE_COLORS } from '@/presentation/components/charts/chartTheme'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { ChartWrapper, ChartTitle } from './ForecastPage.styles'
import { DOW_LABELS } from './ForecastPage.helpers'

export function WeeklyChart({ data, dowColors }: { data: Record<string, string | number>[]; dowColors: string[] }) {
  const ct = useChartTheme()

  return (
    <ChartWrapper>
      <ChartTitle>週別売上推移（曜日別）</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={50}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name: string | undefined) => [toComma(value ?? 0), name ?? '']}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
          />
          {DOW_LABELS.map((label, i) => (
            <Bar
              key={label}
              dataKey={label}
              stackId="dow"
              fill={dowColors[i]}
              fillOpacity={0.8}
              radius={i === DOW_LABELS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

export function DayOfWeekChart({ averages, dowColors }: { averages: readonly DayOfWeekAverage[]; dowColors: string[] }) {
  const ct = useChartTheme()

  const totalAvg = averages.reduce((s, a) => s + a.averageSales, 0)

  const data = averages.map((a, i) => ({
    name: DOW_LABELS[i],
    average: a.averageSales,
    index: safeDivide(a.averageSales, totalAvg, 0),
    count: a.count,
    color: dowColors[i],
  }))

  return (
    <ChartWrapper>
      <ChartTitle>曜日指数（曜日別構成比）</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            width={45}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name: string | undefined) => {
              if (name === 'index') return [formatPercent(value ?? 0), '曜日指数']
              return [toComma(value ?? 0), '平均売上']
            }}
          />
          <Bar dataKey="index" radius={[4, 4, 0, 0]} maxBarSize={40} label={{
            position: 'top',
            fill: ct.textSecondary,
            fontSize: ct.fontSize.xs,
            fontFamily: ct.monoFamily,
            formatter: (v: unknown) => `${(Number(v) * 100).toFixed(1)}%`,
          }}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.color}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

/** 店舗間比較レーダーチャート */
export function StoreComparisonRadarChart({
  storeForecasts,
}: {
  storeForecasts: { storeId: string; storeName: string; forecast: ReturnType<typeof calculateForecast> }[]
}) {
  const ct = useChartTheme()

  // Build radar data from day-of-week averages
  const radarData = DOW_LABELS.map((label, i) => {
    const entry: Record<string, string | number> = { subject: label }
    storeForecasts.forEach((sf) => {
      entry[sf.storeName] = sf.forecast.dayOfWeekAverages[i]?.averageSales ?? 0
    })
    return entry
  })

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 曜日別売上レーダー</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <RadarChart data={radarData} margin={{ top: 4, right: 30, left: 30, bottom: 4 }}>
          <PolarGrid stroke={ct.grid} strokeOpacity={0.4} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
          />
          <PolarRadiusAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            tickFormatter={toManYen}
          />
          {storeForecasts.map((sf, i) => (
            <Radar
              key={sf.storeId}
              name={sf.storeName}
              dataKey={sf.storeName}
              stroke={STORE_COLORS[i % STORE_COLORS.length]}
              fill={STORE_COLORS[i % STORE_COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined) => [toComma(value ?? 0), '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

/** 店舗間比較バーチャート */
export function StoreComparisonBarChart({
  storeForecasts,
}: {
  storeForecasts: { storeId: string; storeName: string; forecast: ReturnType<typeof calculateForecast> }[]
}) {
  const ct = useChartTheme()

  // Build grouped bar data per week
  const data = storeForecasts[0]?.forecast.weeklySummaries.map((w, wi) => {
    const entry: Record<string, string | number> = { name: `第${w.weekNumber}週` }
    storeForecasts.forEach((sf) => {
      const sw = sf.forecast.weeklySummaries[wi]
      entry[sf.storeName] = sw?.totalSales ?? 0
    })
    return entry
  }) ?? []

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 週別売上比較</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={50}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name: string | undefined) => [toComma(value ?? 0), name ?? '']}
          />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          {storeForecasts.map((sf, i) => (
            <Bar
              key={sf.storeId}
              dataKey={sf.storeName}
              fill={STORE_COLORS[i % STORE_COLORS.length]}
              fillOpacity={0.8}
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
