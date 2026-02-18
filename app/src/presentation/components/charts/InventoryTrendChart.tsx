import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import type { DailyRecord } from '@/domain/models'

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
  openingInventory: number | null
  closingInventory: number | null
}

export function InventoryTrendChart({
  daily,
  daysInMonth,
  openingInventory,
  closingInventory,
}: Props) {
  const ct = useChartTheme()
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  if (openingInventory == null) return null

  const allData: { day: number; estimated: number | null; actual: number | null }[] = []
  let cumCost = 0
  let cumEstCogs = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      cumCost += rec.purchase.cost + rec.interStoreIn.cost + rec.interStoreOut.cost
      const dayCost = rec.purchase.cost
      cumEstCogs += dayCost > 0 ? dayCost : rec.sales * 0.74
    }

    // 実在庫は月末日のみプロット
    const actualInv = (d === daysInMonth && closingInventory != null) ? closingInventory : null

    allData.push({
      day: d,
      estimated: openingInventory + cumCost - cumEstCogs,
      actual: actualInv,
    })
  }

  const data = allData.filter(d => d.day >= rangeStart && d.day <= rangeEnd)

  return (
    <Wrapper>
      <Title>推定在庫推移 vs 実在庫</Title>
      <ResponsiveContainer width="100%" height="84%">
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
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
            tickFormatter={toManYen}
            width={55}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              const labels: Record<string, string> = { estimated: '推定在庫', actual: '実在庫' }
              return [value != null ? toComma(value as number) : '-', labels[name as string] ?? String(name)]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => {
              const labels: Record<string, string> = { estimated: '推定在庫', actual: '実在庫' }
              return labels[value] ?? value
            }}
          />
          <Line
            type="monotone"
            dataKey="estimated"
            stroke={ct.colors.cyan}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: ct.colors.cyan, stroke: ct.bg2, strokeWidth: 2 }}
          />
          {closingInventory != null && (
            <Line
              type="monotone"
              dataKey="actual"
              stroke={ct.colors.success}
              strokeWidth={0}
              dot={{ r: 6, fill: ct.colors.success, stroke: ct.bg2, strokeWidth: 2 }}
            />
          )}
          {openingInventory != null && (
            <ReferenceLine
              y={openingInventory}
              stroke={ct.colors.info}
              strokeDasharray="6 3"
              strokeWidth={1}
              label={{
                value: `期首 ${toManYen(openingInventory)}`,
                position: 'left',
                fill: ct.colors.info,
                fontSize: ct.fontSize.xs,
                fontFamily: ct.monoFamily,
              }}
            />
          )}
          {closingInventory != null && (
            <ReferenceLine
              y={closingInventory}
              stroke={ct.colors.success}
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: `実在庫 ${toManYen(closingInventory)}`,
                position: 'right',
                fill: ct.colors.success,
                fontSize: ct.fontSize.xs,
                fontFamily: ct.monoFamily,
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <DayRangeSlider min={1} max={daysInMonth} start={rangeStart} end={rangeEnd} onChange={setRange} />
    </Wrapper>
  )
}
