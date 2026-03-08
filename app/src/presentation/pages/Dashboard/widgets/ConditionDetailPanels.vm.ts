import type { StoreResult, Store } from '@/domain/models'
import { DISCOUNT_TYPES } from '@/domain/models'
import { formatPercent, formatCurrency, formatPointDiff } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import { resolveThresholds, evaluateSignal } from '@/domain/calculations/rules/conditionResolver'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { CATEGORY_ORDER } from '@/domain/constants/categories'
import type { AppSettings } from '@/domain/models'
import type { PrevYearData } from '@/application/hooks/usePrevYearData'
import type { PrevYearMonthlyKpi } from '@/application/hooks/usePrevYearMonthlyKpi'
import {
  type SignalLevel,
  type ConditionItem,
  type DisplayMode,
  SIGNAL_COLORS,
  computeGpBeforeConsumable,
  computeGpAfterConsumable,
  computeGpAmount,
  computeGpAfterConsumableAmount,
  metricSignal,
  buildCrossMult,
} from './conditionSummaryUtils'

// ─── Re-export types used by the .tsx ────────────────────
export type { SignalLevel, ConditionItem, DisplayMode }
export { SIGNAL_COLORS }

// ─── Shared Props ───────────────────────────────────────

export interface DetailPanelProps {
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
  readonly result: StoreResult
  readonly effectiveConfig: ConditionSummaryConfig
  readonly displayMode: DisplayMode
  readonly onDisplayModeChange: (mode: DisplayMode) => void
  readonly settings: AppSettings
  readonly elapsedDays?: number
  readonly daysInMonth?: number
  readonly dataMaxDay?: number
}

