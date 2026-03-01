/**
 * 日次売上データ変換フック
 *
 * DailySalesChart のデータ変換・フィルタロジックを分離。
 * ウォーターフォールデータ・移動平均の算出を担う。
 */
import { useMemo } from 'react'
import type { DailyRecord } from '@/domain/models'
import {
  safeDivide,
  calculateTransactionValue,
  calculateMovingAverage,
} from '@/domain/calculations'

/* ── Types ─────────────────────────────────── */

/** ウォーターフォール表示用の日別データ */
export interface WaterfallItem {
  day: number
  sales: number
  discount: number
  prevYearSales: number | null
  prevYearDiscount: number | null
  customers: number
  txValue: number | null
  prevCustomers: number | null
  prevTxValue: number | null
  currentCum: number
  prevYearCum: number | null
  cumDiscountRate: number
  wfSalesBase: number
  wfSalesUp: number
  wfSalesDown: number
  wfSalesCum: number
  wfDiscBase: number
  wfDiscUp: number
  wfDiscDown: number
  wfDiscCum: number
  wfCustBase: number
  wfCustUp: number
  wfCustDown: number
  wfCustCum: number
  salesMa7: number | null
  discountMa7: number | null
  prevDiscountMa7: number | null
}

/** 日別ベースデータ（ウォーターフォール前） */
interface BaseDayItem {
  day: number
  sales: number
  discount: number
  prevYearSales: number | null
  prevYearDiscount: number | null
  customers: number
  txValue: number | null
  prevCustomers: number | null
  prevTxValue: number | null
  currentCum: number
  prevYearCum: number | null
  cumDiscountRate: number
  salesMa7: number | null
  discountMa7: number | null
  prevDiscountMa7: number | null
}

/* ── Helpers ────────────────────────────────── */

/** N日移動平均を計算（ドメイン層のユーティリティに委譲） */
function movingAverage(values: number[], window: number): (number | null)[] {
  return calculateMovingAverage(values, window).map((v) => (isNaN(v) ? null : v))
}

/* ── Hook ───────────────────────────────────── */

export interface DailySalesDataResult {
  /** フィルタ・MA統合済みの表示用データ */
  readonly data: readonly (BaseDayItem | WaterfallItem)[]
  /** 前年データの有無 */
  readonly hasPrev: boolean
}

