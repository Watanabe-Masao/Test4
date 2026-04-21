/**
 * StripChart — 日次推移の inline 小型ストリップ (SVG で軽量描画)
 *
 * テーブル行内の「日次推移」セルに埋め込むコンパクト bar strip。
 * ECharts は個別インスタンスの overhead が大きいため、テーブルに多数並ぶ
 * この用途では SVG で軽量描画する (プロトタイプと同じ方針)。
 *
 * @responsibility R:chart-view
 */
import { memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'

interface Props {
  /** 値配列 (0-indexed、全期間分) */
  readonly data: readonly number[]
  /** 強調する範囲 [start, end) — 0-indexed。範囲外は dimmed */
  readonly highlightRange?: readonly [number, number]
  /** 現在日 (区切りライン用)。1-based */
  readonly currentDay?: number
  readonly variant?: 'budget' | 'actual' | 'projection'
  readonly width?: number
  readonly height?: number
}

export const StripChart = memo(function StripChart({
  data,
  highlightRange,
  currentDay,
  variant = 'actual',
  width = 160,
  height = 24,
}: Props) {
  const theme = useTheme() as AppTheme

  if (data.length === 0) return null

  const max = Math.max(...data.filter((v) => Number.isFinite(v)), 1)
  const barGap = 1
  const barWidth = Math.max(1, (width - (data.length - 1) * barGap) / data.length)

  const color =
    variant === 'budget'
      ? theme.colors.palette.primary
      : variant === 'projection'
        ? theme.colors.palette.warningDark
        : (theme.chart?.barPositive ?? theme.colors.palette.positive)
  const dimOpacity = 0.25
  const fullOpacity = 0.85

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${variant} ストリップ`}
      style={{ display: 'block' }}
    >
      {data.map((value, i) => {
        const v = Number.isFinite(value) ? value : 0
        const h = Math.max(1, (v / max) * (height - 2))
        const x = i * (barWidth + barGap)
        const y = height - h
        const inRange = highlightRange == null || (i >= highlightRange[0] && i < highlightRange[1])
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            fill={color}
            opacity={inRange ? fullOpacity : dimOpacity}
            rx={0.5}
          />
        )
      })}
      {currentDay != null && currentDay >= 1 && currentDay <= data.length && (
        <line
          x1={(currentDay - 1) * (barWidth + barGap) + barWidth / 2}
          y1={0}
          x2={(currentDay - 1) * (barWidth + barGap) + barWidth / 2}
          y2={height}
          stroke={theme.colors.text3}
          strokeWidth={0.5}
          strokeDasharray="2 2"
        />
      )}
    </svg>
  )
})
