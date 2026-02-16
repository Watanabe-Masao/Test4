import { safeDivide } from './utils'

/**
 * 在庫法（Inventory Method）計算
 *
 * スコープ: 全売上・全仕入（花・産直含む全体）
 * 目的: 実際の在庫実績に基づく会計的な粗利を算出
 */

/** 在庫法の入力パラメータ */
export interface InvMethodInput {
  readonly openingInventory: number | null // 期首在庫
  readonly closingInventory: number | null // 期末在庫
  readonly totalPurchaseCost: number // 総仕入原価
  readonly totalSales: number // 総売上高
}

/** 在庫法の計算結果 */
export interface InvMethodResult {
  readonly cogs: number | null // 売上原価
  readonly grossProfit: number | null // 粗利益
  readonly grossProfitRate: number | null // 粗利率
}

/**
 * 在庫法による実績粗利を計算する
 *
 * 売上原価 = 期首在庫 + 総仕入高 - 期末在庫
 * 粗利益   = 売上高 - 売上原価
 * 粗利率   = 粗利益 / 売上高
 */
export function calculateInvMethod(input: InvMethodInput): InvMethodResult {
  const { openingInventory, closingInventory, totalPurchaseCost, totalSales } = input

  // 期首/期末在庫が不明な場合は計算不可
  if (openingInventory == null || closingInventory == null) {
    return { cogs: null, grossProfit: null, grossProfitRate: null }
  }

  const cogs = openingInventory + totalPurchaseCost - closingInventory
  const grossProfit = totalSales - cogs
  const grossProfitRate = safeDivide(grossProfit, totalSales, 0)

  return { cogs, grossProfit, grossProfitRate }
}
