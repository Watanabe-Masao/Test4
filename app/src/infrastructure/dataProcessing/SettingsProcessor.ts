import { safeNumber } from '@/domain/calculations/utils'
import type { InventoryConfig } from '@/domain/models'

/**
 * 初期設定データを処理する
 *
 * 行0: ヘッダー
 * 行1+: Col0: 店舗コード, Col1: 期首在庫, Col2: 期末在庫, Col3: 月間粗利額予算
 */
export function processSettings(
  rows: readonly unknown[][],
): Map<string, InventoryConfig> {
  const result = new Map<string, InventoryConfig>()
  if (rows.length < 2) return result

  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const storeCode = r[0]
    if (storeCode == null || String(storeCode).trim() === '') continue

    const storeId = String(parseInt(String(storeCode)))
    const openingInventory = safeNumber(r[1])
    const closingInventory = safeNumber(r[2])
    const gpBudget = safeNumber(r[3])

    result.set(storeId, {
      storeId,
      openingInventory: openingInventory || null,
      closingInventory: closingInventory || null,
      grossProfitBudget: gpBudget > 0 ? gpBudget : null,
    })
  }

  return result
}
