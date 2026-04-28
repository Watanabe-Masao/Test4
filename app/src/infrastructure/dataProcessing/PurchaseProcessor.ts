/**
 * @responsibility R:adapter
 */

import { parseDateComponents, monthKey } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { PurchaseData, PurchaseDayEntry } from '@/domain/models/record'

export type { PurchaseData } from '@/domain/models/record'

/** 既知の店舗IDセット */
type StoreSet = ReadonlySet<string>

/** 合計・小計パターン（取引先名に含まれる場合はスキップ） */
const SUBTOTAL_PATTERNS = ['合計', '小計', '計', 'total', 'subtotal']

function isSubtotalSupplier(name: string): boolean {
  const lower = name.toLowerCase().trim()
  return SUBTOTAL_PATTERNS.some((p) => lower === p || lower.endsWith(p))
}

/**
 * 仕入データを処理する（年月パーティション対応）
 *
 * 行0: 取引先コード（"NNNNNNN:取引先名" Col3〜、2列ペア）
 * 行1: 店舗コード（"NNNN:店舗名" Col3〜）
 * 行4+: データ行（Col0: 日付, Col3+: 原価/売価ペア）
 *
 * @returns 年月キー ("YYYY-M") をキーとする月別仕入データ
 */
export function processPurchase(
  rows: readonly unknown[][],
  stores: StoreSet,
): Record<string, PurchaseData> {
  if (rows.length < 5) return {}

  // 集約用の中間構造: monthKey → storeId → day → entry
  const partitioned: Record<
    string,
    Record<
      string,
      Record<
        number,
        {
          suppliers: Record<string, { name: string; cost: number; price: number }>
          total: { cost: number; price: number }
        }
      >
    >
  > = {}

  // ヘッダー解析: 列→(取引先コード, 店舗ID)のマッピング
  const columnMap: { col: number; supplierCode: string; supplierName: string; storeId: string }[] =
    []

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
    if (isSubtotalSupplier(supplierName)) continue

    columnMap.push({ col, supplierCode, supplierName, storeId })
  }

  if (columnMap.length === 0) return {}

  // データ行処理
  for (let row = 4; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const dc = parseDateComponents(r[0])
    if (dc == null) continue

    const mk = monthKey(dc.year, dc.month)
    if (!partitioned[mk]) partitioned[mk] = {}

    for (const { col, supplierCode, supplierName, storeId } of columnMap) {
      const cost = safeNumber(r[col])
      const price = safeNumber(r[col + 1])
      if (cost === 0 && price === 0) continue

      if (!partitioned[mk][storeId]) partitioned[mk][storeId] = {}
      if (!partitioned[mk][storeId][dc.day]) {
        partitioned[mk][storeId][dc.day] = { suppliers: {}, total: { cost: 0, price: 0 } }
      }

      const dayData = partitioned[mk][storeId][dc.day]
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

  // 中間構造をフラットレコード配列に変換
  const result: Record<string, PurchaseData> = {}
  for (const [mk, storeMap] of Object.entries(partitioned)) {
    const [yearStr, monthStr] = mk.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const records: PurchaseDayEntry[] = []
    for (const [storeId, dayMap] of Object.entries(storeMap)) {
      for (const [dayStr, entry] of Object.entries(dayMap)) {
        records.push({
          year,
          month,
          day: Number(dayStr),
          storeId,
          suppliers: entry.suppliers,
          total: entry.total,
        })
      }
    }
    result[mk] = { records }
  }

  return result
}

/**
 * 仕入データから店舗一覧を抽出する
 */
export function extractStoresFromPurchase(
  rows: readonly unknown[][],
): Map<string, { id: string; code: string; name: string }> {
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
export function extractSuppliersFromPurchase(
  rows: readonly unknown[][],
): Map<string, { code: string; name: string }> {
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
