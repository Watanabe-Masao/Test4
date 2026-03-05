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
  budgetCum: number | null
  cumDiscountRate: number
  /** 前年差（当年売上 - 前年売上） */
  yoyDiff: number | null
  /** 前年差累計 */
  yoyDiffCum: number | null
  /** 予算日割（単日） */
  budgetDaily: number | null
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
  /** 前年差累計ウォーターフォール */
  wfYoyBase: number
  wfYoyUp: number
  wfYoyDown: number
  wfYoyCum: number
  salesMa7: number | null
  discountMa7: number | null
  prevDiscountMa7: number | null
}

/** 日別ベースデータ（ウォーターフォール前） */
export interface BaseDayItem {
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
  budgetCum: number | null
  cumDiscountRate: number
  yoyDiff: number | null
  yoyDiffCum: number | null
  budgetDaily: number | null
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
  year?: number,
  month?: number,
  selectedDows?: readonly number[],
  budgetDaily?: ReadonlyMap<number, number>,
): DailySalesDataResult {
  const { baseData, salesMa7, discountMa7, prevDiscountMa7, wfData } = useMemo(() => {
    const rawSales: number[] = []
    const rawDiscount: number[] = []
    const rawPrevDiscount: number[] = []
    let cumSales = 0,
      cumPrevSales = 0,
      cumDiscount = 0,
      cumGrossSales = 0,
      cumBudget = 0,
      cumYoyDiff = 0
    const bd: Omit<BaseDayItem, 'salesMa7' | 'discountMa7' | 'prevDiscountMa7'>[] = []
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

      const dayBudget = budgetDaily?.get(d) ?? null
      if (dayBudget != null) cumBudget += dayBudget

      const yoyDiff = prevSales != null ? sales - prevSales : null
      if (yoyDiff != null) cumYoyDiff += yoyDiff

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
        budgetCum: cumBudget > 0 ? cumBudget : null,
        cumDiscountRate,
        yoyDiff,
        yoyDiffCum: prevYearDaily ? cumYoyDiff : null,
        budgetDaily: dayBudget,
      })
    }

    const sMa7 = movingAverage(rawSales, 7)
    const dMa7 = movingAverage(rawDiscount, 7)
    const pdMa7 = movingAverage(rawPrevDiscount, 7)

    let wf: WaterfallItem[] | null = null
    if (isWf) {
      let wfCumSales = 0,
        wfCumDiscount = 0,
        wfCumCustomers = 0,
        wfCumYoy = 0
      wf = bd.map((item, i) => {
        const salesChange = i === 0 ? item.sales : item.sales - bd[i - 1].sales
        const discountChange = i === 0 ? item.discount : item.discount - bd[i - 1].discount
        const customersChange = i === 0 ? item.customers : item.customers - bd[i - 1].customers

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

        // 前年差ウォーターフォール（日別の前年差を積み上げ）
        const dayYoyDiff = item.yoyDiff ?? 0
        const wfYoyBase = dayYoyDiff >= 0 ? wfCumYoy : wfCumYoy + dayYoyDiff
        const wfYoyUp = dayYoyDiff >= 0 ? dayYoyDiff : 0
        const wfYoyDown = dayYoyDiff < 0 ? Math.abs(dayYoyDiff) : 0
        wfCumYoy += dayYoyDiff

        return {
          ...item,
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
          wfYoyBase,
          wfYoyUp,
          wfYoyDown,
          wfYoyCum: wfCumYoy,
          salesMa7: sMa7[i],
          discountMa7: dMa7[i],
          prevDiscountMa7: pdMa7[i],
        }
      })
    }

    return { baseData: bd, salesMa7: sMa7, discountMa7: dMa7, prevDiscountMa7: pdMa7, wfData: wf }
  }, [daily, daysInMonth, prevYearDaily, isWf, budgetDaily])

  /** 曜日フィルタ: 指定曜日に該当する日のみ通す */
  const dowFilter = useMemo(() => {
    if (!selectedDows || selectedDows.length === 0 || year == null || month == null) {
      return null // フィルタなし
    }
    const dowSet = new Set(selectedDows)
    return (day: number): boolean => {
      const dow = new Date(year, month - 1, day).getDay()
      return dowSet.has(dow)
    }
  }, [selectedDows, year, month])

  const data = useMemo(() => {
    const rangeFilter = (d: { day: number }) =>
      d.day >= rangeStart && d.day <= rangeEnd && (dowFilter == null || dowFilter(d.day))

    if (isWf && wfData) {
      return wfData.filter(rangeFilter)
    }
    return baseData
      .map((d, i) => ({
        ...d,
        salesMa7: salesMa7[i],
        discountMa7: discountMa7[i],
        prevDiscountMa7: prevDiscountMa7[i],
      }))
      .filter(rangeFilter)
  }, [
    isWf,
    wfData,
    baseData,
    salesMa7,
    discountMa7,
    prevDiscountMa7,
    rangeStart,
    rangeEnd,
    dowFilter,
  ])

  return { data, hasPrev: !!prevYearDaily }
}
