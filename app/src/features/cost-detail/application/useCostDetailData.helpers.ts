import type { DailyRecord, TransferBreakdownEntry } from '@/domain/models/record'
import type { Store } from '@/domain/models/Store'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { CustomCategory } from '@/domain/models/storeTypes'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/domain/constants/categories'
import type { CategoryType } from '@/domain/models/record'
import {
  UNCATEGORIZED_CATEGORY_ID,
  PRESET_CATEGORY_DEFS,
  isUserCategory,
} from '@/domain/constants/customCategories'
import { CATEGORY_COLORS, CUSTOM_CATEGORY_COLORS } from '@/presentation/pages/Category/categoryData'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type {
  FlowEntry,
  FlowGroup,
  ItemAggregate,
  ItemDetail,
  AccountAggregate,
  DailyTotals,
  PairDailyEntry,
  DailyCostInclusionEntry,
  TransferPivotStore,
  TransferPivotCell,
  TransferPivotRow,
  TransferPivotData,
  PurchasePivotColumn,
  PurchasePivotCell,
  PurchasePivotRow,
  PurchasePivotData,
} from './useCostDetailData.types'

// ─── Transfer helpers ─────────────────────────────────

function addEntry(
  map: Map<string, FlowEntry>,
  e: TransferBreakdownEntry,
  stores: ReadonlyMap<string, { id: string; name: string }>,
) {
  const key = `${e.fromStoreId}->${e.toStoreId}`
  const existing = map.get(key)
  if (existing) {
    map.set(key, { ...existing, cost: existing.cost + e.cost, price: existing.price + e.price })
  } else {
    map.set(key, {
      from: e.fromStoreId,
      to: e.toStoreId,
      fromName: stores.get(e.fromStoreId)?.name ?? e.fromStoreId,
      toName: stores.get(e.toStoreId)?.name ?? e.toStoreId,
      cost: e.cost,
      price: e.price,
    })
  }
}

export function aggregateFlows(
  days: [number, DailyRecord][],
  inField: 'interStoreIn' | 'interDepartmentIn',
  outField: 'interStoreOut' | 'interDepartmentOut',
  stores: ReadonlyMap<string, { id: string; name: string }>,
): FlowEntry[] {
  const map = new Map<string, FlowEntry>()
  for (const [, rec] of days) {
    for (const e of rec.transferBreakdown[inField]) addEntry(map, e, stores)
    for (const e of rec.transferBreakdown[outField]) addEntry(map, e, stores)
  }
  return Array.from(map.values()).sort((a, b) => Math.abs(b.cost) - Math.abs(a.cost))
}

// ─── Transfer pivot builder ──────────────────────────

export function buildTransferPivot(
  days: [number, DailyRecord][],
  inField: 'interStoreIn' | 'interDepartmentIn',
  outField: 'interStoreOut' | 'interDepartmentOut',
  storeMap: ReadonlyMap<string, { id: string; name: string }>,
): TransferPivotData {
  const partnerStoreIds = new Set<string>()
  for (const [, rec] of days) {
    for (const e of rec.transferBreakdown[inField]) partnerStoreIds.add(e.fromStoreId)
    for (const e of rec.transferBreakdown[outField]) partnerStoreIds.add(e.toStoreId)
  }

  const sortedIds = Array.from(partnerStoreIds).sort()
  const pivotStores: TransferPivotStore[] = sortedIds.map((id) => ({
    storeId: id,
    storeName: storeMap.get(id)?.name ?? id,
  }))

  const totalsByStore: Record<string, TransferPivotCell> = {}
  for (const id of sortedIds) totalsByStore[id] = { cost: 0, price: 0 }
  let tInCost = 0
  let tInPrice = 0
  let tOutCost = 0
  let tOutPrice = 0

  const rows: TransferPivotRow[] = []
  for (const [day, rec] of days) {
    const inRec = rec[inField]
    const outRec = rec[outField]
    if (inRec.cost === 0 && outRec.cost === 0) continue

    const cells: Record<string, TransferPivotCell> = {}
    for (const id of sortedIds) cells[id] = { cost: 0, price: 0 }

    for (const e of rec.transferBreakdown[inField]) {
      const c = cells[e.fromStoreId]
      cells[e.fromStoreId] = { cost: c.cost + e.cost, price: c.price + e.price }
    }
    for (const e of rec.transferBreakdown[outField]) {
      const c = cells[e.toStoreId]
      cells[e.toStoreId] = { cost: c.cost + e.cost, price: c.price + e.price }
    }

    for (const id of sortedIds) {
      totalsByStore[id] = {
        cost: totalsByStore[id].cost + cells[id].cost,
        price: totalsByStore[id].price + cells[id].price,
      }
    }

    tInCost += inRec.cost
    tInPrice += inRec.price
    tOutCost += outRec.cost
    tOutPrice += outRec.price

    rows.push({
      day,
      cells,
      inCost: inRec.cost,
      inPrice: inRec.price,
      outCost: outRec.cost,
      outPrice: outRec.price,
      net: inRec.cost + outRec.cost,
    })
  }

  return {
    stores: pivotStores,
    rows,
    totals: {
      byStore: totalsByStore,
      inCost: tInCost,
      inPrice: tInPrice,
      outCost: tOutCost,
      outPrice: tOutPrice,
      net: tInCost + tOutCost,
    },
  }
}

