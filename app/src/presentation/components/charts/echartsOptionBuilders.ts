/**
 * ECharts Option ビルダー — Logic.ts の出力を ECharts option に変換する共通関数群
 *
 * React 非依存。テーマトークンを受け取り、ECharts option オブジェクトを返す。
 * 各チャートの .tsx で使用:
 *
 *   const option = buildCumulativeOption(chartData, summary, theme)
 *   <EChart option={option} />
 */
import type { EChartsOption } from 'echarts'
import type { AppTheme } from '@/presentation/theme/theme'

// ─── 共通フォーマッタ ──────────────────────────────────

/** 金額を万円表示（軸ラベル用） */
export function toAxisManYen(value: number): string {
  return `${Math.round(value / 10000)}万`
}

/** 金額をカンマ区切り（ツールチップ用） */
export function toCommaYen(value: number): string {
  return `${Math.round(value).toLocaleString('ja-JP')}円`
}

// ─── 共通軸設定 ──────────────────────────────────────────

/** 金額 Y 軸（万円ラベル） */
export function yenYAxis(theme: AppTheme): EChartsOption['yAxis'] {
  return {
    type: 'value',
    axisLabel: {
      formatter: (v: number) => toAxisManYen(v),
      color: theme.colors.text3,
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.mono,
    },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      lineStyle: { color: theme.colors.border, opacity: 0.3, type: 'dashed' },
    },
  }
}

/** カテゴリ X 軸（日付ラベル等） */
export function categoryXAxis(data: readonly string[], theme: AppTheme): EChartsOption['xAxis'] {
  return {
    type: 'category',
    data: data as string[],
    axisLabel: {
      color: theme.colors.text3,
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.mono,
    },
    axisLine: { lineStyle: { color: theme.colors.border } },
    axisTick: { lineStyle: { color: theme.colors.border } },
  }
}

/** 共通グリッド設定 */
export function standardGrid(): EChartsOption['grid'] {
  return {
    left: 10,
    right: 20,
    top: 30,
    bottom: 10,
    containLabel: true,
  }
}

/** 共通ツールチップ設定 */
export function standardTooltip(theme: AppTheme): EChartsOption['tooltip'] {
  return {
    trigger: 'axis',
    backgroundColor: theme.colors.bg2,
    borderColor: theme.colors.border,
    textStyle: {
      color: theme.colors.text,
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.primary,
    },
  }
}

/** 共通凡例設定 */
export function standardLegend(theme: AppTheme): EChartsOption['legend'] {
  return {
    textStyle: {
      color: theme.colors.text3,
      fontSize: 10,
    },
    bottom: 0,
  }
}
