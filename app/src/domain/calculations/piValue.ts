/**
 * PI値（Purchase Incidence）計算
 *
 * 来店客1,000人あたりの購買指標。
 * 店舗間・カテゴリ間の比較に使用される標準化指標。
 *
 * - 点数PI値 = (販売点数 ÷ 来店客数) × 1,000
 * - 金額PI値 = (売上金額 ÷ 来店客数) × 1,000
 *
 * 不変条件: 客単価 = (点数PI値 / 1,000) × 点単価
 *
 * @see references/01-principles/pi-value-definition.md
 * @see references/01-principles/calculation-canonicalization-map.md
 */
import { z } from 'zod'
import { safeDivide } from './utils'
import { PI_MULTIPLIER } from '@/domain/constants'

// ── 入力契約 ──

export interface PIValueInput {
  /** 販売点数 */
  readonly totalQuantity: number
  /** 売上金額 */
  readonly totalSales: number
  /** 来店客数 */
  readonly customers: number
}

export const PIValueInputSchema = z.object({
  totalQuantity: z.number(),
  totalSales: z.number(),
  customers: z.number(),
})

// ── 出力契約 ──

export interface PIValueResult {
  /** 点数PI値 = (販売点数 ÷ 来店客数) × 1,000 */
  readonly quantityPI: number
  /** 金額PI値 = (売上金額 ÷ 来店客数) × 1,000 */
  readonly amountPI: number
}

export const PIValueResultSchema = z.object({
  quantityPI: z.number(),
  amountPI: z.number(),
})

// ── 計算関数 ──

/**
 * 点数PI値を計算する。
 *
 * 点数PI値 = (販売点数 ÷ 来店客数) × 1,000
 * 客数が 0 の場合は 0 を返す。
 */
export function calculateQuantityPI(totalQuantity: number, customers: number): number {
  return safeDivide(totalQuantity, customers, 0) * PI_MULTIPLIER
}

/**
 * 金額PI値を計算する。
 *
 * 金額PI値 = (売上金額 ÷ 来店客数) × 1,000
 * 客数が 0 の場合は 0 を返す。
 */
export function calculateAmountPI(totalSales: number, customers: number): number {
  return safeDivide(totalSales, customers, 0) * PI_MULTIPLIER
}

/**
 * PI値を一括計算する。
 */
export function calculatePIValues(input: PIValueInput): PIValueResult {
  return {
    quantityPI: calculateQuantityPI(input.totalQuantity, input.customers),
    amountPI: calculateAmountPI(input.totalSales, input.customers),
  }
}