export interface MarkupDetailProps extends DetailPanelProps {
  readonly expandedMarkupStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface CostInclusionDetailProps extends DetailPanelProps {
  readonly expandedMarkupStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface SalesYoYDetailProps extends DetailPanelProps {
  readonly prevYear: PrevYearData
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface CustomerYoYDetailProps extends DetailPanelProps {
  readonly prevYear: PrevYearData
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface TxValueDetailProps extends DetailPanelProps {
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface DailySalesDetailProps extends DetailPanelProps {
  readonly daysInMonth: number
  readonly expandedStore: string | null
  readonly onExpandToggle: (storeId: string) => void
}

export interface SimpleBreakdownProps {
  readonly breakdownItem: ConditionItem
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
}

// ─── Helpers ────────────────────────────────────────────

/** Prorate grossProfitBudget to the elapsed period using budgetDaily distribution */
export function prorateGpBudget(
  sr: StoreResult,
  elapsedDays: number | undefined,
  daysInMonth: number | undefined,
): number {
  const dim = daysInMonth ?? 31
  const effectiveEndDay = elapsedDays ?? dim
  const isPartial = elapsedDays != null && elapsedDays < dim
  if (!isPartial) return sr.grossProfitBudget
  let periodBudgetSum = 0
  for (let d = 1; d <= effectiveEndDay; d++) periodBudgetSum += sr.budgetDaily.get(d) ?? 0
  return sr.budget > 0 ? sr.grossProfitBudget * (periodBudgetSum / sr.budget) : 0
}

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

/** Store-level prev-year sales from storeContributions, filtered by maxDay */
export function computeStorePrevSales(
  kpi: PrevYearMonthlyKpi,
  storeId: string,
  maxDay?: number,
): number {
  if (!kpi.hasPrevYear) return 0
  return kpi.sameDow.storeContributions
    .filter((c) => c.storeId === storeId && (maxDay == null || c.mappedDay <= maxDay))
    .reduce((sum, c) => sum + c.sales, 0)
}

/** Store-level prev-year customers from storeContributions, filtered by maxDay */
export function computeStorePrevCustomers(
  kpi: PrevYearMonthlyKpi,
  storeId: string,
  maxDay?: number,
): number {
  if (!kpi.hasPrevYear) return 0
  return kpi.sameDow.storeContributions
    .filter((c) => c.storeId === storeId && (maxDay == null || c.mappedDay <= maxDay))
    .reduce((sum, c) => sum + c.customers, 0)
}

export interface DailyYoYRow {
  readonly day: number
  readonly currentSales: number
  readonly prevSales: number
  readonly currentCustomers: number
  readonly prevCustomers: number
}

/** Build daily YoY comparison rows (all-store aggregate) */
export function buildDailyYoYRows(r: StoreResult, kpi: PrevYearMonthlyKpi): DailyYoYRow[] {
  if (!kpi.hasPrevYear) return []

  const mapping = kpi.sameDow.dailyMapping
  const dayMap = new Map<number, { prevSales: number; prevCustomers: number }>()
  for (const row of mapping) {
    dayMap.set(row.currentDay, { prevSales: row.prevSales, prevCustomers: row.prevCustomers })
  }

  const rows: DailyYoYRow[] = []
  const days = [...r.daily.entries()].sort(([a], [b]) => a - b)
  for (const [day, dr] of days) {
    const prev = dayMap.get(day)
    rows.push({
      day,
      currentSales: dr.sales,
      prevSales: prev?.prevSales ?? 0,
      currentCustomers: dr.customers ?? 0,
      prevCustomers: prev?.prevCustomers ?? 0,
    })
  }
  return rows
}

// ─── GP Rate Detail VM ──────────────────────────────────

export interface GpRateStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  // rate mode
  readonly budgetRate: string
  readonly beforeRate: string
  readonly afterRate: string
  readonly costInclusionRate: string
  readonly diffPointStr: string
  // amount mode
  readonly gpBudgetAmt: string
  readonly gpBeforeAmt: string
  readonly gpAfterAmt: string
  readonly diffAmt: number
  readonly diffAmtStr: string
  readonly diffAmtSign: string
}

export interface GpRateTotalVm {
  readonly totalColor: string
  // rate mode
  readonly budgetRate: string
  readonly beforeRate: string
  readonly afterRate: string
  readonly costInclusionRate: string
  readonly diffPointStr: string
  // amount mode
  readonly gpBudgetAmt: string
  readonly gpBeforeAmt: string
  readonly gpAfterAmt: string
  readonly totalDiffAmt: number
  readonly totalDiffAmtStr: string
  readonly totalDiffAmtSign: string
}

export interface GpRateDetailVm {
  readonly storeRows: readonly GpRateStoreRowVm[]
  readonly total: GpRateTotalVm
}

export function buildGpRateDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  effectiveConfig: ConditionSummaryConfig,
  elapsedDays: number | undefined,
  daysInMonth: number | undefined,
): GpRateDetailVm {
  const gpSignal = (diffPt: number, storeId?: string): SignalLevel => {
    const t = resolveThresholds(effectiveConfig, 'gpRate', storeId)
    return evaluateSignal(diffPt, t, 'higher_better')
  }

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const before = computeGpBeforeConsumable(sr)
    const after = computeGpAfterConsumable(sr)
    const diff = (after - sr.grossProfitRateBudget) * 100
    const sig = gpSignal(diff, sr.storeId)
    const sigColor = SIGNAL_COLORS[sig]

    const gpAmt = computeGpAmount(sr)
    const gpAfterAmt = computeGpAfterConsumableAmount(sr)
    const storeGpBudget = prorateGpBudget(sr, elapsedDays, daysInMonth)
    const diffAmt = gpAfterAmt - storeGpBudget

    return {
      storeId,
      storeName,
      sigColor,
      budgetRate: formatPercent(sr.grossProfitRateBudget),
      beforeRate: formatPercent(before),
      afterRate: formatPercent(after),
      costInclusionRate: formatPercent(sr.costInclusionRate),
      diffPointStr: formatPointDiff(after - sr.grossProfitRateBudget),
      gpBudgetAmt: formatCurrency(storeGpBudget),
      gpBeforeAmt: formatCurrency(gpAmt),
      gpAfterAmt: formatCurrency(gpAfterAmt),
      diffAmt,
      diffAmtStr: formatCurrency(diffAmt),
      diffAmtSign: diffAmt >= 0 ? '+' : '',
    }
  })

  const gpBefore = computeGpBeforeConsumable(result)
  const gpAfter = computeGpAfterConsumable(result)
  const gpDiff = (gpAfter - result.grossProfitRateBudget) * 100
  const totalSig = gpSignal(gpDiff)
  const totalColor = SIGNAL_COLORS[totalSig]

  const totalGpAmt = computeGpAmount(result)
  const totalAfterAmt = computeGpAfterConsumableAmount(result)
  const totalGpBudget = prorateGpBudget(result, elapsedDays, daysInMonth)
  const totalDiffAmt = totalAfterAmt - totalGpBudget

  return {
    storeRows,
    total: {
      totalColor,
      budgetRate: formatPercent(result.grossProfitRateBudget),
      beforeRate: formatPercent(gpBefore),
      afterRate: formatPercent(gpAfter),
      costInclusionRate: formatPercent(result.costInclusionRate),
      diffPointStr: formatPointDiff(gpAfter - result.grossProfitRateBudget),
      gpBudgetAmt: formatCurrency(totalGpBudget),
      gpBeforeAmt: formatCurrency(totalGpAmt),
      gpAfterAmt: formatCurrency(totalAfterAmt),
      totalDiffAmt,
      totalDiffAmtStr: formatCurrency(totalDiffAmt),
      totalDiffAmtSign: totalDiffAmt >= 0 ? '+' : '',
    },
  }
}

// ─── Discount Rate Detail VM ─────────────────────────────

export interface DiscountEntryVm {
  readonly type: string
  readonly rateStr: string
  readonly amtStr: string
}

export interface DiscountStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly rateStr: string
  readonly amtStr: string
  readonly entries: readonly DiscountEntryVm[]
}

