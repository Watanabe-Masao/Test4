/**
 * ECharts ツールチップビルダー
 *
 * 12箇所以上のカスタム HTML フォーマッタを型安全なファクトリに集約。
 */
import type { TooltipComponentOption } from 'echarts'
import type { AppTheme } from '@/presentation/theme/theme'
import { chartFontSize } from '@/presentation/theme/tokens'

// ─── ツールチップ基盤 ──────────────────────────────────

/** テーマに基づく共通ツールチップスタイル（trigger は呼び出し側で指定） */
export function tooltipBase(theme: AppTheme): TooltipComponentOption {
  return {
    trigger: 'axis',
    backgroundColor: theme.colors.bg2,
    borderColor: theme.colors.border,
    textStyle: {
      color: theme.colors.text,
      fontSize: chartFontSize.tooltip,
      fontFamily: theme.typography.fontFamily.primary,
    },
  }
}

/** 後方互換: standardTooltip() */
export function standardTooltip(theme: AppTheme): TooltipComponentOption {
  return tooltipBase(theme)
}

// ─── 凡例 ──────────────────────────────────────────────

/** テーマに基づく共通凡例スタイル */
export function standardLegend(theme: AppTheme) {
  return {
    textStyle: {
      color: theme.colors.text3,
      fontSize: chartFontSize.axis,
    },
    bottom: 0,
  }
}

// ─── フォーマッタファクトリ ────────────────────────────

type TooltipParam = {
  seriesName: string
  value: number | null | undefined
  marker: string
  axisValue?: string
  name?: string
}

/**
 * 通貨フォーマット付きツールチップ
 *
 * @param theme - AppTheme
 * @param labelMap - 系列名 → 日本語ラベルのマッピング
 * @param formatValue - 値のフォーマッタ（デフォルト: toLocaleString + 円）
 */
export function currencyTooltip(
  theme: AppTheme,
  labelMap: Record<string, string>,
  formatValue?: (value: number) => string,
): TooltipComponentOption {
  const fmt = formatValue ?? ((v: number) => `${Math.round(v).toLocaleString('ja-JP')}円`)
  return {
    ...tooltipBase(theme),
    formatter: (params: unknown) => {
      const items = params as TooltipParam[]
      if (!Array.isArray(items) || items.length === 0) return ''
      const title = items[0].axisValue ?? items[0].name ?? ''
      let html = `<div style="font-weight:600;margin-bottom:4px">${title}</div>`
      for (const item of items) {
        const label = labelMap[item.seriesName] ?? item.seriesName
        const val = item.value != null ? fmt(item.value) : '-'
        html += `<div>${item.marker} ${label}: ${val}</div>`
      }
      return html
    },
  }
}

/**
 * パーセントフォーマット付きツールチップ
 *
 * @param theme - AppTheme
 * @param labelMap - 系列名 → 日本語ラベルのマッピング
 * @param decimals - 小数点以下桁数（デフォルト: 1）
 */
export function percentTooltip(
  theme: AppTheme,
  labelMap: Record<string, string>,
  decimals = 1,
): TooltipComponentOption {
  return {
    ...tooltipBase(theme),
    formatter: (params: unknown) => {
      const items = params as TooltipParam[]
      if (!Array.isArray(items) || items.length === 0) return ''
      const title = items[0].axisValue ?? items[0].name ?? ''
      let html = `<div style="font-weight:600;margin-bottom:4px">${title}</div>`
      for (const item of items) {
        const label = labelMap[item.seriesName] ?? item.seriesName
        const val = item.value != null ? `${(item.value as number).toFixed(decimals)}%` : '-'
        html += `<div>${item.marker} ${label}: ${val}</div>`
      }
      return html
    },
  }
}

/**
 * 汎用マルチシリーズツールチップ
 *
 * 系列ごとにカスタムフォーマッタを適用できる。
 *
 * @param theme - AppTheme
 * @param labelMap - 系列名 → 日本語ラベルのマッピング
 * @param formatValue - (seriesName, value) => 表示文字列
 */
export function multiSeriesTooltip(
  theme: AppTheme,
  labelMap: Record<string, string>,
  formatValue: (seriesName: string, value: number) => string,
): TooltipComponentOption {
  return {
    ...tooltipBase(theme),
    formatter: (params: unknown) => {
      const items = params as TooltipParam[]
      if (!Array.isArray(items) || items.length === 0) return ''
      const title = items[0].axisValue ?? items[0].name ?? ''
      let html = `<div style="font-weight:600;margin-bottom:4px">${title}</div>`
      for (const item of items) {
        const label = labelMap[item.seriesName] ?? item.seriesName
        const val = item.value != null ? formatValue(item.seriesName, item.value) : '-'
        html += `<div>${item.marker} ${label}: ${val}</div>`
      }
      return html
    },
  }
}
