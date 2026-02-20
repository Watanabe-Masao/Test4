import { useMemo } from 'react'
import { useAppState } from '../context/AppStateContext'
import { useStoreSelection } from './useStoreSelection'
import { getDaysInMonth } from '@/domain/constants/defaults'

export interface PrevYearDailyEntry {
  readonly sales: number
  readonly discount: number
  readonly customers: number
}

export interface PrevYearData {
  readonly hasPrevYear: boolean
  readonly daily: ReadonlyMap<number, PrevYearDailyEntry>
  /** 経過日数分の前年同曜日売上合計 */
  readonly totalSales: number
  /** 経過日数分の前年同曜日売変合計 */
  readonly totalDiscount: number
  /** 経過日数分の前年同曜日客数合計 */
  readonly totalCustomers: number
}

const EMPTY: PrevYearData = {
  hasPrevYear: false,
  daily: new Map(),
  totalSales: 0,
  totalDiscount: 0,
  totalCustomers: 0,
}

/** null / undefined を除外して有効な数値のみ返す。無効なら undefined。 */
function validNum(v: number | null | undefined): number | undefined {
  if (v == null || isNaN(v)) return undefined
  return v
}

/**
 * 前年同曜日オフセットを算出する
 *
 * 当年 month/1 の曜日と前年 month/1 の曜日の差分を返す。
 * 例: 2026-02-01(日)=0, 2025-02-01(土)=6 → offset = (0-6+7)%7 = 1
 * → 当年 day d に対応する前年の日は d + offset
 * → Map 構築時に前年 day を day - offset のキーで格納する
 *
 * sourceYear / sourceMonth を指定すると、デフォルト (year-1, month) ではなく
 * 指定のソース年月との差分を算出する。
 * 入力が NaN の場合は 0 を返す。
 */
export function calcSameDowOffset(
  year: number,
  month: number,
  sourceYear?: number,
  sourceMonth?: number,
): number {
  const sy = sourceYear ?? (year - 1)
  const sm = sourceMonth ?? month
  // NaN ガード
  if (isNaN(year) || isNaN(month) || isNaN(sy) || isNaN(sm)) return 0
  const currentDow = new Date(year, month - 1, 1).getDay()
  const prevDow = new Date(sy, sm - 1, 1).getDay()
  const result = ((currentDow - prevDow) % 7 + 7) % 7
  return isNaN(result) ? 0 : result
}

/**
 * 前年データ集計フック（店舗選択に連動、同曜日対応付け）
 *
 * @param elapsedDays 当期の経過日数。指定すると totalSales/totalDiscount は
 *                    1〜elapsedDays の範囲のみ合計する（予算と同じ比較基準）
 */
export function usePrevYearData(elapsedDays?: number): PrevYearData {
  const state = useAppState()
  const { selectedStoreIds, isAllStores } = useStoreSelection()

  const prevYearDiscount = state.data.prevYearDiscount
  const { targetYear, targetMonth } = state.settings
  // null / undefined / NaN を安全に処理
  const prevYearSourceYear = validNum(state.settings.prevYearSourceYear)
  const prevYearSourceMonth = validNum(state.settings.prevYearSourceMonth)
  const prevYearDowOffset = validNum(state.settings.prevYearDowOffset)

  return useMemo(() => {
    const allStoreIds = Object.keys(prevYearDiscount)
    if (allStoreIds.length === 0) return EMPTY

    // 対象店舗を決定
    const targetIds = isAllStores
      ? allStoreIds
      : allStoreIds.filter((id) => selectedStoreIds.has(id))

    if (targetIds.length === 0) return EMPTY

    // 前年同曜日オフセット（手動指定 or 自動計算、0〜6 にクランプ）
    const rawOffset = prevYearDowOffset ??
      calcSameDowOffset(targetYear, targetMonth, prevYearSourceYear, prevYearSourceMonth)
    const offset = Math.max(0, Math.min(6, Math.round(rawOffset)))
    const daysInTargetMonth = getDaysInMonth(targetYear, targetMonth)

    if (isNaN(daysInTargetMonth) || daysInTargetMonth <= 0) return EMPTY

    // 日別に合算（キーを offset 分ずらして当年日に対応付け）
    const daily = new Map<number, { sales: number; discount: number; customers: number }>()
    for (const storeId of targetIds) {
      const days = prevYearDiscount[storeId]
      if (!days) continue
      for (const [dayStr, entry] of Object.entries(days)) {
        const origDay = Number(dayStr)
        if (isNaN(origDay)) continue
        const mappedDay = origDay - offset // 当年の日番号に対応付け
        if (mappedDay < 1 || mappedDay > daysInTargetMonth) continue // 当年月の範囲外はスキップ

        const sales = entry.sales ?? 0
        const discount = entry.discount ?? 0
        const customers = entry.customers ?? 0
        const existing = daily.get(mappedDay)
        if (existing) {
          daily.set(mappedDay, {
            sales: existing.sales + sales,
            discount: existing.discount + discount,
            customers: existing.customers + customers,
          })
        } else {
          daily.set(mappedDay, { sales, discount, customers })
        }
      }
    }

    // 経過日数分のみ合計（elapsedDays 指定時）
    const upperDay = elapsedDays ?? daysInTargetMonth
    let totalSales = 0
    let totalDiscount = 0
    let totalCustomers = 0
    for (const [day, entry] of daily) {
      if (day <= upperDay) {
        totalSales += entry.sales
        totalDiscount += entry.discount
        totalCustomers += entry.customers
      }
    }

    return { hasPrevYear: true, daily, totalSales, totalDiscount, totalCustomers }
  }, [prevYearDiscount, selectedStoreIds, isAllStores, targetYear, targetMonth, elapsedDays, prevYearSourceYear, prevYearSourceMonth, prevYearDowOffset])
}
