/**
 * CustomerScatterChart — pure data builders
 *
 * useMemo body の pure 計算抽出 (ADR-D-003 PR4)。
 * 客数×客単価の絶対値マップ / 前年比変化率マップ をそれぞれ算出する。
 * React hooks や I/O を含まない pure 関数。
 *
 * @responsibility R:utility
 */
import type { DailyRecord } from '@/domain/models/record'
import { calculateTransactionValue } from '@/domain/calculations/utils'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'

export interface ScatterPoint {
  readonly day: number
  readonly customers: number
  readonly txValue: number
  readonly sales: number
  readonly dow: number
}

export interface PrevScatterPoint {
  readonly day: number
  readonly customers: number
  readonly txValue: number
  readonly sales: number
}

export interface QuadrantCounts {
  readonly q1: number
  readonly q2: number
  readonly q3: number
  readonly q4: number
}

export interface AbsoluteScatterResult {
  readonly scatterData: readonly ScatterPoint[]
  readonly prevScatter: readonly PrevScatterPoint[]
  readonly avgCustomers: number
  readonly avgTxValue: number
  readonly quadrantCounts: QuadrantCounts
}

export interface YoyScatterPoint {
  readonly day: number
  readonly custChange: number
  readonly txChange: number
  readonly sales: number
  readonly dow: number
}

export interface YoyScatterResult {
  readonly yoyData: readonly YoyScatterPoint[]
  readonly yoyQuadrants: QuadrantCounts
}

type PrevYearDaily = ReadonlyMap<
  string,
  { sales: number; discount: number; customers?: number }
>

export function buildAbsoluteScatter(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  year: number,
  month: number,
  prevYearDaily: PrevYearDaily | undefined,
): AbsoluteScatterResult {
  const points: ScatterPoint[] = []
  const prevPoints: PrevScatterPoint[] = []
  let totalC = 0
  let totalT = 0
  let count = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const customers = rec?.customers ?? 0
    if (customers <= 0) continue
    const sales = rec?.sales ?? 0
    const txValue = calculateTransactionValue(sales, customers)
    const dow = new Date(year, month - 1, d).getDay()
    points.push({ day: d, customers, txValue, sales, dow })
    totalC += customers
    totalT += txValue
    count++
  }

  if (prevYearDaily) {
    for (let d = 1; d <= daysInMonth; d++) {
      const prev = prevYearDaily.get(toDateKeyFromParts(year, month, d))
      if (!prev?.customers || prev.customers <= 0) continue
      prevPoints.push({
        day: d,
        customers: prev.customers,
        txValue: calculateTransactionValue(prev.sales, prev.customers),
        sales: prev.sales,
      })
    }
  }

  const avgCustomers = count > 0 ? totalC / count : 0
  const avgTxValue = count > 0 ? totalT / count : 0
  let q1 = 0
  let q2 = 0
  let q3 = 0
  let q4 = 0
  for (const p of points) {
    if (p.customers >= avgCustomers && p.txValue >= avgTxValue) q1++
    else if (p.customers < avgCustomers && p.txValue >= avgTxValue) q2++
    else if (p.customers < avgCustomers && p.txValue < avgTxValue) q3++
    else q4++
  }

  return {
    scatterData: points,
    prevScatter: prevPoints,
    avgCustomers,
    avgTxValue,
    quadrantCounts: { q1, q2, q3, q4 },
  }
}

export function buildYoyScatter(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  year: number,
  month: number,
  prevYearDaily: PrevYearDaily | undefined,
): YoyScatterResult {
  if (!prevYearDaily) return { yoyData: [], yoyQuadrants: { q1: 0, q2: 0, q3: 0, q4: 0 } }
  const pts: YoyScatterPoint[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const customers = rec?.customers ?? 0
    if (customers <= 0) continue
    const prevEntry = prevYearDaily.get(toDateKeyFromParts(year, month, d))
    if (!prevEntry?.customers || prevEntry.customers <= 0) continue
    const txValue = calculateTransactionValue(rec?.sales ?? 0, customers)
    const prevTxValue = calculateTransactionValue(prevEntry.sales, prevEntry.customers)
    pts.push({
      day: d,
      custChange: (customers - prevEntry.customers) / prevEntry.customers,
      txChange: prevTxValue > 0 ? (txValue - prevTxValue) / prevTxValue : 0,
      sales: rec?.sales ?? 0,
      dow: new Date(year, month - 1, d).getDay(),
    })
  }
  let q1 = 0
  let q2 = 0
  let q3 = 0
  let q4 = 0
  for (const p of pts) {
    if (p.custChange >= 0 && p.txChange >= 0) q1++
    else if (p.custChange < 0 && p.txChange >= 0) q2++
    else if (p.custChange < 0 && p.txChange < 0) q3++
    else q4++
  }
  return { yoyData: pts, yoyQuadrants: { q1, q2, q3, q4 } }
}
