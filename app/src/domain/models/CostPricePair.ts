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
