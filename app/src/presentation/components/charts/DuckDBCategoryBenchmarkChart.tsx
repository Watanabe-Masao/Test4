/**
 * DuckDB カテゴリベンチマーク — 商品力分析ダッシュボード
 *
 * 構成比実数値ベースの総合カテゴリ評価:
 * 1. 総合指数 (Index): 平均構成比を 0-100 に正規化
 * 2. バラツキ: 構成比の変動係数 (CV)
 * 3. カバー率: 実販売店舗数 / 全店舗数
 * 4. 安定度: 1 - CV/2
 * 5. 商品力マップ: Index × バラツキの4タイプ分類
 *
 * 表示ビュー:
 * - チャート: 横棒グラフ（Index順）
 * - テーブル: 全指標一覧
 * - マップ: 商品力4象限マップ
 */
import { useState, useMemo, memo } from 'react'
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
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBCategoryBenchmark,
  useDuckDBCategoryBenchmarkTrend,
  buildCategoryBenchmarkScores,
  buildCategoryTrendData,
  buildBoxPlotData,
  type CategoryBenchmarkScore,
  type BoxPlotStats,
  type BenchmarkMetric,
  type ProductType,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter, toPct } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import { palette } from '@/presentation/theme/tokens'

// ── styled-components ──

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const Subtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

const Controls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
  flex-wrap: wrap;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 4px;
`

const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 2px 10px;
  font-size: 0.6rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.65rem;
`

const Th = styled.th`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child {
    text-align: left;
  }
`

const Td = styled.td<{ $color?: string; $bold?: boolean; $align?: string }>`
  text-align: ${({ $align }) => $align ?? 'center'};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  font-size: 11px;
  ${({ $bold }) => $bold && 'font-weight: 700;'}
  &:first-child {
    text-align: left;
    font-family: inherit;
    font-weight: 600;
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
  }
`

const TypeBadge = styled.span<{ $type: ProductType }>`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
  background: ${({ $type, theme }) => {
    const alpha = theme.mode === 'dark' ? '0.2' : '0.1'
    switch ($type) {
      case 'flagship':
        return `rgba(34,197,94,${alpha})`
      case 'regional':
        return `rgba(59,130,246,${alpha})`
      case 'standard':
        return `rgba(156,163,175,${alpha})`
      case 'unstable':
        return `rgba(239,68,68,${alpha})`
    }
  }};
  color: ${({ $type }) => {
    switch ($type) {
      case 'flagship':
        return '#22c55e'
      case 'regional':
        return '#3b82f6'
      case 'standard':
        return '#9ca3af'
      case 'unstable':
        return '#ef4444'
    }
  }};
`

const MapSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
`

const MapLegend = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  justify-content: center;
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
`

const LegendItem = styled.span<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`

const MapQuadrantLabel = styled.div`
  position: absolute;
  font-size: 9px;
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
  pointer-events: none;
`

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`

const KpiCard = styled.div<{ $accent: string }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'};
  border-left: 3px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radii.md};
`

const KpiLabel = styled.div`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
`

const KpiValue = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
`

const KpiSub = styled.div`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text3};
`

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

type CategoryLevel = 'department' | 'line' | 'klass'
type ViewMode = 'chart' | 'table' | 'map' | 'trend' | 'boxplot'
type BoxMetric = 'sales' | 'quantity'

const LEVEL_LABELS: Record<CategoryLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

const VIEW_LABELS: Record<ViewMode, string> = {
  chart: 'チャート',
  table: 'テーブル',
  map: 'マップ',
  trend: 'トレンド',
  boxplot: '箱ひげ図',
}

const BOX_METRIC_LABELS: Record<BoxMetric, string> = {
  sales: '販売金額',
  quantity: '販売数量',
}

const BENCHMARK_METRIC_LABELS: Record<BenchmarkMetric, string> = {
  share: '構成比',
  salesPi: '金額PI値',
  quantityPi: '数量PI値',
}

const TYPE_LABELS: Record<ProductType, string> = {
  flagship: '主力',
  regional: '地域特化',
  standard: '普通',
  unstable: '不安定',
}

const TYPE_COLORS: Record<ProductType, string> = {
  flagship: '#22c55e',
  regional: '#3b82f6',
  standard: '#9ca3af',
  unstable: '#ef4444',
}

