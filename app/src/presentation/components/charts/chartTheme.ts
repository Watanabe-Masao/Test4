import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { format as d3format } from 'd3-format'
import type { AppTheme } from '@/presentation/theme/theme'
import { palette } from '@/presentation/theme/tokens'
import { useUiStore } from '@/application/stores/uiStore'
import { formatPercent, formatCurrency } from '@/domain/formatting'

/** チャート用のテーマカラーを取得するフック */
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
  return `${Math.round(v / 10000).toLocaleString('ja-JP')}万`
}

/** 金額を千円表示する */
export function toSenYen(v: number): string {
  return `${Math.round(v / 1000).toLocaleString('ja-JP')}千`
}

/** 金額を円表示する（formatCurrency に委譲＋円サフィックス） */
export const toYen = (v: number): string => `${formatCurrency(v)}円`

/** 金額をカンマ区切りで表示する（formatCurrency に委譲） */
export const toComma = (v: number): string => formatCurrency(v)

/** パーセント表示する（domain/formatting の formatPercent に委譲） */
export const toPct = (v: number, decimals = 2): string => formatPercent(v, decimals)

// ── d3-format ベースの軸フォーマッタ ──

const fmtCommaInt = d3format(',.0f')

/**
 * 軸ラベル用の金額フォーマッタ。
 * 値の大きさに応じて SI 接頭辞（千/万/億）を自動適用する。
 * 例: 1500 → "1,500", 15000 → "1.5万", 150000000 → "1.5億"
 */
export function toAxisYen(v: number): string {
  const abs = Math.abs(v)
  if (abs === 0) return '0'
  if (abs >= 1e8) return `${(v / 1e8).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}億`
  if (abs >= 1e4) return `${(v / 1e4).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万`
  if (abs >= 1e3) return `${(v / 1e3).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}千`
  return fmtCommaInt(v)
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

/** 通貨フォーマッタの型（VM 等に渡す用） */
export type CurrencyFormatter = (v: number | null) => string

/** 千円値（サフィックスなし） */
function formatSenValue(n: number | null): string {
  if (n == null || isNaN(n)) return '-'
  return Math.round(n / 1000).toLocaleString('ja-JP')
}

/** 千円値（サフィックス付き） */
function formatSenWithUnit(n: number | null): string {
  if (n == null || isNaN(n)) return '-'
  return `${Math.round(n / 1000).toLocaleString('ja-JP')}千`
}

/** 円値（サフィックス付き） — null 安全版 */
function formatYenWithUnit(n: number | null): string {
  if (n == null || isNaN(n)) return '-'
  return `${Math.round(n).toLocaleString('ja-JP')}円`
}

/** 通貨フォーマットの結果セット */
export interface CurrencyFormat {
  /** 数値のみ（"1,234,567" or "1,235"） */
  readonly format: CurrencyFormatter
  /** 単位付き（"1,234,567円" or "1,235千"） */
  readonly formatWithUnit: CurrencyFormatter
  /** 単位文字列（"円" or "千円"） */
  readonly unit: string
}

const YEN_FORMAT: CurrencyFormat = {
  format: formatCurrency,
  formatWithUnit: formatYenWithUnit,
  unit: '円',
}

const SEN_FORMAT: CurrencyFormat = {
  format: formatSenValue,
  formatWithUnit: formatSenWithUnit,
  unit: '千円',
}

/**
 * 通貨単位設定に連動するフォーマッタセットを返すフック。
 *
 * - format: サフィックスなし（KPIカード、テーブルセル用）
 * - formatWithUnit: サフィックス付き（ツールチップ、インライン表示用）
 * - unit: 単位文字列
 */
export function useCurrencyFormat(): CurrencyFormat {
  const currencyUnit = useUiStore((s) => s.currencyUnit)
  return currencyUnit === 'yen' ? YEN_FORMAT : SEN_FORMAT
}

/** グローバル設定に基づく通貨フォーマッタを返すフック（単位付き） */
export function useCurrencyFormatter(): (v: number) => string {
  const currencyUnit = useUiStore((s) => s.currencyUnit)
  return useMemo(() => (currencyUnit === 'yen' ? toYen : toSenYen), [currencyUnit])
}

/**
 * 千円軸用のコンパクトフォーマッタ。
 * 千円ベースの値を自動スケーリングする。
 * 例: 1500(千円) → "150万", 1500000(千円) → "15億"
 */
function toAxisSen(v: number): string {
  const yen = v * 1000
  return toAxisYen(yen)
}

/**
 * 通貨単位設定に連動する軸フォーマッタを返すフック。
 *
 * - 'yen' モード: toAxisYen（円ベースで千/万/億を自動切替）
 * - 'sen' モード: toAxisSen（千円ベースの値を万/億に変換）
 *
 * @example
 * const axisFormatter = useAxisFormatter()
 * <YAxis tickFormatter={axisFormatter} />
 */
export function useAxisFormatter(): (v: number) => string {
  const currencyUnit = useUiStore((s) => s.currencyUnit)
  return useMemo(() => (currencyUnit === 'yen' ? toAxisYen : toAxisSen), [currencyUnit])
}
