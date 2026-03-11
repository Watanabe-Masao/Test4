/**
 * 日次売上データ変換の純粋関数群
 *
 * useDailySalesData.ts から分離した純粋関数。
 * React に依存せず、単体テスト可能。
 */
import type { DailyRecord } from '@/domain/models'
import {
  safeDivide,
  calculateTransactionValue,
  calculateMovingAverage,
} from '@/domain/calculations'
import type { BaseDayItem, WaterfallItem } from '../hooks/useDailySalesData'

/** N日移動平均を計算（ドメイン層のユーティリティに委譲） */
function movingAverage(values: number[], window: number): (number | null)[] {
  return calculateMovingAverage(values, window).map((v) => (isNaN(v) ? null : v))
}

/** buildBaseDayItems の戻り値 */
export interface BaseDayItemsResult {
  readonly baseData: Omit<BaseDayItem, 'salesMa7' | 'discountMa7' | 'prevDiscountMa7'>[]
  readonly salesMa7: (number | null)[]
  readonly discountMa7: (number | null)[]
  readonly prevDiscountMa7: (number | null)[]
}

/**
 * 日別ベースデータ（累積値・前年差・MA含む）を構築する純粋関数。
 *
 * useDailySalesData の最初の useMemo から抽出。
 */
export function buildBaseDayItems(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  prevYearDaily:
    | ReadonlyMap<number, { sales: number; discount: number; customers?: number }>
    | undefined,
  budgetDaily: ReadonlyMap<number, number> | undefined,
): BaseDayItemsResult {
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

  return {
    baseData: bd,
    salesMa7: movingAverage(rawSales, 7),
    discountMa7: movingAverage(rawDiscount, 7),
    prevDiscountMa7: movingAverage(rawPrevDiscount, 7),
  }
}

/**
 * ベースデータからウォーターフォール表示用データを構築する純粋関数。
 */
export function buildWaterfallData(
  baseData: readonly Omit<BaseDayItem, 'salesMa7' | 'discountMa7' | 'prevDiscountMa7'>[],
  salesMa7: readonly (number | null)[],
  discountMa7: readonly (number | null)[],
  prevDiscountMa7: readonly (number | null)[],
): WaterfallItem[] {
  let wfCumSales = 0,
    wfCumDiscount = 0,
    wfCumCustomers = 0,
    wfCumYoy = 0

  return baseData.map((item, i) => {
    const salesChange = i === 0 ? item.sales : item.sales - baseData[i - 1].sales
    const discountChange = i === 0 ? item.discount : item.discount - baseData[i - 1].discount
    const customersChange = i === 0 ? item.customers : item.customers - baseData[i - 1].customers

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
      salesMa7: salesMa7[i],
      discountMa7: discountMa7[i],
      prevDiscountMa7: prevDiscountMa7[i],
    }
  })
}

/**
 * 曜日フィルタ関数を生成する純粋関数。
 * 指定曜日に該当する日のみ通すフィルタを返す。
 */
export function createDowFilter(
  year: number,
  month: number,
  selectedDows: readonly number[],
): ((day: number) => boolean) | null {
  if (selectedDows.length === 0) return null
  const dowSet = new Set(selectedDows)
  return (day: number): boolean => {
    const dow = new Date(year, month - 1, day).getDay()
    return dowSet.has(dow)
  }
}
