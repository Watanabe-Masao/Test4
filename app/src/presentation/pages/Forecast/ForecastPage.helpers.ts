import type { ForecastInput, WeeklySummary } from '@/domain/calculations/forecast'
import { calculateTransactionValue, safeDivide } from '@/domain/calculations'
import { decompose2 } from '@/domain/calculations/factorDecomposition'
import type { DailyRecord } from '@/domain/models'
import type { PrevYearData } from '@/application/hooks'

export const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']
export const DEFAULT_DOW_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899']

/** Build a ForecastInput from a StoreResult */
export function buildForecastInput(
  r: { daily: ReadonlyMap<number, { sales: number; purchase: { cost: number } }> },
  year: number,
  month: number,
): ForecastInput {
  const dailySales = new Map<number, number>()
  const dailyGrossProfit = new Map<number, number>()
  for (const [d, rec] of r.daily) {
    dailySales.set(d, rec.sales)
    const gp = rec.sales - rec.purchase.cost
    dailyGrossProfit.set(d, gp)
  }
  return { year, month, dailySales, dailyGrossProfit }
}

/** Compute stacked bar data: for each week, break down sales by day-of-week */
export function computeStackedWeekData(
  weeks: readonly WeeklySummary[],
  dailySales: ReadonlyMap<number, number>,
  year: number,
  month: number,
): Record<string, string | number>[] {
  return weeks.map((w) => {
    const entry: Record<string, string | number> = { name: `第${w.weekNumber}週` }
    // Initialize all DOW keys to 0
    for (const label of DOW_LABELS) {
      entry[label] = 0
    }
    // Accumulate sales for each day in this week
    for (let d = w.startDay; d <= w.endDay; d++) {
      const sales = dailySales.get(d) ?? 0
      const dow = new Date(year, month - 1, d).getDay() // 0=Sun
      const label = DOW_LABELS[dow]
      entry[label] = (entry[label] as number) + sales
    }
    return entry
  })
}

// ─── 客数・客単価分析用ヘルパー ─────────────────────────

/** 日別客数データ */
export interface DailyCustomerEntry {
  day: number
  sales: number
  customers: number
  txValue: number
  prevCustomers: number
  prevSales: number
  prevTxValue: number
}

/** 日別データから客数エントリを構築 */
export function buildDailyCustomerData(
  daily: ReadonlyMap<number, DailyRecord>,
  prevYear: PrevYearData,
): DailyCustomerEntry[] {
  const entries: DailyCustomerEntry[] = []
  for (const [d, rec] of daily) {
    if (rec.sales <= 0) continue
    const customers = rec.customers ?? 0
    const txValue = calculateTransactionValue(rec.sales, customers)
    const py = prevYear.daily.get(d)
    const prevCustomers = py?.customers ?? 0
    const prevSales = py?.sales ?? 0
    const prevTxValue = calculateTransactionValue(prevSales, prevCustomers)
    entries.push({ day: d, sales: rec.sales, customers, txValue, prevCustomers, prevSales, prevTxValue })
  }
  return entries.sort((a, b) => a.day - b.day)
}

/** 曜日別客数集計 */
export interface DowCustomerAvg {
  dow: string
  avgCustomers: number
  avgTxValue: number
  prevAvgCustomers: number
  prevAvgTxValue: number
  count: number
}

export function buildDowCustomerAverages(
  entries: DailyCustomerEntry[],
  year: number,
  month: number,
): DowCustomerAvg[] {
  const buckets = DOW_LABELS.map((dow) => ({
    dow,
    totalCustomers: 0,
    totalSales: 0,
    totalPrevCustomers: 0,
    totalPrevSales: 0,
    count: 0,
  }))

  for (const e of entries) {
    const dow = new Date(year, month - 1, e.day).getDay()
    const b = buckets[dow]
    b.totalCustomers += e.customers
    b.totalSales += e.sales
    b.totalPrevCustomers += e.prevCustomers
    b.totalPrevSales += e.prevSales
    b.count++
  }

  return buckets.map((b) => ({
    dow: b.dow,
    avgCustomers: Math.round(safeDivide(b.totalCustomers, b.count)),
    avgTxValue: calculateTransactionValue(b.totalSales, b.totalCustomers),
    prevAvgCustomers: Math.round(safeDivide(b.totalPrevCustomers, b.count)),
    prevAvgTxValue: calculateTransactionValue(b.totalPrevSales, b.totalPrevCustomers),
    count: b.count,
  }))
}

/** 移動平均（N日窓） */
export interface MovingAvgEntry {
  day: number
  salesMA: number
  customersMA: number
  txValueMA: number
  prevSalesMA: number
  prevCustomersMA: number
  prevTxValueMA: number
}

export function buildMovingAverages(
  entries: DailyCustomerEntry[],
  window: number,
): MovingAvgEntry[] {
  const result: MovingAvgEntry[] = []
  for (let i = 0; i < entries.length; i++) {
    const start = Math.max(0, i - window + 1)
    const slice = entries.slice(start, i + 1)
    const n = slice.length
    const salesMA = slice.reduce((s, e) => s + e.sales, 0) / n
    const customersMA = slice.reduce((s, e) => s + e.customers, 0) / n
    const txValueMA = safeDivide(salesMA, customersMA)
    const prevSalesMA = slice.reduce((s, e) => s + e.prevSales, 0) / n
    const prevCustomersMA = slice.reduce((s, e) => s + e.prevCustomers, 0) / n
    const prevTxValueMA = safeDivide(prevSalesMA, prevCustomersMA)
    result.push({
      day: entries[i].day,
      salesMA: Math.round(salesMA),
      customersMA: Math.round(customersMA),
      txValueMA: Math.round(txValueMA),
      prevSalesMA: Math.round(prevSalesMA),
      prevCustomersMA: Math.round(prevCustomersMA),
      prevTxValueMA: Math.round(prevTxValueMA),
    })
  }
  return result
}

