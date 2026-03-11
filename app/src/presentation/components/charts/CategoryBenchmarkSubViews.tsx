/**
 * カテゴリベンチマーク — サブビュー & ツールチップ
 *
 * ChartView / TableView / MapView / TrendView と
 * BenchmarkChartTooltip / MapTooltip を集約。
 */
import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import type { CategoryBenchmarkScore, CategoryTrendPoint } from '@/application/hooks/useDuckDBQuery'
import { toPct } from './chartTheme'
import type { useChartTheme } from './chartTheme'
import { EmptyState } from '@/presentation/components/common'
import {
  DataTable,
  Th,
  Td,
  TypeBadge,
  MapSection,
  MapLegend,
  LegendItem,
  MapQuadrantLabel,
} from './CategoryBenchmarkChart.styles'
import {
  TYPE_LABELS,
  TYPE_COLORS,
  TREND_COLORS,
  indexColor,
  computeChartHeight,
  buildScatterData,
  buildTrendPivotData,
  buildNameMap,
  getMetricDisplayName,
} from './CategoryBenchmarkChart.vm'

// ── Types ──

type ChartTheme = ReturnType<typeof useChartTheme>

// ── Chart Tooltip ──

interface ChartTooltipPayload {
  readonly payload: CategoryBenchmarkScore
  readonly value: number
}

interface ChartTooltipProps {
  readonly active?: boolean
  readonly payload?: readonly ChartTooltipPayload[]
  readonly ct: ChartTheme
  readonly fmt: (v: number) => string
}

