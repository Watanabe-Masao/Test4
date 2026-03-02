/**
 * 要因分解分析チャート群
 */
import { memo } from 'react'
import {
  useChartTheme,
  tooltipStyle,
  useCurrencyFormatter,
  toComma,
} from '@/presentation/components/charts/chartTheme'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
  ComposedChart,
  Line,
  Area,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import { ChartWrapper, ChartTitle } from './ForecastPage.styles'
import { type DailyDecompEntry, type DowDecompAvg } from './ForecastPage.helpers'

const EFFECT_COLORS = {
  custEffect: '#06b6d4',
  ticketEffect: '#8b5cf6',
  salesDiff: '#f59e0b',
} as const

const EFFECT_LABELS: Record<string, string> = {
  custEffect: '客数効果',
  ticketEffect: '客単価効果',
  salesDiff: '売上差',
  cumCustEffect: '累計客数効果',
  cumTicketEffect: '累計客単価効果',
  cumSalesDiff: '累計売上差',
}

/** 日別要因分解推移（累計折れ線） */
export const DecompTrendChart = memo(function DecompTrendChart({ data }: { data: DailyDecompEntry[] }) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()

  return (
    <ChartWrapper>
      <ChartTitle>日別 要因分解推移（累計）</ChartTitle>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
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
            tickFormatter={fmt}
            width={55}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name: string | undefined) => [
              toComma(value ?? 0),
              EFFECT_LABELS[name as string] ?? name ?? '',
            ]}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => EFFECT_LABELS[value] ?? value}
          />
          <Area
            type="monotone"
            dataKey="cumCustEffect"
            fill={EFFECT_COLORS.custEffect}
            fillOpacity={0.15}
            stroke={EFFECT_COLORS.custEffect}
            strokeWidth={2}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="cumTicketEffect"
            fill={EFFECT_COLORS.ticketEffect}
            fillOpacity={0.15}
            stroke={EFFECT_COLORS.ticketEffect}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="cumSalesDiff"
            stroke={EFFECT_COLORS.salesDiff}
            strokeWidth={2.5}
            dot={false}
            strokeDasharray="6 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
})

/** 日別要因分解バー（1日ごとの内訳） */
export const DecompDailyBarChart = memo(function DecompDailyBarChart({ data }: { data: DailyDecompEntry[] }) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()

  return (
    <ChartWrapper>
      <ChartTitle>日別 売上差の要因内訳</ChartTitle>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
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
            tickFormatter={fmt}
            width={55}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name: string | undefined) => [
              toComma(value ?? 0),
              EFFECT_LABELS[name as string] ?? name ?? '',
            ]}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => EFFECT_LABELS[value] ?? value}
          />
          <Bar
            dataKey="custEffect"
            stackId="effect"
            fill={EFFECT_COLORS.custEffect}
            fillOpacity={0.8}
            maxBarSize={16}
          />
          <Bar
            dataKey="ticketEffect"
            stackId="effect"
            fill={EFFECT_COLORS.ticketEffect}
            fillOpacity={0.8}
            maxBarSize={16}
            radius={[3, 3, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
})

/** 曜日別要因分解チャート */
export const DecompDowChart = memo(function DecompDowChart({ data, dowColors }: { data: DowDecompAvg[]; dowColors: string[] }) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()

  return (
    <ChartWrapper>
      <ChartTitle>曜日別 平均要因分解</ChartTitle>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="85%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="dow"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmt}
            width={55}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name: string | undefined) => {
              const label =
                name === 'avgCustEffect'
                  ? '客数効果'
                  : name === 'avgTicketEffect'
                    ? '客単価効果'
                    : name === 'avgSalesDiff'
                      ? '売上差'
                      : (name ?? '')
              return [toComma(value ?? 0), label]
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) =>
              value === 'avgCustEffect'
                ? '客数効果'
                : value === 'avgTicketEffect'
                  ? '客単価効果'
                  : value === 'avgSalesDiff'
                    ? '売上差'
                    : value
            }
          />
          <Bar
            dataKey="avgCustEffect"
            fill={EFFECT_COLORS.custEffect}
            fillOpacity={0.8}
            maxBarSize={28}
            radius={[0, 0, 0, 0]}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={dowColors[i]} fillOpacity={0.7} />
            ))}
          </Bar>
          <Bar
            dataKey="avgTicketEffect"
            fill={EFFECT_COLORS.ticketEffect}
            fillOpacity={0.8}
            maxBarSize={28}
            radius={[3, 3, 0, 0]}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={dowColors[i]} fillOpacity={0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
})