/** 売上・客数・客単価の関係性データ */
export interface RelationshipEntry {
  day: number
  sales: number
  customers: number
  txValue: number
  salesIndex: number
  customersIndex: number
  txValueIndex: number
}

export function buildRelationshipData(entries: DailyCustomerEntry[]): RelationshipEntry[] {
  const withCust = entries.filter((e) => e.customers > 0)
  if (withCust.length === 0) return []
  const avgSales = withCust.reduce((s, e) => s + e.sales, 0) / withCust.length
  const avgCust = withCust.reduce((s, e) => s + e.customers, 0) / withCust.length
  const avgTxVal = safeDivide(avgSales, avgCust)

  return withCust.map((e) => ({
    day: e.day,
    sales: e.sales,
    customers: e.customers,
    txValue: e.txValue,
    salesIndex: safeDivide(e.sales, avgSales),
    customersIndex: safeDivide(e.customers, avgCust),
    txValueIndex: safeDivide(e.txValue, avgTxVal),
  }))
}

export function buildRelationshipDataFromPrev(entries: DailyCustomerEntry[]): RelationshipEntry[] {
  const withCust = entries.filter((e) => e.prevCustomers > 0)
  if (withCust.length === 0) return []
  const avgSales = withCust.reduce((s, e) => s + e.prevSales, 0) / withCust.length
  const avgCust = withCust.reduce((s, e) => s + e.prevCustomers, 0) / withCust.length
  const avgTxVal = safeDivide(avgSales, avgCust)

  return withCust.map((e) => ({
    day: e.day,
    sales: e.prevSales,
    customers: e.prevCustomers,
    txValue: e.prevTxValue,
    salesIndex: safeDivide(e.prevSales, avgSales),
    customersIndex: safeDivide(e.prevCustomers, avgCust),
    txValueIndex: safeDivide(e.prevTxValue, avgTxVal),
  }))
}

// ─── 要因分解分析用ヘルパー ──────────────────────────

/** 日別要因分解エントリ */
export interface DailyDecompEntry {
  day: number
  salesDiff: number
  custEffect: number
  ticketEffect: number
  /** 累計 */
  cumSalesDiff: number
  cumCustEffect: number
  cumTicketEffect: number
}

/** 日別2要素分解データ構築 */
export function buildDailyDecomposition(
  entries: DailyCustomerEntry[],
): DailyDecompEntry[] {
  const withBoth = entries.filter((e) => e.customers > 0 && e.prevCustomers > 0)
  if (withBoth.length === 0) return []

  let cumSalesDiff = 0
  let cumCustEffect = 0
  let cumTicketEffect = 0

  return withBoth.map((e) => {
    const result = decompose2(e.prevSales, e.sales, e.prevCustomers, e.customers)
    const salesDiff = e.sales - e.prevSales
    cumSalesDiff += salesDiff
    cumCustEffect += result.custEffect
    cumTicketEffect += result.ticketEffect
    return {
      day: e.day,
      salesDiff,
      custEffect: result.custEffect,
      ticketEffect: result.ticketEffect,
      cumSalesDiff,
      cumCustEffect,
      cumTicketEffect,
    }
  })
}

/** 曜日別要因分解集計 */
export interface DowDecompAvg {
  dow: string
  avgSalesDiff: number
  avgCustEffect: number
  avgTicketEffect: number
  count: number
}

export function buildDowDecomposition(
  entries: DailyDecompEntry[],
  year: number,
  month: number,
): DowDecompAvg[] {
  const buckets = DOW_LABELS.map((dow) => ({
    dow,
    totalSalesDiff: 0,
    totalCustEffect: 0,
    totalTicketEffect: 0,
    count: 0,
  }))

  for (const e of entries) {
    const dow = new Date(year, month - 1, e.day).getDay()
    const b = buckets[dow]
    b.totalSalesDiff += e.salesDiff
    b.totalCustEffect += e.custEffect
    b.totalTicketEffect += e.ticketEffect
    b.count++
  }

  return buckets.map((b) => ({
    dow: b.dow,
    avgSalesDiff: Math.round(safeDivide(b.totalSalesDiff, b.count)),
    avgCustEffect: Math.round(safeDivide(b.totalCustEffect, b.count)),
    avgTicketEffect: Math.round(safeDivide(b.totalTicketEffect, b.count)),
    count: b.count,
  }))
}

/** 週別要因分解集計 */
export interface WeeklyDecompSummary {
  weekNumber: number
  startDay: number
  endDay: number
  salesDiff: number
  custEffect: number
  ticketEffect: number
}

export function buildWeeklyDecomposition(
  entries: DailyDecompEntry[],
  weeks: readonly WeeklySummary[],
): WeeklyDecompSummary[] {
  return weeks.map((w) => {
    const weekEntries = entries.filter((e) => e.day >= w.startDay && e.day <= w.endDay)
    return {
      weekNumber: w.weekNumber,
      startDay: w.startDay,
      endDay: w.endDay,
      salesDiff: weekEntries.reduce((s, e) => s + e.salesDiff, 0),
      custEffect: weekEntries.reduce((s, e) => s + e.custEffect, 0),
      ticketEffect: weekEntries.reduce((s, e) => s + e.ticketEffect, 0),
    }
  })
}
