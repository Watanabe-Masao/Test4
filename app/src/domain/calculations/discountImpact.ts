/**
 * @responsibility R:unclassified
 */

import { z } from 'zod'
import { safeDivide } from './utils'
import type { CalculationResult } from '@/domain/models/CalculationResult'
import { okResult, invalidResult } from '@/domain/models/CalculationResult'

/**
 * 売変影響分析
 *
 * @see references/01-principles/calculation-canonicalization-map.md — 必須分類
 * @see references/01-principles/discount-definition.md — 値引きの正本定義
 */

/** 売変影響の入力パラメータ */
export interface DiscountImpactInput {
  readonly coreSales: number
  readonly markupRate: number
  readonly discountRate: number
}

export const DiscountImpactInputSchema = z.object({
  coreSales: z.number(),
  markupRate: z.number(),
  discountRate: z.number(),
})

/** 売変影響の計算結果 */
export interface DiscountImpactResult {
  readonly discountLossCost: number
}

export const DiscountImpactResultSchema = z.object({
  discountLossCost: z.number(),
})

/**
 * 売変率の定義域を検証する
 *
 * 有効範囲: 0 ≤ discountRate < 1
 * - discountRate < 0: 業務上あり得ない（invalid）
 * - discountRate >= 1: 分母ゼロ（invalid）
 */
function validateDiscountRate(discountRate: number): readonly string[] {
  const warnings: string[] = []
  if (discountRate < 0) {
    warnings.push('calc_discount_rate_negative')
  }
  if (discountRate >= 1) {
    warnings.push('calc_discount_rate_out_of_domain')
  }
  return warnings
}

/**
 * 売変ロス原価を算出する（CalculationResult 版）
 *
 * 売変ロス原価 = (1 - 値入率) × コア売上 × 売変率 / (1 - 売変率)
 *
 * 売変（値引）によって失われた売価を、原価換算した金額。
 *
 * discountRate >= 1 または discountRate < 0 の場合は invalid を返す。
 */
export function calculateDiscountImpactWithStatus(
  input: DiscountImpactInput,
): CalculationResult<DiscountImpactResult> {
  const { coreSales, markupRate, discountRate } = input
  const warnings = validateDiscountRate(discountRate)

  if (warnings.length > 0) {
    return invalidResult(warnings)
  }

  const discountLossCost =
    (1 - markupRate) * coreSales * safeDivide(discountRate, 1 - discountRate, 0)

  return okResult({ discountLossCost })
}

/**
 * 売変ロス原価を算出する（後方互換）
 *
 * @deprecated calculateDiscountImpactWithStatus を使用してください
 * @expiresAt 2026-12-31
 * @sunsetCondition 全 caller が calculateDiscountImpactWithStatus 版に移行し、本関数の参照が 0 になった時
 * @reason 結果値のみ返す旧 API。WithStatus 版は status/issue 情報を含むため、エラー処理品質が向上する
 */
/** @calc-id CALC-013 */
export function calculateDiscountImpact(input: DiscountImpactInput): DiscountImpactResult {
  const result = calculateDiscountImpactWithStatus(input)
  if (result.value != null) {
    return result.value
  }
  // 後方互換: invalid 時は従来の safeDivide fallback を使用
  const { coreSales, markupRate, discountRate } = input
  const discountLossCost =
    (1 - markupRate) * coreSales * safeDivide(discountRate, 1 - discountRate, discountRate)
  return { discountLossCost }
}
