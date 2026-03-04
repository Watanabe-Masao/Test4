/** 消耗品明細 */
export interface CostInclusionItem {
  readonly accountCode: string
  readonly itemCode: string
  readonly itemName: string
  readonly quantity: number
  readonly cost: number
}

/** 消耗品日別レコード */
export interface CostInclusionDailyRecord {
  readonly cost: number
  readonly items: readonly CostInclusionItem[]
}

/** ゼロ値の消耗品日別レコード */
export const ZERO_COST_INCLUSION_DAILY: CostInclusionDailyRecord = {
  cost: 0,
  items: [],
} as const
