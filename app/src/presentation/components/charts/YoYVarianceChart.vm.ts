/**
 * YoYVarianceChart ViewModel
 *
 * 前年比差異・成長率・移動平均の計算ロジック。React 非依存。副作用なし。
 *
 * @guard F7 View は ViewModel のみ受け取る
 * @guard G5 hook ≤300行 — 純粋関数を分離
 */
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import {
  calculateTransactionValue,
  calculateMovingAverage,
  calculateGrowthRate,
} from '@/domain/calculations/utils'
import { maToNull } from './YoYVarianceChart.builders'
import type { DailyRecord } from '@/domain/models/record'

// ── 型定義 ──

export interface YoYVarianceRow {
  readonly day: number
  readonly salesDiff: number
  readonly discountDiff: number
  readonly customerDiff: number
  readonly cumSalesDiff: number
  readonly cumDiscountDiff: number
  readonly cumCustomerDiff: number
  readonly salesGrowth: number | null
  readonly customerGrowth: number | null
  readonly txValueGrowth: number | null
  readonly cumSalesGrowth: number | null
  readonly cumCustomerGrowth: number | null
  readonly cumTxValueGrowth: number | null
}

export interface YoYVarianceTotals {
  readonly salesDiff: number
  readonly discountDiff: number
  readonly customerDiff: number
}

export interface YoYVarianceData {
  readonly chartData: readonly YoYVarianceRow[]
  readonly totals: YoYVarianceTotals
  readonly salesGrowthMa7: readonly (number | null)[]
  readonly customerGrowthMa7: readonly (number | null)[]
  readonly txValueGrowthMa7: readonly (number | null)[]
}

// ── 計算ロジック ──

/**
 * 日別前年比データを集約する。
 *
 * 各日について:
 * - 売上・売変・客数の差分と累積差分
 * - 日別/累積成長率（売上・客数・客単価）
 * - 7日移動平均成長率
 */
export function aggregateYoYVarianceData(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  year: number,
  month: number,
  prevYearDaily: ReadonlyMap<string, { sales: number; discount: number; customers?: number }>,
): YoYVarianceData {
  let cumSalesDiff = 0,
    cumDiscountDiff = 0,
    cumCustomerDiff = 0
  let totalSalesDiff = 0,
    totalDiscountDiff = 0,
    totalCustomerDiff = 0
  let cumCurSales = 0,
    cumPrevSales = 0
  let cumCurCustomers = 0,
    cumPrevCustomers = 0
  let cumCurTxValueSum = 0,
    cumPrevTxValueSum = 0
  let cumCurTxDays = 0,
    cumPrevTxDays = 0

  const rawSalesGrowth: number[] = []
  const rawCustomerGrowth: number[] = []
  const rawTxValueGrowth: number[] = []

  const rows: YoYVarianceRow[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const prev = prevYearDaily.get(toDateKeyFromParts(year, month, d))
    const curSales = rec?.sales ?? 0
    const prevSales = prev?.sales ?? 0
    const curDiscount = rec?.discountAbsolute ?? 0
    const prevDiscount = prev?.discount ?? 0
    const curCustomers = rec?.customers ?? 0
    const prevCustomers = prev?.customers ?? 0

    const salesDiff = curSales - prevSales
    const discountDiff = curDiscount - prevDiscount
    const customerDiff = curCustomers - prevCustomers

    const curTxValue = curCustomers > 0 ? calculateTransactionValue(curSales, curCustomers) : null
    const prevTxValue =
      prevCustomers > 0 ? calculateTransactionValue(prevSales, prevCustomers) : null

    cumSalesDiff += salesDiff
    cumDiscountDiff += discountDiff
    cumCustomerDiff += customerDiff
    totalSalesDiff += salesDiff
    totalDiscountDiff += discountDiff
    totalCustomerDiff += customerDiff

    const salesGrowth = prevSales > 0 ? calculateGrowthRate(curSales, prevSales) : null
    const customerGrowth =
      prevCustomers > 0 ? calculateGrowthRate(curCustomers, prevCustomers) : null
    const txValueGrowth =
      curTxValue != null && prevTxValue != null && prevTxValue > 0
        ? calculateGrowthRate(curTxValue, prevTxValue)
        : null

    cumCurSales += curSales
    cumPrevSales += prevSales
    cumCurCustomers += curCustomers
    cumPrevCustomers += prevCustomers
    if (curTxValue != null) {
      cumCurTxValueSum += curTxValue
      cumCurTxDays++
    }
    if (prevTxValue != null) {
      cumPrevTxValueSum += prevTxValue
      cumPrevTxDays++
    }

    const cumSalesGrowth = cumPrevSales > 0 ? calculateGrowthRate(cumCurSales, cumPrevSales) : null
    const cumCustomerGrowth =
      cumPrevCustomers > 0 ? calculateGrowthRate(cumCurCustomers, cumPrevCustomers) : null
    const avgCurTx = cumCurTxDays > 0 ? cumCurTxValueSum / cumCurTxDays : 0
    const avgPrevTx = cumPrevTxDays > 0 ? cumPrevTxValueSum / cumPrevTxDays : 0
    const cumTxValueGrowth = avgPrevTx > 0 ? calculateGrowthRate(avgCurTx, avgPrevTx) : null

    rawSalesGrowth.push(salesGrowth ?? 0)
    rawCustomerGrowth.push(customerGrowth ?? 0)
    rawTxValueGrowth.push(txValueGrowth ?? 0)

    rows.push({
      day: d,
      salesDiff,
      discountDiff,
      customerDiff,
      cumSalesDiff,
      cumDiscountDiff,
      cumCustomerDiff,
      salesGrowth,
      customerGrowth,
      txValueGrowth,
      cumSalesGrowth,
      cumCustomerGrowth,
      cumTxValueGrowth,
    })
  }

  const salesGrowthMa7 = maToNull(calculateMovingAverage(rawSalesGrowth, 7))
  const customerGrowthMa7 = maToNull(calculateMovingAverage(rawCustomerGrowth, 7))
  const txValueGrowthMa7 = maToNull(calculateMovingAverage(rawTxValueGrowth, 7))

  return {
    chartData: rows,
    totals: {
      salesDiff: totalSalesDiff,
      discountDiff: totalDiscountDiff,
      customerDiff: totalCustomerDiff,
    },
    salesGrowthMa7,
    customerGrowthMa7,
    txValueGrowthMa7,
  }
}
