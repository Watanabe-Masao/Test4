import { useState, useMemo } from 'react'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { DailyRecord, TransferBreakdownEntry, CustomCategory } from '@/domain/models'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/domain/constants/categories'
import type { CategoryType } from '@/domain/models'
import { CATEGORY_COLORS, CUSTOM_CATEGORY_COLORS } from '@/presentation/pages/Category/categoryData'

// ─── Types ─────────────────────────────────────────────

export type ActiveTab = 'transfer' | 'consumable' | 'purchase'
export type TransferType = 'interStore' | 'interDepartment'
export type ConsumableViewMode = 'item' | 'account' | 'daily'

export interface FlowEntry {
  from: string
  to: string
  fromName: string
  toName: string
  cost: number
  price: number
}

export interface ItemAggregate {
  itemCode: string
  itemName: string
  accountCode: string
  totalQuantity: number
  totalCost: number
  dayCount: number
}

export interface AccountAggregate {
  accountCode: string
  totalCost: number
  itemCount: number
}

export interface ItemDetail {
  day: number
  storeId: string
  storeName: string
  quantity: number
  cost: number
}

export interface FlowGroup {
  fromId: string
  fromName: string
  entries: FlowEntry[]
  totalCost: number
  totalPrice: number
}

export interface DailyConsumableEntry {
  day: number
  cost: number
  itemCount: number
  items: readonly {
    itemCode: string
    itemName: string
    accountCode: string
    quantity: number
    cost: number
  }[]
}

export interface DailyTotals {
  inCost: number
  inPrice: number
  outCost: number
  outPrice: number
}

export interface PairDailyEntry {
  day: number
  cost: number
  price: number
}

export interface TransferPivotStore {
  storeId: string
  storeName: string
}

export interface TransferPivotCell {
  cost: number
  price: number
}

export interface TransferPivotRow {
  day: number
  cells: Record<string, TransferPivotCell>
  inCost: number
  inPrice: number
  outCost: number
  outPrice: number
  net: number
}

export interface TransferPivotData {
  stores: TransferPivotStore[]
  rows: TransferPivotRow[]
  totals: {
    byStore: Record<string, TransferPivotCell>
    inCost: number
    inPrice: number
    outCost: number
    outPrice: number
    net: number
  }
}

// ─── Purchase pivot types ────────────────────────────

/** 仕入ピボットの列定義 */
export interface PurchasePivotColumn {
  key: string
  label: string
  color: string
  isCustom: boolean
}

/** 仕入ピボットのセル（原価/売価） */
export interface PurchasePivotCell {
  cost: number
  price: number
}

/** 仕入ピボットの行（日付単位） */
export interface PurchasePivotRow {
  day: number
  cells: Record<string, PurchasePivotCell>
  totalCost: number
  totalPrice: number
}

/** 仕入ピボットデータ全体 */
export interface PurchasePivotData {
  columns: PurchasePivotColumn[]
  rows: PurchasePivotRow[]
  totals: {
    byColumn: Record<string, PurchasePivotCell>
    grandCost: number
    grandPrice: number
  }
}

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

