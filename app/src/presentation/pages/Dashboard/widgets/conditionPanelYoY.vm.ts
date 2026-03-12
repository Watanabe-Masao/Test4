/**
 * 前年比（売上・客数）の ViewModel
 */
import type { StoreResult, Store } from '@/domain/models'
import { formatPercent, formatCurrency } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import type { PrevYearData } from '@/application/hooks/usePrevYearData'
import type { PrevYearMonthlyKpi } from '@/application/hooks/usePrevYearMonthlyKpi'
import { SIGNAL_COLORS, metricSignal } from './conditionSummaryUtils'

// ─── Helpers ────────────────────────────────────────────

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
      prevStoreSales > 0 ? metricSignal(storeYoY, 'salesYoY', effectiveConfig, sr.storeId) : 'blue'
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
