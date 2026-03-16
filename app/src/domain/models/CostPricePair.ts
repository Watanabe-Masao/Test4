import { safeDivide } from '../calculations/utils'

/** 原価・売価ペア */
export interface CostPricePair {
  readonly cost: number
  readonly price: number
}

/** ゼロ値の CostPricePair */
export const ZERO_COST_PRICE_PAIR: CostPricePair = { cost: 0, price: 0 } as const

/** 2つの CostPricePair を加算 */
export function addCostPricePairs(a: CostPricePair, b: CostPricePair): CostPricePair {
  return { cost: a.cost + b.cost, price: a.price + b.price }
}

// ── CostPricePair → 率への compose 関数 ──
// 下流はこれらを使って額から率を導出する。SQL/VM で率を直接計算しない（禁止事項 #10）。

/**
 * CostPricePair から値入率を算出する
 *
 * markupRate = (price - cost) / price
 * @returns 0〜1 のスケール。price=0 の場合 0
 */
export function markupRateOf(pair: CostPricePair): number {
  return safeDivide(pair.price - pair.cost, pair.price, 0)
}

/**
 * CostPricePair から原価率を算出する
 *
 * costRate = cost / price
 * @invariant costRate + markupRate = 1
 * @returns 0〜1 のスケール。price=0 の場合 0
 */
export function costRateOf(pair: CostPricePair): number {
  return safeDivide(pair.cost, pair.price, 0)
}

/**
 * CostPricePair から値入額（粗利益額）を算出する
 *
 * markup = price - cost
 */
export function markupAmountOf(pair: CostPricePair): number {
  return pair.price - pair.cost
}

/**
 * 複数の CostPricePair を集約して率を算出する
 *
 * 個別の率を平均するのではなく、額を合算してから率を算出する（加重平均）。
 * これにより全店合計・カテゴリ集約で正確な率が得られる。
 */
export function aggregateMarkupRate(pairs: readonly CostPricePair[]): number {
  const total = pairs.reduce(addCostPricePairs, ZERO_COST_PRICE_PAIR)
  return markupRateOf(total)
}
