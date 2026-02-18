import { useMemo } from 'react'
import { useAppState } from '../context/AppStateContext'
import { useStoreSelection } from './useStoreSelection'

export interface PrevYearDailyEntry {
  readonly sales: number
  readonly discount: number
}

export interface PrevYearData {
  readonly hasPrevYear: boolean
  readonly daily: ReadonlyMap<number, PrevYearDailyEntry>
  readonly totalSales: number
  readonly totalDiscount: number
}

const EMPTY: PrevYearData = {
  hasPrevYear: false,
  daily: new Map(),
  totalSales: 0,
  totalDiscount: 0,
}

/**
 * 前年同曜日オフセットを算出する
 *
 * 当年 month/1 の曜日と前年 month/1 の曜日の差分を返す。
 * 例: 2026-02-01(日)=0, 2025-02-01(土)=6 → offset = (0-6+7)%7 = 1
 * → 当年 day d に対応する前年の日は d + offset
 * → Map 構築時に前年 day を day - offset のキーで格納する
 */
function calcSameDowOffset(year: number, month: number): number {
  const currentDow = new Date(year, month - 1, 1).getDay()
  const prevDow = new Date(year - 1, month - 1, 1).getDay()
  return ((currentDow - prevDow) % 7 + 7) % 7
}

/** 前年データ集計フック（店舗選択に連動、同曜日対応付け） */
export function usePrevYearData(): PrevYearData {
  const state = useAppState()
  const { selectedStoreIds, isAllStores } = useStoreSelection()

  const prevYearDiscount = state.data.prevYearDiscount
  const { targetYear, targetMonth } = state.settings

  return useMemo(() => {
    const allStoreIds = Object.keys(prevYearDiscount)
    if (allStoreIds.length === 0) return EMPTY

    // 対象店舗を決定
    const targetIds = isAllStores
      ? allStoreIds
      : allStoreIds.filter((id) => selectedStoreIds.has(id))

    if (targetIds.length === 0) return EMPTY

    // 前年同曜日オフセット
    const offset = calcSameDowOffset(targetYear, targetMonth)

    // 日別に合算（キーを offset 分ずらして当年日に対応付け）
    const daily = new Map<number, { sales: number; discount: number }>()
    for (const storeId of targetIds) {
      const days = prevYearDiscount[storeId]
      if (!days) continue
      for (const [dayStr, entry] of Object.entries(days)) {
        const origDay = Number(dayStr)
        const mappedDay = origDay - offset // 当年の日番号に対応付け
        if (mappedDay < 1) continue // 対応する当年日がない場合はスキップ

        const existing = daily.get(mappedDay)
        if (existing) {
          daily.set(mappedDay, {
            sales: existing.sales + entry.sales,
            discount: existing.discount + entry.discount,
          })
        } else {
          daily.set(mappedDay, { sales: entry.sales, discount: entry.discount })
        }
      }
    }

    let totalSales = 0
    let totalDiscount = 0
    for (const entry of daily.values()) {
      totalSales += entry.sales
      totalDiscount += entry.discount
    }

    return { hasPrevYear: true, daily, totalSales, totalDiscount }
  }, [prevYearDiscount, selectedStoreIds, isAllStores, targetYear, targetMonth])
}
