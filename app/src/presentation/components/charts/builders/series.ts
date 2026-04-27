/**
 * ECharts 系列スタイルプリセット
 *
 * chartStyles トークンを使用して、バー・ライン・エリアの共通スタイルを提供。
 * スプレッドで個別設定と組み合わせる:
 *
 *   { name: '売上', type: 'bar', data, ...barDefaults({ color: theme.chart.barPositive }) }
 *
 * @responsibility R:unclassified
 */
import { chartStyles } from '@/presentation/theme/tokens'
import type { LinearGradientObject } from 'echarts'

/** ECharts 線形グラデーションを生成（top → bottom） */
export function verticalGradient(colorTop: string, colorBottom: string): LinearGradientObject {
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: colorTop },
      { offset: 1, color: colorBottom },
    ],
  } as LinearGradientObject
}

/** バー系列のデフォルトスタイル */
export function barDefaults(opts: { color: string; opacity?: number; gradient?: boolean }): {
  itemStyle: {
    color: string | LinearGradientObject
    opacity: number
    borderRadius: [number, number, number, number]
  }
  barMaxWidth: number
} {
  const baseColor = opts.color
  return {
    itemStyle: {
      color: opts.gradient !== false ? verticalGradient(baseColor, baseColor + 'b3') : baseColor,
      opacity: opts.opacity ?? chartStyles.opacity.bar,
      borderRadius: [...chartStyles.barRadius.standard] as [number, number, number, number],
    },
    barMaxWidth: chartStyles.barWidth.wide,
  }
}

/** 水平バー系列のデフォルトスタイル */
export function horizontalBarDefaults(opts: { color: string; opacity?: number }): {
  itemStyle: {
    color: string | LinearGradientObject
    opacity: number
    borderRadius: [number, number, number, number]
  }
  barMaxWidth: number
} {
  const baseColor = opts.color
  return {
    itemStyle: {
      color: verticalGradient(baseColor, baseColor + 'b3'),
      opacity: opts.opacity ?? chartStyles.opacity.bar,
      borderRadius: [...chartStyles.barRadius.horizontal] as [number, number, number, number],
    },
    barMaxWidth: chartStyles.barWidth.wide,
  }
}

/** ライン系列のデフォルトスタイル */
export function lineDefaults(opts: {
  color: string
  dashed?: boolean
  width?: number
  smooth?: boolean
}): {
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
    smooth: opts.smooth ?? true,
  }
}

/** エリア（塗りつぶし）系列のデフォルトスタイル — グラデーション塗り */
export function areaDefaults(opts: { color: string; subtle?: boolean }): {
  lineStyle: { color: string; width: number }
  itemStyle: { color: string }
  areaStyle: { color: LinearGradientObject }
  symbol: 'none'
  smooth: boolean
} {
  const opacity = opts.subtle ? chartStyles.opacity.areaSubtle : chartStyles.opacity.area
  return {
    lineStyle: {
      color: opts.color,
      width: chartStyles.lineWidth.standard,
    },
    itemStyle: { color: opts.color },
    areaStyle: {
      color: verticalGradient(
        opts.color +
          Math.round(opacity * 255)
            .toString(16)
            .padStart(2, '0'),
        opts.color + '00',
      ),
    },
    symbol: 'none',
    smooth: true,
  }
}
