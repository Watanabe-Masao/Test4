import { parseDate, getDayOfMonth } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { SalesData } from '@/domain/models'

export type { SalesData } from '@/domain/models'

/**
 * ヘッダー行から店舗列位置を検出する（2列/3列ペア自動対応）
 */
function detectStoreColumns(headerRow: readonly unknown[]): { col: number; storeId: string; stride: number }[] {
  const storeCols: { col: number; storeId: string }[] = []
  for (let col = 3; col < headerRow.length; col++) {
    const cellStr = String(headerRow[col] ?? '')
    const match = cellStr.match(/(\d{4}):/)
    if (match) {
      storeCols.push({ col, storeId: String(parseInt(match[1])) })
    }
  }

  if (storeCols.length === 0) return []

  const stride = storeCols.length >= 2
    ? storeCols[1].col - storeCols[0].col
    : (headerRow.length - storeCols[0].col) >= 3 ? 3 : 2

  return storeCols.map(({ col, storeId }) => ({ col, storeId, stride }))
}

/**
 * 売上データを処理する
 *
 * 行0: 店舗コード（"NNNN:店舗名" Col3〜）
 * 行3+: データ行（Col0: 日付, Col3+: 売上金額）
 *
 * targetMonth を指定すると、その月のデータのみ抽出する
 */
export function processSales(rows: readonly unknown[][], targetMonth?: number): SalesData {
  if (rows.length < 4) return {}

  const result: Record<string, Record<number, { sales: number; customers: number }>> = {}

  const columnMap = detectStoreColumns(rows[0] as unknown[])

  // データ行処理
  for (let row = 3; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    let day: number | null
    if (targetMonth != null) {
      const date = parseDate(r[0])
      if (date == null) continue
      if (date.getMonth() + 1 !== targetMonth) continue
      day = date.getDate()
    } else {
      day = getDayOfMonth(r[0])
    }
    if (day == null) continue

    for (const { col, storeId, stride } of columnMap) {
      const sales = safeNumber(r[col])
      // 3列ペアの場合: col=販売金額, col+1=売変, col+2=客数
      const customers = stride >= 3 ? safeNumber(r[col + 2]) : 0
      if (!result[storeId]) result[storeId] = {}
      result[storeId][day] = { sales, customers }
    }
  }

  return result
}

/**
 * 売上データから店舗一覧を抽出する（2列/3列ペア自動対応）
 */
export function extractStoresFromSales(rows: readonly unknown[][]): Map<string, { id: string; code: string; name: string }> {
  const stores = new Map<string, { id: string; code: string; name: string }>()
  if (rows.length < 1) return stores

  const headerRow = rows[0] as unknown[]
  for (let col = 3; col < headerRow.length; col++) {
    const stoStr = String(headerRow[col] ?? '')
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
