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

/** 前年データ集計フック（店舗選択に連動） */
export function usePrevYearData(): PrevYearData {
  const state = useAppState()
  const { selectedStoreIds, isAllStores } = useStoreSelection()

  const prevYearDiscount = state.data.prevYearDiscount

  return useMemo(() => {
    const allStoreIds = Object.keys(prevYearDiscount)
    if (allStoreIds.length === 0) return EMPTY

    // 対象店舗を決定
    const targetIds = isAllStores
      ? allStoreIds
      : allStoreIds.filter((id) => selectedStoreIds.has(id))

    if (targetIds.length === 0) return EMPTY

    // 日別に合算
    const daily = new Map<number, { sales: number; discount: number }>()
    for (const storeId of targetIds) {
      const days = prevYearDiscount[storeId]
      if (!days) continue
      for (const [dayStr, entry] of Object.entries(days)) {
        const day = Number(dayStr)
        const existing = daily.get(day)
        if (existing) {
          daily.set(day, {
            sales: existing.sales + entry.sales,
            discount: existing.discount + entry.discount,
          })
        } else {
          daily.set(day, { sales: entry.sales, discount: entry.discount })
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
  }, [prevYearDiscount, selectedStoreIds, isAllStores])
}
