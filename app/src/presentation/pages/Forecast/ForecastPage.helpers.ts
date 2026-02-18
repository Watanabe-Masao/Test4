import type { ForecastInput, WeeklySummary } from '@/domain/calculations/forecast'

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
