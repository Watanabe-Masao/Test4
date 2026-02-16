import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'

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
      pink: theme.colors.palette.pink,
      orange: theme.colors.palette.orange,
      blue: theme.colors.palette.blue,
      lime: theme.colors.palette.lime,
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

/** 金額を万円表示する */
export function toManYen(v: number): string {
  return `${Math.round(v / 10000)}万`
}

/** 金額をカンマ区切りで表示する */
export function toComma(v: number): string {
  return Math.round(v).toLocaleString('ja-JP')
}

/** パーセント表示する */
export function toPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}