export interface DiscountTotalVm {
  readonly totalColor: string
  readonly rateStr: string
  readonly amtStr: string
  readonly entries: readonly DiscountEntryVm[]
}

export interface DiscountRateDetailVm {
  readonly storeRows: readonly DiscountStoreRowVm[]
  readonly total: DiscountTotalVm
}

export function buildDiscountRateDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  effectiveConfig: ConditionSummaryConfig,
): DiscountRateDetailVm {
  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const sig = metricSignal(sr.discountRate, 'discountRate', effectiveConfig, sr.storeId)
    const sigColor = SIGNAL_COLORS[sig]

    const entries = DISCOUNT_TYPES.map((dt) => {
      const entry = sr.discountEntries.find((e) => e.type === dt.type)
      const amt = entry?.amount ?? 0
      const rate = sr.grossSales > 0 ? safeDivide(amt, sr.grossSales, 0) : 0
      return { type: dt.type, rateStr: formatPercent(rate), amtStr: formatCurrency(amt) }
    })

    return {
      storeId,
      storeName,
      sigColor,
      rateStr: formatPercent(sr.discountRate),
      amtStr: formatCurrency(sr.totalDiscount),
      entries,
    }
  })

  const totalSig = metricSignal(result.discountRate, 'discountRate', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]
  const totalEntries = DISCOUNT_TYPES.map((dt) => {
    const entry = result.discountEntries.find((e) => e.type === dt.type)
    const amt = entry?.amount ?? 0
    const rate = result.grossSales > 0 ? safeDivide(amt, result.grossSales, 0) : 0
    return { type: dt.type, rateStr: formatPercent(rate), amtStr: formatCurrency(amt) }
  })

  return {
    storeRows,
    total: {
      totalColor,
      rateStr: formatPercent(result.discountRate),
      amtStr: formatCurrency(result.totalDiscount),
      entries: totalEntries,
    },
  }
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

// ─── Sales YoY Detail VM ────────────────────────────────

export interface SalesYoYStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly currentSalesStr: string
  readonly prevSalesStr: string
  readonly yoyStr: string
  readonly hasPrev: boolean
}

export interface SalesYoYDetailVm {
  readonly storeRows: readonly SalesYoYStoreRowVm[]
  readonly totalCurrentStr: string
  readonly totalPrevStr: string
  readonly totalYoYStr: string
  readonly totalColor: string
  readonly dailyRows: readonly DailyYoYRow[]
  readonly hasDailyRows: boolean
}

export function buildSalesYoYDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  effectiveConfig: ConditionSummaryConfig,
  prevYear: PrevYearData,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  dataMaxDay: number | undefined,
): SalesYoYDetailVm {
  const prevTotal = prevYear.totalSales
  const yoyTotal = safeDivide(result.totalSales, prevTotal, 0)
  const totalSig = metricSignal(yoyTotal, 'salesYoY', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  const dailyRows = buildDailyYoYRows(result, prevYearMonthlyKpi)

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const prevStoreSales = computeStorePrevSales(prevYearMonthlyKpi, storeId, dataMaxDay)
    const storeYoY = safeDivide(sr.totalSales, prevStoreSales, 0)
    const sig =
      prevStoreSales > 0
        ? metricSignal(storeYoY, 'salesYoY', effectiveConfig, sr.storeId)
        : 'blue'
    const sigColor = SIGNAL_COLORS[sig]

    return {
      storeId,
      storeName,
      sigColor,
      currentSalesStr: formatCurrency(sr.totalSales),
      prevSalesStr: prevStoreSales > 0 ? formatCurrency(prevStoreSales) : '—',
      yoyStr: prevStoreSales > 0 ? formatPercent(storeYoY, 2) : '—',
      hasPrev: prevStoreSales > 0,
    }
  })

  return {
    storeRows,
    totalCurrentStr: formatCurrency(result.totalSales),
    totalPrevStr: formatCurrency(prevTotal),
    totalYoYStr: formatPercent(yoyTotal, 2),
    totalColor,
    dailyRows,
    hasDailyRows: dailyRows.length > 0,
  }
}

