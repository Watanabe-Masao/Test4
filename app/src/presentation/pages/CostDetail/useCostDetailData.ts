import { useState, useMemo } from 'react'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import type { DailyRecord, TransferBreakdownEntry } from '@/domain/models'

// ─── Types ─────────────────────────────────────────────

export type ActiveTab = 'transfer' | 'consumable'
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

export interface DetailRow {
  key: string
  label: string
  isSub: boolean
  inCost: number
  inPrice: number
  outCost: number
  outPrice: number
}

export interface DailyTransferRow {
  day: number
  inCost: number
  inPrice: number
  outCost: number
  outPrice: number
  net: number
  hasBreakdown: boolean
  isExpanded: boolean
  detailRows: DetailRow[]
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

// ─── Daily transfer detail row builder ────────────────

function buildDetailRows(
  rec: DailyRecord,
  inField: 'interStoreIn' | 'interDepartmentIn',
  outField: 'interStoreOut' | 'interDepartmentOut',
  stores: ReadonlyMap<string, { id: string; name: string }>,
): DetailRow[] {
  const inEntries = rec.transferBreakdown[inField]
  const outEntries = rec.transferBreakdown[outField]
  const inRec = rec[inField]
  const outRec = rec[outField]
  const rows: DetailRow[] = []

  for (const e of inEntries) {
    const partner = stores.get(e.fromStoreId)?.name ?? e.fromStoreId
    rows.push({
      key: `in-${e.fromStoreId}-${e.toStoreId}`,
      label: `${e.toStoreId}←${e.fromStoreId}  ${partner}`,
      isSub: false,
      inCost: e.cost,
      inPrice: e.price,
      outCost: 0,
      outPrice: 0,
    })
  }
  if (inEntries.length > 1) {
    const toId = inEntries[0]?.toStoreId ?? ''
    rows.push({
      key: 'in-sub',
      label: `${toId}← 小計`,
      isSub: true,
      inCost: inRec.cost,
      inPrice: inRec.price,
      outCost: 0,
      outPrice: 0,
    })
  }
  for (const e of outEntries) {
    const partner = stores.get(e.toStoreId)?.name ?? e.toStoreId
    rows.push({
      key: `out-${e.fromStoreId}-${e.toStoreId}`,
      label: `${e.fromStoreId}→${e.toStoreId}  ${partner}`,
      isSub: false,
      inCost: 0,
      inPrice: 0,
      outCost: e.cost,
      outPrice: e.price,
    })
  }
  if (outEntries.length > 1) {
    const fromId = outEntries[0]?.fromStoreId ?? ''
    rows.push({
      key: 'out-sub',
      label: `${fromId}→ 小計`,
      isSub: true,
      inCost: 0,
      inPrice: 0,
      outCost: outRec.cost,
      outPrice: outRec.price,
    })
  }
  return rows
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

// ─── Hook ─────────────────────────────────────────────

export function useCostDetailData() {
  useCalculation()
  const { currentResult, selectedResults, storeName, stores } = useStoreSelection()

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('transfer')

  // Transfer state
  const [transferType, setTransferType] = useState<TransferType>('interStore')
  const [selectedPair, setSelectedPair] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

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

  // ─── Daily transfer rows (pre-computed for rendering) ─
  const dailyTransferRows = useMemo(
    (): DailyTransferRow[] =>
      days
        .map(([day, rec]) => {
          const inRec = rec[inField]
          const outRec = rec[outField]
          const net = inRec.cost + outRec.cost
          const hasData = inRec.cost !== 0 || outRec.cost !== 0
          if (!hasData) return null
          const inEntries = rec.transferBreakdown[inField]
          const outEntries = rec.transferBreakdown[outField]
          const hasBreakdown = inEntries.length > 0 || outEntries.length > 0
          const isExpanded = expandedDay === day
          return {
            day,
            inCost: inRec.cost,
            inPrice: inRec.price,
            outCost: outRec.cost,
            outPrice: outRec.price,
            net,
            hasBreakdown,
            isExpanded,
            detailRows: isExpanded ? buildDetailRows(rec, inField, outField, stores) : [],
          }
        })
        .filter((row): row is DailyTransferRow => row !== null),
    [days, inField, outField, expandedDay, stores],
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
    setExpandedDay(null)
  }

  const handleDayClick = (day: number) => setExpandedDay(expandedDay === day ? null : day)

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
    dailyTransferRows,
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

    // Handlers
    handleTransferTypeChange,
    handleDayClick,
    handleItemClick,
    handleConsumableViewChange,
  } as const
}
