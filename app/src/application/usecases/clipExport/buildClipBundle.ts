/**
 * クリップバンドル構築
 *
 * 1ヶ月分のデータを ClipBundle に変換し、自己完結型 HTML 用のデータを作成する。
 * DuckDB クエリは呼び出し元（presentation 層）が実行し、結果を渡す。
 */
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData } from '@/application/hooks/analytics'
import {
  decompose2,
  decompose3,
  decompose5,
} from '@/application/services/factorDecompositionBridge'
import { getPrevYearDailyValue } from '@/application/comparison/comparisonAccessors'
import type {
  ClipBundle,
  ClipDailyEntry,
  ClipPrevYearEntry,
  ClipCtsRecord,
  ClipDecomposition,
} from './types'

/** CTS レコードをシリアライズ可能な形式に変換 */
function toCtsClip(records: readonly CategoryTimeSalesRecord[]): ClipCtsRecord[] {
  return records.map((r) => ({
    day: r.day,
    deptCode: r.department.code,
    deptName: r.department.name,
    lineCode: r.line.code,
    lineName: r.line.name,
    klassCode: r.klass.code,
    klassName: r.klass.name,
    totalQuantity: r.totalQuantity,
    totalAmount: r.totalAmount,
    timeSlots: r.timeSlots.map((ts) => ({
      hour: ts.hour,
      quantity: ts.quantity,
      amount: ts.amount,
    })),
  }))
}

/** シャープリー分解を事前計算 */
function computeDecomposition(
  curSales: number,
  prevSales: number,
  curCustomers: number,
  prevCustomers: number,
  curCts: readonly CategoryTimeSalesRecord[],
  prevCts: readonly CategoryTimeSalesRecord[],
): ClipDecomposition | null {
  if (prevSales <= 0 || prevCustomers <= 0 || curCustomers <= 0) return null

  const d2 = decompose2(prevSales, curSales, prevCustomers, curCustomers)

  const curTotalQty = curCts.reduce((s, r) => s + r.totalQuantity, 0)
  const prevTotalQty = prevCts.reduce((s, r) => s + r.totalQuantity, 0)
  const hasQty = curTotalQty > 0 && prevTotalQty > 0

  const d3 = hasQty
    ? decompose3(prevSales, curSales, prevCustomers, curCustomers, prevTotalQty, curTotalQty)
    : null

  const d5 = hasQty
    ? decompose5(
        prevSales,
        curSales,
        prevCustomers,
        curCustomers,
        prevTotalQty,
        curTotalQty,
        curCts.map((r) => ({
          key: `${r.department.code}|${r.line.code}|${r.klass.code}`,
          qty: r.totalQuantity,
          amt: r.totalAmount,
        })),
        prevCts.map((r) => ({
          key: `${r.department.code}|${r.line.code}|${r.klass.code}`,
          qty: r.totalQuantity,
          amt: r.totalAmount,
        })),
      )
    : null

  return {
    curSales,
    prevSales,
    curCustomers,
    prevCustomers,
    curTotalQty,
    prevTotalQty,
    decompose2: d2,
    decompose3: d3,
    decompose5: d5,
  }
}

/** 月の日数を算出 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export interface BuildClipBundleParams {
  readonly result: StoreResult
  readonly prevYear: PrevYearData
  readonly year: number
  readonly month: number
  readonly storeName: string
  /** 当月の CTS レコード（DuckDB から取得済み） */
  readonly ctsRecords: readonly CategoryTimeSalesRecord[]
  /** 前年の CTS レコード（DuckDB から取得済み） */
  readonly ctsPrevRecords: readonly CategoryTimeSalesRecord[]
}

/**
 * StoreResult + CTS レコードから ClipBundle を構築する。
 * CTS レコードは呼び出し元が DuckDB から取得して渡す。
 */
export function buildClipBundle(params: BuildClipBundleParams): ClipBundle {
  const { result: r, prevYear, year, month, storeName, ctsRecords, ctsPrevRecords } = params
  const daysInMonth = getDaysInMonth(year, month)

  // 日別データ
  const daily: ClipDailyEntry[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const rec = r.daily.get(d)
    daily.push({
      day: d,
      sales: rec?.sales ?? 0,
      customers: rec?.customers ?? 0,
      discount: rec?.discountAmount ?? 0,
      totalCost: rec?.totalCost ?? 0,
      budget: r.budgetDaily.get(d) ?? 0,
    })
  }

  // 前年日別データ
  const prevYearDaily: ClipPrevYearEntry[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const entry = getPrevYearDailyValue(prevYear, year, month, d)
    if (entry) {
      prevYearDaily.push({
        day: d,
        sales: entry.sales,
        customers: entry.customers,
        discount: entry.discount,
      })
    }
  }

  // シャープリー分解
  const decomposition = computeDecomposition(
    r.totalSales,
    prevYear.totalSales,
    r.totalCustomers,
    prevYear.totalCustomers,
    ctsRecords,
    ctsPrevRecords,
  )

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    year,
    month,
    daysInMonth,
    storeName,
    summary: {
      totalSales: r.totalSales,
      totalCoreSales: r.totalCoreSales,
      totalCustomers: r.totalCustomers,
      totalDiscount: r.totalDiscount,
      totalCost: r.totalCost,
      budget: r.budget,
      grossProfitBudget: r.grossProfitBudget,
      budgetAchievementRate: r.budgetAchievementRate,
      averageMarkupRate: r.averageMarkupRate,
      coreMarkupRate: r.coreMarkupRate,
      invMethodGrossProfit: r.invMethodGrossProfit,
      invMethodGrossProfitRate: r.invMethodGrossProfitRate,
      estMethodMargin: r.estMethodMargin,
      estMethodMarginRate: r.estMethodMarginRate,
      averageDailySales: r.averageDailySales,
      projectedSales: r.projectedSales,
      totalCostInclusion: r.totalCostInclusion,
    },
    prevYear: {
      hasPrevYear: prevYear.hasPrevYear,
      totalSales: prevYear.totalSales,
      totalCustomers: prevYear.totalCustomers,
      totalDiscount: prevYear.totalDiscount,
    },
    daily,
    prevYearDaily,
    ctsRecords: toCtsClip(ctsRecords),
    ctsPrevRecords: toCtsClip(ctsPrevRecords),
    decomposition,
  }
}
