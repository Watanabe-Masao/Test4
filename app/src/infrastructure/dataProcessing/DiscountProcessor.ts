import { parseDate } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'

/** 売変パース結果: storeId → day → { sales, discount } */
export interface DiscountData {
  readonly [storeId: string]: {
    readonly [day: number]: { readonly sales: number; readonly discount: number }
  }
}

/**
 * 売変データを処理する
 *
 * 行0: 店舗コード（"NNNN:店舗名" Col3〜、2列ペア）
 * 行2+: データ行（Col0: 日付, 偶数列: 売上金額, 奇数列: 売変額）
 * 売変額は絶対値で格納
 */
export function processDiscount(rows: readonly unknown[][], targetMonth?: number): DiscountData {
  if (rows.length < 3) return {}

  const result: Record<string, Record<number, { sales: number; discount: number }>> = {}

  // ヘッダー解析
  const columnMap: { storeId: string; salesCol: number; discountCol: number }[] = []
  for (let col = 3; col < (rows[0] as unknown[]).length; col += 2) {
    const stoStr = String((rows[0] as unknown[])[col] ?? '')
    const stoMatch = stoStr.match(/(\d{4}):/)
    if (stoMatch) {
      const storeId = String(parseInt(stoMatch[1]))
      columnMap.push({ storeId, salesCol: col, discountCol: col + 1 })
    }
  }

  // データ行処理（行2以降）
  for (let row = 2; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const date = parseDate(r[0])
    if (date == null) continue
    if (targetMonth != null && date.getMonth() + 1 !== targetMonth) continue
    const day = date.getDate()

    for (const { storeId, salesCol, discountCol } of columnMap) {
      const sales = safeNumber(r[salesCol])
      const discount = Math.abs(safeNumber(r[discountCol]))
      if (sales === 0) continue // 売上0の行はスキップ

      if (!result[storeId]) result[storeId] = {}
      result[storeId][day] = { sales, discount }
    }
  }

  return result
}
