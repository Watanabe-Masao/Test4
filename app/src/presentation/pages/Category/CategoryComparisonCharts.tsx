import type { StoreResult } from '@/domain/models'
import { safeDivide } from '@/domain/calculations/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import { useChartTheme, toManYen, toComma } from '@/presentation/components/charts/chartTheme'
import { ChartWrapper, ChartTitle } from './CategoryPage.styles'

const STORE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

/** 店舗間カテゴリ比較バーチャート */
export function StoreComparisonCategoryBarChart({
  selectedResults,
  storeNames,
}: {
  selectedResults: StoreResult[]
  storeNames: Map<string, string>
}) {
  const ct = useChartTheme()

  const data = CATEGORY_ORDER
    .filter((cat) => selectedResults.some((sr) => sr.categoryTotals.has(cat)))
    .map((cat) => {
      const entry: Record<string, string | number> = { name: CATEGORY_LABELS[cat] }
      selectedResults.forEach((sr) => {
        const name = storeNames.get(sr.storeId) ?? sr.storeId
        const pair = sr.categoryTotals.get(cat)
        entry[name] = pair ? Math.abs(pair.price) : 0
      })
      return entry
    })

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 カテゴリ別売価比較</ChartTitle>
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
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
            }}
            formatter={(value: number | undefined, name: string | undefined) => [toComma(value ?? 0), name ?? '']}
          />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          {selectedResults.map((sr, i) => {
            const name = storeNames.get(sr.storeId) ?? sr.storeId
            return (
              <Bar
                key={sr.storeId}
                dataKey={name}
                fill={STORE_COLORS[i % STORE_COLORS.length]}
                fillOpacity={0.8}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
            )
          })}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

/** 店舗間値入率レーダーチャート */
export function StoreComparisonMarkupRadarChart({
  selectedResults,
  storeNames,
}: {
  selectedResults: StoreResult[]
  storeNames: Map<string, string>
}) {
  const ct = useChartTheme()

  const radarData = CATEGORY_ORDER
    .filter((cat) => selectedResults.some((sr) => sr.categoryTotals.has(cat)))
    .map((cat) => {
      const entry: Record<string, string | number> = { subject: CATEGORY_LABELS[cat] }
      selectedResults.forEach((sr) => {
        const name = storeNames.get(sr.storeId) ?? sr.storeId
        const pair = sr.categoryTotals.get(cat)
        const markup = pair ? safeDivide(pair.price - pair.cost, pair.price, 0) * 100 : 0
        entry[name] = markup
      })
      return entry
    })

  return (
    <ChartWrapper>
      <ChartTitle>店舗間 カテゴリ別値入率レーダー</ChartTitle>
      <ResponsiveContainer width="100%" height="85%">
        <RadarChart data={radarData} margin={{ top: 4, right: 30, left: 30, bottom: 4 }}>
          <PolarGrid stroke={ct.grid} strokeOpacity={0.4} />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
          />
          <PolarRadiusAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            tickFormatter={(v) => `${v}%`}
          />
          {selectedResults.map((sr, i) => {
            const name = storeNames.get(sr.storeId) ?? sr.storeId
            return (
              <Radar
                key={sr.storeId}
                name={name}
                dataKey={name}
                stroke={STORE_COLORS[i % STORE_COLORS.length]}
                fill={STORE_COLORS[i % STORE_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            )
          })}
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          <Tooltip
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
            }}
            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
