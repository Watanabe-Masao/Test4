import { safeDivide } from './utils'

/**
 * 売変影響分析
 */

/** 売変影響の入力パラメータ */
export interface DiscountImpactInput {
  readonly coreSales: number // コア売上
  readonly markupRate: number // 値入率
  readonly discountRate: number // 売変率
}

/** 売変影響の計算結果 */
export interface DiscountImpactResult {
  readonly discountLossCost: number // 売変ロス原価
}

/**
 * 売変ロス原価を算出する
 *
 * 売変ロス原価 = (1 - 値入率) × コア売上 × 売変率 / (1 - 売変率)
 *
 * 売変（値引）によって失われた売価を、原価換算した金額。
 */
export function calculateDiscountImpact(input: DiscountImpactInput): DiscountImpactResult {
  const { coreSales, markupRate, discountRate } = input

  const divisor = 1 - discountRate
  const discountLossCost =
    (1 - markupRate) * coreSales * safeDivide(discountRate, divisor > 0 ? divisor : 1, 0)

  return { discountLossCost }
}
