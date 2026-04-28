/**
 * @responsibility R:adapter
 */

import { parseDateComponents, monthKey } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { BudgetData } from '@/domain/models/record'

/**
 * 売上予算データを処理する（年月パーティション対応）
 *
 * 行0: ヘッダー（スキップ）
 * 行1+: [店舗コード, 日付, 予算金額, ...]
 *   Col0: 店舗コード（例: "0001", "81257"）
 *   Col1: 日付（Excel シリアル値 or 文字列）
 *   Col2: 予算金額
 *
 * @returns 年月キー ("YYYY-M") をキーとする月別予算データ
 */
export function processBudget(rows: readonly unknown[][]): Record<string, Map<string, BudgetData>> {
  if (rows.length < 2) return {}

  // 一時的にmutableで構築: monthKey → storeId → day → budgetVal
  const temp: Record<string, Record<string, Map<number, number>>> = {}

  // データ行処理（行1以降、ヘッダー行をスキップ）
  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const storeCode = r[0]
    if (!storeCode) continue

    const sid = String(parseInt(String(storeCode)))
    if (sid === 'NaN') continue

    const dc = parseDateComponents(r[1])
    if (!dc) continue

    const budgetVal = safeNumber(r[2])
    // 0以下は「予算なし」として扱う（空欄・未設定の除外）
    if (budgetVal <= 0) continue

    const mk = monthKey(dc.year, dc.month)
    if (!temp[mk]) temp[mk] = {}
    if (!temp[mk][sid]) temp[mk][sid] = new Map()
    temp[mk][sid].set(dc.day, budgetVal)
  }

  // total を daily の合計から算出
  const result: Record<string, Map<string, BudgetData>> = {}
  for (const [mk, stores] of Object.entries(temp)) {
    result[mk] = new Map()
    for (const [storeId, daily] of Object.entries(stores)) {
      let total = 0
      for (const v of daily.values()) total += v
      result[mk].set(storeId, { storeId, daily, total })
    }
  }

  return result
}
