import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { palette } from '@/presentation/theme/tokens'
import { useUiStore } from '@/application/stores/uiStore'

/** recharts用のテーマカラーを取得するフック */
export function useChartTheme() {
  const theme = useTheme() as AppTheme

  return {
    colors: {
      primary: theme.colors.palette.primary,
      success: theme.colors.palette.success,
      successDark: theme.colors.palette.successDark,
      warning: theme.colors.palette.warning,
      warningDark: theme.colors.palette.warningDark,
      danger: theme.colors.palette.danger,
      dangerDark: theme.colors.palette.dangerDark,
      info: theme.colors.palette.info,
      infoDark: theme.colors.palette.infoDark,
      purple: theme.colors.palette.purple,
      cyan: theme.colors.palette.cyan,
      cyanDark: theme.colors.palette.cyanDark,
      pink: theme.colors.palette.pink,
      orange: theme.colors.palette.orange,
      blue: theme.colors.palette.blue,
      lime: theme.colors.palette.lime,
      slate: theme.colors.palette.slate,
      slateDark: theme.colors.palette.slateDark,
    },
    text: theme.colors.text,
    textSecondary: theme.colors.text2,
    textMuted: theme.colors.text3,
    grid: theme.colors.border,
    bg: theme.colors.bg,
    bg2: theme.colors.bg2,
    bg3: theme.colors.bg3,
    fontFamily: theme.typography.fontFamily.primary,
    monoFamily: theme.typography.fontFamily.mono,
    fontSize: {
      xs: 9,
      sm: 10,
      base: 11,
    },
    isDark: theme.mode === 'dark',
  }
}

export type ChartTheme = ReturnType<typeof useChartTheme>

/** Tooltip共通スタイルを生成 */
export function tooltipStyle(ct: ChartTheme) {
  return {
    background: ct.bg2,
    border: `1px solid ${ct.grid}`,
    borderRadius: 8,
    fontSize: ct.fontSize.sm,
    fontFamily: ct.fontFamily,
    color: ct.text,
  } as const
}

/** 店舗間比較用の共通カラーパレット */
export const STORE_COLORS = [
  palette.primary,
  palette.successDark,
  palette.warningDark,
  palette.dangerDark,
  palette.cyanDark,
  palette.pinkDark,
] as const

/** 金額を万円表示する */
export function toManYen(v: number): string {
  return `${Math.round(v / 10000)}万`
}

/** 金額を千円表示する */
export function toSenYen(v: number): string {
  return `${Math.round(v / 1000).toLocaleString('ja-JP')}千`
}

/** 金額を円表示する（カンマ区切り＋円サフィックス） */
export function toYen(v: number): string {
  return `${Math.round(v).toLocaleString('ja-JP')}円`
}

/** 金額をカンマ区切りで表示する */
export function toComma(v: number): string {
  return Math.round(v).toLocaleString('ja-JP')
}

/** パーセント表示する */
export function toPct(v: number, decimals = 2): string {
  return `${(v * 100).toFixed(decimals)}%`
}

// ── 偏差値計算 ──

/** 偏差値の平均（50） */
export const DEVIATION_MEAN = 50

/** 偏差値の標準偏差倍率（10） */
export const DEVIATION_SD = 10

/** Zスコアを偏差値に変換する: 偏差値 = 50 + 10z */
export function toDevScore(z: number): number {
  return DEVIATION_MEAN + DEVIATION_SD * z
}

/** グローバル設定に基づく通貨フォーマッタを返すフック */
export function useCurrencyFormatter(): (v: number) => string {
  const currencyUnit = useUiStore((s) => s.currencyUnit)
  return useMemo(() => (currencyUnit === 'yen' ? toYen : toSenYen), [currencyUnit])
}
