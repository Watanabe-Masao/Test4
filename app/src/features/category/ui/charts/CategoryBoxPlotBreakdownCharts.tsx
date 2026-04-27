/**
 * カテゴリ箱ひげ図 — ブレイクダウンサブコンポーネント
 *
 * StoreBreakdownChart: 店舗別内訳の横棒グラフ
 * DateBreakdownChart: 日別内訳の横棒グラフ
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo } from 'react'
import type { StoreBreakdownItem, DateBreakdownItem } from '@/application/hooks/duckdb'
import { niceAxisMax } from '@/presentation/components/charts/chartAxisUtils'
import type { ChartTheme } from '@/features/category/ui/charts/CategoryBoxPlotChart.vm'

// ── StoreBreakdownChart ──

export function StoreBreakdownChart({
  items,
  storeNameMap,
  ct,
  fmt,
  categoryName,
  onClose,
}: {
  items: readonly StoreBreakdownItem[]
  storeNameMap: ReadonlyMap<string, string>
  ct: ChartTheme
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
    return niceAxisMax(Math.max(...items.map((d) => d.value)))
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

export function DateBreakdownChart({
  items,
  ct,
  fmt,
  categoryName,
  onClose,
}: {
  items: readonly DateBreakdownItem[]
  ct: ChartTheme
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
    return niceAxisMax(Math.max(...items.map((d) => d.value)))
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
