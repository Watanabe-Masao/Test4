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
  ComposedChart,
  Line,
  Area,
  LineChart,
} from 'recharts'
import { ChartWrapper, ChartTitle } from './ForecastPage.styles'
import {
  DOW_LABELS,
  type DowCustomerAvg,
  type MovingAvgEntry,
  type DailyCustomerEntry,
  type RelationshipEntry,
} from './ForecastPage.helpers'

export function WeeklyChart({ data, dowColors }: { data: Record<string, string | number>[]; dowColors: string[] }) {
  const ct = useChartTheme()

  return (
    <ChartWrapper>
      <ChartTitle>週別売上推移（曜日別）</ChartTitle>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
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
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
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
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
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
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
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

// ─── 客数・客単価分析チャート ──────────────────────────

/** 曜日別客数・客単価チャート（前年比較付き） */
export function DowCustomerChart({
  averages,
  dowColors,
}: {
  averages: DowCustomerAvg[]
  dowColors: string[]
}) {
  const ct = useChartTheme()
  const hasPrev = averages.some((a) => a.prevAvgCustomers > 0)

  const data = averages.map((a, i) => ({
    name: a.dow,
    今年客数: a.avgCustomers,
    ...(hasPrev ? { 前年客数: a.prevAvgCustomers } : {}),
    今年客単価: a.avgTxValue,
    ...(hasPrev ? { 前年客単価: a.prevAvgTxValue } : {}),
    color: dowColors[i],
  }))

  return (
    <ChartWrapper>
      <ChartTitle>曜日別 平均客数・客単価{hasPrev ? '（前年比較）' : ''}</ChartTitle>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="name"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            width={45}
            label={{ value: '客数', position: 'insideTopLeft', fill: ct.textMuted, fontSize: ct.fontSize.xs }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={toComma}
            label={{ value: '客単価', position: 'insideTopRight', fill: ct.textMuted, fontSize: ct.fontSize.xs }}
          />
          <Tooltip contentStyle={tooltipStyle(ct)} formatter={(v: number, name: string) => [toComma(v), name]} />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          <Bar yAxisId="left" dataKey="今年客数" fill="#06b6d4" fillOpacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={30}>
            {data.map((_, i) => <Cell key={i} fill={dowColors[i]} fillOpacity={0.8} />)}
          </Bar>
          {hasPrev && (
            <Bar yAxisId="left" dataKey="前年客数" fill="#94a3b8" fillOpacity={0.4} radius={[4, 4, 0, 0]} maxBarSize={30} />
          )}
          <Line yAxisId="right" type="monotone" dataKey="今年客単価" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
          {hasPrev && (
            <Line yAxisId="right" type="monotone" dataKey="前年客単価" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

/** 客数・客単価 移動平均チャート */
export function MovingAverageChart({
  data: maData,
  hasPrev,
}: {
  data: MovingAvgEntry[]
  hasPrev: boolean
}) {
  const ct = useChartTheme()

  const chartData = maData.map((e) => ({
    day: `${e.day}`,
    客数MA: e.customersMA,
    客単価MA: e.txValueMA,
    ...(hasPrev ? { 前年客数MA: e.prevCustomersMA, 前年客単価MA: e.prevTxValueMA } : {}),
  }))

  return (
    <ChartWrapper>
      <ChartTitle>客数・客単価 移動平均（5日窓）{hasPrev ? ' vs 前年' : ''}</ChartTitle>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={toComma}
          />
          <Tooltip contentStyle={tooltipStyle(ct)} formatter={(v: number, name: string) => [toComma(v), name]} />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          <Area yAxisId="left" type="monotone" dataKey="客数MA" fill="#06b6d4" fillOpacity={0.15} stroke="#06b6d4" strokeWidth={2} />
          {hasPrev && (
            <Area yAxisId="left" type="monotone" dataKey="前年客数MA" fill="#94a3b8" fillOpacity={0.08} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" />
          )}
          <Line yAxisId="right" type="monotone" dataKey="客単価MA" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          {hasPrev && (
            <Line yAxisId="right" type="monotone" dataKey="前年客単価MA" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

/** 売上・客数・客単価 関係性チャート（指数化） */
export function RelationshipChart({
  data: relData,
  prevData,
  viewMode,
}: {
  data: RelationshipEntry[]
  prevData: RelationshipEntry[]
  viewMode: 'current' | 'prev' | 'compare'
}) {
  const ct = useChartTheme()

  const showCurrent = viewMode === 'current' || viewMode === 'compare'
  const showPrev = (viewMode === 'prev' || viewMode === 'compare') && prevData.length > 0

  // Merge data by day
  const dayMap = new Map<number, Record<string, number | string>>()
  if (showCurrent) {
    for (const e of relData) {
      dayMap.set(e.day, {
        day: `${e.day}`,
        売上指数: Math.round(e.salesIndex * 100),
        客数指数: Math.round(e.customersIndex * 100),
        客単価指数: Math.round(e.txValueIndex * 100),
      })
    }
  }
  if (showPrev) {
    for (const e of prevData) {
      const existing = dayMap.get(e.day) ?? { day: `${e.day}` }
      dayMap.set(e.day, {
        ...existing,
        前年売上指数: Math.round(e.salesIndex * 100),
        前年客数指数: Math.round(e.customersIndex * 100),
        前年客単価指数: Math.round(e.txValueIndex * 100),
      })
    }
  }
  const chartData = [...dayMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v)

  const title = viewMode === 'compare'
    ? '売上・客数・客単価 関係性推移（今年 vs 前年）'
    : viewMode === 'prev'
    ? '売上・客数・客単価 関係性推移（前年）'
    : '売上・客数・客単価 関係性推移（今年）'

  return (
    <ChartWrapper style={{ height: 360 }}>
      <ChartTitle>{title}（平均=100）</ChartTitle>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
        <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            width={40}
            domain={['auto', 'auto']}
          />
          <Tooltip contentStyle={tooltipStyle(ct)} formatter={(v: number, name: string) => [`${v}%`, name]} />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          {showCurrent && (
            <>
              <Line type="monotone" dataKey="売上指数" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="客数指数" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="客単価指数" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
            </>
          )}
          {showPrev && (
            <>
              <Line type="monotone" dataKey="前年売上指数" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="前年客数指数" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              <Line type="monotone" dataKey="前年客単価指数" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

/** 日別客数・売上散布図的チャート */
export function CustomerSalesScatterChart({ data }: { data: DailyCustomerEntry[] }) {
  const ct = useChartTheme()

  const withCust = data.filter((e) => e.customers > 0)
  const chartData = withCust.map((e) => ({
    day: `${e.day}`,
    売上: e.sales,
    客数: e.customers,
    客単価: e.txValue,
  }))

  return (
    <ChartWrapper>
      <ChartTitle>日別 売上・客数・客単価 推移</ChartTitle>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="sales"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={50}
          />
          <YAxis
            yAxisId="cust"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip contentStyle={tooltipStyle(ct)} formatter={(v: number, name: string) =>
            name === '売上' ? [toComma(v), name] : [toComma(v), name]
          } />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          <Bar yAxisId="sales" dataKey="売上" fill="#3b82f6" fillOpacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Line yAxisId="cust" type="monotone" dataKey="客数" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2.5 }} />
          <Line yAxisId="cust" type="monotone" dataKey="客単価" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

/** 同曜日比較チャート（今年 vs 前年） */
export function SameDowComparisonChart({
  entries,
  year,
  month,
  dowColors,
}: {
  entries: DailyCustomerEntry[]
  year: number
  month: number
  dowColors: string[]
}) {
  const ct = useChartTheme()

  // Group by DOW, then show each occurrence
  const byDow: Map<number, DailyCustomerEntry[]> = new Map()
  for (const e of entries) {
    if (e.customers <= 0) continue
    const dow = new Date(year, month - 1, e.day).getDay()
    if (!byDow.has(dow)) byDow.set(dow, [])
    byDow.get(dow)!.push(e)
  }

  // Flatten into chart data: one entry per day, colored by DOW
  const chartData = entries
    .filter((e) => e.customers > 0 && e.prevCustomers > 0)
    .map((e) => {
      const dow = new Date(year, month - 1, e.day).getDay()
      return {
        day: `${e.day}(${DOW_LABELS[dow]})`,
        今年客数: e.customers,
        前年客数: e.prevCustomers,
        今年客単価: e.txValue,
        前年客単価: e.prevTxValue,
        color: dowColors[dow],
      }
    })

  if (chartData.length === 0) return null

  return (
    <ChartWrapper>
      <ChartTitle>同曜日 客数・客単価比較（今年 vs 前年）</ChartTitle>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            width={50}
            tickFormatter={toComma}
          />
          <Tooltip contentStyle={tooltipStyle(ct)} formatter={(v: number, name: string) => [toComma(v), name]} />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          <Bar yAxisId="left" dataKey="今年客数" fill="#06b6d4" fillOpacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={16}>
            {chartData.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.8} />)}
          </Bar>
          <Bar yAxisId="left" dataKey="前年客数" fill="#94a3b8" fillOpacity={0.4} radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Line yAxisId="right" type="monotone" dataKey="今年客単価" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
          <Line yAxisId="right" type="monotone" dataKey="前年客単価" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 2 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
