/**
 * カテゴリ箱ひげ図 — BoxPlotView サブコンポーネント
 *
 * SVG による箱ひげ図描画とホバー/選択のインタラクションを担当する。
 * CategoryBoxPlotChart から分離された純粋な描画コンポーネント。
 */
import { useState, useMemo } from 'react'
import type { CategoryBenchmarkRow, CategoryBenchmarkTrendRow } from '@/application/hooks/duckdb'
import {
  buildStoreBreakdown,
  buildDateBreakdown,
  type BoxPlotStats,
} from '@/application/hooks/duckdb'
import { EmptyState } from '@/presentation/components/common/layout'
import { niceAxisMax } from '@/presentation/components/charts/chartAxisUtils'
import { MapLegend, LegendItem } from '@/features/category/ui/charts/CategoryBoxPlotChart.styles'
import type {
  ChartTheme,
  AnalysisAxis,
} from '@/features/category/ui/charts/CategoryBoxPlotChart.vm'
import {
  StoreBreakdownChart,
  DateBreakdownChart,
} from '@/features/category/ui/charts/CategoryBoxPlotBreakdownCharts'

export function BoxPlotView({
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
  ct: ChartTheme
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
    return niceAxisMax(Math.max(...boxData.map((d) => d.max)))
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
                {/* Mean marker */}
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
              fontSize: ct.fontSize.label,
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
