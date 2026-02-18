import { useState } from 'react'
import { Chip } from '@/presentation/components/common'
import { formatCurrency } from '@/domain/calculations/utils'
import { safeDivide } from '@/domain/calculations/utils'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Line,
  type PieLabelRenderProps,
} from 'recharts'
import { useChartTheme, toManYen } from '@/presentation/components/charts/chartTheme'
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
        {String(name)} {(pct * 100).toFixed(1)}%
      </text>
    )
  }
}

/** 相乗積チャート（円グラフ / パレート図 切替） */
export function CrossMultiplicationChart({ items }: { items: CategoryChartItem[] }) {
  const ct = useChartTheme()
  const [view, setView] = useState<ChartView>('pie')

  const totalPrice = items.reduce((s, d) => s + Math.abs(d.price), 0)

  const data = items
    .map((d) => {
      const priceShare = safeDivide(Math.abs(d.price), totalPrice, 0)
      const crossMult = priceShare * d.markup
      return { name: d.label, value: Math.abs(crossMult), color: d.color }
    })
    .filter((d) => d.value > 0)

  if (data.length === 0) return null

  const renderLabel = makePieLabel(ct)

  return (
    <PieWrapper>
      <PieTitle>カテゴリ別 相乗積構成</PieTitle>
      <PieToggle>
        <Chip $active={view === 'pie'} onClick={() => setView('pie')}>円グラフ</Chip>
        <Chip $active={view === 'pareto'} onClick={() => setView('pareto')}>パレート図</Chip>
      </PieToggle>
      {view === 'pie' ? (
        <ResponsiveContainer width="100%" height="80%">
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
              contentStyle={{
                background: ct.bg2, border: `1px solid ${ct.grid}`,
                borderRadius: 8, fontSize: ct.fontSize.sm, fontFamily: ct.fontFamily, color: ct.text,
              }}
              formatter={(value) => [`${((value as number) * 100).toFixed(2)}%`, '相乗積']}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="80%">
          <ComposedChart data={buildParetoData(data)} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
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
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              width={45}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false} tickLine={false}
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                background: ct.bg2, border: `1px solid ${ct.grid}`,
                borderRadius: 8, fontSize: ct.fontSize.sm, fontFamily: ct.fontFamily, color: ct.text,
              }}
              formatter={(value: unknown, name: string | undefined) => {
                const v = Number(value)
                if (name === 'cumPct') return [`${(v * 100).toFixed(1)}%`, '累計']
                return [`${(v * 100).toFixed(2)}%`, '相乗積']
              }}
            />
            <Bar yAxisId="left" dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {buildParetoData(data).map((entry, i) => (
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
}

/** 構成比チャート（円グラフ / パレート図 切替） */
export function CompositionChart({ items }: { items: CategoryChartItem[] }) {
  const ct = useChartTheme()
  const [mode, setMode] = useState<PieMode>('cost')
  const [view, setView] = useState<ChartView>('pie')

  const data = items
    .filter((d) => (mode === 'cost' ? d.cost : d.price) !== 0)
    .map((d) => {
      const value = Math.abs(mode === 'cost' ? d.cost : d.price)
      return { name: d.label, value, color: d.color }
    })

  if (data.length === 0) return null

  const renderLabel = makePieLabel(ct)

  return (
    <PieWrapper>
      <PieTitle>カテゴリ別 構成比</PieTitle>
      <PieToggle>
        <Chip $active={mode === 'cost'} onClick={() => setMode('cost')}>原価</Chip>
        <Chip $active={mode === 'price'} onClick={() => setMode('price')}>売価</Chip>
        <span style={{ width: 8 }} />
        <Chip $active={view === 'pie'} onClick={() => setView('pie')}>円グラフ</Chip>
        <Chip $active={view === 'pareto'} onClick={() => setView('pareto')}>パレート図</Chip>
      </PieToggle>
      {view === 'pie' ? (
        <ResponsiveContainer width="100%" height="75%">
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
              contentStyle={{
                background: ct.bg2, border: `1px solid ${ct.grid}`,
                borderRadius: 8, fontSize: ct.fontSize.sm, fontFamily: ct.fontFamily, color: ct.text,
              }}
              formatter={(value) => [formatCurrency(value as number), mode === 'cost' ? '原価' : '売価']}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height="75%">
          <ComposedChart data={buildParetoData(data)} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
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
              axisLine={false} tickLine={false}
              tickFormatter={toManYen}
              width={50}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false} tickLine={false}
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                background: ct.bg2, border: `1px solid ${ct.grid}`,
                borderRadius: 8, fontSize: ct.fontSize.sm, fontFamily: ct.fontFamily, color: ct.text,
              }}
              formatter={(value: unknown, name: string | undefined) => {
                const v = Number(value)
                if (name === 'cumPct') return [`${(v * 100).toFixed(1)}%`, '累計']
                return [formatCurrency(v), mode === 'cost' ? '原価' : '売価']
              }}
            />
            <Bar yAxisId="left" dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {buildParetoData(data).map((entry, i) => (
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
}
