import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, toComma, toPct } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import type { DailyRecord } from '@/domain/models'
import { DISCOUNT_TYPES } from '@/domain/models'
import { safeDivide } from '@/domain/calculations'

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

/** 売変種別ごとのカラーパレット（DISCOUNT_TYPES の順序に対応） */
const DISCOUNT_COLORS = ['#ef4444', '#f97316', '#eab308', '#a855f7'] as const

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
}

/** 売変インパクト分析チャート（スタックバー: 種別内訳 / ライン: 累計売変率） */
export function DiscountTrendChart({ daily, daysInMonth }: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  let cumDiscount = 0
  let cumGrossSales = 0

  const allData = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const dayDiscount = rec?.discountAbsolute ?? 0
    const dayGross = rec?.grossSales ?? 0

    cumDiscount += dayDiscount
    cumGrossSales += dayGross

    const cumRate = safeDivide(cumDiscount, cumGrossSales, 0)

    // 種別内訳をフラットに展開（Recharts のスタックバー用）
    const entry: Record<string, number | boolean> = {
      day: d,
      discount: dayDiscount,
      cumRate,
      hasSales: rec ? rec.sales > 0 : false,
    }
    if (rec?.discountEntries) {
      for (const de of rec.discountEntries) {
        entry[`d${de.type}`] = de.amount
      }
    } else {
      for (const dt of DISCOUNT_TYPES) {
        entry[`d${dt.type}`] = 0
      }
    }

    allData.push(entry)
  }

  const hasData = allData.some(d => (d.discount as number) > 0)
  if (!hasData) return null

  const data = allData.filter(d => (d.day as number) >= rangeStart && (d.day as number) <= rangeEnd)

  // 種別ラベルマップ（Tooltip / Legend 用）
  const labelMap: Record<string, string> = { cumRate: '累計売変率' }
  for (const dt of DISCOUNT_TYPES) {
    labelMap[`d${dt.type}`] = dt.label
  }

  return (
    <Wrapper>
      <Title>売変インパクト分析（スタックバー: 種別内訳 / ライン: 累計売変率）</Title>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="84%">
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmt}
            width={50}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toPct}
            width={45}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              if (name === 'cumRate') return [toPct(value as number), labelMap[name]]
              return [toComma(value as number), labelMap[name as string] ?? name]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => labelMap[value] ?? value}
          />
          {DISCOUNT_TYPES.map((dt, i) => (
            <Bar
              key={dt.type}
              yAxisId="left"
              dataKey={`d${dt.type}`}
              stackId="discount"
              fill={DISCOUNT_COLORS[i % DISCOUNT_COLORS.length]}
              maxBarSize={16}
              radius={i === DISCOUNT_TYPES.length - 1 ? [3, 3, 0, 0] : undefined}
            />
          ))}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumRate"
            stroke={ct.colors.orange}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
      <DayRangeSlider min={1} max={daysInMonth} start={rangeStart} end={rangeEnd} onChange={setRange} />
    </Wrapper>
  )
}
