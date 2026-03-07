/**
 * DuckDB カテゴリ箱ひげ図 — 独立ウィジェット
 *
 * カテゴリベンチマークから分離された箱ひげ図ビュー。
 * 店舗別 / 期間別の分布を箱ひげ図で表示し、
 * ドリルダウンで店舗別・日別の内訳を確認できる。
 */
import { useState, useMemo, memo } from 'react'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  useDuckDBCategoryBenchmark,
  useDuckDBCategoryBenchmarkTrend,
  useDuckDBCategoryHierarchy,
  buildBoxPlotData,
  buildBoxPlotDataByDate,
  buildStoreBreakdown,
  buildDateBreakdown,
  type CategoryBenchmarkRow,
  type CategoryBenchmarkTrendRow,
  type BoxPlotStats,
  type StoreBreakdownItem,
  type DateBreakdownItem,
} from '@/application/hooks/useDuckDBQuery'
import { useChartTheme, useCurrencyFormatter } from './chartTheme'
import { useI18n } from '@/application/hooks/useI18n'
import { useDataStore } from '@/application/stores'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'

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
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: stretch;
  flex-wrap: wrap;
`

const ControlGroup = styled.div<{ $hidden?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  visibility: ${({ $hidden }) => ($hidden ? 'hidden' : 'visible')};
  pointer-events: ${({ $hidden }) => ($hidden ? 'none' : 'auto')};
`

const ControlLabel = styled.span`
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
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

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
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

const FilterSelect = styled.select`
  padding: 2px 6px;
  font-size: 0.6rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff')};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  max-width: 140px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

// ── Types ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

type CategoryLevel = 'department' | 'line' | 'klass'
type BoxMetric = 'sales' | 'quantity'
type AnalysisAxis = 'store' | 'date'

const LEVEL_LABELS: Record<CategoryLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

const BOX_METRIC_LABELS: Record<BoxMetric, string> = {
  sales: '販売金額',
  quantity: '販売数量',
}

const ANALYSIS_AXIS_LABELS: Record<AnalysisAxis, string> = {
  store: '店舗別',
  date: '期間別',
}

// ── StoreBreakdownChart ──

