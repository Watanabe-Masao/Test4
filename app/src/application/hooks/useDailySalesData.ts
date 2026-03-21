/**
 * 日次売上データ変換フック
 *
 * DailySalesChart のデータ変換・フィルタロジックを分離。
 * ウォーターフォールデータ・移動平均の算出を担う。
 */
import { useMemo } from 'react'
import type { DailyRecord } from '@/domain/models/record'
import {
  buildBaseDayItems,
  buildWaterfallData,
  createDowFilter,
} from '@/application/usecases/dailySalesTransform'

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
  /** 売変累計（当期） */
  discountCum: number
  /** 売変累計（前年） */
  prevYearDiscountCum: number | null
  /** 前年差（当年売上 - 前年売上） */
  yoyDiff: number | null
  /** 前年差累計 */
  yoyDiffCum: number | null
  /** 予算差（当日: 売上 - 予算） */
  budgetDiff: number | null
  /** 予算差累計 */
  budgetDiffCum: number | null
  /** 予算日割（単日） */
  budgetDaily: number | null
  /** 売変差累計（差分モード右軸用） */
  discountDiffCum: number
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
  /** 売変累計（当期） */
  discountCum: number
  /** 売変累計（前年） */
  prevYearDiscountCum: number | null
  yoyDiff: number | null
  yoyDiffCum: number | null
  /** 予算差（当日: 売上 - 予算） */
  budgetDiff: number | null
  /** 予算差累計 */
  budgetDiffCum: number | null
  budgetDaily: number | null
  /** 予算達成率（currentCum / budgetCum、1.0 = 100%） */
  budgetAchievementRate: number | null
  /** 前年比（currentCum / prevYearCum、1.0 = 100%） */
  yoyRatio: number | null
  salesMa7: number | null
  discountMa7: number | null
  prevDiscountMa7: number | null
}

/** 差分モードの比較対象 */
export type DiffTarget = 'yoy' | 'budget'

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
    | ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
    | undefined,
  isWf: boolean,
  rangeStart: number,
  rangeEnd: number,
  year?: number,
  month?: number,
  selectedDows?: readonly number[],
  budgetDaily?: ReadonlyMap<number, number>,
  diffTarget?: DiffTarget,
): DailySalesDataResult {
  const { baseData, salesMa7, discountMa7, prevDiscountMa7, wfData } = useMemo(() => {
    const result = buildBaseDayItems(
      daily,
      daysInMonth,
      prevYearDaily,
      budgetDaily,
      year ?? 2000,
      month ?? 1,
    )
    const wf = isWf
      ? buildWaterfallData(
          result.baseData,
          result.salesMa7,
          result.discountMa7,
          result.prevDiscountMa7,
          diffTarget ?? 'yoy',
        )
      : null
    return { ...result, wfData: wf }
  }, [daily, daysInMonth, prevYearDaily, isWf, budgetDaily, year, month, diffTarget])

  /** 曜日フィルタ: 指定曜日に該当する日のみ通す */
  const dowFilter = useMemo(() => {
    if (!selectedDows || selectedDows.length === 0 || year == null || month == null) {
      return null
    }
    return createDowFilter(year, month, selectedDows)
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
