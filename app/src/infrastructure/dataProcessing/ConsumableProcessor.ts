import { parseDateComponents, monthKey } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { ConsumableItem, ConsumableData } from '@/domain/models'

export type { ConsumableData } from '@/domain/models'

/** 勘定コードフィルタ */
const TARGET_ACCOUNT_CODE = '81257'

/**
 * 消耗品データを処理する（年月パーティション対応）
 *
 * 行0: ヘッダー
 * 行1+: Col0: 勘定コード, Col1: 品目コード, Col2: 品目名, Col3: 数量, Col4: 原価, Col5: 日付
 * 店舗判定: ファイル名先頭2桁
 *
 * @returns 年月キー ("YYYY-M") をキーとする月別消耗品データ
 */
export function processConsumables(
  rows: readonly unknown[][],
  filename: string,
): Record<string, ConsumableData> {
  if (rows.length < 2) return {}

  // 店舗コード抽出: ファイル名先頭2桁
  const storeMatch = filename.match(/^(\d{2})/)
  if (!storeMatch) return {}
  const storeId = String(parseInt(storeMatch[1]))

  const partitioned: Record<string, Record<string, Record<number, { cost: number; items: ConsumableItem[] }>>> = {}

  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const accountCode = String(r[0] ?? '').trim()
    if (accountCode !== TARGET_ACCOUNT_CODE) continue

    const itemCode = String(r[1] ?? '')
    const itemName = String(r[2] ?? '')
    const quantity = safeNumber(r[3])
    const cost = safeNumber(r[4])
    const dc = parseDateComponents(r[5])
    if (dc == null) continue

    const mk = monthKey(dc.year, dc.month)
    if (!partitioned[mk]) partitioned[mk] = {}
    if (!partitioned[mk][storeId]) partitioned[mk][storeId] = {}
    if (!partitioned[mk][storeId][dc.day]) partitioned[mk][storeId][dc.day] = { cost: 0, items: [] }

    const dayData = partitioned[mk][storeId][dc.day] as { cost: number; items: ConsumableItem[] }
    dayData.cost += cost
    dayData.items.push({ accountCode, itemCode, itemName, quantity, cost })
  }

  return partitioned
}

/** 消耗品アイテムの重複排除キー（同一店舗・日・品目コード→同一アイテムと見なす） */
function consumableItemKey(item: ConsumableItem): string {
  return `${item.accountCode}|${item.itemCode}`
}

/**
 * 消耗品データをマージする（重複排除付き）
 *
 * 同一店舗・同一日の同一品目コードは上書きする（incoming 優先）。
 * これにより同一ファイルの再取込でコストが倍増するバグを防ぐ。
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

  // 新規データをマージ（品目コードで重複排除）
  for (const [storeId, days] of Object.entries(incoming)) {
    if (!merged[storeId]) merged[storeId] = {}
    for (const [day, data] of Object.entries(days)) {
      const d = Number(day)
      if (!merged[storeId][d]) {
        merged[storeId][d] = { cost: 0, items: [] }
      }
      // 既存アイテムをキーでインデックス化し、incoming で上書き
      const existingItems = merged[storeId][d].items
      const incomingItems = data.items
      if (existingItems.length === 0 && incomingItems.length === 0) {
        // アイテム詳細なし（集計コストのみ）→ incoming 側のコストで上書き
        merged[storeId][d] = { cost: data.cost, items: [] }
      } else {
        const itemMap = new Map<string, ConsumableItem>()
        for (const item of existingItems) {
          itemMap.set(consumableItemKey(item), item)
        }
        for (const item of incomingItems) {
          itemMap.set(consumableItemKey(item), item)
        }
        const deduped = Array.from(itemMap.values())
        merged[storeId][d] = {
          cost: deduped.reduce((sum, item) => sum + item.cost, 0),
          items: deduped,
        }
      }
    }
  }

  return merged
}

/**
 * 月パーティション済み消耗品データをマージする
 */
export function mergePartitionedConsumables(
  existing: Record<string, ConsumableData>,
  incoming: Record<string, ConsumableData>,
): Record<string, ConsumableData> {
  const result = { ...existing }
  for (const [mk, data] of Object.entries(incoming)) {
    if (result[mk]) {
      result[mk] = mergeConsumableData(result[mk], data)
    } else {
      result[mk] = data
    }
  }
  return result
}
