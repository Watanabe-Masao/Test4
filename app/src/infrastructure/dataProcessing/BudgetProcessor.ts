import { getDayOfMonth } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { BudgetData } from '@/domain/models'

/**
 * 売上予算データを処理する（ピボット形式）
 *
 * 行0: 店舗コード（"NNNN:店舗名" Col3〜、各1列）
 * 行1: サブヘッダー（"売上予算" 等）
 * 行2: 期間合計（スキップ）
 * 行3+: データ行（Col0: 日付, Col3+: 予算金額）
 */
export function processBudget(rows: readonly unknown[][]): Map<string, BudgetData> {
  const result = new Map<string, BudgetData>()
  if (rows.length < 4) return result

  // ヘッダー解析: 行0の店舗コード（Col3〜、1列ずつ）
  const columnMap: { col: number; storeId: string }[] = []
  const row0 = rows[0] as unknown[]
  for (let col = 3; col < row0.length; col++) {
    const cellStr = String(row0[col] ?? '').trim()
    const stoMatch = cellStr.match(/(\d{4}):/)
    if (stoMatch) {
      columnMap.push({ col, storeId: String(parseInt(stoMatch[1])) })
    }
  }

  if (columnMap.length === 0) return result

  // 一時的にmutableで構築
  const temp: Record<string, { daily: Map<number, number>; total: number }> = {}

  // データ行処理（行3以降、行2は期間合計でスキップ）
  for (let row = 3; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const day = getDayOfMonth(r[0])
    if (day == null) continue

    for (const { col, storeId } of columnMap) {
      const budget = safeNumber(r[col])
      if (budget <= 0) continue

      if (!temp[storeId]) temp[storeId] = { daily: new Map(), total: 0 }
      temp[storeId].daily.set(day, budget)
      temp[storeId].total += budget
    }
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