// ── Color helpers ──

function indexColor(index: number): string {
  if (index >= 70) return palette.positive
  if (index >= 40) return palette.caution
  return palette.negative
}

// ── Chart Tooltip ──

interface ChartTooltipPayload {
  readonly payload: CategoryBenchmarkScore
  readonly value: number
}

interface ChartTooltipProps {
  readonly active?: boolean
  readonly payload?: readonly ChartTooltipPayload[]
  readonly ct: ReturnType<typeof useChartTheme>
  readonly fmt: (v: number) => string
}

function BenchmarkChartTooltip({ active, payload, ct, fmt }: ChartTooltipProps) {
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
        {item.metric === 'share'
          ? '平均構成比'
          : item.metric === 'salesPi'
            ? '金額PI値'
            : '数量PI値'}
        : {item.metric === 'share' ? toPct(item.avgShare, 1) : item.avgShare.toFixed(1)}
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
  readonly ct: ReturnType<typeof useChartTheme>
  readonly fmt: (v: number) => string
}

function MapTooltip({ active, payload, ct, fmt }: ScatterTooltipProps) {
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

function ChartView({
  scores,
  ct,
  fmt,
}: {
  scores: readonly CategoryBenchmarkScore[]
  ct: ReturnType<typeof useChartTheme>
  fmt: (v: number) => string
}) {
  const chartHeight = Math.max(200, scores.length * 28 + 40)

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

function TableView({
  scores,
  fmt,
  metricLabel,
}: {
  scores: readonly CategoryBenchmarkScore[]
  fmt: (v: number) => string
  metricLabel: string
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
            <Th>カバー率</Th>
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
              <Td>
                {s.activeStoreCount}/{s.storeCount}
              </Td>
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

function MapView({
  scores,
  ct,
  fmt,
}: {
  scores: readonly CategoryBenchmarkScore[]
  ct: ReturnType<typeof useChartTheme>
  fmt: (v: number) => string
}) {
  const scatterData = scores.map((s) => ({
    ...s,
    x: s.index,
    y: s.stability * 100,
  }))

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

// ── 色パレット（トレンド用） ──

const TREND_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
  '#64748b', // slate
]

function TrendView({
  trendData,
  topCodes,
  scores,
  ct,
}: {
  trendData: ReturnType<typeof buildCategoryTrendData>
  topCodes: readonly string[]
  scores: readonly CategoryBenchmarkScore[]
  ct: ReturnType<typeof useChartTheme>
}) {
  // カテゴリコード → 名前のマップ
  const nameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of scores) map.set(s.code, s.name)
    return map
  }, [scores])

  // date → { dateKey, code1: score, code2: score, ... } のピボットデータ
  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, string | number>>()
    for (const p of trendData) {
      let entry = dateMap.get(p.dateKey)
      if (!entry) {
        entry = { dateKey: p.dateKey }
        dateMap.set(p.dateKey, entry)
      }
      entry[p.code] = p.compositeScore
    }
    const arr = Array.from(dateMap.values())
    arr.sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)))
    return arr
  }, [trendData])

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

// ── 箱ひげ図 (Box Plot) ──

/**
 * 箱ひげ図ビュー — SVG 直接描画
 *
 * Recharts の Bar shape 型制約を避けるため、
 * 純粋 SVG で箱ひげ図を描画する。
 */
