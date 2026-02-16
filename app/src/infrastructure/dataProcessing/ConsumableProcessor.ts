import { getDayOfMonth } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { ConsumableItem } from '@/domain/models'

/** 消耗品パース結果: storeId → day → { cost, items } */
export interface ConsumableData {
  readonly [storeId: string]: {
    readonly [day: number]: {
      readonly cost: number
      readonly items: readonly ConsumableItem[]
    }
  }
}

/** 勘定コードフィルタ */
const TARGET_ACCOUNT_CODE = '81257'

/**
 * 消耗品データを処理する
 *
 * 行0: ヘッダー
 * 行1+: Col0: 勘定コード, Col1: 品目コード, Col2: 品目名, Col3: 数量, Col4: 原価, Col5: 日付
 * 店舗判定: ファイル名先頭2桁
 */
export function processConsumables(
  rows: readonly unknown[][],
  filename: string,
): ConsumableData {
  if (rows.length < 2) return {}

  // 店舗コード抽出: ファイル名先頭2桁
  const storeMatch = filename.match(/^(\d{2})/)
  if (!storeMatch) return {}
  const storeId = String(parseInt(storeMatch[1]))

  const result: Record<string, Record<number, { cost: number; items: ConsumableItem[] }>> = {}

  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const accountCode = String(r[0] ?? '').trim()
    if (accountCode !== TARGET_ACCOUNT_CODE) continue

    const itemCode = String(r[1] ?? '')
    const itemName = String(r[2] ?? '')
    const quantity = safeNumber(r[3])
    const cost = safeNumber(r[4])
    const day = getDayOfMonth(r[5])
    if (day == null) continue

    if (!result[storeId]) result[storeId] = {}
    if (!result[storeId][day]) result[storeId][day] = { cost: 0, items: [] }

    const dayData = result[storeId][day] as { cost: number; items: ConsumableItem[] }
    dayData.cost += cost
    dayData.items.push({ accountCode, itemCode, itemName, quantity, cost })
  }

  return result
}

/**
 * 消耗品データをマージする（追加モード）
 */
export function mergeConsumableData(
  existing: ConsumableData,
  incoming: ConsumableData,
): ConsumableData {
  const merged: Record<string, Record<number, { cost: number; items: ConsumableItem[] }>> = {}

  // 既存データをコピー
  for (const [storeId, days] of Object.entries(existing)) {
    merged[storeId] = {}
    for (const [day, data] of Object.entries(days)) {
      merged[storeId][Number(day)] = {
        cost: data.cost,
        items: [...data.items],
      }
    }
  }

  // 新規データをマージ
  for (const [storeId, days] of Object.entries(incoming)) {
    if (!merged[storeId]) merged[storeId] = {}
    for (const [day, data] of Object.entries(days)) {
      const d = Number(day)
      if (!merged[storeId][d]) {
        merged[storeId][d] = { cost: 0, items: [] }
      }
      merged[storeId][d].cost += data.cost
      merged[storeId][d].items.push(...data.items)
    }
  }

  return merged
}
