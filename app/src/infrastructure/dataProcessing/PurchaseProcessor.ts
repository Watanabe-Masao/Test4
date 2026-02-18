import { getDayOfMonth } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { PurchaseData } from '@/domain/models'

export type { PurchaseData } from '@/domain/models'

/** 既知の店舗IDセット */
type StoreSet = ReadonlySet<string>

/**
 * 仕入データを処理する
 *
 * 行0: 取引先コード（"NNNNNNN:取引先名" Col3〜、2列ペア）
 * 行1: 店舗コード（"NNNN:店舗名" Col3〜）
 * 行4+: データ行（Col0: 日付, Col3+: 原価/売価ペア）
 */
export function processPurchase(rows: readonly unknown[][], stores: StoreSet): PurchaseData {
  if (rows.length < 5) return {}

  const result: Record<string, Record<number, { suppliers: Record<string, { name: string; cost: number; price: number }>; total: { cost: number; price: number } }>> = {}

  // ヘッダー解析: 列→(取引先コード, 店舗ID)のマッピング
  const columnMap: { col: number; supplierCode: string; supplierName: string; storeId: string }[] = []

  for (let col = 3; col < (rows[0] as unknown[]).length; col += 2) {
    const supStr = String((rows[0] as unknown[])[col] ?? '')
    const stoStr = String((rows[1] as unknown[])[col] ?? '')

    const supMatch = supStr.match(/(\d{7})/)
    const stoMatch = stoStr.match(/(\d{4}):/)
    if (!supMatch || !stoMatch) continue

    const supplierCode = supMatch[1]
    const supplierName = supStr.replace(/^\d{7}:?/, '').trim() || supplierCode
    const storeId = String(parseInt(stoMatch[1]))

    if (!stores.has(storeId)) continue

    columnMap.push({ col, supplierCode, supplierName, storeId })
  }

  // データ行処理
  for (let row = 4; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const day = getDayOfMonth(r[0])
    if (day == null) continue

    for (const { col, supplierCode, supplierName, storeId } of columnMap) {
      const cost = safeNumber(r[col])
      const price = safeNumber(r[col + 1])
      if (cost === 0 && price === 0) continue

      if (!result[storeId]) result[storeId] = {}
      if (!result[storeId][day]) {
        result[storeId][day] = { suppliers: {}, total: { cost: 0, price: 0 } }
      }

      const dayData = result[storeId][day]
      if (!dayData.suppliers[supplierCode]) {
        dayData.suppliers[supplierCode] = { name: supplierName, cost: 0, price: 0 }
      }

      const sup = dayData.suppliers[supplierCode] as { name: string; cost: number; price: number }
      sup.cost += cost
      sup.price += price
      ;(dayData.total as { cost: number; price: number }).cost += cost
      ;(dayData.total as { cost: number; price: number }).price += price
    }
  }

  return result
}

/**
 * 仕入データから店舗一覧を抽出する
 */
export function extractStoresFromPurchase(rows: readonly unknown[][]): Map<string, { id: string; code: string; name: string }> {
  const stores = new Map<string, { id: string; code: string; name: string }>()
  if (rows.length < 2) return stores

  for (let col = 3; col < (rows[1] as unknown[]).length; col += 2) {
    const stoStr = String((rows[1] as unknown[])[col] ?? '')
    const stoMatch = stoStr.match(/(\d{4}):(.*)/)
    if (stoMatch) {
      const code = stoMatch[1]
      const id = String(parseInt(code))
      const name = stoMatch[2].trim() || code
      if (!stores.has(id)) {
        stores.set(id, { id, code, name })
      }
    }
  }

  return stores
}

/**
 * 仕入データから取引先一覧を抽出する
 */
export function extractSuppliersFromPurchase(rows: readonly unknown[][]): Map<string, { code: string; name: string }> {
  const suppliers = new Map<string, { code: string; name: string }>()
  if (rows.length < 1) return suppliers

  for (let col = 3; col < (rows[0] as unknown[]).length; col += 2) {
    const supStr = String((rows[0] as unknown[])[col] ?? '')
    const supMatch = supStr.match(/(\d{7})/)
    if (supMatch) {
      const code = supMatch[1]
      const name = supStr.replace(/^\d{7}:?/, '').trim() || code
      if (!suppliers.has(code)) {
        suppliers.set(code, { code, name })
      }
    }
  }

  return suppliers
}