export function useDailySalesData(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  prevYearDaily:
    | ReadonlyMap<number, { sales: number; discount: number; customers?: number }>
    | undefined,
  isWf: boolean,
  rangeStart: number,
  rangeEnd: number,
): DailySalesDataResult {
  const { baseData, salesMa7, discountMa7, prevDiscountMa7, wfData } = useMemo(() => {
    const rawSales: number[] = []
    const rawDiscount: number[] = []
    const rawPrevDiscount: number[] = []
    let cumSales = 0,
      cumPrevSales = 0,
      cumDiscount = 0,
      cumGrossSales = 0
    const bd: {
      day: number
      sales: number
      discount: number
      prevYearSales: number | null
      prevYearDiscount: number | null
      customers: number
      txValue: number | null
      prevCustomers: number | null
      prevTxValue: number | null
      currentCum: number
      prevYearCum: number | null
      cumDiscountRate: number
    }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const sales = rec?.sales ?? 0
      const discount = rec?.discountAbsolute ?? 0
      const grossSales = rec?.grossSales ?? 0
      rawSales.push(sales)
      rawDiscount.push(discount)
      const prevEntry = prevYearDaily?.get(d)
      const prevSales = prevEntry?.sales ?? null
      const prevDiscount = prevEntry?.discount ?? null
      rawPrevDiscount.push(prevEntry?.discount ?? 0)
      const customers = rec?.customers ?? 0
      const txValue = customers > 0 ? calculateTransactionValue(sales, customers) : null
      const prevCustomers = prevEntry && 'customers' in prevEntry ? (prevEntry.customers ?? 0) : 0
      const pySales = prevEntry?.sales ?? 0
      const pyCustomers = prevEntry && 'customers' in prevEntry ? (prevEntry.customers ?? 0) : 0
      const prevTxValue = pyCustomers > 0 ? calculateTransactionValue(pySales, pyCustomers) : null

      cumSales += sales
      cumPrevSales += prevEntry?.sales ?? 0
      cumDiscount += discount
      cumGrossSales += grossSales
      const cumDiscountRate = safeDivide(cumDiscount, cumGrossSales, 0)

      bd.push({
        day: d,
        sales,
        discount,
        prevYearSales: prevSales,
        prevYearDiscount: prevDiscount,
        customers,
        txValue,
        prevCustomers: prevCustomers > 0 ? prevCustomers : null,
        prevTxValue,
        currentCum: cumSales,
        prevYearCum: cumPrevSales > 0 ? cumPrevSales : null,
        cumDiscountRate,
      })
    }

    const sMa7 = movingAverage(rawSales, 7)
    const dMa7 = movingAverage(rawDiscount, 7)
    const pdMa7 = movingAverage(rawPrevDiscount, 7)

    let wf: WaterfallItem[] | null = null
    if (isWf) {
      let wfCumSales = 0,
        wfCumDiscount = 0,
        wfCumCustomers = 0
      wf = bd.map((d, i) => {
        const salesChange = i === 0 ? d.sales : d.sales - bd[i - 1].sales
        const discountChange = i === 0 ? d.discount : d.discount - bd[i - 1].discount
        const customersChange = i === 0 ? d.customers : d.customers - bd[i - 1].customers

        const wfSalesBase = salesChange >= 0 ? wfCumSales : wfCumSales + salesChange
        const wfSalesUp = salesChange >= 0 ? salesChange : 0
        const wfSalesDown = salesChange < 0 ? Math.abs(salesChange) : 0
        wfCumSales += salesChange

        const wfDiscBase = discountChange >= 0 ? wfCumDiscount : wfCumDiscount + discountChange
        const wfDiscUp = discountChange >= 0 ? discountChange : 0
        const wfDiscDown = discountChange < 0 ? Math.abs(discountChange) : 0
        wfCumDiscount += discountChange

        const wfCustBase = customersChange >= 0 ? wfCumCustomers : wfCumCustomers + customersChange
        const wfCustUp = customersChange >= 0 ? customersChange : 0
        const wfCustDown = customersChange < 0 ? Math.abs(customersChange) : 0
        wfCumCustomers += customersChange

        return {
          ...d,
          wfSalesBase,
          wfSalesUp,
          wfSalesDown,
          wfSalesCum: wfCumSales,
          wfDiscBase,
          wfDiscUp,
          wfDiscDown,
          wfDiscCum: wfCumDiscount,
          wfCustBase,
          wfCustUp,
          wfCustDown,
          wfCustCum: wfCumCustomers,
          salesMa7: sMa7[i],
          discountMa7: dMa7[i],
          prevDiscountMa7: pdMa7[i],
        }
      })
    }

    return { baseData: bd, salesMa7: sMa7, discountMa7: dMa7, prevDiscountMa7: pdMa7, wfData: wf }
  }, [daily, daysInMonth, prevYearDaily, isWf])

  const data = useMemo(() => {
    if (isWf && wfData) {
      return wfData.filter((d) => d.day >= rangeStart && d.day <= rangeEnd)
    }
    return baseData
      .map((d, i) => ({
        ...d,
        salesMa7: salesMa7[i],
        discountMa7: discountMa7[i],
        prevDiscountMa7: prevDiscountMa7[i],
      }))
      .filter((d) => d.day >= rangeStart && d.day <= rangeEnd)
  }, [isWf, wfData, baseData, salesMa7, discountMa7, prevDiscountMa7, rangeStart, rangeEnd])

  return { data, hasPrev: !!prevYearDaily }
}
