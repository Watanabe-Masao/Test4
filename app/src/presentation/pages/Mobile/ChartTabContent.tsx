import { useTheme } from 'styled-components'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatCurrency } from '@/domain/calculations/utils'
import type { AppTheme } from '@/presentation/theme/theme'
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
  const chartText = theme.colors.text3
  const chartGrid = theme.colors.border

  return (
    <ChartCard>
      <ChartTitle>日別売上</ChartTitle>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={dailySalesData as DailySalesEntry[]}
          margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
          <XAxis
            dataKey="day"
            tick={{ fill: chartText, fontSize: 10 }}
            tickLine={false}
            interval={6}
          />
          <YAxis
            tick={{ fill: chartText, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${Math.round(v / 10000)}`}
          />
          <Tooltip
            contentStyle={{
              background: theme.colors.bg2,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 6,
              fontSize: 11,
            }}
            formatter={(v: number | undefined, name: string | undefined) => [
              formatCurrency(v ?? 0),
              name ?? '',
            ]}
            labelFormatter={(label) => `${label}日`}
          />
          <Bar dataKey="sales" name="売上" radius={[2, 2, 0, 0]}>
            {dailySalesData.map((entry) => (
              <Cell
                key={entry.day}
                fill={
                  entry.sales === 0
                    ? `${theme.colors.palette.slate}40`
                    : entry.dow === 0 || entry.dow === 6
                      ? theme.colors.palette.warning
                      : theme.colors.palette.primary
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
