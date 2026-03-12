/**
 * 値入率・原価算入費の ViewModel
 */
import type { StoreResult, Store } from '@/domain/models'
import { formatPercent, formatCurrency } from '@/domain/formatting'
import { resolveThresholds, evaluateSignal } from '@/domain/calculations/rules/conditionResolver'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { CATEGORY_ORDER } from '@/domain/constants/categories'
import type { AppSettings } from '@/domain/models'
import {
  type SignalLevel,
  SIGNAL_COLORS,
  metricSignal,
  buildCrossMult,
} from './conditionSummaryUtils'

// ─── Helpers ────────────────────────────────────────────

/** 店舗の日別データから品目別に集約する */
export function aggregateCostInclusionItems(sr: StoreResult): { itemName: string; cost: number }[] {
  const agg = new Map<string, number>()
  for (const [, dr] of sr.daily) {
    for (const item of dr.costInclusion.items) {
      agg.set(item.itemName, (agg.get(item.itemName) ?? 0) + item.cost)
    }
  }
  return [...agg.entries()]
    .map(([itemName, cost]) => ({ itemName, cost }))
    .sort((a, b) => b.cost - a.cost)
}

// ─── Markup Rate Detail VM ──────────────────────────────

export interface CrossMultRowVm {
  readonly label: string
  readonly color: string
  readonly crossMultiplication: number
  readonly crossMultStr: string
  readonly markupRate: string
  readonly priceShare: string
  readonly cost: string
  readonly price: string
}

export interface MarkupStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly avgMarkupRate: string
  readonly coreMarkupRate: string
  readonly totalCost: string
  readonly totalPrice: string
  readonly crossRows: readonly CrossMultRowVm[]
  readonly totalCross: string
  readonly maxCross: number
}

export interface MarkupTotalVm {
  readonly avgMarkupRate: string
  readonly coreMarkupRate: string
  readonly totalCost: string
  readonly totalPrice: string
}

export interface MarkupRateDetailVm {
  readonly storeRows: readonly MarkupStoreRowVm[]
  readonly total: MarkupTotalVm
}

export function buildMarkupRateDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  effectiveConfig: ConditionSummaryConfig,
  settings: AppSettings,
): MarkupRateDetailVm {
  const markupSignal = (rate: number, storeId?: string): SignalLevel => {
    const t = resolveThresholds(effectiveConfig, 'markupRate', storeId)
    const diff = (rate - result.grossProfitRateBudget) * 100
    return evaluateSignal(diff, t, 'higher_better')
  }

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const crossRows = buildCrossMult(sr, settings.supplierCategoryMap)
    const sig = markupSignal(sr.averageMarkupRate, sr.storeId)
    const sigColor = SIGNAL_COLORS[sig]

    const maxCross = Math.max(...crossRows.map((c) => Math.abs(c.crossMultiplication)), 0.001)
    const totalCross = crossRows.reduce((s, c) => s + c.crossMultiplication, 0)

    const crossRowVms = crossRows.map((cr) => ({
      label: cr.label,
      color: cr.color,
      crossMultiplication: cr.crossMultiplication,
      crossMultStr: formatPercent(cr.crossMultiplication),
      markupRate: formatPercent(cr.markupRate),
      priceShare: formatPercent(cr.priceShare),
      cost: formatCurrency(cr.cost),
      price: formatCurrency(cr.price),
    }))

    return {
      storeId,
      storeName,
      sigColor,
      avgMarkupRate: formatPercent(sr.averageMarkupRate),
      coreMarkupRate: formatPercent(sr.coreMarkupRate),
      totalCost: formatCurrency(crossRows.reduce((sum, c) => sum + c.cost, 0)),
      totalPrice: formatCurrency(crossRows.reduce((sum, c) => sum + c.price, 0)),
      crossRows: crossRowVms,
      totalCross: formatPercent(totalCross),
      maxCross,
    }
  })

  const totalCost = CATEGORY_ORDER.reduce(
    (sum, cat) => sum + (result.categoryTotals.get(cat)?.cost ?? 0),
    0,
  )
  const totalPrice = CATEGORY_ORDER.reduce(
    (sum, cat) => sum + (result.categoryTotals.get(cat)?.price ?? 0),
    0,
  )

  return {
    storeRows,
    total: {
      avgMarkupRate: formatPercent(result.averageMarkupRate),
      coreMarkupRate: formatPercent(result.coreMarkupRate),
      totalCost: formatCurrency(totalCost),
      totalPrice: formatCurrency(totalPrice),
    },
  }
}

// ─── Cost Inclusion Detail VM ───────────────────────────

export interface CostInclusionItemVm {
  readonly itemName: string
  readonly costStr: string
  readonly shareStr: string
}

export interface CostInclusionStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly totalCostStr: string
  readonly rateStr: string
  readonly items: readonly CostInclusionItemVm[]
  readonly hasItems: boolean
}

export interface CostInclusionDetailVm {
  readonly storeRows: readonly CostInclusionStoreRowVm[]
  readonly grandTotalStr: string
  readonly grandRateStr: string
  readonly totalItems: readonly CostInclusionItemVm[]
  readonly hasTotalItems: boolean
}

export function buildCostInclusionDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  effectiveConfig: ConditionSummaryConfig,
): CostInclusionDetailVm {
  const totalItems = aggregateCostInclusionItems(result)
  const grandTotal = result.totalCostInclusion

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const sig = metricSignal(sr.costInclusionRate, 'costInclusion', effectiveConfig, sr.storeId)
    const sigColor = SIGNAL_COLORS[sig]

    const storeItems = aggregateCostInclusionItems(sr)
    const storeTotal = sr.totalCostInclusion

    const itemVms = storeItems.map((item) => {
      const itemShare = storeTotal > 0 ? item.cost / storeTotal : 0
      return {
        itemName: item.itemName,
        costStr: formatCurrency(item.cost),
        shareStr: formatPercent(itemShare),
      }
    })

    return {
      storeId,
      storeName,
      sigColor,
      totalCostStr: formatCurrency(sr.totalCostInclusion),
      rateStr: formatPercent(sr.costInclusionRate),
      items: itemVms,
      hasItems: storeItems.length > 0,
    }
  })

  const totalItemVms = totalItems.map((item) => {
    const itemShare = grandTotal > 0 ? item.cost / grandTotal : 0
    return {
      itemName: item.itemName,
      costStr: formatCurrency(item.cost),
      shareStr: formatPercent(itemShare),
    }
  })

  return {
    storeRows,
    grandTotalStr: formatCurrency(grandTotal),
    grandRateStr: formatPercent(result.costInclusionRate),
    totalItems: totalItemVms,
    hasTotalItems: totalItems.length > 0,
  }
}
