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
 *
 * @param overflowDays 翌月から追加で取り込む日数（前年データ用）。
 *   同曜日オフセットにより月末付近の対応日が翌月にはみ出す場合に備え、
 *   翌月先頭の数日を拡張day番号（例: 2月28日の翌日→day 29）として保持する。
 */
export function processDiscount(
  rows: readonly unknown[][],
  targetMonth?: number,
  overflowDays: number = 0,
): DiscountData {
  if (rows.length < 3) return {}

  const result: Record<string, Record<number, { sales: number; discount: number; customers: number }>> = {}

  const columnMap = buildColumnMap(rows[0] as unknown[])

  // overflowDays > 0 の場合、対象月の日数を特定する（翌月データの拡張day算出用）
  let daysInTargetMonth = 0
  if (targetMonth != null && overflowDays > 0) {
    for (let row = 2; row < rows.length; row++) {
      const d = parseDate((rows[row] as unknown[])[0])
      if (d && d.getMonth() + 1 === targetMonth) {
        daysInTargetMonth = new Date(d.getFullYear(), targetMonth, 0).getDate()
        break
      }
    }
  }
  const nextMonth = targetMonth != null ? (targetMonth % 12) + 1 : 0

  // データ行処理（行2以降）
  for (let row = 2; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const date = parseDate(r[0])
    if (date == null) continue

    let day: number
    if (targetMonth == null) {
      day = date.getDate()
    } else {
      const dateMonth = date.getMonth() + 1
      if (dateMonth === targetMonth) {
        day = date.getDate()
      } else if (
        overflowDays > 0 &&
        daysInTargetMonth > 0 &&
        dateMonth === nextMonth &&
        date.getDate() <= overflowDays
      ) {
        // 翌月先頭を拡張day番号として取り込む（例: 3/1 → day 29）
        day = daysInTargetMonth + date.getDate()
      } else {
        continue
      }
    }

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
