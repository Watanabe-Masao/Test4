/**
 * 日次売上データ変換フック
 *
 * DailySalesChart のデータ変換・フィルタロジックを分離。
 * ウォーターフォールデータの算出を担う。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { DailyRecord } from '@/domain/models/record'
import { buildBaseDayItems, buildWaterfallData, createDowFilter } from '@/features/sales'

/* ── Types ─────────────────────────────────── */

/** ウォーターフォール表示用の日別データ */
export interface WaterfallItem {
  day: number
  sales: number
  discount: number
  prevYearSales: number | null
  prevYearDiscount: number | null
  customers: number
  /** 買上点数（CTS 由来、DuckDB store_day_summary.total_quantity） */
  quantity: number
  txValue: number | null
  prevCustomers: number | null
  /** 前年買上点数 */
  prevQuantity: number | null
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
}

/** 日別ベースデータ（ウォーターフォール前） */
export interface BaseDayItem {
  day: number
  sales: number
  discount: number
  prevYearSales: number | null
  prevYearDiscount: number | null
  customers: number
  /** 買上点数（CTS 由来、DuckDB store_day_summary.total_quantity） */
  quantity: number
  txValue: number | null
  prevCustomers: number | null
  /** 前年買上点数 */
  prevQuantity: number | null
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

/** 日別点数データ（DuckDB 由来） */
export interface DailyQuantityData {
  /** 当期: day → quantity */
  readonly current: ReadonlyMap<number, number>
  /** 前年: day → quantity */
  readonly prev: ReadonlyMap<number, number>
}

type PrevYearDailyMap = ReadonlyMap<
  string,
  { sales: number; discount: number; customers?: number; ctsQuantity?: number }
>

function buildDailySalesData(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  prevYearDaily: PrevYearDailyMap | undefined,
  isWf: boolean,
  budgetDaily: ReadonlyMap<number, number> | undefined,
  year: number | undefined,
  month: number | undefined,
  diffTarget: DiffTarget | undefined,
  dailyQuantity: DailyQuantityData | undefined,
) {
  const result = buildBaseDayItems(
    daily,
    daysInMonth,
    prevYearDaily,
    budgetDaily,
    year ?? 2000,
    month ?? 1,
  )
  // DuckDB 由来の日別点数をマージ — 当年は常に上書きし、前年は値があるときだけ
  // 上書きする。prev を無条件に上書きすると、buildBaseDayItems が既に
  // prevYearDaily.ctsQuantity（JS 集計）から設定した値を消してしまい、
  // DuckDB 側の is_prev_year 行が空のときに「比較期点数」が消える。
  if (dailyQuantity) {
    for (const item of result.baseData) {
      item.quantity = dailyQuantity.current.get(item.day) ?? 0
      const prevQty = dailyQuantity.prev.get(item.day)
      if (prevQty != null && prevQty > 0) {
        item.prevQuantity = prevQty
      }
    }
  }
  const wfData = isWf ? buildWaterfallData(result.baseData, diffTarget ?? 'yoy') : null
  return { baseData: result.baseData, wfData }
}

export function useDailySalesData(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  prevYearDaily:
    | ReadonlyMap<
        string,
        { sales: number; discount: number; customers?: number; ctsQuantity?: number }
      >
    | undefined,
  isWf: boolean,
  rangeStart: number,
  rangeEnd: number,
  year?: number,
  month?: number,
  selectedDows?: readonly number[],
  budgetDaily?: ReadonlyMap<number, number>,
  diffTarget?: DiffTarget,
  dailyQuantity?: DailyQuantityData,
): DailySalesDataResult {
  const { baseData, wfData } = useMemo(
    () =>
      buildDailySalesData(
        daily,
        daysInMonth,
        prevYearDaily,
        isWf,
        budgetDaily,
        year,
        month,
        diffTarget,
        dailyQuantity,
      ),
    [daily, daysInMonth, prevYearDaily, isWf, budgetDaily, year, month, diffTarget, dailyQuantity],
  )

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
    return baseData.filter(rangeFilter)
  }, [isWf, wfData, baseData, rangeStart, rangeEnd, dowFilter])

  return { data, hasPrev: !!prevYearDaily }
}
