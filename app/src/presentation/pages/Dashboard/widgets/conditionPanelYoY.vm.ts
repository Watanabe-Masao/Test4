/**
 * 前年比（売上・客数）の ViewModel
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import type { Store } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import { formatPercent } from '@/domain/formatting'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import { calculateYoYRatio, calculateAchievementRate } from '@/domain/calculations/utils'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import {
  type PrevYearData,
  type PrevYearMonthlyKpi,
  buildSameDowPoints,
} from '@/application/comparison/comparisonTypes'
import type { CurrentCtsQuantity } from './types'
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

  const pointMap = buildSameDowPoints(kpi.sameDow.dailyMapping)

  const rows: DailyYoYRow[] = []
  const days = [...r.daily.entries()].sort(([a], [b]) => a - b)
  for (const [day, dr] of days) {
    const point = pointMap.get(day)
    rows.push({
      day,
      currentSales: dr.sales,
      prevSales: point?.sales ?? 0,
      currentCustomers: dr.customers ?? 0,
      prevCustomers: point?.customers ?? 0,
    })
  }
  return rows
}

/**
 * Build daily YoY comparison rows for a specific store.
 * Uses storeContributions (per-store per-day) instead of dailyMapping (all-store aggregate).
 */
export function buildStoreDailyYoYRows(
  sr: StoreResult,
  kpi: PrevYearMonthlyKpi,
  storeId: string,
): DailyYoYRow[] {
  if (!kpi.hasPrevYear) return []

  // 前年の日別データを storeContributions からstore単位で集計
  const prevByDay = new Map<number, { sales: number; customers: number }>()
  for (const c of kpi.sameDow.storeContributions) {
    if (c.storeId !== storeId) continue
    const e = prevByDay.get(c.mappedDay) ?? { sales: 0, customers: 0 }
    e.sales += c.sales
    e.customers += c.customers
    prevByDay.set(c.mappedDay, e)
  }

  const rows: DailyYoYRow[] = []
  const days = [...sr.daily.entries()].sort(([a], [b]) => a - b)
  for (const [day, dr] of days) {
    const prev = prevByDay.get(day)
    rows.push({
      day,
      currentSales: dr.sales,
      prevSales: prev?.sales ?? 0,
      currentCustomers: dr.customers ?? 0,
      prevCustomers: prev?.customers ?? 0,
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
  fmtCurrency: CurrencyFormatter,
): SalesYoYDetailVm {
  const prevTotal = prevYear.totalSales
  const yoyTotal = calculateYoYRatio(result.totalSales, prevTotal)
  const totalSig = metricSignal(yoyTotal, 'salesYoY', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  const dailyRows = buildDailyYoYRows(result, prevYearMonthlyKpi)

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const prevStoreSales = computeStorePrevSales(prevYearMonthlyKpi, storeId, dataMaxDay)
    const storeYoY = calculateYoYRatio(sr.totalSales, prevStoreSales)
    const sig =
      prevStoreSales > 0 ? metricSignal(storeYoY, 'salesYoY', effectiveConfig, sr.storeId) : 'blue'
    const sigColor = SIGNAL_COLORS[sig]

    return {
      storeId,
      storeName,
      sigColor,
      currentSalesStr: fmtCurrency(sr.totalSales),
      prevSalesStr: prevStoreSales > 0 ? fmtCurrency(prevStoreSales) : '—',
      yoyStr: prevStoreSales > 0 ? formatPercent(storeYoY, 2) : '—',
      hasPrev: prevStoreSales > 0,
    }
  })

  return {
    storeRows,
    totalCurrentStr: fmtCurrency(result.totalSales),
    totalPrevStr: fmtCurrency(prevTotal),
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
  const yoyTotal = calculateYoYRatio(result.totalCustomers, prevTotal)
  const totalSig = metricSignal(yoyTotal, 'customerYoY', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  const dailyRows = buildDailyYoYRows(result, prevYearMonthlyKpi)

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const prevStoreCustomers = computeStorePrevCustomers(prevYearMonthlyKpi, storeId, dataMaxDay)
    const storeYoY = calculateYoYRatio(sr.totalCustomers, prevStoreCustomers)
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

// ─── Items (CTS) YoY Detail VM ──────────────────────────

export interface ItemsYoYStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly currentQtyStr: string
  readonly prevQtyStr: string
  readonly yoyStr: string
}

export interface ItemsYoYDailyRow {
  readonly day: number
  readonly currentQty: number
  readonly prevQty: number
}

export interface ItemsYoYDetailVm {
  readonly storeRows: readonly ItemsYoYStoreRowVm[]
  readonly totalCurrentStr: string
  readonly totalPrevStr: string
  readonly totalYoYStr: string
  readonly totalColor: string
  readonly dailyRows: readonly ItemsYoYDailyRow[]
  readonly hasDailyRows: boolean
}

/**
 * 店舗別の日別販売点数行を構築する。
 * 事前集計済みの currentCtsQuantity と prevYearMonthlyKpi から生成。
 * raw CTS レコードには一切触れない。
 */
export function buildItemsYoYStoreDailyRows(
  currentCtsQuantity: CurrentCtsQuantity,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  effectiveDay: number,
  storeId: string | null,
): ItemsYoYDailyRow[] {
  const dayMap = new Map<number, { cur: number; prev: number }>()

  // 当年: currentCtsQuantity から日別合計（全店 or 特定店舗）
  if (storeId == null) {
    for (const [day, qty] of currentCtsQuantity.byDay) {
      if (day > 0 && day <= effectiveDay) {
        dayMap.set(day, { cur: qty, prev: 0 })
      }
    }
  } else {
    // 店舗単位の日別データは byDay に含まれないため、byStore の合計を使い
    // 日別内訳は storeContributions から当年日付をヒントにする
    // ただし currentCtsQuantity には日×店舗の粒度がないため、
    // storeContributions を使って日別を構築する必要はない。
    // → currentCtsQuantity に byStoreDay がない場合は全店日別で代替
    // TODO: 将来的に byStoreDay を追加すれば完全な店舗別日別が可能
    for (const [day, qty] of currentCtsQuantity.byDay) {
      if (day > 0 && day <= effectiveDay) {
        dayMap.set(day, { cur: qty, prev: 0 })
      }
    }
  }

  // 前年: prevYearMonthlyKpi.sameDow.storeContributions から日別合計（alignment 適用済み）
  for (const contrib of prevYearMonthlyKpi.sameDow.storeContributions) {
    if (storeId != null && contrib.storeId !== storeId) continue
    if (contrib.mappedDay <= 0 || contrib.mappedDay > effectiveDay) continue
    const e = dayMap.get(contrib.mappedDay) ?? { cur: 0, prev: 0 }
    e.prev += contrib.ctsQuantity
    dayMap.set(contrib.mappedDay, e)
  }

  return [...dayMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, v]) => ({ day, currentQty: v.cur, prevQty: v.prev }))
}

/**
 * 販売点数前年比の DetailVM を構築する。
 * 事前集計済みデータのみ使用。raw CTS レコードには触れない。
 */
export function buildItemsYoYDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  effectiveConfig: ConditionSummaryConfig,
  currentCtsQuantity: CurrentCtsQuantity,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  effectiveDay: number,
): ItemsYoYDetailVm {
  const totalCurQty = currentCtsQuantity.total
  // 前年合計: storeContributions の ctsQuantity を effectiveDay 以内で合算
  let totalPrevQty = 0
  for (const contrib of prevYearMonthlyKpi.sameDow.storeContributions) {
    if (contrib.mappedDay <= 0 || contrib.mappedDay > effectiveDay) continue
    totalPrevQty += contrib.ctsQuantity
  }

  const totalYoY = calculateAchievementRate(totalCurQty, totalPrevQty)
  const totalSig = totalPrevQty > 0 ? metricSignal(totalYoY, 'itemsYoY', effectiveConfig) : 'blue'
  const totalColor = SIGNAL_COLORS[totalSig]

  // 前年の店舗別合計を storeContributions から集計
  const prevByStore = new Map<string, number>()
  for (const contrib of prevYearMonthlyKpi.sameDow.storeContributions) {
    if (contrib.mappedDay <= 0 || contrib.mappedDay > effectiveDay) continue
    prevByStore.set(contrib.storeId, (prevByStore.get(contrib.storeId) ?? 0) + contrib.ctsQuantity)
  }

  const storeRows = sortedStoreEntries.map(([storeId]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const curQty = currentCtsQuantity.byStore.get(storeId) ?? 0
    const prevQty = prevByStore.get(storeId) ?? 0
    const storeYoY = calculateAchievementRate(curQty, prevQty)
    const sig = prevQty > 0 ? metricSignal(storeYoY, 'itemsYoY', effectiveConfig, storeId) : 'blue'
    const sigColor = SIGNAL_COLORS[sig]
    return {
      storeId,
      storeName,
      sigColor,
      currentQtyStr: `${curQty.toLocaleString()}点`,
      prevQtyStr: prevQty > 0 ? `${prevQty.toLocaleString()}点` : '—',
      yoyStr: prevQty > 0 ? formatPercent(storeYoY, 2) : '—',
    }
  })

  const dailyRows = buildItemsYoYStoreDailyRows(
    currentCtsQuantity,
    prevYearMonthlyKpi,
    effectiveDay,
    null,
  )

  return {
    storeRows,
    totalCurrentStr: `${totalCurQty.toLocaleString()}点`,
    totalPrevStr: totalPrevQty > 0 ? `${totalPrevQty.toLocaleString()}点` : '—',
    totalYoYStr: totalPrevQty > 0 ? formatPercent(totalYoY, 2) : '—',
    totalColor,
    dailyRows,
    hasDailyRows: dailyRows.length > 0,
  }
}

// ─── TotalCost YoY Detail VM ────────────────────────────

export interface TotalCostYoYStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly currentCostStr: string
  readonly prevCostStr: string
  readonly yoyStr: string
}

