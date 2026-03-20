/**
 * MonthlyCalendar の純粋関数ユーティリティ
 *
 * 週計算ロジック、セル判定関数などを MonthlyCalendar.tsx から分離。
 */
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import {
  calculateAchievementRate,
  calculateYoYRatio,
  calculateTransactionValue,
} from '@/domain/calculations/utils'
import type { StoreResult } from '@/domain/models'
import type { PrevYearData } from '@/application/hooks'
import type { WeatherCategory } from '@/domain/models'

export const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']
export const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export const WEATHER_ICONS: Record<WeatherCategory, string> = {
  sunny: '\u2600\uFE0F',
  cloudy: '\u2601\uFE0F',
  rainy: '\uD83C\uDF27\uFE0F',
  snowy: '\u2744\uFE0F',
  other: '\uD83C\uDF00',
}

/** 千円表記 (符号付き) */
export function fmtSenDiff(n: number): string {
  const sen = Math.round(n / 1_000)
  return `${sen >= 0 ? '+' : ''}${sen.toLocaleString()}千`
}

/** カレンダーグリッド（週ごとの日配列）を構築する */
export function buildCalendarWeeks(
  year: number,
  month: number,
  daysInMonth: number,
): (number | null)[][] {
  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = []
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7
  for (let i = 0; i < firstDow; i++) currentWeek.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }
  return weeks
}

export interface WeekSummary {
  wSales: number
  wBudget: number
  wDiff: number
  wAch: number
  wPySales: number
  wPyRatio: number
  wCustomers: number
  wTxVal: number
  dayCount: number
}

/** 週の集計を計算する */
export function calcWeekSummary(
  week: readonly (number | null)[],
  r: StoreResult,
  prevYear: PrevYearData,
  year: number,
  month: number,
): WeekSummary {
  let wSales = 0,
    wBudget = 0,
    wPySales = 0,
    wCustomers = 0,
    dayCount = 0
  for (const day of week) {
    if (day == null) continue
    const rec = r.daily.get(day)
    wSales += rec?.sales ?? 0
    wBudget += r.budgetDaily.get(day) ?? 0
    wPySales += prevYear.daily.get(toDateKeyFromParts(year, month, day))?.sales ?? 0
    wCustomers += rec?.customers ?? 0
    if ((rec?.sales ?? 0) > 0) dayCount++
  }
  const wDiff = wSales - wBudget
  const wAch = calculateAchievementRate(wSales, wBudget)
  const wPyRatio = calculateYoYRatio(wSales, wPySales)
  const wTxVal = calculateTransactionValue(wSales, wCustomers)
  return { wSales, wBudget, wDiff, wAch, wPySales, wPyRatio, wCustomers, wTxVal, dayCount }
}

/** 累計データを計算する */
export function buildCumulativeMaps(
  daysInMonth: number,
  r: StoreResult,
  prevYear: PrevYearData,
  year: number,
  month: number,
) {
  const cumBudget = new Map<number, number>()
  const cumSales = new Map<number, number>()
  const cumPrevYear = new Map<number, number>()
  const cumCustomers = new Map<number, number>()
  const cumPrevCustomers = new Map<number, number>()
  let runBudget = 0
  let runSales = 0
  let runPrevYear = 0
  let runCustomers = 0
  let runPrevCustomers = 0
  for (let d = 1; d <= daysInMonth; d++) {
    runBudget += r.budgetDaily.get(d) ?? 0
    runSales += r.daily.get(d)?.sales ?? 0
    runPrevYear += prevYear.daily.get(toDateKeyFromParts(year, month, d))?.sales ?? 0
    runCustomers += r.daily.get(d)?.customers ?? 0
    runPrevCustomers += prevYear.daily.get(toDateKeyFromParts(year, month, d))?.customers ?? 0
    cumBudget.set(d, runBudget)
    cumSales.set(d, runSales)
    cumPrevYear.set(d, runPrevYear)
    cumCustomers.set(d, runCustomers)
    cumPrevCustomers.set(d, runPrevCustomers)
  }
  return { cumBudget, cumSales, cumPrevYear, cumCustomers, cumPrevCustomers }
}
