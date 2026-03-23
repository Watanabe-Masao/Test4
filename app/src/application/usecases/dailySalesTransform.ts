/**
 * 日次売上データ変換の純粋関数群
 *
 * useDailySalesData.ts から分離した純粋関数。
 * React に依存せず、単体テスト可能。
 */
import type { DailyRecord } from '@/domain/models/record'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import {
  safeDivide,
  calculateTransactionValue,
  calculateAchievementRate,
  calculateYoYRatio,
} from '@/domain/calculations'
import type { BaseDayItem, DiffTarget, WaterfallItem } from '../hooks/useDailySalesData'

/** buildBaseDayItems の戻り値 */
export interface BaseDayItemsResult {
  readonly baseData: BaseDayItem[]
}

/**
 * 日別ベースデータ（累積値・前年差含む）を構築する純粋関数。
 *
 * useDailySalesData の最初の useMemo から抽出。
 */
export function buildBaseDayItems(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  prevYearDaily:
    | ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
    | undefined,
  budgetDaily: ReadonlyMap<number, number> | undefined,
  year: number,
  month: number,
): BaseDayItemsResult {
  let cumSales = 0,
    cumPrevSales = 0,
    cumDiscount = 0,
    cumPrevDiscount = 0,
    cumGrossSales = 0,
    cumBudget = 0,
    cumYoyDiff = 0,
    cumBudgetDiff = 0
  const bd: BaseDayItem[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    const sales = rec?.sales ?? 0
    const discount = rec?.discountAbsolute ?? 0
    const grossSales = rec?.grossSales ?? 0
    const prevEntry = prevYearDaily?.get(toDateKeyFromParts(year, month, d))
    const prevSales = prevEntry?.sales ?? null
    const prevDiscount = prevEntry?.discount != null ? Math.abs(prevEntry.discount) : null
    const customers = rec?.customers ?? 0
    const txValue = customers > 0 ? calculateTransactionValue(sales, customers) : null
    const prevCustomers = prevEntry && 'customers' in prevEntry ? (prevEntry.customers ?? 0) : 0
    const pySales = prevEntry?.sales ?? 0
    const pyCustomers = prevEntry && 'customers' in prevEntry ? (prevEntry.customers ?? 0) : 0
    const prevTxValue = pyCustomers > 0 ? calculateTransactionValue(pySales, pyCustomers) : null

    cumSales += sales
    cumPrevSales += prevEntry?.sales ?? 0
    cumDiscount += discount
    cumPrevDiscount += prevDiscount ?? 0
    cumGrossSales += grossSales
    const cumDiscountRate = safeDivide(cumDiscount, cumGrossSales, 0)

    const dayBudget = budgetDaily?.get(d) ?? null
    if (dayBudget != null) cumBudget += dayBudget

    const yoyDiff = prevSales != null ? sales - prevSales : null
    if (yoyDiff != null) cumYoyDiff += yoyDiff

    const budgetDiff = dayBudget != null ? sales - dayBudget : null
    if (budgetDiff != null) cumBudgetDiff += budgetDiff

    bd.push({
      day: d,
      sales,
      discount,
      prevYearSales: prevSales,
      prevYearDiscount: prevDiscount,
      customers,
      quantity: 0,
      txValue,
      prevCustomers: prevCustomers > 0 ? prevCustomers : null,
      prevQuantity: null,
      prevTxValue,
      currentCum: cumSales,
      prevYearCum: cumPrevSales > 0 ? cumPrevSales : null,
      budgetCum: cumBudget > 0 ? cumBudget : null,
      cumDiscountRate,
      discountCum: cumDiscount,
      prevYearDiscountCum: prevYearDaily ? cumPrevDiscount : null,
      yoyDiff,
      yoyDiffCum: prevYearDaily ? cumYoyDiff : null,
      budgetDiff,
      budgetDiffCum: budgetDaily ? cumBudgetDiff : null,
      budgetDaily: dayBudget,
      budgetAchievementRate: cumBudget > 0 ? calculateAchievementRate(cumSales, cumBudget) : null,
      yoyRatio: cumPrevSales > 0 ? calculateYoYRatio(cumSales, cumPrevSales) : null,
    })
  }

  return { baseData: bd }
}

/**
 * ベースデータからウォーターフォール表示用データを構築する純粋関数。
 */
export function buildWaterfallData(
  baseData: readonly BaseDayItem[],
  diffTarget: DiffTarget = 'yoy',
): WaterfallItem[] {
  let wfCumSales = 0,
    wfCumDiscount = 0,
    wfCumCustomers = 0,
    wfCumYoy = 0,
    wfCumDiscDiff = 0

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

    // 差分ウォーターフォール（diffTarget に応じて前年差 or 予算差を積み上げ）
    const dayDiff = diffTarget === 'budget' ? (item.budgetDiff ?? 0) : (item.yoyDiff ?? 0)
    const wfYoyBase = dayDiff >= 0 ? wfCumYoy : wfCumYoy + dayDiff
    const wfYoyUp = dayDiff >= 0 ? dayDiff : 0
    const wfYoyDown = dayDiff < 0 ? Math.abs(dayDiff) : 0
    wfCumYoy += dayDiff

    // 売変差累計（当期売変 - 前年売変 の累計）
    const dayDiscDiff = item.discount - (item.prevYearDiscount ?? 0)
    wfCumDiscDiff += dayDiscDiff

    return {
      ...item,
      discountDiffCum: wfCumDiscDiff,
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
