import { useState, useMemo } from 'react'
import { useCalculation } from '@/application/hooks/calculation'
import { useStoreSelection } from '@/application/hooks/ui'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { buildPurchasePivot } from './useCostDetailData.helpers'
import type { ActiveTab, TransferType, CostInclusionViewMode } from './useCostDetailData.types'
import { useCostDetailTransfer } from './useCostDetailTransfer'
import { useCostDetailCostInclusion } from './useCostDetailCostInclusion'

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

  // ─── Transfer data (sub-hook) ───────────────────────
  const isInterStore = transferType === 'interStore'
  const inField = isInterStore ? ('interStoreIn' as const) : ('interDepartmentIn' as const)
  const outField = isInterStore ? ('interStoreOut' as const) : ('interDepartmentOut' as const)

  const { flows, groupedFlows, maxFlowCost, pairDailyData, dailyTotals, transferPivot } =
    useCostDetailTransfer(days, inField, outField, stores, selectedPair)

  // ─── Purchase pivot data (category × date matrix) ──
  const purchasePivot = useMemo(
    () => buildPurchasePivot(days, settings.supplierCategoryMap),
    [days, settings.supplierCategoryMap],
  )

  // ─── CostInclusion data (sub-hook) ─────────────────
  const { itemAggregates, accountAggregates, itemDetailData, dailyCostInclusionData } =
    useCostDetailCostInclusion(days, selectedItem, selectedResults, stores)

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
