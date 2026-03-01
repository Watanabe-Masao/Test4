/** 予算データ */
export interface BudgetData {
  readonly storeId: string
  readonly daily: ReadonlyMap<number, number> // day → 予算金額
  readonly total: number
}

/** 在庫設定 */
export interface InventoryConfig {
  readonly storeId: string
  readonly openingInventory: number | null // 機首在庫（全体）
  readonly closingInventory: number | null // 期末在庫（消耗品込） = productInventory + consumableInventory
  readonly grossProfitBudget: number | null
  readonly productInventory: number | null // 商品在庫
  readonly consumableInventory: number | null // 消耗品在庫
  readonly inventoryDate: string | null // 在庫基準日（YYYY/M/D 形式、ヘッダから取得）
  readonly closingInventoryDay: number | null // 期末在庫日付（何日時点か、null=月末）
}
