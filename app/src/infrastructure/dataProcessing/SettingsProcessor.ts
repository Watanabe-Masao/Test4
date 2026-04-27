/**
 * @responsibility R:unclassified
 */

import { safeNumber } from '@/domain/calculations/utils'
import type { InventoryConfig } from '@/domain/models/record'

/** セルが数値として有効かどうか判定（空欄・null と 0 を区別） */
function isNumericCell(value: unknown): boolean {
  if (value == null) return false
  const s = String(value).trim()
  if (s === '') return false
  return !isNaN(Number(s))
}

/**
 * ヘッダー行 A1 から在庫基準日を取得する。
 * Excel から読み取った値は Date オブジェクト、シリアル値、または "2026/2/1" 等の文字列になりうる。
 */
function parseInventoryDate(headerRow: readonly unknown[]): string | null {
  const cell = headerRow[0]
  if (cell == null) return null

  // Date オブジェクト（xlsx パーサーが変換済み）
  if (cell instanceof Date) {
    const y = cell.getFullYear()
    const m = cell.getMonth() + 1
    const d = cell.getDate()
    return `${y}/${m}/${d}`
  }

  const s = String(cell).trim()
  if (s === '') return null

  // "2026/2/1" や "2026/02/01" 形式
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) return s

  // Excel シリアル値（数値）→ Date 変換
  const n = Number(s)
  if (!isNaN(n) && n > 40000 && n < 60000) {
    // Excel serial date → JS Date
    const epoch = new Date(1899, 11, 30) // Excel epoch
    const jsDate = new Date(epoch.getTime() + n * 86400000)
    const y = jsDate.getFullYear()
    const m = jsDate.getMonth() + 1
    const d = jsDate.getDate()
    return `${y}/${m}/${d}`
  }

  return null
}

/**
 * 初期設定データを処理する
 *
 * 新フォーマット:
 *   ヘッダー行: A=在庫基準日(2026/2/1), B=機首在庫, C=期末在庫（消耗品込）, D=粗利額予算, E=商品在庫, F=消耗品
 *   データ行:   A=店舗コード, B=機首在庫, C=期末在庫（消耗品込）, D=粗利額予算, E=商品在庫, F=消耗品
 *
 * 旧フォーマット（後方互換）:
 *   ヘッダー行: A=ヘッダー, B=期首在庫, C=期末在庫, D=月間粗利額予算
 *   データ行:   A=店舗コード, B=期首在庫, C=期末在庫, D=月間粗利額予算
 */
export function processSettings(rows: readonly unknown[][]): Map<string, InventoryConfig> {
  const result = new Map<string, InventoryConfig>()
  if (rows.length < 2) return result

  const header = rows[0] as unknown[]
  const inventoryDate = parseInventoryDate(header)

  // 新フォーマット判定: E列（商品在庫）またはF列（消耗品）にヘッダーまたはデータがあるか
  const hasNewFormat = detectNewFormat(rows)

  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const storeCode = r[0]
    if (storeCode == null || String(storeCode).trim() === '') continue

    const storeId = String(parseInt(String(storeCode)))
    const gpBudget = safeNumber(r[3])
    const openingInventory = isNumericCell(r[1]) ? safeNumber(r[1]) : null

    let productInventory: number | null = null
    let costInclusionInventory: number | null = null
    let closingInventory: number | null = null

    if (hasNewFormat) {
      // 新フォーマット: E=商品在庫, F=消耗品
      productInventory = isNumericCell(r[4]) ? safeNumber(r[4]) : null
      costInclusionInventory = isNumericCell(r[5]) ? safeNumber(r[5]) : null
      // 期末在庫（消耗品込）= 商品在庫 + 消耗品（自動計算）
      if (productInventory != null || costInclusionInventory != null) {
        closingInventory = (productInventory ?? 0) + (costInclusionInventory ?? 0)
      } else {
        // E/F列がないデータ行ではC列をフォールバック
        closingInventory = isNumericCell(r[2]) ? safeNumber(r[2]) : null
      }
    } else {
      // 旧フォーマット: C=期末在庫
      closingInventory = isNumericCell(r[2]) ? safeNumber(r[2]) : null
    }

    result.set(storeId, {
      storeId,
      openingInventory,
      closingInventory,
      grossProfitBudget: gpBudget > 0 ? gpBudget : null,
      productInventory,
      costInclusionInventory,
      inventoryDate,
      closingInventoryDay: null, // UIから設定される
    })
  }

  return result
}

/** 新フォーマット（E列/F列あり）かどうか判定 */
function detectNewFormat(rows: readonly unknown[][]): boolean {
  // ヘッダー行のE列に「商品在庫」等があるか
  const header = rows[0] as unknown[]
  if (header.length >= 5) {
    const e = String(header[4] ?? '').trim()
    if (e === '商品在庫' || e === '商品') return true
  }

  // データ行にE列に数値があるか
  for (let row = 1; row < Math.min(rows.length, 5); row++) {
    const r = rows[row] as unknown[]
    if (r.length >= 5 && isNumericCell(r[4])) return true
  }

  return false
}
