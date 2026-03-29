/**
 * CategoryTotalView ViewModel
 *
 * カテゴリ集計データの合計・構成比の計算ロジック。React 非依存。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import { calculateMarkupRate, calculateShare } from '@/domain/calculations/utils'

// ── 型定義 ──

export interface CategoryTotals {
  readonly totalCost: number
  readonly totalPrice: number
  readonly totalGrossProfit: number
  readonly overallMarkupRate: number
  readonly totalAbsCost: number
  readonly totalAbsPrice: number
}

export interface CategoryRowMetrics {
  readonly grossProfit: number
  readonly costShare: number
  readonly priceShare: number
}

// ── 計算ロジック ──

/** カテゴリデータの合計指標を計算する */
export function computeCategoryTotals(
  categoryData: readonly { cost: number; price: number }[],
): CategoryTotals {
  const totalCost = categoryData.reduce((s, c) => s + c.cost, 0)
  const totalPrice = categoryData.reduce((s, c) => s + c.price, 0)
  const totalGrossProfit = totalPrice - totalCost
  const overallMarkupRate = calculateMarkupRate(totalGrossProfit, totalPrice)
  const totalAbsCost = categoryData.reduce((s, c) => s + Math.abs(c.cost), 0)
  const totalAbsPrice = categoryData.reduce((s, c) => s + Math.abs(c.price), 0)
  return { totalCost, totalPrice, totalGrossProfit, overallMarkupRate, totalAbsCost, totalAbsPrice }
}

/** 個別カテゴリ行の導出指標を計算する */
export function computeRowMetrics(
  cost: number,
  price: number,
  totalAbsCost: number,
  totalAbsPrice: number,
): CategoryRowMetrics {
  const grossProfit = price - cost
  const costShare = calculateShare(Math.abs(cost), totalAbsCost)
  const priceShare = calculateShare(Math.abs(price), totalAbsPrice)
  return { grossProfit, costShare, priceShare }
}

/** 店舗別の粗利・値入率を計算する */
export function computeStoreGrossProfit(
  storeCost: number,
  storePrice: number,
): { grossProfit: number; markupRate: number } {
  const grossProfit = storePrice - storeCost
  const markupRate = calculateMarkupRate(grossProfit, storePrice)
  return { grossProfit, markupRate }
}
