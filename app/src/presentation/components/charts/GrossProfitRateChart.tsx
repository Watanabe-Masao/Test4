import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toPct } from './chartTheme'
import { getDailyTotalCost } from '@/domain/models'
import type { DailyRecord } from '@/domain/models'
import { safeDivide } from '@/domain/calculations/utils'

const Wrapper = styled.div`
  width: 100%;
  height: 360px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  targetRate: number
  warningRate: number
}

export function GrossProfitRateChart({ daily, daysInMonth, targetRate, warningRate }: Props) {
  const ct = useChartTheme()

  const data = []
  let cumSales = 0
  let cumCost = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      cumSales += rec.sales
      cumCost += getDailyTotalCost(rec)
    }
    const rate = safeDivide(cumSales - cumCost, cumSales, 0)
    data.push({
      day: d,
      rate,
      hasSales: rec ? rec.sales > 0 : false,
    })
  }

  // Y軸上限をデータの最大値に基づいて動的に決定（最低0.5、0.1刻みで切り上げ）
  const maxRate = Math.max(...data.filter(d => d.hasSales).map(d => d.rate), 0)
  const yMax = Math.max(0.5, Math.ceil(maxRate * 10) / 10)

  const getBarColor = (rate: number) => {
    if (rate >= targetRate) return ct.colors.success
    if (rate >= warningRate) return ct.colors.warning
    return ct.colors.danger
  }

  return (
    <Wrapper>
      <Title>粗利率推移（累計ベース）</Title>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
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
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            width={40}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value) => [toPct(value as number), '粗利率']}
            labelFormatter={(label) => `${label}日`}
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
                fill={entry.hasSales ? getBarColor(entry.rate) : 'transparent'}
                fillOpacity={entry.hasSales ? 0.8 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
