/** 予算データ */
export interface BudgetData {
  readonly storeId: string
  readonly daily: ReadonlyMap<number, number> // day → 予算金額
  readonly total: number
}

/** 在庫設定 */
export interface InventoryConfig {
  readonly storeId: string
  readonly openingInventory: number | null
  readonly closingInventory: number | null
  readonly grossProfitBudget: number | null
}
