import { getDayOfMonth } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { SpecialSalesData } from '@/domain/models'

export type { SpecialSalesData } from '@/domain/models'

/**
 * 花・産直データを処理する
 *
 * 行0: 店舗コード（"NNNN:店舗名" Col3〜、2列ペア）
 * 行1: メトリクスラベル行（"販売金額", "来店客数" 等）
 * 行2: 空 or 集計ラベル
 * 行3+: データ行（Col0: 日付, Col3+: 2列ペア [販売金額, 来店客数]）
 *
 * 原価 = Math.round(売価 × 掛け率)
 *
 * @param rows パース済み2次元配列
 * @param costRate 原価掛け率
 * @param readCustomers true=2列目を来店客数として読む（花ファイル用）
 */
export function processSpecialSales(
  rows: readonly unknown[][],
  costRate: number,
  readCustomers: boolean = false,
): SpecialSalesData {
  if (rows.length < 4) return {}

  const result: Record<string, Record<number, { price: number; cost: number; customers?: number }>> = {}

  // ヘッダー解析（2列ペア: 販売金額 | 来店客数）
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
      const customers = readCustomers ? safeNumber(r[col + 1]) : 0

      // 金額も客数も0ならスキップ
      if (price === 0 && customers === 0) continue

      const cost = Math.round(price * costRate)

      if (!result[storeId]) result[storeId] = {}
      if (!result[storeId][day]) {
        result[storeId][day] = readCustomers
          ? { price: 0, cost: 0, customers: 0 }
          : { price: 0, cost: 0 }
      }

      const dayData = result[storeId][day] as { price: number; cost: number; customers?: number }
      dayData.price += price
      dayData.cost += cost
      if (readCustomers) {
        dayData.customers = (dayData.customers ?? 0) + customers
      }
    }
  }

  return result
}
