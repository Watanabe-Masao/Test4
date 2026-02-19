import { parseDate } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { DiscountData } from '@/domain/models'

export type { DiscountData } from '@/domain/models'

/**
 * ヘッダー行(row0)から店舗列マップを構築する。
 * 2列ペア（販売金額, 売変）と 3列ペア（販売金額, 売変, 客数）の両方に対応。
 *
 * Excelのマージセル対応:
 *   xlsxライブラリはマージされた全セルに値を展開する場合がある。
 *   同一storeIdの連続列をグループ化し、グループの先頭列のみを使用する。
 */
function buildColumnMap(headerRow: readonly unknown[]): {
  storeId: string
  salesCol: number
  discountCol: number
  customersCol: number | null
}[] {
  // 全列をスキャンし、同一storeIdの連続列をグループ化
  const groups: { storeId: string; firstCol: number; lastCol: number }[] = []
  let prevStoreId: string | null = null

  for (let col = 3; col < headerRow.length; col++) {
    const cellStr = String(headerRow[col] ?? '')
    const match = cellStr.match(/(\d{4}):/)
    if (match) {
      const storeId = String(parseInt(match[1]))
      if (storeId === prevStoreId && groups.length > 0) {
        // 同一storeIdの連続 → グループ拡張
        groups[groups.length - 1].lastCol = col
      } else {
        // 新しい店舗グループ
        groups.push({ storeId, firstCol: col, lastCol: col })
      }
      prevStoreId = storeId
    } else {
      prevStoreId = null
    }
  }

  if (groups.length === 0) return []

  // ストライド検出: グループ間の距離、またはグループ幅から推定
  let stride: number
  if (groups.length >= 2) {
    stride = groups[1].firstCol - groups[0].firstCol
  } else {
    // 1店舗の場合: グループ幅で判定（マージセルの幅 = 列数）
    const groupWidth = groups[0].lastCol - groups[0].firstCol + 1
    if (groupWidth >= 3) {
      stride = 3
    } else if (groupWidth === 2) {
      stride = 2
    } else {
      // マージなし: 残り列数で推定
      stride = (headerRow.length - groups[0].firstCol) >= 3 ? 3 : 2
    }
  }

  return groups.map(({ storeId, firstCol }) => ({
    storeId,
    salesCol: firstCol,
    discountCol: firstCol + 1,
    customersCol: stride >= 3 ? firstCol + 2 : null,
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
