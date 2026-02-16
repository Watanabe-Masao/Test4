/** 消耗品明細 */
export interface ConsumableItem {
  readonly accountCode: string
  readonly itemCode: string
  readonly itemName: string
  readonly quantity: number
  readonly cost: number
}

/** 消耗品日別レコード */
export interface ConsumableDailyRecord {
  readonly cost: number
  readonly items: readonly ConsumableItem[]
}

/** ゼロ値の消耗品日別レコード */
export const ZERO_CONSUMABLE_DAILY: ConsumableDailyRecord = {
  cost: 0,
  items: [],
} as const
