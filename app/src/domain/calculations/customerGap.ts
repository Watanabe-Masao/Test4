/**
 * 前年比客数GAP 計算
 *
 * 客数変動では説明できない、1人あたり購買行動の変化を数値化する。
 *
 * - 点数客数GAP = 点数前年比 − 客数前年比
 * - 金額客数GAP = 金額前年比 − 客数前年比
 *
 * 例: 客数100%、点数95% → 点数客数GAP = ▲5%
 *   「客数は同じだが、1人あたりの買上点数が5%減少した」
 *
 * @see references/01-principles/customer-gap-definition.md
 * @see references/01-principles/calculation-canonicalization-map.md
 */
import { z } from 'zod'
import { safeDivide } from './utils'

// ── 入力契約 ──

export interface CustomerGapInput {
  /** 当期客数 */
  readonly curCustomers: number
  /** 前期客数 */
  readonly prevCustomers: number
  /** 当期販売点数 */
  readonly curQuantity: number
  /** 前期販売点数 */
  readonly prevQuantity: number
  /** 当期売上金額 */
  readonly curSales: number
  /** 前期売上金額 */
  readonly prevSales: number
}

export const CustomerGapInputSchema = z.object({
  curCustomers: z.number(),
  prevCustomers: z.number(),
  curQuantity: z.number(),
  prevQuantity: z.number(),
  curSales: z.number(),
  prevSales: z.number(),
})

// ── 出力契約 ──

export interface CustomerGapResult {
  /** 客数前年比（小数: 1.0 = 100%） */
  readonly customerYoY: number
  /** 点数前年比（小数: 1.0 = 100%） */
  readonly quantityYoY: number
  /** 金額前年比（小数: 1.0 = 100%） */
  readonly salesYoY: number
  /** 点数客数GAP = 点数前年比 − 客数前年比（小数: -0.05 = ▲5%） */
  readonly quantityCustomerGap: number
  /** 金額客数GAP = 金額前年比 − 客数前年比（小数: -0.05 = ▲5%） */
  readonly amountCustomerGap: number
}

export const CustomerGapResultSchema = z.object({
  customerYoY: z.number(),
  quantityYoY: z.number(),
  salesYoY: z.number(),
  quantityCustomerGap: z.number(),
  amountCustomerGap: z.number(),
})

// ── 計算関数 ──

/**
 * 前年比客数GAPを計算する。
 *
 * 前期の客数・点数・金額のいずれかが 0 の場合は null を返す
 * （0除算防止 + 意味のない GAP 値を表示しない）。
 */
export function calculateCustomerGap(input: CustomerGapInput): CustomerGapResult | null {
  const { curCustomers, prevCustomers, curQuantity, prevQuantity, curSales, prevSales } = input

  // 前期データが不足 → 計算不可
  if (prevCustomers <= 0 || prevQuantity <= 0 || prevSales <= 0) {
    return null
  }

  const customerYoY = safeDivide(curCustomers, prevCustomers, 0)
  const quantityYoY = safeDivide(curQuantity, prevQuantity, 0)
  const salesYoY = safeDivide(curSales, prevSales, 0)

  return {
    customerYoY,
    quantityYoY,
    salesYoY,
    quantityCustomerGap: quantityYoY - customerYoY,
    amountCustomerGap: salesYoY - customerYoY,
  }
}