function BoxPlotView({
  boxData,
  ct,
  fmt,
  metricLabel,
}: {
  boxData: readonly BoxPlotStats[]
  ct: ReturnType<typeof useChartTheme>
  fmt: (v: number) => string
  metricLabel: string
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const marginLeft = 90
  const marginRight = 40
  const marginTop = 10
  const marginBottom = 30
  const rowHeight = 36
  const chartHeight = Math.max(200, boxData.length * rowHeight + marginTop + marginBottom)

  const xMax = useMemo(() => {
    if (boxData.length === 0) return 100
    const m = Math.max(...boxData.map((d) => d.max))
    // Round up to a nice number
    const mag = Math.pow(10, Math.floor(Math.log10(m)))
    return Math.ceil(m / mag) * mag * 1.05
  }, [boxData])

  if (boxData.length === 0) {
    return <EmptyState>箱ひげ図データがありません</EmptyState>
  }

  const hovered = hoveredIdx !== null ? boxData[hoveredIdx] : null

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <svg width="100%" height={chartHeight} viewBox={`0 0 800 ${chartHeight}`}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
            const xPx = marginLeft + frac * (800 - marginLeft - marginRight)
            const val = frac * xMax
            return (
              <g key={frac}>
                <line
                  x1={xPx}
                  y1={marginTop}
                  x2={xPx}
                  y2={chartHeight - marginBottom}
                  stroke={ct.grid}
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
                <text
                  x={xPx}
                  y={chartHeight - marginBottom + 16}
                  textAnchor="middle"
                  fill={ct.textMuted}
                  fontSize={10}
                >
                  {val >= 1000000
                    ? `${(val / 1000000).toFixed(1)}M`
                    : val >= 1000
                      ? `${(val / 1000).toFixed(0)}K`
                      : String(Math.round(val))}
                </text>
              </g>
            )
          })}
          {/* Box plots */}
          {boxData.map((d, i) => {
            const plotW = 800 - marginLeft - marginRight
            const yCenter = marginTop + i * rowHeight + rowHeight / 2
            const barH = rowHeight * 0.55
            const scale = xMax > 0 ? plotW / xMax : 0

            const xMinPx = marginLeft + d.min * scale
            const xQ1Px = marginLeft + d.q1 * scale
            const xMedianPx = marginLeft + d.median * scale
            const xMeanPx = marginLeft + d.mean * scale
            const xQ3Px = marginLeft + d.q3 * scale
            const xMaxPx = marginLeft + d.max * scale
            const whiskerH = barH * 0.5

            return (
              <g
                key={d.code}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Hover background */}
                <rect
                  x={0}
                  y={marginTop + i * rowHeight}
                  width={800}
                  height={rowHeight}
                  fill={
                    hoveredIdx === i
                      ? ct.bg2 === '#fff'
                        ? '#f3f4f6'
                        : 'rgba(255,255,255,0.05)'
                      : 'transparent'
                  }
                />
                {/* Category label */}
                <text
                  x={marginLeft - 6}
                  y={yCenter + 4}
                  textAnchor="end"
                  fill={ct.textMuted}
                  fontSize={10}
                >
                  {d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name}
                </text>
                {/* Left whisker: min → Q1 */}
                <line
                  x1={xMinPx}
                  y1={yCenter}
                  x2={xQ1Px}
                  y2={yCenter}
                  stroke="#6366f1"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                <line
                  x1={xMinPx}
                  y1={yCenter - whiskerH / 2}
                  x2={xMinPx}
                  y2={yCenter + whiskerH / 2}
                  stroke="#6366f1"
                  strokeWidth={2}
                />
                {/* IQR box */}
                <rect
                  x={xQ1Px}
                  y={yCenter - barH / 2}
                  width={Math.max(xQ3Px - xQ1Px, 1)}
                  height={barH}
                  fill="#6366f1"
                  fillOpacity={0.6}
                  stroke="#6366f1"
                  strokeWidth={1}
                  rx={2}
                />
                {/* Median line */}
                <line
                  x1={xMedianPx}
                  y1={yCenter - barH / 2}
                  x2={xMedianPx}
                  y2={yCenter + barH / 2}
                  stroke="#fff"
                  strokeWidth={2}
                />
                {/* Right whisker: Q3 → max */}
                <line
                  x1={xQ3Px}
                  y1={yCenter}
                  x2={xMaxPx}
                  y2={yCenter}
                  stroke="#6366f1"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                />
                <line
                  x1={xMaxPx}
                  y1={yCenter - whiskerH / 2}
                  x2={xMaxPx}
                  y2={yCenter + whiskerH / 2}
                  stroke="#6366f1"
                  strokeWidth={2}
                />
                {/* Mean marker (×) */}
                <line
                  x1={xMeanPx - 3}
                  y1={yCenter - 3}
                  x2={xMeanPx + 3}
                  y2={yCenter + 3}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                />
                <line
                  x1={xMeanPx - 3}
                  y1={yCenter + 3}
                  x2={xMeanPx + 3}
                  y2={yCenter - 3}
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                />
              </g>
            )
          })}
        </svg>
        {/* Hover tooltip */}
        {hovered && hoveredIdx !== null && (
          <div
            style={{
              position: 'absolute',
              top: marginTop + hoveredIdx * rowHeight - 10,
              right: marginRight,
              background: ct.bg2,
              border: `1px solid ${ct.grid}`,
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: ct.fontSize.sm,
              fontFamily: ct.fontFamily,
              color: ct.text,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {hovered.name} ({hovered.code})
            </div>
            <div style={{ fontSize: '0.6rem', color: ct.textMuted, marginBottom: 2 }}>
              {metricLabel}
            </div>
            <div>最大値: {fmt(hovered.max)}</div>
            <div>Q3 (75%): {fmt(hovered.q3)}</div>
            <div>中央値: {fmt(hovered.median)}</div>
            <div>Q1 (25%): {fmt(hovered.q1)}</div>
            <div>最小値: {fmt(hovered.min)}</div>
            <div>平均値: {fmt(hovered.mean)}</div>
            <div>店舗数: {hovered.count}</div>
          </div>
        )}
      </div>
      <MapLegend>
        <LegendItem $color="#6366f1">Q1-Q3 (四分位範囲)</LegendItem>
        <span
          style={{
            fontSize: '0.6rem',
            color: ct.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 2,
              background: '#fff',
              border: '1px solid #6366f1',
            }}
          />
          中央値
        </span>
        <span
          style={{
            fontSize: '0.6rem',
            color: ct.textMuted,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ color: '#f59e0b', fontWeight: 700 }}>×</span>
          平均値
        </span>
      </MapLegend>
    </div>
  )
}