function StoreBreakdownChart({
  items,
  storeNameMap,
  ct,
  fmt,
  categoryName,
  onClose,
}: {
  items: readonly StoreBreakdownItem[]
  storeNameMap: ReadonlyMap<string, string>
  ct: ReturnType<typeof useChartTheme>
  fmt: (v: number) => string
  categoryName: string
  onClose: () => void
}) {
  const marginLeft = 90
  const marginRight = 40
  const marginTop = 10
  const marginBottom = 30
  const rowHeight = 28
  const chartHeight = Math.max(120, items.length * rowHeight + marginTop + marginBottom)

  const xMax = useMemo(() => {
    if (items.length === 0) return 100
    const m = Math.max(...items.map((d) => d.value))
    const mag = Math.pow(10, Math.floor(Math.log10(m || 1)))
    return Math.ceil(m / mag) * mag * 1.05
  }, [items])

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <div style={{ marginTop: 12, padding: '8px 0', borderTop: `1px solid ${ct.grid}` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
          padding: '0 4px',
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: ct.text }}>
          {categoryName} — 店舗別内訳
        </span>
        <button
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: '0.6rem',
            padding: '2px 8px',
            borderRadius: 4,
            color: ct.textMuted,
            background: ct.bg2 === '#fff' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
          }}
        >
          閉じる
        </button>
      </div>
      <svg width="100%" height={chartHeight} viewBox={`0 0 800 ${chartHeight}`}>
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
        {items.map((item, i) => {
          const plotW = 800 - marginLeft - marginRight
          const yCenter = marginTop + i * rowHeight + rowHeight / 2
          const barH = rowHeight * 0.6
          const scale = xMax > 0 ? plotW / xMax : 0
          const barW = Math.max(item.value * scale, 1)
          const storeName = storeNameMap.get(item.storeId) ?? item.storeId
          const isHovered = hoveredIdx === i

          return (
            <g
              key={item.storeId}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <rect
                x={0}
                y={marginTop + i * rowHeight}
                width={800}
                height={rowHeight}
                fill={
                  isHovered
                    ? ct.bg2 === '#fff'
                      ? '#f3f4f6'
                      : 'rgba(255,255,255,0.05)'
                    : 'transparent'
                }
              />
              <text
                x={marginLeft - 6}
                y={yCenter + 4}
                textAnchor="end"
                fill={ct.textMuted}
                fontSize={10}
              >
                {storeName.length > 10 ? storeName.slice(0, 10) + '…' : storeName}
              </text>
              <rect
                x={marginLeft}
                y={yCenter - barH / 2}
                width={barW}
                height={barH}
                fill="#6366f1"
                fillOpacity={isHovered ? 0.8 : 0.5}
                rx={2}
              />
              <text
                x={marginLeft + barW + 4}
                y={yCenter + 4}
                fill={ct.textMuted}
                fontSize={9}
                fontFamily="monospace"
              >
                {fmt(item.value)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── DateBreakdownChart ──

function DateBreakdownChart({
  items,
  ct,
  fmt,
  categoryName,
  onClose,
}: {
  items: readonly DateBreakdownItem[]
  ct: ReturnType<typeof useChartTheme>
  fmt: (v: number) => string
  categoryName: string
  onClose: () => void
}) {
  const marginLeft = 90
  const marginRight = 40
  const marginTop = 10
  const marginBottom = 30
  const rowHeight = 28
  const chartHeight = Math.max(120, items.length * rowHeight + marginTop + marginBottom)

  const xMax = useMemo(() => {
    if (items.length === 0) return 100
    const m = Math.max(...items.map((d) => d.value))
    const mag = Math.pow(10, Math.floor(Math.log10(m || 1)))
    return Math.ceil(m / mag) * mag * 1.05
  }, [items])

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <div style={{ marginTop: 12, padding: '8px 0', borderTop: `1px solid ${ct.grid}` }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
          padding: '0 4px',
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: ct.text }}>
          {categoryName} — 日別内訳
        </span>
        <button
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: '0.6rem',
            padding: '2px 8px',
            borderRadius: 4,
            color: ct.textMuted,
            background: ct.bg2 === '#fff' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
          }}
        >
          閉じる
        </button>
      </div>
      <svg width="100%" height={chartHeight} viewBox={`0 0 800 ${chartHeight}`}>
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
        {items.map((item, i) => {
          const plotW = 800 - marginLeft - marginRight
          const yCenter = marginTop + i * rowHeight + rowHeight / 2
          const barH = rowHeight * 0.6
          const scale = xMax > 0 ? plotW / xMax : 0
          const barW = Math.max(item.value * scale, 1)
          const dateLabel = item.dateKey.length >= 10 ? item.dateKey.slice(5) : item.dateKey
          const isHovered = hoveredIdx === i

          return (
            <g
              key={item.dateKey}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <rect
                x={0}
                y={marginTop + i * rowHeight}
                width={800}
                height={rowHeight}
                fill={
                  isHovered
                    ? ct.bg2 === '#fff'
                      ? '#f3f4f6'
                      : 'rgba(255,255,255,0.05)'
                    : 'transparent'
                }
              />
              <text
                x={marginLeft - 6}
                y={yCenter + 4}
                textAnchor="end"
                fill={ct.textMuted}
                fontSize={10}
              >
                {dateLabel}
              </text>
              <rect
                x={marginLeft}
                y={yCenter - barH / 2}
                width={barW}
                height={barH}
                fill="#10b981"
                fillOpacity={isHovered ? 0.8 : 0.5}
                rx={2}
              />
              <text
                x={marginLeft + barW + 4}
                y={yCenter + 4}
                fill={ct.textMuted}
                fontSize={9}
                fontFamily="monospace"
              >
                {fmt(item.value)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── BoxPlotView ──

function BoxPlotView({
  boxData,
  ct,
  fmt,
  metricLabel,
  rawRows,
  trendRows,
  boxMetric,
  boxAxis,
  storeNameMap,
}: {
  boxData: readonly BoxPlotStats[]
  ct: ReturnType<typeof useChartTheme>
  fmt: (v: number) => string
  metricLabel: string
  rawRows: readonly CategoryBenchmarkRow[] | null
  trendRows: readonly CategoryBenchmarkTrendRow[] | null
  boxMetric: 'sales' | 'quantity'
  boxAxis: AnalysisAxis
  storeNameMap: ReadonlyMap<string, string>
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const storeBreakdown = useMemo(() => {
    if (boxAxis !== 'store' || !selectedCode || !rawRows) return null
    return buildStoreBreakdown(rawRows, selectedCode, boxMetric)
  }, [selectedCode, rawRows, boxMetric, boxAxis])

  const dateBreakdown = useMemo(() => {
    if (boxAxis !== 'date' || !selectedCode || !trendRows) return null
    return buildDateBreakdown(trendRows, selectedCode)
  }, [selectedCode, trendRows, boxAxis])

  const selectedName = useMemo(
    () => boxData.find((d) => d.code === selectedCode)?.name ?? '',
    [boxData, selectedCode],
  )

  const handleRowClick = (code: string) => {
    setSelectedCode((prev) => (prev === code ? null : code))
  }

  const marginLeft = 90
  const marginRight = 40
  const marginTop = 10
  const marginBottom = 30
  const rowHeight = 36
  const chartHeight = Math.max(200, boxData.length * rowHeight + marginTop + marginBottom)

  const xMax = useMemo(() => {
    if (boxData.length === 0) return 100
    const m = Math.max(...boxData.map((d) => d.max))
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

            const isSelected = selectedCode === d.code

            return (
              <g
                key={d.code}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleRowClick(d.code)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={0}
                  y={marginTop + i * rowHeight}
                  width={800}
                  height={rowHeight}
                  fill={
                    isSelected
                      ? ct.bg2 === '#fff'
                        ? 'rgba(99,102,241,0.08)'
                        : 'rgba(99,102,241,0.15)'
                      : hoveredIdx === i
                        ? ct.bg2 === '#fff'
                          ? '#f3f4f6'
                          : 'rgba(255,255,255,0.05)'
                        : 'transparent'
                  }
                />
                <text
                  x={marginLeft - 6}
                  y={yCenter + 4}
                  textAnchor="end"
                  fill={isSelected ? '#6366f1' : ct.textMuted}
                  fontSize={10}
                  fontWeight={isSelected ? 700 : 400}
                >
                  {d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name}
                </text>
                {/* Left whisker */}
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
                {/* Right whisker */}
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
            <div>
              {boxAxis === 'store' ? '店舗数' : '日数'}: {hovered.count}
            </div>
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
      {selectedCode && boxAxis === 'store' && storeBreakdown && storeBreakdown.length > 0 && (
        <StoreBreakdownChart
          items={storeBreakdown}
          storeNameMap={storeNameMap}
          ct={ct}
          fmt={fmt}
          categoryName={selectedName}
          onClose={() => setSelectedCode(null)}
        />
      )}
      {selectedCode && boxAxis === 'date' && dateBreakdown && dateBreakdown.length > 0 && (
        <DateBreakdownChart
          items={dateBreakdown}
          ct={ct}
          fmt={fmt}
          categoryName={selectedName}
          onClose={() => setSelectedCode(null)}
        />
      )}
    </div>
  )
}

// ── Main Component ──

export const DuckDBCategoryBoxPlotChart = memo(function DuckDBCategoryBoxPlotChart({
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const storesMap = useDataStore((s) => s.data.stores)
  const storeNameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const [id, store] of storesMap) m.set(id, store.name)
    return m
  }, [storesMap])

  const [level, setLevel] = useState<CategoryLevel>('department')
  const [minStores, setMinStores] = useState(2)
  const [boxMetric, setBoxMetric] = useState<BoxMetric>('sales')
  const [analysisAxis, setAnalysisAxis] = useState<AnalysisAxis>('store')
  const [parentDeptCode, setParentDeptCode] = useState<string>('')
  const [parentLineCode, setParentLineCode] = useState<string>('')

  const isSingleStore = selectedStoreIds.size === 1
  const effectiveAxis: AnalysisAxis = isSingleStore ? 'date' : analysisAxis

  const { data: deptList } = useDuckDBCategoryHierarchy(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'department',
  )

  const { data: lineList } = useDuckDBCategoryHierarchy(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'line',
    parentDeptCode || undefined,
  )

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
    parentDeptCode || undefined,
    parentLineCode || undefined,
  )

  const { data: trendRows } = useDuckDBCategoryBenchmarkTrend(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    level,
    parentDeptCode || undefined,
    parentLineCode || undefined,
  )

  const totalStoreCount = selectedStoreIds.size

  const boxPlotDataByStore = useMemo(
    () => (rawRows ? buildBoxPlotData(rawRows, boxMetric, 20, minStores, totalStoreCount) : []),
    [rawRows, boxMetric, minStores, totalStoreCount],
  )

  const boxPlotDataByDate = useMemo(
    () =>
      trendRows && rawRows
        ? buildBoxPlotDataByDate(trendRows, rawRows, boxMetric, 20, minStores, totalStoreCount)
        : [],
    [trendRows, rawRows, boxMetric, minStores, totalStoreCount],
  )

  const boxPlotData = effectiveAxis === 'store' ? boxPlotDataByStore : boxPlotDataByDate

  if (error) {
    return (
      <Wrapper aria-label="カテゴリ箱ひげ図（DuckDB）">
        <Title>カテゴリ箱ひげ図（DuckDB）</Title>
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (isLoading && !rawRows) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="カテゴリ箱ひげ図（DuckDB）">
      <HeaderRow>
        <div>
          <Title>カテゴリ箱ひげ図（DuckDB）</Title>
          <Subtitle>
            {effectiveAxis === 'date'
              ? 'カテゴリ別 日別販売金額の分布'
              : `カテゴリ別 店舗間${BOX_METRIC_LABELS[boxMetric]}の分布`}
          </Subtitle>
        </div>
        <Controls>
          <ControlGroup>
            <ControlLabel>階層</ControlLabel>
            <ButtonGroup>
              {(Object.keys(LEVEL_LABELS) as CategoryLevel[]).map((l) => (
                <ToggleBtn
                  key={l}
                  $active={level === l}
                  onClick={() => {
                    setLevel(l)
                    if (l === 'department') {
                      setParentDeptCode('')
                      setParentLineCode('')
                    } else if (l === 'line') {
                      setParentLineCode('')
                    }
                  }}
                >
                  {LEVEL_LABELS[l]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          {level !== 'department' && deptList && deptList.length > 0 && (
            <ControlGroup>
              <ControlLabel>部門</ControlLabel>
              <FilterSelect
                value={parentDeptCode}
                onChange={(e) => {
                  setParentDeptCode(e.target.value)
                  setParentLineCode('')
                }}
              >
                <option value="">全部門</option>
                {deptList.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </FilterSelect>
            </ControlGroup>
          )}
          {level === 'klass' && lineList && lineList.length > 0 && (
            <ControlGroup>
              <ControlLabel>ライン</ControlLabel>
              <FilterSelect
                value={parentLineCode}
                onChange={(e) => setParentLineCode(e.target.value)}
              >
                <option value="">全ライン</option>
                {lineList.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </FilterSelect>
            </ControlGroup>
          )}
          <ControlGroup>
            <ControlLabel>分析軸</ControlLabel>
            <ButtonGroup>
              {(Object.keys(ANALYSIS_AXIS_LABELS) as AnalysisAxis[]).map((a) => (
                <ToggleBtn
                  key={a}
                  $active={effectiveAxis === a}
                  onClick={() => setAnalysisAxis(a)}
                  disabled={a === 'store' && isSingleStore}
                  title={
                    a === 'store' && isSingleStore
                      ? '店舗別比較には複数店舗の選択が必要です'
                      : undefined
                  }
                >
                  {ANALYSIS_AXIS_LABELS[a]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup $hidden={effectiveAxis !== 'store'}>
            <ControlLabel>指標</ControlLabel>
            <ButtonGroup>
              {(Object.keys(BOX_METRIC_LABELS) as BoxMetric[]).map((m) => (
                <ToggleBtn key={m} $active={boxMetric === m} onClick={() => setBoxMetric(m)}>
                  {BOX_METRIC_LABELS[m]}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup $hidden={effectiveAxis !== 'store'}>
            <ControlLabel>最低店舗数</ControlLabel>
            <ButtonGroup>
              {[1, 2, 3].map((n) => (
                <ToggleBtn key={n} $active={minStores === n} onClick={() => setMinStores(n)}>
                  {n === 1 ? '全て' : `${n}店以上`}
                </ToggleBtn>
              ))}
            </ButtonGroup>
          </ControlGroup>
        </Controls>
      </HeaderRow>

      <BoxPlotView
        boxData={boxPlotData}
        ct={ct}
        fmt={
          boxMetric === 'sales' || effectiveAxis === 'date'
            ? fmt
            : (v: number) => v.toLocaleString()
        }
        metricLabel={effectiveAxis === 'date' ? '販売金額（日別）' : BOX_METRIC_LABELS[boxMetric]}
        rawRows={rawRows ?? null}
        trendRows={trendRows ?? null}
        boxMetric={boxMetric}
        boxAxis={effectiveAxis}
        storeNameMap={storeNameMap}
      />
    </Wrapper>
  )
})