function aggregateFlows(
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

function buildTransferPivot(
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

// ─── Consumable helpers ───────────────────────────────

function aggregateByItem(days: [number, DailyRecord][]): ItemAggregate[] {
  const map = new Map<string, ItemAggregate>()
  const daySeen = new Map<string, Set<number>>()
  for (const [day, rec] of days) {
    for (const item of rec.consumable.items) {
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

function aggregateByAccount(items: ItemAggregate[]): AccountAggregate[] {
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
function buildPurchasePivot(
  days: [number, DailyRecord][],
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategory>>>,
): PurchasePivotData {
  // --- 列定義 ---
  // 標準カテゴリを取得するためのマッピング
  const standardFieldMap: Partial<Record<CategoryType, (rec: DailyRecord) => PurchasePivotCell>> = {
    market: (rec) => rec.purchase,
    flowers: (rec) => rec.flowers,
    directProduce: (rec) => rec.directProduce,
    consumables: (rec) => ({ cost: rec.consumable.cost, price: 0 }),
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
        const cc = supplierCategoryMap[suppCode]
        if (cc) customCatHasData.add(cc)
      }
    }

    for (const cc of CUSTOM_CATEGORIES) {
      if (!customCatHasData.has(cc.id as CustomCategory)) continue
      customColumns.push({
        key: cc.id,
        label: cc.label,
        color: CUSTOM_CATEGORY_COLORS[cc.id] ?? '#64748b',
        isCustom: true,
      })
      customKeys.add(cc.id)
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
        const cc = supplierCategoryMap[suppCode]
        if (!cc || !customKeys.has(cc)) continue
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

// ─── Hook ─────────────────────────────────────────────

export function useCostDetailData() {
  useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()
  const settings = useSettingsStore((s) => s.settings)

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('transfer')

  // Transfer state
  const [transferType, setTransferType] = useState<TransferType>('interStore')
  const [selectedPair, setSelectedPair] = useState<string | null>(null)

  // Consumable state
  const [consumableView, setConsumableView] = useState<ConsumableViewMode>('item')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  // ─── Sorted daily entries ───────────────────────────
  const days = useMemo(
    () =>
      currentResult ? Array.from(currentResult.daily.entries()).sort(([a], [b]) => a - b) : [],
    [currentResult],
  )

  // ─── Transfer data ──────────────────────────────────
  const isInterStore = transferType === 'interStore'
  const inField = isInterStore ? ('interStoreIn' as const) : ('interDepartmentIn' as const)
  const outField = isInterStore ? ('interStoreOut' as const) : ('interDepartmentOut' as const)

  const flows = useMemo(
    () => (days.length > 0 ? aggregateFlows(days, inField, outField, stores) : []),
    [days, inField, outField, stores],
  )

  const groupedFlows = useMemo((): FlowGroup[] => {
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
  }, [flows])

  const maxFlowCost = useMemo(
    () => (flows.length === 0 ? 1 : Math.max(...flows.map((f) => Math.abs(f.cost)), 1)),
    [flows],
  )

  const pairDailyData = useMemo((): PairDailyEntry[] | null => {
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
  }, [selectedPair, days, inField, outField])

  const dailyTotals = useMemo(
    (): DailyTotals =>
      days.reduce(
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
      ),
    [days, inField, outField],
  )

  // ─── Transfer pivot data (store × date matrix) ──────
  const transferPivot = useMemo(
    () => buildTransferPivot(days, inField, outField, stores),
    [days, inField, outField, stores],
  )

  // ─── Purchase pivot data (category × date matrix) ──
  const purchasePivot = useMemo(
    () => buildPurchasePivot(days, settings.supplierCategoryMap),
    [days, settings.supplierCategoryMap],
  )

  // ─── Consumable data ────────────────────────────────
  const itemAggregates = useMemo(() => aggregateByItem(days), [days])
  const accountAggregates = useMemo(() => aggregateByAccount(itemAggregates), [itemAggregates])

  const itemDetailData = useMemo((): ItemDetail[] | null => {
    if (!selectedItem) return null
    const details: ItemDetail[] = []
    for (const result of selectedResults) {
      const stName = stores.get(result.storeId)?.name ?? result.storeId
      for (const [day, rec] of result.daily) {
        for (const item of rec.consumable.items) {
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
  }, [selectedItem, selectedResults, stores])

  // ─── Derived values (computed once per render) ──────
  const typeIn = currentResult
    ? isInterStore
      ? currentResult.transferDetails.interStoreIn
      : currentResult.transferDetails.interDepartmentIn
    : null
  const typeOut = currentResult
    ? isInterStore
      ? currentResult.transferDetails.interStoreOut
      : currentResult.transferDetails.interDepartmentOut
    : null
  const typeNet =
    typeIn && typeOut
      ? { cost: typeIn.cost + typeOut.cost, price: typeIn.price + typeOut.price }
      : null
  const typeLabel = isInterStore ? '店間' : '部門間'
  const selectedFlow = selectedPair
    ? (flows.find((f) => `${f.from}->${f.to}` === selectedPair) ?? null)
    : null

  const totalConsumableCost = currentResult?.totalConsumable ?? 0
  const consumableRate = currentResult?.consumableRate ?? 0
  const totalSales = currentResult?.totalSales ?? 0
  const maxItemCost = itemAggregates.length > 0 ? itemAggregates[0].totalCost : 1
  const maxAccountCost = accountAggregates.length > 0 ? accountAggregates[0].totalCost : 1

  const dailyConsumableData = useMemo(
    (): DailyConsumableEntry[] =>
      days
        .filter(([, rec]) => rec.consumable.cost > 0 || rec.consumable.items.length > 0)
        .map(([day, rec]) => ({
          day,
          cost: rec.consumable.cost,
          itemCount: rec.consumable.items.length,
          items: rec.consumable.items,
        })),
    [days],
  )

  const hasConsumableData = totalConsumableCost > 0 || itemAggregates.length > 0

  // ─── Handlers ───────────────────────────────────────
  const handleTransferTypeChange = (type: TransferType) => {
    setTransferType(type)
    setSelectedPair(null)
  }

  const handleItemClick = (itemCode: string) =>
    setSelectedItem(selectedItem === itemCode ? null : itemCode)

  const handleConsumableViewChange = (view: ConsumableViewMode) => {
    setConsumableView(view)
    setSelectedItem(null)
  }

  return {
    // Core
    currentResult,
    storeName,

    // Tab
    activeTab,
    setActiveTab,

    // Transfer state & data
    transferType,
    selectedPair,
    setSelectedPair,
    flows,
    groupedFlows,
    maxFlowCost,
    pairDailyData,
    dailyTotals,
    transferPivot,
    typeIn,
    typeOut,
    typeNet,
    typeLabel,
    selectedFlow,

    // Consumable state & data
    consumableView,
    selectedItem,
    itemAggregates,
    accountAggregates,
    itemDetailData,
    totalConsumableCost,
    consumableRate,
    totalSales,
    maxItemCost,
    maxAccountCost,
    dailyConsumableData,
    hasConsumableData,

    // Purchase pivot data
    purchasePivot,

    // Handlers
    handleTransferTypeChange,
    handleItemClick,
    handleConsumableViewChange,
  } as const
}