export interface TotalCostYoYDetailVm {
  readonly storeRows: readonly TotalCostYoYStoreRowVm[]
  readonly totalCurrentStr: string
  readonly totalPrevStr: string
  readonly totalYoYStr: string
  readonly totalColor: string
}

export function buildTotalCostYoYDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  effectiveConfig: ConditionSummaryConfig,
  prevYearStoreCostPrice: ReadonlyMap<string, { cost: number; price: number }> | undefined,
  fmtCurrency: CurrencyFormatter,
): TotalCostYoYDetailVm {
  const prevTotal =
    prevYearStoreCostPrice != null
      ? [...prevYearStoreCostPrice.values()].reduce((s, v) => s + v.cost, 0)
      : 0
  const curTotal = sortedStoreEntries.reduce((s, [, sr]) => s + sr.totalCost, 0)
  const totalYoY = calculateYoYRatio(curTotal, prevTotal)
  const totalSig = prevTotal > 0 ? metricSignal(totalYoY, 'customerYoY', effectiveConfig) : 'blue'
  const totalColor = SIGNAL_COLORS[totalSig]

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const prevCost = prevYearStoreCostPrice?.get(storeId)?.cost ?? 0
    const storeYoY = calculateYoYRatio(sr.totalCost, prevCost)
    const sig =
      prevCost > 0 ? metricSignal(storeYoY, 'customerYoY', effectiveConfig, storeId) : 'blue'
    const sigColor = SIGNAL_COLORS[sig]
    return {
      storeId,
      storeName,
      sigColor,
      currentCostStr: fmtCurrency(sr.totalCost),
      prevCostStr: prevCost > 0 ? fmtCurrency(prevCost) : '—',
      yoyStr: prevCost > 0 ? formatPercent(storeYoY, 2) : '—',
    }
  })

  return {
    storeRows,
    totalCurrentStr: fmtCurrency(curTotal),
    totalPrevStr: prevTotal > 0 ? fmtCurrency(prevTotal) : '—',
    totalYoYStr: prevTotal > 0 ? formatPercent(totalYoY, 2) : '—',
    totalColor,
  }
}