// ── Component ──

export const DuckDBCategoryBenchmarkChart = memo(function DuckDBCategoryBenchmarkChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()

  const [level, setLevel] = useState<CategoryLevel>('department')
  const [view, setView] = useState<ViewMode>('chart')
  const [minStores, setMinStores] = useState(2)
  const [boxMetric, setBoxMetric] = useState<BoxMetric>('sales')
  const [benchmarkMetric, setBenchmarkMetric] = useState<BenchmarkMetric>('share')

  const {
    data: rawRows,
    error,
    isLoading,
  } = useDuckDBCategoryBenchmark(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  // トレンドデータ取得（トレンドビュー用）
  const { data: trendRows } = useDuckDBCategoryBenchmarkTrend(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
  )

  const totalStoreCount = selectedStoreIds.size
  const scores = useMemo(
    () =>
      rawRows
        ? buildCategoryBenchmarkScores(rawRows, minStores, totalStoreCount, benchmarkMetric)
        : [],
    [rawRows, minStores, totalStoreCount, benchmarkMetric],
  )

  // トレンド表示用: 上位10カテゴリのコード
  const topCodes = useMemo(() => scores.slice(0, 10).map((s) => s.code), [scores])

  const trendData = useMemo(
    () => (trendRows ? buildCategoryTrendData(trendRows, topCodes, totalStoreCount) : []),
    [trendRows, topCodes, totalStoreCount],
  )

  // 箱ひげ図データ（上位20カテゴリ）
  const boxPlotData = useMemo(
    () => (rawRows ? buildBoxPlotData(rawRows, boxMetric, 20, minStores, totalStoreCount) : []),
    [rawRows, boxMetric, minStores, totalStoreCount],
  )

  // KPIサマリー
  const kpis = useMemo(() => {
    if (scores.length === 0) return null
    const sorted = [...scores].sort((a, b) => b.index - a.index)
    const top = sorted[0]
    const bottom = sorted[sorted.length - 1]
    const flagshipCount = scores.filter((s) => s.productType === 'flagship').length
    const unstableCount = scores.filter((s) => s.productType === 'unstable').length
    const avgIndex = scores.reduce((s, v) => s + v.index, 0) / scores.length
    return { top, bottom, flagshipCount, unstableCount, avgIndex }
  }, [scores])

  if (error) {
    return (
      <Wrapper aria-label="カテゴリベンチマーク（DuckDB）">
        <Title>カテゴリベンチマーク（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !rawRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || scores.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="カテゴリベンチマーク（DuckDB）">
      <HeaderRow>
        <div>
          <Title>カテゴリベンチマーク（DuckDB）</Title>
          <Subtitle>
            {benchmarkMetric === 'share'
              ? '構成比ベース商品力分析 | 平均構成比 × バラツキ(CV) × カバー率'
              : `${BENCHMARK_METRIC_LABELS[benchmarkMetric]}ベース商品力分析 | PI値 = 値÷客数×1000`}
          </Subtitle>
        </div>
        <Controls>
          <ButtonGroup>
            {(Object.keys(LEVEL_LABELS) as CategoryLevel[]).map((l) => (
              <ToggleBtn key={l} $active={level === l} onClick={() => setLevel(l)}>
                {LEVEL_LABELS[l]}
              </ToggleBtn>
            ))}
          </ButtonGroup>
          <ButtonGroup>
            {(Object.keys(BENCHMARK_METRIC_LABELS) as BenchmarkMetric[]).map((m) => (
              <ToggleBtn
                key={m}
                $active={benchmarkMetric === m}
                onClick={() => setBenchmarkMetric(m)}
              >
                {BENCHMARK_METRIC_LABELS[m]}
              </ToggleBtn>
            ))}
          </ButtonGroup>
          <ButtonGroup>
            {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
              <ToggleBtn key={v} $active={view === v} onClick={() => setView(v)}>
                {VIEW_LABELS[v]}
              </ToggleBtn>
            ))}
          </ButtonGroup>
          <ButtonGroup>
            <span style={{ fontSize: '0.6rem', color: ct.textMuted, whiteSpace: 'nowrap' }}>
              最低店舗数:
            </span>
            {[1, 2, 3].map((n) => (
              <ToggleBtn key={n} $active={minStores === n} onClick={() => setMinStores(n)}>
                {n === 1 ? '全て' : `${n}店以上`}
              </ToggleBtn>
            ))}
          </ButtonGroup>
          {view === 'boxplot' && (
            <ButtonGroup>
              {(Object.keys(BOX_METRIC_LABELS) as BoxMetric[]).map((m) => (
                <ToggleBtn key={m} $active={boxMetric === m} onClick={() => setBoxMetric(m)}>
                  {BOX_METRIC_LABELS[m]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          )}
        </Controls>
      </HeaderRow>

      {/* KPI サマリー */}
      {kpis && (
        <SummaryRow>
          <KpiCard $accent={palette.positive}>
            <KpiLabel>最高評価</KpiLabel>
            <KpiValue>{kpis.top.name}</KpiValue>
            <KpiSub>Index {kpis.top.index.toFixed(1)}</KpiSub>
          </KpiCard>
          <KpiCard $accent={palette.negative}>
            <KpiLabel>最低評価</KpiLabel>
            <KpiValue>{kpis.bottom.name}</KpiValue>
            <KpiSub>Index {kpis.bottom.index.toFixed(1)}</KpiSub>
          </KpiCard>
          <KpiCard $accent="#6366f1">
            <KpiLabel>平均Index</KpiLabel>
            <KpiValue>{kpis.avgIndex.toFixed(1)}</KpiValue>
            <KpiSub>{scores.length}カテゴリ</KpiSub>
          </KpiCard>
          <KpiCard $accent="#22c55e">
            <KpiLabel>主力カテゴリ</KpiLabel>
            <KpiValue>{kpis.flagshipCount}</KpiValue>
            <KpiSub>不安定: {kpis.unstableCount}</KpiSub>
          </KpiCard>
        </SummaryRow>
      )}

      {/* メインビュー */}
      <div style={{ marginTop: 16 }}>
        {view === 'chart' && <ChartView scores={scores} ct={ct} fmt={fmt} />}
        {view === 'table' && (
          <TableView
            scores={scores}
            fmt={fmt}
            metricLabel={BENCHMARK_METRIC_LABELS[benchmarkMetric]}
          />
        )}
        {view === 'map' && <MapView scores={scores} ct={ct} fmt={fmt} />}
        {view === 'trend' && (
          <TrendView trendData={trendData} topCodes={topCodes} scores={scores} ct={ct} />
        )}
        {view === 'boxplot' && (
          <BoxPlotView
            boxData={boxPlotData}
            ct={ct}
            fmt={boxMetric === 'sales' ? fmt : (v: number) => v.toLocaleString()}
            metricLabel={BOX_METRIC_LABELS[boxMetric]}
          />
        )}
      </div>
    </Wrapper>
  )
})
