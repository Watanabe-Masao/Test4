import { getDayOfMonth } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'

/** 花/産直パース結果: storeId → day → { price, cost } */
export interface SpecialSalesData {
  readonly [storeId: string]: {
    readonly [day: number]: { readonly price: number; readonly cost: number }
  }
}

/**
 * 花・産直データを処理する
 *
 * 行0: 店舗コード（"NNNN:店舗名" Col3〜、2列ペア）
 * 行3+: データ行（Col0: 日付, Col3+: 売価金額）
 * 原価 = Math.round(売価 × 掛け率)
 */
export function processSpecialSales(
  rows: readonly unknown[][],
  costRate: number,
): SpecialSalesData {
  if (rows.length < 4) return {}

  const result: Record<string, Record<number, { price: number; cost: number }>> = {}

  // ヘッダー解析
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
      const price = safeNumber(r[col])
      if (price === 0) continue

      const cost = Math.round(price * costRate)

      if (!result[storeId]) result[storeId] = {}
      if (!result[storeId][day]) result[storeId][day] = { price: 0, cost: 0 }

      const dayData = result[storeId][day] as { price: number; cost: number }
      dayData.price += price
      dayData.cost += cost
    }
  }

  return result
}
