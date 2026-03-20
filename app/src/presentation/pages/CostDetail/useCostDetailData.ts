import { useState, useMemo } from 'react'
import { useCalculation } from '@/application/hooks/calculation'
import { useStoreSelection } from '@/application/hooks/ui'
import { useSettingsStore } from '@/application/stores/settingsStore'
import {
  aggregateFlows,
  buildTransferPivot,
  aggregateByItem,
  aggregateByAccount,
  buildPurchasePivot,
} from './useCostDetailData.helpers'
import type {
  ActiveTab,
  TransferType,
  CostInclusionViewMode,
  FlowGroup,
  ItemDetail,
  PairDailyEntry,
  DailyTotals,
  DailyCostInclusionEntry,
} from './useCostDetailData.types'

// Re-export types for external consumers
export type {
  ActiveTab,
  TransferType,
  CostInclusionViewMode,
  FlowEntry,
  ItemAggregate,
  AccountAggregate,
  ItemDetail,
  FlowGroup,
  DailyCostInclusionEntry,
  DailyTotals,
  PairDailyEntry,
  TransferPivotStore,
  TransferPivotCell,
  TransferPivotRow,
  TransferPivotData,
  PurchasePivotColumn,
  PurchasePivotCell,
  PurchasePivotRow,
  PurchasePivotData,
} from './useCostDetailData.types'

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

  // CostInclusion state
  const [costInclusionView, setCostInclusionView] = useState<CostInclusionViewMode>('item')
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

  // ─── CostInclusion data ────────────────────────────────
  const itemAggregates = useMemo(() => aggregateByItem(days), [days])
  const accountAggregates = useMemo(() => aggregateByAccount(itemAggregates), [itemAggregates])

  const itemDetailData = useMemo((): ItemDetail[] | null => {
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

  const totalCostInclusionAmount = currentResult?.totalCostInclusion ?? 0
  const costInclusionRate = currentResult?.costInclusionRate ?? 0
  const totalSales = currentResult?.totalSales ?? 0
  const maxItemCost = itemAggregates.length > 0 ? itemAggregates[0].totalCost : 1
  const maxAccountCost = accountAggregates.length > 0 ? accountAggregates[0].totalCost : 1

  const dailyCostInclusionData = useMemo(
    (): DailyCostInclusionEntry[] =>
      days
        .filter(([, rec]) => rec.costInclusion.cost > 0 || rec.costInclusion.items.length > 0)
        .map(([day, rec]) => ({
          day,
          cost: rec.costInclusion.cost,
          itemCount: rec.costInclusion.items.length,
          items: rec.costInclusion.items,
        })),
    [days],
  )

  const hasCostInclusionData = totalCostInclusionAmount > 0 || itemAggregates.length > 0

  // ─── Handlers ───────────────────────────────────────
  const handleTransferTypeChange = (type: TransferType) => {
    setTransferType(type)
    setSelectedPair(null)
  }

  const handleItemClick = (itemCode: string) =>
    setSelectedItem(selectedItem === itemCode ? null : itemCode)

  const handleCostInclusionViewChange = (view: CostInclusionViewMode) => {
    setCostInclusionView(view)
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

    // CostInclusion state & data
    costInclusionView,
    selectedItem,
    itemAggregates,
    accountAggregates,
    itemDetailData,
    totalCostInclusionAmount,
    costInclusionRate,
    totalSales,
    maxItemCost,
    maxAccountCost,
    dailyCostInclusionData,
    hasCostInclusionData,

    // Purchase pivot data
    purchasePivot,

    // Handlers
    handleTransferTypeChange,
    handleItemClick,
    handleCostInclusionViewChange,
  } as const
}

/** Return type of useCostDetailData — shared across tab components */
export type CostDetailData = ReturnType<typeof useCostDetailData>
