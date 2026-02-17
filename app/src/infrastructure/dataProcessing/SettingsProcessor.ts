import { safeNumber } from '@/domain/calculations/utils'
import type { InventoryConfig } from '@/domain/models'

/** セルが数値として有効かどうか判定（空欄・null と 0 を区別） */
function isNumericCell(value: unknown): boolean {
  if (value == null) return false
  const s = String(value).trim()
  if (s === '') return false
  return !isNaN(Number(s))
}

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
    const gpBudget = safeNumber(r[3])

    result.set(storeId, {
      storeId,
      openingInventory: isNumericCell(r[1]) ? safeNumber(r[1]) : null,
      closingInventory: isNumericCell(r[2]) ? safeNumber(r[2]) : null,
      grossProfitBudget: gpBudget > 0 ? gpBudget : null,
    })
  }

  return result
}
