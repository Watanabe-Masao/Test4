import { parseDate } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { BudgetData } from '@/domain/models'

/**
 * 売上予算データを処理する（フラット形式）
 *
 * 行0: ヘッダー（スキップ）
 * 行1+: [店舗コード, 日付, 予算金額, ...]
 *   Col0: 店舗コード（例: "0001", "81257"）
 *   Col1: 日付（Excel シリアル値 or 文字列）
 *   Col2: 予算金額
 */
export function processBudget(rows: readonly unknown[][]): Map<string, BudgetData> {
  const result = new Map<string, BudgetData>()
  if (rows.length < 2) return result

  // 一時的にmutableで構築
  const temp: Record<string, Map<number, number>> = {}

  // データ行処理（行1以降、ヘッダー行をスキップ）
  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const storeCode = r[0]
    if (!storeCode) continue

    const sid = String(parseInt(String(storeCode)))
    if (sid === 'NaN') continue

    const date = parseDate(r[1])
    if (!date) continue

    const budgetVal = safeNumber(r[2])
    // 0以下は「予算なし」として扱う（空欄・未設定の除外）
    if (budgetVal <= 0) continue

    const day = date.getDate()
    if (!temp[sid]) temp[sid] = new Map()
    temp[sid].set(day, budgetVal)
  }

  // total を daily の合計から算出（重複行があっても不整合にならない）
  for (const [storeId, daily] of Object.entries(temp)) {
    let total = 0
    for (const v of daily.values()) total += v
    result.set(storeId, { storeId, daily, total })
  }

  return result
}
