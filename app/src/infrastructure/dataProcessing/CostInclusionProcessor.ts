import { parseDateComponents, monthKey } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { CostInclusionItem, CostInclusionData, CostInclusionRecord } from '@/domain/models'

export type { CostInclusionData } from '@/domain/models'

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
export function processCostInclusions(
  rows: readonly unknown[][],
  filename: string,
): Record<string, CostInclusionData> {
  if (rows.length < 2) return {}

  // 店舗コード抽出: ファイル名先頭2桁
  const storeMatch = filename.match(/^(\d{2})/)
  if (!storeMatch) return {}
  const storeId = String(parseInt(storeMatch[1]))

  // 中間構造: monthKey → day → { cost, items }
  const partitioned: Record<
    string,
    Record<number, { cost: number; items: CostInclusionItem[] }>
  > = {}

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
    if (!partitioned[mk][dc.day]) partitioned[mk][dc.day] = { cost: 0, items: [] }

    const dayData = partitioned[mk][dc.day]
    dayData.cost += cost
    dayData.items.push({ accountCode, itemCode, itemName, quantity, cost })
  }

  // 中間構造をフラットレコード配列に変換
  const result: Record<string, CostInclusionData> = {}
  for (const [mk, dayMap] of Object.entries(partitioned)) {
    const [yearStr, monthStr] = mk.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const records: CostInclusionRecord[] = []
    for (const [dayStr, entry] of Object.entries(dayMap)) {
      records.push({
        year,
        month,
        day: Number(dayStr),
        storeId,
        cost: entry.cost,
        items: entry.items,
      })
    }
    result[mk] = { records }
  }

  return result
}

/** 消耗品アイテムの重複排除キー（同一店舗・日・品目コード→同一アイテムと見なす） */
function costInclusionItemKey(item: CostInclusionItem): string {
  return `${item.accountCode}|${item.itemCode}`
}

/** CostInclusionRecord の一意キー（店舗+日） */
function costInclusionRecordKey(rec: CostInclusionRecord): string {
  return `${rec.storeId}\t${rec.day}`
}

/**
 * 消耗品データをマージする（重複排除付き）
 *
 * 同一店舗・同一日の同一品目コードは上書きする（incoming 優先）。
 * これにより同一ファイルの再取込でコストが倍増するバグを防ぐ。
 */
export function mergeCostInclusionData(
  existing: CostInclusionData,
  incoming: CostInclusionData,
): CostInclusionData {
  // 既存レコードをキーでインデックス化
  const map = new Map<
    string,
    {
      cost: number
      items: CostInclusionItem[]
      year: number
      month: number
      day: number
      storeId: string
    }
  >()

  for (const rec of existing.records) {
    const key = costInclusionRecordKey(rec)
    map.set(key, {
      year: rec.year,
      month: rec.month,
      day: rec.day,
      storeId: rec.storeId,
      cost: rec.cost,
      items: [...rec.items],
    })
  }

  // incoming をマージ
  for (const rec of incoming.records) {
    const key = costInclusionRecordKey(rec)
    const ex = map.get(key)
    if (!ex) {
      map.set(key, {
        year: rec.year,
        month: rec.month,
        day: rec.day,
        storeId: rec.storeId,
        cost: rec.cost,
        items: [...rec.items],
      })
    } else {
      const existingItems = ex.items
      const incomingItems = rec.items
      if (existingItems.length === 0 && incomingItems.length === 0) {
        ex.cost = rec.cost
      } else {
        const itemMap = new Map<string, CostInclusionItem>()
        for (const item of existingItems) {
          itemMap.set(costInclusionItemKey(item), item)
        }
        for (const item of incomingItems) {
          itemMap.set(costInclusionItemKey(item), item)
        }
        const deduped = Array.from(itemMap.values())
        ex.cost = deduped.reduce((sum, item) => sum + item.cost, 0)
        ex.items = deduped
      }
    }
  }

  const records: CostInclusionRecord[] = Array.from(map.values()).map((v) => ({
    year: v.year,
    month: v.month,
    day: v.day,
    storeId: v.storeId,
    cost: v.cost,
    items: v.items,
  }))

  return { records }
}

/**
 * 月パーティション済み消耗品データをマージする
 */
export function mergePartitionedCostInclusions(
  existing: Record<string, CostInclusionData>,
  incoming: Record<string, CostInclusionData>,
): Record<string, CostInclusionData> {
  const result = { ...existing }
  for (const [mk, data] of Object.entries(incoming)) {
    if (result[mk]) {
      result[mk] = mergeCostInclusionData(result[mk], data)
    } else {
      result[mk] = data
    }
  }
  return result
}
