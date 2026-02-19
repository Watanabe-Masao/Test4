import type { ForecastInput, WeeklySummary } from '@/domain/calculations/forecast'
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
    const txValue = customers > 0 ? Math.round(rec.sales / customers) : 0
    const py = prevYear.daily.get(d)
    const prevCustomers = py?.customers ?? 0
    const prevSales = py?.sales ?? 0
    const prevTxValue = prevCustomers > 0 ? Math.round(prevSales / prevCustomers) : 0
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
    avgCustomers: b.count > 0 ? Math.round(b.totalCustomers / b.count) : 0,
    avgTxValue: b.totalCustomers > 0 ? Math.round(b.totalSales / b.totalCustomers) : 0,
    prevAvgCustomers: b.count > 0 ? Math.round(b.totalPrevCustomers / b.count) : 0,
    prevAvgTxValue: b.totalPrevCustomers > 0 ? Math.round(b.totalPrevSales / b.totalPrevCustomers) : 0,
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
    const txValueMA = customersMA > 0 ? salesMA / customersMA : 0
    const prevSalesMA = slice.reduce((s, e) => s + e.prevSales, 0) / n
    const prevCustomersMA = slice.reduce((s, e) => s + e.prevCustomers, 0) / n
    const prevTxValueMA = prevCustomersMA > 0 ? prevSalesMA / prevCustomersMA : 0
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
  const avgTxVal = avgCust > 0 ? avgSales / avgCust : 0

  return withCust.map((e) => ({
    day: e.day,
    sales: e.sales,
    customers: e.customers,
    txValue: e.txValue,
    salesIndex: avgSales > 0 ? e.sales / avgSales : 0,
    customersIndex: avgCust > 0 ? e.customers / avgCust : 0,
    txValueIndex: avgTxVal > 0 ? e.txValue / avgTxVal : 0,
  }))
}

export function buildRelationshipDataFromPrev(entries: DailyCustomerEntry[]): RelationshipEntry[] {
  const withCust = entries.filter((e) => e.prevCustomers > 0)
  if (withCust.length === 0) return []
  const avgSales = withCust.reduce((s, e) => s + e.prevSales, 0) / withCust.length
  const avgCust = withCust.reduce((s, e) => s + e.prevCustomers, 0) / withCust.length
  const avgTxVal = avgCust > 0 ? avgSales / avgCust : 0

  return withCust.map((e) => ({
    day: e.day,
    sales: e.prevSales,
    customers: e.prevCustomers,
    txValue: e.prevTxValue,
    salesIndex: avgSales > 0 ? e.prevSales / avgSales : 0,
    customersIndex: avgCust > 0 ? e.prevCustomers / avgCust : 0,
    txValueIndex: avgTxVal > 0 ? e.prevTxValue / avgTxVal : 0,
  }))
}
