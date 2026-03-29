/**
 * InsightTabForecast ViewModel
 *
 * 予測テーブルの週次集計・分解計算ロジック。React 非依存。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import type { DailyRecord } from '@/domain/models/record'
import { calculateTransactionValue } from '@/domain/calculations/utils'

// ── 型定義 ──

export interface WeeklyActualData {
  readonly weekNumber: number
  readonly weekCustomers: number
  readonly weekSales: number
  readonly weekTxValue: number
}

export interface DecompTotals {
  readonly salesDiff: number
  readonly custEffect: number
  readonly ticketEffect: number
  readonly custPct: number
}

// ── 計算ロジック ──

/** 週次の実績客数・売上・客単価を集約する */
export function computeWeeklyActuals(
  startDay: number,
  endDay: number,
  daily: ReadonlyMap<number, DailyRecord>,
): { customers: number; sales: number; txValue: number } {
  let customers = 0
  let sales = 0
  for (let day = startDay; day <= endDay; day++) {
    const rec = daily.get(day)
    if (rec) {
      customers += rec.customers ?? 0
      sales += rec.sales
    }
  }
  const txValue = calculateTransactionValue(sales, customers)
  return { customers, sales, txValue }
}

/** 分解行の寄与率を計算する */
export function computeDecompPct(custEffect: number, ticketEffect: number): number {
  const total = Math.abs(custEffect) + Math.abs(ticketEffect)
  return total > 0 ? custEffect / (custEffect + ticketEffect) : 0
}

/** 分解合計行を計算する */
export function computeDecompTotals(
  weeklyDecomp: readonly { salesDiff: number; custEffect: number; ticketEffect: number }[],
): DecompTotals {
  const totals = weeklyDecomp.reduce(
    (acc, w) => ({
      salesDiff: acc.salesDiff + w.salesDiff,
      custEffect: acc.custEffect + w.custEffect,
      ticketEffect: acc.ticketEffect + w.ticketEffect,
    }),
    { salesDiff: 0, custEffect: 0, ticketEffect: 0 },
  )
  const custPct = computeDecompPct(totals.custEffect, totals.ticketEffect)
  return { ...totals, custPct }
}
