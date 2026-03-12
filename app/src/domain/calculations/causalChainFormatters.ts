/**
 * 因果チェーンのフォーマットヘルパーと型定義
 *
 * causalChain.ts から抽出した純粋関数群。
 * パーセント/通貨の基本フォーマットは domain/formatting に委譲。
 */
import { formatPercent, formatCurrency } from '@/domain/formatting'

/** セマンティックなカラーヒント。実際の色は Presentation 層で解決する。 */
export type ColorHint =
  | 'positive'
  | 'negative'
  | 'caution'
  | 'primary'
  | 'secondary'
  | 'info'
  | 'warning'

export interface CausalFactor {
  readonly label: string
  readonly value: number
  readonly formatted: string
  readonly colorHint: ColorHint
}

export interface CausalStep {
  readonly title: string
  readonly description: string
  readonly factors: readonly CausalFactor[]
  readonly maxFactorIndex: number
  readonly insight: string
}

/** パーセントフォーマット（formatPercent に委譲、デフォルト小数2位） */
export const fmtPct = (v: number, decimals = 2): string => formatPercent(v, decimals)

/** カンマ区切り数値（formatCurrency に委譲） */
export const fmtComma = (v: number): string => formatCurrency(v)

/** 円表記（符号付き） */
export function fmtYen(v: number): string {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${fmtComma(v)}円`
}

/** 差分のフォーマット（%表記、符号付き） */
export function fmtDelta(v: number): string {
  return `${v >= 0 ? '+' : ''}${fmtPct(v)}`
}

/** factors 配列内で最大 value のインデックスを返す */
export function findMaxFactorIndex(factors: readonly CausalFactor[]): number {
  if (factors.length === 0) return 0
  return factors.reduce((max, f, i) => (f.value > factors[max].value ? i : max), 0)
}
