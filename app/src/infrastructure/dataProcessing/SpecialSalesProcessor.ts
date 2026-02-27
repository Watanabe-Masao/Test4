import { parseDateComponents, monthKey } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { SpecialSalesData } from '@/domain/models'

export type { SpecialSalesData } from '@/domain/models'

/**
 * 花・産直データを処理する（年月パーティション対応）
 *
 * 行0: 店舗コード（"NNNN:店舗名" Col3〜、2列ペア）
 * 行3+: データ行（Col0: 日付, Col3+: 売価金額 [, 来店客数]）
 * 原価 = Math.round(売価 × 掛け率)
 *
 * @param readCustomers true の場合、ペアの2列目を来店客数として読み込む（花ファイル用）
 * @returns 年月キー ("YYYY-M") をキーとする月別データ
 */
export function processSpecialSales(
  rows: readonly unknown[][],
  costRate: number,
  readCustomers: boolean = false,
): Record<string, SpecialSalesData> {
  if (rows.length < 4) return {}

  const partitioned: Record<
    string,
    Record<string, Record<number, { price: number; cost: number; customers?: number }>>
  > = {}

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
    const dc = parseDateComponents(r[0])
    if (dc == null) continue

    const mk = monthKey(dc.year, dc.month)
    if (!partitioned[mk]) partitioned[mk] = {}

    for (const { col, storeId } of columnMap) {
      const price = safeNumber(r[col])
      if (price === 0 && !readCustomers) continue

      const cost = Math.round(price * costRate)
      const customers = readCustomers ? safeNumber(r[col + 1]) : undefined

      // 客数のみの行（price=0 but customers>0）も記録する
      if (price === 0 && (customers === undefined || customers === 0)) continue

      if (!partitioned[mk][storeId]) partitioned[mk][storeId] = {}
      if (!partitioned[mk][storeId][dc.day])
        partitioned[mk][storeId][dc.day] = { price: 0, cost: 0 }

      const dayData = partitioned[mk][storeId][dc.day] as {
        price: number
        cost: number
        customers?: number
      }
      dayData.price += price
      dayData.cost += cost
      if (customers !== undefined) {
        dayData.customers = (dayData.customers ?? 0) + customers
      }
    }
  }

  return partitioned
}
