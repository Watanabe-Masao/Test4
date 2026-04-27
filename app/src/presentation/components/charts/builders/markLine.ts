/**
 * ECharts マークラインプリセット
 *
 * ゼロ基線、予算線、閾値線など頻出パターンを共通化。
 *
 * @responsibility R:unclassified
 */
import type { AppTheme } from '@/presentation/theme/theme'
import { chartFontSize } from '@/presentation/theme/tokens'

// ECharts の MarkLine 型は複雑なため、緩い型で定義
type MarkLineData = Record<string, unknown>

export interface MarkLineOption {
  silent: boolean
  symbol: string | string[]
  lineStyle?: Record<string, unknown>
  label?: Record<string, unknown>
  data: MarkLineData[]
}

/** ゼロ基線（差異チャート等で y=0 に水平線） */
export function zeroBaseline(theme: AppTheme): MarkLineOption {
  return {
    silent: true,
    symbol: 'none',
    lineStyle: {
      color: theme.colors.border,
      width: 1,
      type: 'solid',
      opacity: 0.5,
    },
    label: { show: false },
    data: [{ yAxis: 0 }],
  }
}

/** 予算線（予算値を水平線で表示） */
export function budgetLine(theme: AppTheme, value: number, label?: string): MarkLineOption {
  return {
    silent: true,
    symbol: 'none',
    lineStyle: {
      color: theme.chart.budget,
      width: 1.5,
      type: 'dashed',
    },
    label: label
      ? {
          formatter: label,
          position: 'end',
          fontSize: chartFontSize.annotation,
          color: theme.colors.text3,
        }
      : { show: false },
    data: [{ yAxis: value }],
  }
}

/** 閾値線（カスタム色・ラベル付き） */
export function thresholdLine(
  theme: AppTheme,
  value: number,
  opts: { label: string; color: string; axis?: 'yAxis' | 'xAxis' },
): MarkLineOption {
  const axisKey = opts.axis ?? 'yAxis'
  return {
    silent: true,
    symbol: 'none',
    lineStyle: {
      color: opts.color,
      width: 1.5,
      type: 'dashed',
      opacity: 0.7,
    },
    label: {
      formatter: opts.label,
      position: 'end',
      fontSize: chartFontSize.annotation,
      color: theme.colors.text3,
    },
    data: [{ [axisKey]: value }],
  }
}