// ─── Customer YoY Detail VM ─────────────────────────────

export interface CustomerYoYStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly currentCustomersStr: string
  readonly prevCustomersStr: string
  readonly yoyStr: string
  readonly hasPrev: boolean
}

export interface CustomerYoYDetailVm {
  readonly storeRows: readonly CustomerYoYStoreRowVm[]
  readonly totalCurrentStr: string
  readonly totalPrevStr: string
  readonly totalYoYStr: string
  readonly totalColor: string
  readonly dailyRows: readonly DailyYoYRow[]
  readonly hasDailyRows: boolean
}

export function buildCustomerYoYDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  effectiveConfig: ConditionSummaryConfig,
  prevYear: PrevYearData,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  dataMaxDay: number | undefined,
): CustomerYoYDetailVm {
  const prevTotal = prevYear.totalCustomers
  const yoyTotal = safeDivide(result.totalCustomers, prevTotal, 0)
  const totalSig = metricSignal(yoyTotal, 'customerYoY', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  const dailyRows = buildDailyYoYRows(result, prevYearMonthlyKpi)

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const prevStoreCustomers = computeStorePrevCustomers(prevYearMonthlyKpi, storeId, dataMaxDay)
    const storeYoY = safeDivide(sr.totalCustomers, prevStoreCustomers, 0)
    const sig =
      prevStoreCustomers > 0
        ? metricSignal(storeYoY, 'customerYoY', effectiveConfig, sr.storeId)
        : 'blue'
    const sigColor = SIGNAL_COLORS[sig]

    return {
      storeId,
      storeName,
      sigColor,
      currentCustomersStr: `${sr.totalCustomers.toLocaleString()}人`,
      prevCustomersStr: prevStoreCustomers > 0 ? `${prevStoreCustomers.toLocaleString()}人` : '—',
      yoyStr: prevStoreCustomers > 0 ? formatPercent(storeYoY, 2) : '—',
      hasPrev: prevStoreCustomers > 0,
    }
  })

  return {
    storeRows,
    totalCurrentStr: `${result.totalCustomers.toLocaleString()}人`,
    totalPrevStr: `${prevTotal.toLocaleString()}人`,
    totalYoYStr: formatPercent(yoyTotal, 2),
    totalColor,
    dailyRows,
    hasDailyRows: dailyRows.length > 0,
  }
}

// ─── Tx Value Detail VM ─────────────────────────────────

export interface TxValueStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly salesStr: string
  readonly customersStr: string
  readonly txStr: string
  readonly dailyRows: readonly TxValueDailyRowVm[]
}

export interface TxValueDailyRowVm {
  readonly day: number
  readonly dayLabel: string
  readonly salesStr: string
  readonly customersStr: string
  readonly txStr: string
}

export interface TxValueDetailVm {
  readonly storeRows: readonly TxValueStoreRowVm[]
  readonly totalSalesStr: string
  readonly totalCustomersStr: string
  readonly totalTxStr: string
}

export function formatTxValue(v: number): string {
  return `${v.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}円`
}

export function buildTxValueDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
): TxValueDetailVm {
  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const storeTx = sr.transactionValue

    const days = [...sr.daily.entries()].sort(([a], [b]) => a - b)
    const dailyRows = days.map(([day, dr]) => {
      const customers = dr.customers ?? 0
      const dayTx = safeDivide(dr.sales, customers, 0)
      return {
        day,
        dayLabel: `${day}日`,
        salesStr: formatCurrency(dr.sales),
        customersStr: `${customers.toLocaleString()}人`,
        txStr: formatTxValue(dayTx),
      }
    })

    return {
      storeId,
      storeName,
      salesStr: formatCurrency(sr.totalSales),
      customersStr: `${sr.totalCustomers.toLocaleString()}人`,
      txStr: formatTxValue(storeTx),
      dailyRows,
    }
  })

  return {
    storeRows,
    totalSalesStr: formatCurrency(result.totalSales),
    totalCustomersStr: `${result.totalCustomers.toLocaleString()}人`,
    totalTxStr: formatTxValue(result.transactionValue),
  }
}

// ─── Daily Sales Detail VM ──────────────────────────────

export interface DailySalesStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly salesStr: string
  readonly budgetStr: string
  readonly achievementStr: string
  readonly dailySalesStr: string
  readonly budgetDailyStr: string
  readonly hasBudget: boolean
  readonly dailyBreakdown: readonly DailySalesDayVm[]
}

export interface DailySalesDayVm {
  readonly day: number
  readonly dayLabel: string
  readonly salesStr: string
  readonly budgetStr: string
  readonly rateStr: string
  readonly hasRate: boolean
}

