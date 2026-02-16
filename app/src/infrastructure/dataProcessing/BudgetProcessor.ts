import { getDayOfMonth } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { BudgetData } from '@/domain/models'

/**
 * 予算データを処理する
 *
 * 行0: ヘッダー
 * 行1+: Col0: 店舗コード, Col1: 日付, Col2: 予算金額
 */
export function processBudget(rows: readonly unknown[][]): Map<string, BudgetData> {
  const result = new Map<string, BudgetData>()
  if (rows.length < 2) return result

  // 一時的にmutableで構築
  const temp: Record<string, { daily: Map<number, number>; total: number }> = {}

  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const storeCode = r[0]
    if (storeCode == null || String(storeCode).trim() === '') continue

    const storeId = String(parseInt(String(storeCode)))
    const day = getDayOfMonth(r[1])
    if (day == null) continue

    const budget = safeNumber(r[2])
    if (budget <= 0) continue

    if (!temp[storeId]) temp[storeId] = { daily: new Map(), total: 0 }
    temp[storeId].daily.set(day, budget)
    temp[storeId].total += budget
  }

  for (const [storeId, data] of Object.entries(temp)) {
    result.set(storeId, {
      storeId,
      daily: data.daily,
      total: data.total,
    })
  }

  return result
}
