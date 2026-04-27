/**
 * 予算データ
 *
 * @responsibility R:unclassified
 */
export interface BudgetData {
  readonly storeId: string
  readonly daily: ReadonlyMap<number, number> // day → 予算金額
  readonly total: number
}

/** 在庫設定 */
export interface InventoryConfig {
  readonly storeId: string
  readonly openingInventory: number | null // 機首在庫（全体）
  readonly closingInventory: number | null // 期末在庫（消耗品込） = productInventory + costInclusionInventory
  readonly grossProfitBudget: number | null
  readonly productInventory: number | null // 商品在庫
  readonly costInclusionInventory: number | null // 消耗品在庫
  readonly inventoryDate: string | null // 在庫基準日（YYYY/M/D 形式、ヘッダから取得）
  readonly closingInventoryDay: number | null // 期末在庫日付（何日時点か、null=月末）
  readonly flowerCostRate?: number // 店別花掛け率（undefined = グローバル設定を使用）
  readonly directProduceCostRate?: number // 店別産直掛け率（undefined = グローバル設定を使用）
}

const DEFAULT_INVENTORY_CONFIG: Omit<InventoryConfig, 'storeId'> = {
  openingInventory: null,
  closingInventory: null,
  grossProfitBudget: null,
  productInventory: null,
  costInclusionInventory: null,
  inventoryDate: null,
  closingInventoryDay: null,
}

/**
 * 既存在庫設定に部分更新を適用する純粋関数。
 *
 * 期末在庫（消耗品込）= 商品在庫 + 消耗品在庫 を自動計算する。
 */
export function mergeInventoryConfig(
  existing: InventoryConfig | undefined,
  storeId: string,
  update: Partial<InventoryConfig>,
): InventoryConfig {
  const base = existing ?? { storeId, ...DEFAULT_INVENTORY_CONFIG }
  const merged = { ...base, ...update }
  if (
    ('productInventory' in update || 'costInclusionInventory' in update) &&
    (merged.productInventory != null || merged.costInclusionInventory != null)
  ) {
    return {
      ...merged,
      closingInventory: (merged.productInventory ?? 0) + (merged.costInclusionInventory ?? 0),
    }
  }
  return merged
}
