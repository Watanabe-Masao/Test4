import { memo, useState } from 'react'
import { Chip } from '@/presentation/components/common'
import { calculateShare } from '@/domain/calculations/utils'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  type PieLabelRenderProps,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import {
  useChartTheme,
  useCurrencyFormat,
  toAxisYen,
  toPct,
} from '@/presentation/components/charts/chartTheme'
import { createChartTooltip } from '@/presentation/components/charts/createChartTooltip'
import { PieWrapper, PieTitle, PieToggle } from './CategoryPage.styles'
import type { CategoryChartItem, PieMode, ChartView } from './categoryData'
import { buildParetoData } from './categoryData'

/** 共通ラベルレンダラー */
function makePieLabel(ct: ReturnType<typeof useChartTheme>) {
  return (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props
    const pct = Number(percent)
    if (pct < 0.03) return null
    const RADIAN = Math.PI / 180
    const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 1.25
    const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN)
    const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN)
    return (
      <text
        x={x}
        y={y}
        fill={ct.textSecondary}
        textAnchor={x > Number(cx) ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={ct.fontSize.xs}
        fontFamily={ct.fontFamily}
      >
        {String(name)} {toPct(pct)}
      </text>
    )
  }
}

const MODE_LABELS: Record<PieMode, string> = {
  cost: '原価',
  price: '売価',
  crossMult: '相乗積',
}

/** 構成比チャート（原価 / 売価 / 相乗積 切替、円グラフ / パレート図 切替） */
export const CompositionChart = memo(function CompositionChart({
  items,
}: {
  items: CategoryChartItem[]
}) {
  const ct = useChartTheme()
  const { format: fmtCurrency } = useCurrencyFormat()
  const [mode, setMode] = useState<PieMode>('cost')
  const [view, setView] = useState<ChartView>('pie')

  const totalPrice = items.reduce((s, d) => s + d.price, 0)
  const isCrossMult = mode === 'crossMult'

  const data = items
    .map((d) => {
      let value: number
      if (mode === 'cost') {
        value = Math.abs(d.cost)
      } else if (mode === 'price') {
        value = Math.abs(d.price)
      } else {
        value = Math.abs(calculateShare(d.price - d.cost, totalPrice))
      }
      return { name: d.label, value, color: d.color }
    })
    .filter((d) => d.value > 0)

  if (data.length === 0) return null

  const renderLabel = makePieLabel(ct)
  const paretoData = buildParetoData(data)

  const tooltipLabel = MODE_LABELS[mode]
  const tooltipFormatter = isCrossMult
    ? (value: number) => toPct(value, 2)
    : (value: number) => fmtCurrency(value)

  return (
    <PieWrapper>
      <PieTitle>カテゴリ別 構成比</PieTitle>
      <PieToggle>
        {(Object.keys(MODE_LABELS) as PieMode[]).map((m) => (
          <Chip key={m} $active={mode === m} onClick={() => setMode(m)}>
            {MODE_LABELS[m]}
          </Chip>
        ))}
        <span style={{ width: 8 }} />
        <Chip $active={view === 'pie'} onClick={() => setView('pie')}>
          円グラフ
        </Chip>
        <Chip $active={view === 'pareto'} onClick={() => setView('pareto')}>
          パレート図
        </Chip>
      </PieToggle>
      {view === 'pie' ? (
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="75%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="48%"
              outerRadius="70%"
              innerRadius="40%"
              dataKey="value"
              label={renderLabel}
              strokeWidth={2}
              stroke={ct.bg3}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Pie>
            <Tooltip
              content={createChartTooltip({
                ct,
                formatter: (value) => [tooltipFormatter(value as number), tooltipLabel],
              })}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="75%">
          <ComposedChart data={paretoData} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
            <XAxis
              dataKey="name"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={isCrossMult ? (v) => toPct(v, 0) : toAxisYen}
              width={50}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              domain={[0, 1]}
              tickFormatter={(v) => toPct(v, 0)}
              width={45}
            />
            <Tooltip
              content={createChartTooltip({
                ct,
                formatter: (value, name) => {
                  const v = Number(value)
                  if (name === 'cumPct') return [toPct(v), '累計']
                  return [tooltipFormatter(v), tooltipLabel]
                },
              })}
            />
            <Bar yAxisId="left" dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {paretoData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumPct"
              stroke={ct.colors.danger}
              strokeWidth={2}
              dot={{ r: 3, fill: ct.colors.danger }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </PieWrapper>
  )
})
