import { getDayOfMonth } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'

/** 売上パース結果: storeId → day → { sales } */
export interface SalesData {
  readonly [storeId: string]: {
    readonly [day: number]: { readonly sales: number }
  }
}

/**
 * 売上データを処理する
 *
 * 行0: 店舗コード（"NNNN:店舗名" Col3〜、2列ペア）
 * 行3+: データ行（Col0: 日付, Col3+: 売上金額）
 */
export function processSales(rows: readonly unknown[][]): SalesData {
  if (rows.length < 4) return {}

  const result: Record<string, Record<number, { sales: number }>> = {}

  // ヘッダー解析: 列→店舗IDのマッピング
  const columnMap: { col: number; storeId: string }[] = []
  for (let col = 3; col < (rows[0] as unknown[]).length; col += 2) {
    const stoStr = String((rows[0] as unknown[])[col] ?? '')
    const stoMatch = stoStr.match(/(\d{4}):/)
    if (stoMatch) {
      const storeId = String(parseInt(stoMatch[1]))
      columnMap.push({ col, storeId })
    }
  }

  // データ行処理
  for (let row = 3; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const day = getDayOfMonth(r[0])
    if (day == null) continue

    for (const { col, storeId } of columnMap) {
      const sales = safeNumber(r[col])
      if (!result[storeId]) result[storeId] = {}
      result[storeId][day] = { sales }
    }
  }

  return result
}

/**
 * 売上データから店舗一覧を抽出する
 */
export function extractStoresFromSales(rows: readonly unknown[][]): Map<string, { id: string; code: string; name: string }> {
  const stores = new Map<string, { id: string; code: string; name: string }>()
  if (rows.length < 1) return stores

  for (let col = 3; col < (rows[0] as unknown[]).length; col += 2) {
    const stoStr = String((rows[0] as unknown[])[col] ?? '')
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