// ─── CostInclusion helpers ───────────────────────────────

export function aggregateByItem(days: [number, DailyRecord][]): ItemAggregate[] {
  const map = new Map<string, ItemAggregate>()
  const daySeen = new Map<string, Set<number>>()
  for (const [day, rec] of days) {
    for (const item of rec.costInclusion.items) {
      const key = item.itemCode
      const existing = map.get(key)
      if (existing) {
        map.set(key, {
          ...existing,
          totalQuantity: existing.totalQuantity + item.quantity,
          totalCost: existing.totalCost + item.cost,
        })
      } else {
        map.set(key, {
          itemCode: item.itemCode,
          itemName: item.itemName,
          accountCode: item.accountCode,
          totalQuantity: item.quantity,
          totalCost: item.cost,
          dayCount: 0,
        })
        daySeen.set(key, new Set())
      }
      daySeen.get(key)?.add(day)
    }
  }
  for (const [key, entry] of map) map.set(key, { ...entry, dayCount: daySeen.get(key)?.size ?? 0 })
  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
}

export function aggregateByAccount(items: ItemAggregate[]): AccountAggregate[] {
  const map = new Map<string, AccountAggregate>()
  for (const item of items) {
    const existing = map.get(item.accountCode)
    if (existing) {
      map.set(item.accountCode, {
        ...existing,
        totalCost: existing.totalCost + item.totalCost,
        itemCount: existing.itemCount + 1,
      })
    } else {
      map.set(item.accountCode, {
        accountCode: item.accountCode,
        totalCost: item.totalCost,
        itemCount: 1,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalCost - a.totalCost)
}

// ─── Purchase pivot builder ─────────────────────────

/**
 * 仕入ピボットテーブルを構築する。
 *
 * 列: 標準カテゴリ（market, lfc, ... , interDepartment）+
 *     カスタムカテゴリ（market_purchase, lfc, ...）
 * 行: 日付（1日〜31日）
 * セル: 原価 / 売価
 *
 * 標準カテゴリの日別値は DailyRecord の各フィールドから直接取得。
 * カスタムカテゴリの日別値は supplierBreakdown + supplierCategoryMap から集約。
 */
export function buildPurchasePivot(
  days: [number, DailyRecord][],
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategory>>>,
): PurchasePivotData {
  // --- 列定義 ---
  // 標準カテゴリを取得するためのマッピング
  const standardFieldMap: Partial<Record<CategoryType, (rec: DailyRecord) => PurchasePivotCell>> = {
    market: (rec) => rec.purchase,
    flowers: (rec) => rec.flowers,
    directProduce: (rec) => rec.directProduce,
    consumables: (rec) => ({ cost: rec.costInclusion.cost, price: 0 }),
    interStore: (rec) => ({
      cost: rec.interStoreIn.cost + rec.interStoreOut.cost,
      price: rec.interStoreIn.price + rec.interStoreOut.price,
    }),
    interDepartment: (rec) => ({
      cost: rec.interDepartmentIn.cost + rec.interDepartmentOut.cost,
      price: rec.interDepartmentIn.price + rec.interDepartmentOut.price,
    }),
  }

  // カスタムカテゴリが使われているか確認
  const hasCustomCategories = Object.keys(supplierCategoryMap).length > 0

  // 標準カテゴリの列: データがある列のみ表示
  const standardColumns: PurchasePivotColumn[] = []
  const standardKeys = new Set<string>()

  // まず全日のデータをスキャンして、どのカテゴリにデータがあるか確認
  for (const cat of CATEGORY_ORDER) {
    const getter = standardFieldMap[cat]
    if (!getter) continue
    // カスタムカテゴリが有効な場合、market は個別カスタムに分解されるのでスキップ
    if (hasCustomCategories && cat === 'market') continue

    let hasData = false
    for (const [, rec] of days) {
      const cell = getter(rec)
      if (cell.cost !== 0 || cell.price !== 0) {
        hasData = true
        break
      }
    }
    if (hasData) {
      standardColumns.push({
        key: cat,
        label: CATEGORY_LABELS[cat],
        color: CATEGORY_COLORS[cat] ?? '#64748b',
        isCustom: false,
      })
      standardKeys.add(cat)
    }
  }

  // カスタムカテゴリの列
  const customColumns: PurchasePivotColumn[] = []
  const customKeys = new Set<string>()

  if (hasCustomCategories) {
    // どのカスタムカテゴリにデータがあるか確認
    const customCatHasData = new Set<CustomCategory>()
    for (const [, rec] of days) {
      for (const [suppCode, pair] of rec.supplierBreakdown) {
        if (pair.cost === 0 && pair.price === 0) continue
        const cc = supplierCategoryMap[suppCode] ?? UNCATEGORIZED_CATEGORY_ID
        customCatHasData.add(cc)
      }
    }

    const userCategoryLabels = useSettingsStore.getState().settings.userCategoryLabels ?? {}
    for (const cc of PRESET_CATEGORY_DEFS) {
      if (!customCatHasData.has(cc.id as CustomCategory)) continue
      customColumns.push({
        key: cc.id,
        label: cc.label,
        color: CUSTOM_CATEGORY_COLORS[cc.id] ?? '#64748b',
        isCustom: true,
      })
      customKeys.add(cc.id)
    }
    // ユーザーカテゴリ
    for (const id of customCatHasData) {
      if (!isUserCategory(id)) continue
      customColumns.push({
        key: id,
        label: userCategoryLabels[id] ?? id.replace('user:', ''),
        color: '#14b8a6',
        isCustom: true,
      })
      customKeys.add(id)
    }
  }

  const columns = [...standardColumns, ...customColumns]
  const allKeys = [...standardKeys, ...customKeys]

  // --- 行構築 ---
  const totalsByCol: Record<string, PurchasePivotCell> = {}
  for (const k of allKeys) totalsByCol[k] = { cost: 0, price: 0 }
  let grandCost = 0
  let grandPrice = 0

  const rows: PurchasePivotRow[] = []
  for (const [day, rec] of days) {
    const cells: Record<string, PurchasePivotCell> = {}
    for (const k of allKeys) cells[k] = { cost: 0, price: 0 }

    // 標準カテゴリ値の取得
    for (const cat of standardKeys) {
      const getter = standardFieldMap[cat as CategoryType]
      if (!getter) continue
      const val = getter(rec)
      cells[cat] = { cost: val.cost, price: val.price }
    }

    // カスタムカテゴリ値の取得（supplierBreakdown から集約）
    if (hasCustomCategories) {
      for (const [suppCode, pair] of rec.supplierBreakdown) {
        const cc = supplierCategoryMap[suppCode] ?? UNCATEGORIZED_CATEGORY_ID
        if (!customKeys.has(cc)) continue
        cells[cc] = {
          cost: cells[cc].cost + pair.cost,
          price: cells[cc].price + pair.price,
        }
      }
    }

    // 行合計
    let rowCost = 0
    let rowPrice = 0
    for (const k of allKeys) {
      rowCost += cells[k].cost
      rowPrice += cells[k].price
      totalsByCol[k] = {
        cost: totalsByCol[k].cost + cells[k].cost,
        price: totalsByCol[k].price + cells[k].price,
      }
    }

    // データがある行のみ追加
    if (rowCost !== 0 || rowPrice !== 0) {
      rows.push({ day, cells, totalCost: rowCost, totalPrice: rowPrice })
    }

    grandCost += rowCost
    grandPrice += rowPrice
  }

  return {
    columns,
    rows,
    totals: { byColumn: totalsByCol, grandCost, grandPrice },
  }
}

// ─── useMemo 抽出関数（G5 横展開） ──────────────────────

type DayEntry = [number, DailyRecord]
type TransferField = 'interStoreIn' | 'interStoreOut' | 'interDepartmentIn' | 'interDepartmentOut'

/** フローエントリをソース別にグループ化する */
export function buildFlowGroups(flows: readonly FlowEntry[]): FlowGroup[] {
  if (flows.length === 0) return []
  const groups = new Map<string, FlowGroup>()
  for (const f of flows) {
    const existing = groups.get(f.from)
    if (existing) {
      existing.entries.push(f)
      existing.totalCost += f.cost
      existing.totalPrice += f.price
    } else {
      groups.set(f.from, {
        fromId: f.from,
        fromName: f.fromName,
        entries: [f],
        totalCost: f.cost,
        totalPrice: f.price,
      })
    }
  }
  return Array.from(groups.values()).sort((a, b) => Math.abs(b.totalCost) - Math.abs(a.totalCost))
}

/** 選択ペアの日別移動データを構築する */
export function buildPairDailyData(
  selectedPair: string | null,
  days: readonly DayEntry[],
  inField: TransferField,
  outField: TransferField,
): PairDailyEntry[] | null {
  if (!selectedPair) return null
  return days
    .map(([day, rec]) => {
      const entries = [
        ...rec.transferBreakdown[inField],
        ...rec.transferBreakdown[outField],
      ].filter((e) => `${e.fromStoreId}->${e.toStoreId}` === selectedPair)
      const cost = entries.reduce((s, e) => s + e.cost, 0)
      const price = entries.reduce((s, e) => s + e.price, 0)
      return { day, cost, price }
    })
    .filter((d) => d.cost !== 0 || d.price !== 0)
}

/** 日別の入出合計を計算する */
export function calculateDailyTotals(
  days: readonly DayEntry[],
  inField: TransferField,
  outField: TransferField,
): DailyTotals {
  return days.reduce(
    (acc, [, rec]) => {
      const inRec = rec[inField]
      const outRec = rec[outField]
      return {
        inCost: acc.inCost + inRec.cost,
        inPrice: acc.inPrice + inRec.price,
        outCost: acc.outCost + outRec.cost,
        outPrice: acc.outPrice + outRec.price,
      }
    },
    { inCost: 0, inPrice: 0, outCost: 0, outPrice: 0 },
  )
}

/** 選択品目の店舗別明細を構築する */
export function buildItemDetailData(
  selectedItem: string | null,
  selectedResults: readonly StoreResult[],
  stores: ReadonlyMap<string, Store>,
): ItemDetail[] | null {
  if (!selectedItem) return null
  const details: ItemDetail[] = []
  for (const result of selectedResults) {
    const stName = stores.get(result.storeId)?.name ?? result.storeId
    for (const [day, rec] of result.daily) {
      for (const item of rec.costInclusion.items) {
        if (item.itemCode === selectedItem)
          details.push({
            day,
            storeId: result.storeId,
            storeName: stName,
            quantity: item.quantity,
            cost: item.cost,
          })
      }
    }
  }
  return details.sort((a, b) => a.day - b.day || a.storeId.localeCompare(b.storeId))
}

/** 日別原価算入データを構築する */
export function buildDailyCostInclusionData(days: readonly DayEntry[]): DailyCostInclusionEntry[] {
  return days
    .filter(([, rec]) => rec.costInclusion.cost > 0 || rec.costInclusion.items.length > 0)
    .map(([day, rec]) => ({
      day,
      cost: rec.costInclusion.cost,
      itemCount: rec.costInclusion.items.length,
      items: rec.costInclusion.items,
    }))
}
