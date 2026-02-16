import { safeDivide } from './utils'

/**
 * 推定法（Estimation Method）計算
 *
 * スコープ: 在庫販売のみ（花・産直除外）
 * 目的: 推定期末在庫の算出基礎。実粗利ではなく在庫推定指標。
 *       推定在庫と実績在庫を比較し、見えない損失・異常を検知するために使用。
 */

/** 推定法の入力パラメータ */
export interface EstMethodInput {
  readonly coreSales: number // コア売上（花・産直・売上納品除外）
  readonly discountRate: number // 売変率
  readonly markupRate: number // 値入率
  readonly consumableCost: number // 消耗品費
  readonly openingInventory: number | null // 期首在庫（在庫販売分）
  readonly inventoryPurchaseCost: number // 期中仕入原価（在庫販売分、花・産直除外）
}

/** 推定法の計算結果 */
export interface EstMethodResult {
  readonly grossSales: number // 粗売上（売変前売価）
  readonly cogs: number // 推定原価
  readonly margin: number // 推定マージン ※実粗利ではない
  readonly marginRate: number // 推定マージン率 ※実粗利率ではない
  readonly closingInventory: number | null // 推定期末在庫
}

/**
 * 推定法による在庫推定指標を計算する
 *
 * 粗売上   = コア売上 / (1 - 売変率)
 * 推定原価 = 粗売上 × (1 - 値入率) + 消耗品費
 * 推定マージン = コア売上 - 推定原価
 * 推定マージン率 = 推定マージン / コア売上
 * 推定期末在庫 = 期首在庫 + 期中仕入原価(在庫販売分) - 推定原価
 */
export function calculateEstMethod(input: EstMethodInput): EstMethodResult {
  const {
    coreSales,
    discountRate,
    markupRate,
    consumableCost,
    openingInventory,
    inventoryPurchaseCost,
  } = input

  // 粗売上 = コア売上 / (1 - 売変率)
  // 売変率が1の場合はコア売上をそのまま使用
  const divisor = 1 - discountRate
  const grossSales = divisor > 0 ? coreSales / divisor : coreSales

  // 推定原価 = 粗売上 × (1 - 値入率) + 消耗品費
  const cogs = grossSales * (1 - markupRate) + consumableCost

  // 推定マージン = コア売上 - 推定原価
  const margin = coreSales - cogs

  // 推定マージン率 = 推定マージン / コア売上
  const marginRate = safeDivide(margin, coreSales, 0)

  // 推定期末在庫 = 期首在庫 + 期中仕入原価(在庫販売分) - 推定原価
  const closingInventory =
    openingInventory != null ? openingInventory + inventoryPurchaseCost - cogs : null

  return { grossSales, cogs, margin, marginRate, closingInventory }
}

/**
 * コア売上を算出する
 *
 * コア売上 = 総売上 - 花売価 - 産直売価
 * ※ 現時点では「売上納品 = 花 + 産直」のため、上記で売上納品も除外される
 */
export function calculateCoreSales(
  totalSales: number,
  flowerSalesPrice: number,
  directProduceSalesPrice: number,
): { coreSales: number; isOverDelivery: boolean; overDeliveryAmount: number } {
  let coreSales = totalSales - flowerSalesPrice - directProduceSalesPrice
  let isOverDelivery = false
  let overDeliveryAmount = 0

  if (coreSales < 0) {
    isOverDelivery = true
    overDeliveryAmount = -coreSales
    coreSales = 0
  }

  return { coreSales, isOverDelivery, overDeliveryAmount }
}

/**
 * 売変率を算出する
 *
 * 売変率 = 売変額 / (売上 + 売変額)
 */
export function calculateDiscountRate(salesAmount: number, discountAmount: number): number {
  return safeDivide(discountAmount, salesAmount + discountAmount, 0)
}
