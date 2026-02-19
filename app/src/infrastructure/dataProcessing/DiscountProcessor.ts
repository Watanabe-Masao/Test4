import { parseDate } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { DiscountData } from '@/domain/models'

export type { DiscountData } from '@/domain/models'

/**
 * ヘッダー行(row0)から店舗列マップを構築する。
 * 2列ペア（販売金額, 売変）と 3列ペア（販売金額, 売変, 客数）の両方に対応。
 */
function buildColumnMap(headerRow: readonly unknown[]): {
  storeId: string
  salesCol: number
  discountCol: number
  customersCol: number | null
}[] {
  // まず全ての店舗コード列を検出
  const storeCols: { col: number; storeId: string }[] = []
  for (let col = 3; col < headerRow.length; col++) {
    const cellStr = String(headerRow[col] ?? '')
    const match = cellStr.match(/(\d{4}):/)
    if (match) {
      storeCols.push({ col, storeId: String(parseInt(match[1])) })
    }
  }

  if (storeCols.length === 0) return []

  // ストライド検出: 2店舗以上あれば差分で判定、1店舗の場合はヘッダー長で推定
  const stride = storeCols.length >= 2
    ? storeCols[1].col - storeCols[0].col
    : (headerRow.length - storeCols[0].col) >= 3 ? 3 : 2

  return storeCols.map(({ col, storeId }) => ({
    storeId,
    salesCol: col,
    discountCol: col + 1,
    customersCol: stride >= 3 ? col + 2 : null,
  }))
}

/**
 * 売変データを処理する
 *
 * 行0: 店舗コード（"NNNN:店舗名" Col3〜）
 * 行2+: データ行（販売金額, 売変額 [, 来店客数]）
 *
 * 2列ペア (旧形式: 販売金額, 売変) と
 * 3列ペア (新形式: 販売金額, 売変, 来店客数) の両方をサポート
 */
export function processDiscount(rows: readonly unknown[][], targetMonth?: number): DiscountData {
  if (rows.length < 3) return {}

  const result: Record<string, Record<number, { sales: number; discount: number; customers: number }>> = {}

  const columnMap = buildColumnMap(rows[0] as unknown[])

  // データ行処理（行2以降）
  for (let row = 2; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const date = parseDate(r[0])
    if (date == null) continue
    if (targetMonth != null && date.getMonth() + 1 !== targetMonth) continue
    const day = date.getDate()

    for (const { storeId, salesCol, discountCol, customersCol } of columnMap) {
      const sales = safeNumber(r[salesCol])
      const discount = Math.abs(safeNumber(r[discountCol]))
      const customers = customersCol != null ? safeNumber(r[customersCol]) : 0
      if (sales === 0) continue // 売上0の行はスキップ

      if (!result[storeId]) result[storeId] = {}
      result[storeId][day] = { sales, discount, customers }
    }
  }

  return result
}
