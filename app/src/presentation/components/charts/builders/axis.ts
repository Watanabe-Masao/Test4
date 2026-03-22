/**
 * ECharts 軸ビルダー
 *
 * 共通の軸ラベルスタイル・splitLine 設定をトークン経由で提供。
 * 16箇所以上の軸ラベル重複と29箇所以上の splitLine 重複を解消する。
 */
import type { XAXisComponentOption, YAXisComponentOption } from 'echarts'
import type { AppTheme } from '@/presentation/theme/theme'
import { chartFontSize } from '@/presentation/theme/tokens'

// ─── 内部ヘルパー ──────────────────────────────────────

/** テーマに基づく共通の軸ラベルスタイル */
function axisLabelStyle(theme: AppTheme) {
  return {
    color: theme.colors.text3,
    fontSize: chartFontSize.axis,
    fontFamily: theme.typography.fontFamily.mono,
  } as const
}

/** テーマに基づく共通の splitLine スタイル */
function splitLineStyle(theme: AppTheme) {
  return {
    lineStyle: {
      color: theme.colors.border,
      opacity: 0.2,
      type: 'dashed' as const,
      width: 0.5,
    },
  }
}

// ─── 値軸（Y 軸）ビルダー ──────────────────────────────

export interface ValueYAxisOptions {
  /** 軸ラベルのフォーマッタ（デフォルト: なし） */
  formatter?: (value: number) => string
  /** 軸の位置（デフォルト: 'left'） */
  position?: 'left' | 'right'
  /** splitLine を表示するか（デフォルト: true） */
  showSplitLine?: boolean
  /** 最小値 */
  min?: number | 'dataMin'
  /** 最大値 */
  max?: number | 'dataMax'
  /** 軸目盛りの間隔（固定スケール用） */
  interval?: number
}

/** 値軸（Y 軸）を構築 */
export function valueYAxis(theme: AppTheme, opts?: ValueYAxisOptions): YAXisComponentOption {
  const { formatter, position = 'left', showSplitLine = true, min, max, interval } = opts ?? {}
  return {
    type: 'value',
    position,
    min,
    max,
    ...(interval != null ? { interval } : {}),
    axisLabel: {
      ...axisLabelStyle(theme),
      ...(formatter ? { formatter } : {}),
    },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: showSplitLine ? splitLineStyle(theme) : { show: false },
  }
}

// ─── カテゴリ軸（X 軸）ビルダー ────────────────────────

/** カテゴリ X 軸を構築 */
export function categoryXAxis(data: readonly string[], theme: AppTheme): XAXisComponentOption {
  return {
    type: 'category',
    data: data as string[],
    axisLabel: axisLabelStyle(theme),
    axisLine: { lineStyle: { color: theme.colors.border } },
    axisTick: { lineStyle: { color: theme.colors.border } },
  }
}

// ─── パーセント軸ビルダー ──────────────────────────────

/** パーセント Y 軸を構築 */
export function percentYAxis(
  theme: AppTheme,
  opts?: { position?: 'left' | 'right' },
): YAXisComponentOption {
  return valueYAxis(theme, {
    formatter: (v: number) => `${v}%`,
    position: opts?.position,
  })
}

// ─── 金額軸ビルダー（後方互換） ────────────────────────

/** 万円表示の Y 軸（後方互換: yenYAxis） */
export function yenYAxis(theme: AppTheme): YAXisComponentOption {
  return valueYAxis(theme, {
    formatter: (v: number) => `${Math.round(v / 10000)}万`,
  })
}
