/**
 * ECharts 系列スタイルプリセット
 *
 * chartStyles トークンを使用して、バー・ライン・エリアの共通スタイルを提供。
 * スプレッドで個別設定と組み合わせる:
 *
 *   { name: '売上', type: 'bar', data, ...barDefaults({ color: theme.chart.barPositive }) }
 */
import { chartStyles } from '@/presentation/theme/tokens'

/** バー系列のデフォルトスタイル */
export function barDefaults(opts: { color: string; opacity?: number }): {
  itemStyle: {
    color: string
    opacity: number
    borderRadius: readonly [number, number, number, number]
  }
  barMaxWidth: number
} {
  return {
    itemStyle: {
      color: opts.color,
      opacity: opts.opacity ?? chartStyles.opacity.bar,
      borderRadius: chartStyles.barRadius.standard,
    },
    barMaxWidth: chartStyles.barWidth.wide,
  }
}

/** 水平バー系列のデフォルトスタイル */
export function horizontalBarDefaults(opts: { color: string; opacity?: number }): {
  itemStyle: {
    color: string
    opacity: number
    borderRadius: readonly [number, number, number, number]
  }
  barMaxWidth: number
} {
  return {
    itemStyle: {
      color: opts.color,
      opacity: opts.opacity ?? chartStyles.opacity.bar,
      borderRadius: chartStyles.barRadius.horizontal,
    },
    barMaxWidth: chartStyles.barWidth.wide,
  }
}

/** ライン系列のデフォルトスタイル */
export function lineDefaults(opts: { color: string; dashed?: boolean; width?: number }): {
  lineStyle: { color: string; width: number; type: 'solid' | 'dashed' }
  itemStyle: { color: string }
  symbol: 'none'
  smooth: boolean
} {
  return {
    lineStyle: {
      color: opts.color,
      width: opts.width ?? chartStyles.lineWidth.standard,
      type: opts.dashed ? 'dashed' : 'solid',
    },
    itemStyle: { color: opts.color },
    symbol: 'none',
    smooth: false,
  }
}

/** エリア（塗りつぶし）系列のデフォルトスタイル */
export function areaDefaults(opts: { color: string; subtle?: boolean }): {
  lineStyle: { color: string; width: number }
  itemStyle: { color: string }
  areaStyle: { color: string; opacity: number }
  symbol: 'none'
  smooth: boolean
} {
  return {
    lineStyle: {
      color: opts.color,
      width: chartStyles.lineWidth.standard,
    },
    itemStyle: { color: opts.color },
    areaStyle: {
      color: opts.color,
      opacity: opts.subtle ? chartStyles.opacity.areaSubtle : chartStyles.opacity.area,
    },
    symbol: 'none',
    smooth: false,
  }
}