export function BenchmarkChartTooltip({ active, payload, ct, fmt }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload

  return (
    <div
      style={{
        background: ct.bg2,
        border: `1px solid ${ct.grid}`,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: ct.fontSize.sm,
        fontFamily: ct.fontFamily,
        color: ct.text,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {item.name} ({item.code})
      </div>
      <div>Index: {item.index.toFixed(1)}</div>
      <div>
        {getMetricDisplayName(item.metric)}:{' '}
        {item.metric === 'share' ? toPct(item.avgShare, 1) : item.avgShare.toFixed(1)}
      </div>
      <div>バラツキ(CV): {item.variance.toFixed(2)}</div>
      <div>安定度: {toPct(item.stability, 0)}</div>
      <div>
        カバー率: {item.activeStoreCount}/{item.storeCount} ({toPct(item.dominance, 0)})
      </div>
      <div>売上: {fmt(item.totalSales)}</div>
      <div>
        タイプ: <TypeBadge $type={item.productType}>{TYPE_LABELS[item.productType]}</TypeBadge>
      </div>
    </div>
  )
}

// ── Scatter Tooltip ──

interface ScatterTooltipPayload {
  readonly payload: CategoryBenchmarkScore & { x: number; y: number }
}

interface ScatterTooltipProps {
  readonly active?: boolean
  readonly payload?: readonly ScatterTooltipPayload[]
  readonly ct: ChartTheme
  readonly fmt: (v: number) => string
}

export function MapTooltip({ active, payload, ct, fmt }: ScatterTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0].payload

  return (
    <div
      style={{
        background: ct.bg2,
        border: `1px solid ${ct.grid}`,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: ct.fontSize.sm,
        fontFamily: ct.fontFamily,
        color: ct.text,
      }}
    >
      <div style={{ fontWeight: 600 }}>{item.name}</div>
      <div>Index: {item.index.toFixed(1)}</div>
      <div>バラツキ: {item.variance.toFixed(3)}</div>
      <div>売上: {fmt(item.totalSales)}</div>
      <div>
        <TypeBadge $type={item.productType}>{TYPE_LABELS[item.productType]}</TypeBadge>
      </div>
    </div>
  )
}

// ── Sub-views ──

export function ChartView({
  scores,
  ct,
  fmt,
}: {
  scores: readonly CategoryBenchmarkScore[]
  ct: ChartTheme
  fmt: (v: number) => string
}) {
  const chartHeight = computeChartHeight(scores.length)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={scores} layout="vertical" margin={{ top: 4, right: 40, left: 80, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
          width={75}
        />
        <Tooltip content={<BenchmarkChartTooltip ct={ct} fmt={fmt} />} />
        <Bar dataKey="index" name="Index" radius={[0, 4, 4, 0]}>
          {scores.map((s) => (
            <Cell key={s.code} fill={indexColor(s.index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TableView({
  scores,
  fmt,
  metricLabel,
  isDateAxis,
}: {
  scores: readonly CategoryBenchmarkScore[]
  fmt: (v: number) => string
  metricLabel: string
  isDateAxis?: boolean
}) {
  const isPi = scores.length > 0 && scores[0].metric !== 'share'

  return (
    <div style={{ overflowX: 'auto' }}>
      <DataTable>
        <thead>
          <tr>
            <Th>カテゴリ</Th>
            <Th>Index</Th>
            <Th>{metricLabel}</Th>
            <Th>バラツキ(CV)</Th>
            <Th>安定度</Th>
            <Th>{isDateAxis ? '日数' : 'カバー率'}</Th>
            <Th>売上合計</Th>
            <Th>タイプ</Th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => (
            <tr key={s.code}>
              <Td $align="left">{s.name}</Td>
              <Td $color={indexColor(s.index)} $bold>
                {s.index.toFixed(1)}
              </Td>
              <Td>{isPi ? s.avgShare.toFixed(1) : toPct(s.avgShare, 1)}</Td>
              <Td>{s.variance.toFixed(2)}</Td>
              <Td>{toPct(s.stability, 0)}</Td>
              <Td>{isDateAxis ? `${s.storeCount}日` : `${s.activeStoreCount}/${s.storeCount}`}</Td>
              <Td>{fmt(s.totalSales)}</Td>
              <Td>
                <TypeBadge $type={s.productType}>{TYPE_LABELS[s.productType]}</TypeBadge>
              </Td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}

export function MapView({
  scores,
  ct,
  fmt,
}: {
  scores: readonly CategoryBenchmarkScore[]
  ct: ChartTheme
  fmt: (v: number) => string
}) {
  const scatterData = buildScatterData(scores)

  return (
    <MapSection>
      <div style={{ position: 'relative' }}>
        <MapQuadrantLabel style={{ top: 4, left: 90 }}>普通</MapQuadrantLabel>
        <MapQuadrantLabel style={{ top: 4, right: 30 }}>主力</MapQuadrantLabel>
        <MapQuadrantLabel style={{ bottom: 30, left: 90 }}>不安定</MapQuadrantLabel>
        <MapQuadrantLabel style={{ bottom: 30, right: 30 }}>地域特化</MapQuadrantLabel>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} />
            <XAxis
              type="number"
              dataKey="x"
              name="Index"
              domain={[0, 100]}
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
              stroke={ct.grid}
              label={{
                value: 'Index (構成比)',
                position: 'bottom',
                offset: -5,
                fontSize: 10,
                fill: ct.textMuted,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="安定度"
              domain={[0, 100]}
              tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
              stroke={ct.grid}
              label={{
                value: '安定度 (%)',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fontSize: 10,
                fill: ct.textMuted,
              }}
            />
            <ZAxis type="number" dataKey="totalSales" range={[40, 400]} name="売上" />
            <Tooltip content={<MapTooltip ct={ct} fmt={fmt} />} />
            <Scatter data={scatterData}>
              {scatterData.map((s) => (
                <Cell key={s.code} fill={TYPE_COLORS[s.productType]} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <MapLegend>
        <LegendItem $color={TYPE_COLORS.flagship}>主力（高Index・高安定度）</LegendItem>
        <LegendItem $color={TYPE_COLORS.regional}>地域特化（高Index・低安定度）</LegendItem>
        <LegendItem $color={TYPE_COLORS.standard}>普通（低Index・高安定度）</LegendItem>
        <LegendItem $color={TYPE_COLORS.unstable}>不安定（低Index・低安定度）</LegendItem>
      </MapLegend>
    </MapSection>
  )
}

export function TrendView({
  trendData,
  topCodes,
  scores,
  ct,
}: {
  trendData: readonly CategoryTrendPoint[]
  topCodes: readonly string[]
  scores: readonly CategoryBenchmarkScore[]
  ct: ChartTheme
}) {
  const nameMap = useMemo(() => buildNameMap(scores), [scores])

  const chartData = useMemo(() => buildTrendPivotData(trendData), [trendData])

  if (chartData.length === 0) {
    return <EmptyState>トレンドデータがありません</EmptyState>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} />
          <XAxis
            dataKey="dateKey"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            label={{
              value: 'Index × 安定度',
              angle: -90,
              position: 'insideLeft',
              offset: 5,
              fontSize: 10,
              fill: ct.textMuted,
            }}
          />
          <Tooltip
            contentStyle={{
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
            }}
            labelFormatter={(v) => String(v)}
            formatter={(value, name) => [
              Number(value).toFixed(2),
              nameMap.get(String(name)) ?? String(name),
            ]}
          />
          <Legend
            formatter={(value) => nameMap.get(String(value)) ?? String(value)}
            wrapperStyle={{ fontSize: '0.6rem' }}
          />
          {topCodes.map((code, i) => (
            <Line
              key={code}
              type="monotone"
              dataKey={code}
              stroke={TREND_COLORS[i % TREND_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
