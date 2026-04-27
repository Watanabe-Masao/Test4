/**
 * 移動合計・コスト集計
 *
 * 正式な業務確定値を導出する Authoritative 関数。
 * 移動（店間入出・部門間入出）の売価・原価合計を計算する。
 *
 * @see references/01-principles/calculation-canonicalization-map.md — 必須分類
 * @see references/01-principles/purchase-cost-definition.md — 移動原価の性質
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'

/** 移動合計の入力（4方向の売価・原価） */
export interface TransferTotalsInput {
  readonly interStoreInPrice: number
  readonly interStoreInCost: number
  readonly interStoreOutPrice: number
  readonly interStoreOutCost: number
  readonly interDepartmentInPrice: number
  readonly interDepartmentInCost: number
  readonly interDepartmentOutPrice: number
  readonly interDepartmentOutCost: number
}

export const TransferTotalsInputSchema = z.object({
  interStoreInPrice: z.number(),
  interStoreInCost: z.number(),
  interStoreOutPrice: z.number(),
  interStoreOutCost: z.number(),
  interDepartmentInPrice: z.number(),
  interDepartmentInCost: z.number(),
  interDepartmentOutPrice: z.number(),
  interDepartmentOutCost: z.number(),
})

/** 移動合計の結果 */
export interface TransferTotalsResult {
  readonly transferPrice: number
  readonly transferCost: number
}

export const TransferTotalsResultSchema = z.object({
  transferPrice: z.number(),
  transferCost: z.number(),
})

/**
 * 移動の売価合計・原価合計を計算する
 *
 * transferPrice = interStoreIn.price + interStoreOut.price + interDeptIn.price + interDeptOut.price
 * transferCost  = interStoreIn.cost  + interStoreOut.cost  + interDeptIn.cost  + interDeptOut.cost
 */
export function calculateTransferTotals(input: TransferTotalsInput): TransferTotalsResult {
  const transferPrice =
    input.interStoreInPrice +
    input.interStoreOutPrice +
    input.interDepartmentInPrice +
    input.interDepartmentOutPrice
  const transferCost =
    input.interStoreInCost +
    input.interStoreOutCost +
    input.interDepartmentInCost +
    input.interDepartmentOutCost
  return { transferPrice, transferCost }
}

/**
 * 在庫仕入原価を計算する
 *
 * inventoryCost = totalCost - deliverySalesCost
 *
 * 総仕入原価から売上納品原価（花 + 産直）を除いたもの。
 */
export function calculateInventoryCost(totalCost: number, deliverySalesCost: number): number {
  return totalCost - deliverySalesCost
}