export interface DailySalesDetailVm {
  readonly storeRows: readonly DailySalesStoreRowVm[]
  readonly totalSalesStr: string
  readonly totalBudgetStr: string
  readonly totalAchievementStr: string
  readonly totalDailySalesStr: string
  readonly totalBudgetDailyStr: string
  readonly totalColor: string
  readonly hasTotalBudget: boolean
}

export function buildDailySalesDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  effectiveConfig: ConditionSummaryConfig,
  daysInMonth: number,
): DailySalesDetailVm {
  const budgetDailyAvg = daysInMonth > 0 ? result.budget / daysInMonth : 0
  const dailyRatio = safeDivide(result.averageDailySales, budgetDailyAvg, 0)
  const totalSig = metricSignal(dailyRatio, 'dailySales', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const storeBudgetDaily = daysInMonth > 0 ? sr.budget / daysInMonth : 0
    const storeRatio = safeDivide(sr.averageDailySales, storeBudgetDaily, 0)
    const achievementRate = safeDivide(sr.totalSales, sr.budget, 0)
    const sig =
      storeBudgetDaily > 0
        ? metricSignal(storeRatio, 'dailySales', effectiveConfig, sr.storeId)
        : 'blue'
    const sigColor = SIGNAL_COLORS[sig]

    const days = [...sr.daily.entries()].sort(([a], [b]) => a - b)
    let cumSales = 0
    let cumBudget = 0
    const dailyBreakdown = days.map(([day, dr]) => {
      const dayBudget = sr.budgetDaily.get(day) ?? 0
      cumSales += dr.sales
      cumBudget += dayBudget
      const dayRate = safeDivide(cumSales, cumBudget, 0)
      return {
        day,
        dayLabel: `${day}日`,
        salesStr: formatCurrency(dr.sales),
        budgetStr: formatCurrency(dayBudget),
        rateStr: cumBudget > 0 ? formatPercent(dayRate, 2) : '—',
        hasRate: cumBudget > 0,
      }
    })

    return {
      storeId,
      storeName,
      sigColor,
      salesStr: formatCurrency(sr.totalSales),
      budgetStr: formatCurrency(sr.budget),
      achievementStr: sr.budget > 0 ? formatPercent(achievementRate, 2) : '—',
      dailySalesStr: formatCurrency(sr.averageDailySales),
      budgetDailyStr: formatCurrency(storeBudgetDaily),
      hasBudget: sr.budget > 0,
      dailyBreakdown,
    }
  })

  return {
    storeRows,
    totalSalesStr: formatCurrency(result.totalSales),
    totalBudgetStr: formatCurrency(result.budget),
    totalAchievementStr:
      result.budget > 0 ? formatPercent(safeDivide(result.totalSales, result.budget, 0), 2) : '—',
    totalDailySalesStr: formatCurrency(result.averageDailySales),
    totalBudgetDailyStr: formatCurrency(budgetDailyAvg),
    totalColor,
    hasTotalBudget: result.budget > 0,
  }
}

// ─── Daily YoY Render Data VM ───────────────────────────

export interface DailyYoYRenderRow {
  readonly day: number
  readonly dayLabel: string
  readonly currentStr: string
  readonly prevStr: string
  readonly yoyStr: string
  readonly hasPrev: boolean
}

export function buildDailyYoYRenderRows(
  rows: readonly DailyYoYRow[],
  mode: 'cumulative' | 'daily',
  metric: 'sales' | 'customers',
): DailyYoYRenderRow[] {
  let cumCurrent = 0
  let cumPrev = 0

  return rows.map((row) => {
    const currentVal = metric === 'sales' ? row.currentSales : row.currentCustomers
    const prevVal = metric === 'sales' ? row.prevSales : row.prevCustomers
    cumCurrent += currentVal
    cumPrev += prevVal

    const displayCurrent = mode === 'cumulative' ? cumCurrent : currentVal
    const displayPrev = mode === 'cumulative' ? cumPrev : prevVal
    const yoy = safeDivide(displayCurrent, displayPrev, 0)

    const fmtVal =
      metric === 'sales'
        ? (v: number) => formatCurrency(v)
        : (v: number) => `${v.toLocaleString()}人`

    return {
      day: row.day,
      dayLabel: `${row.day}日`,
      currentStr: fmtVal(displayCurrent),
      prevStr: displayPrev > 0 ? fmtVal(displayPrev) : '—',
      yoyStr: displayPrev > 0 ? formatPercent(yoy, 2) : '—',
      hasPrev: displayPrev > 0,
    }
  })
}
