import { useEffect } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import { loadMonthlySlice } from '@/infrastructure/storage/IndexedDBStore'
import { discountToSalesData } from '@/infrastructure/ImportService'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type { DiscountData, CategoryTimeSalesData, CategoryTimeSalesRecord } from '@/domain/models'

/**
 * 前年自動同期日数。
 * 同曜日オフセットにより月末データが翌月にはみ出す場合に備え、
 * 翌月先頭の数日を拡張day番号として取り込む。
 */
const OVERFLOW_DAYS = 6

/**
 * IndexedDB に保存済みの前年同月データを自動的にロードし、
 * prevYearSales / prevYearDiscount / prevYearCategoryTimeSales として
 * ステートに反映するフック。
 *
 * 動作条件:
 * - 当年データ（discount）がロード済み
 * - 前年データ（prevYearDiscount）がまだ空（明示インポート優先）
 *
 * 翌月先頭 OVERFLOW_DAYS 日分のデータも結合し、
 * 同曜日オフセットによる月末はみ出しに対応する。
 */
export function useAutoLoadPrevYear(): void {
  const state = useAppState()
  const dispatch = useAppDispatch()

  const { targetYear, targetMonth } = state.settings
  const hasPrevYearData = Object.keys(state.data.prevYearDiscount).length > 0
  const hasCurrentData = Object.keys(state.data.discount).length > 0

  useEffect(() => {
    if (hasPrevYearData || !hasCurrentData) return

    let cancelled = false
    const prevYear = targetYear - 1
    const nextMonth = (targetMonth % 12) + 1

    ;(async () => {
      try {
        // 前年同月の売変データをロード
        const prevDiscount = await loadMonthlySlice<DiscountData>(prevYear, targetMonth, 'discount')
        if (!prevDiscount || Object.keys(prevDiscount).length === 0) return
        if (cancelled) return

        // 前年同月の分類別時間帯売上をロード
        const prevCTS = await loadMonthlySlice<CategoryTimeSalesData>(prevYear, targetMonth, 'categoryTimeSales')

        // 前年翌月（overflow 用）
        const prevNextDiscount = await loadMonthlySlice<DiscountData>(prevYear, nextMonth, 'discount')
        const prevNextCTS = await loadMonthlySlice<CategoryTimeSalesData>(prevYear, nextMonth, 'categoryTimeSales')

        if (cancelled) return

        const daysInPrevMonth = getDaysInMonth(prevYear, targetMonth)

        // 売変データ: 本月 + 翌月先頭を拡張day番号で結合
        const mergedDiscount: Record<string, Record<number, { sales: number; discount: number; customers: number }>> = {}
        for (const [storeId, days] of Object.entries(prevDiscount)) {
          mergedDiscount[storeId] = { ...days }
        }
        if (prevNextDiscount) {
          for (const [storeId, days] of Object.entries(prevNextDiscount)) {
            if (!mergedDiscount[storeId]) mergedDiscount[storeId] = {}
            for (const [dayStr, entry] of Object.entries(days)) {
              const day = Number(dayStr)
              if (day <= OVERFLOW_DAYS) {
                mergedDiscount[storeId][daysInPrevMonth + day] = entry
              }
            }
          }
        }

        // CTS: 本月 + 翌月先頭を拡張day番号で結合
        const mergedCTSRecords: CategoryTimeSalesRecord[] = [
          ...(prevCTS?.records ?? []),
        ]
        if (prevNextCTS?.records) {
          for (const rec of prevNextCTS.records) {
            if (rec.day <= OVERFLOW_DAYS) {
              mergedCTSRecords.push({ ...rec, day: daysInPrevMonth + rec.day })
            }
          }
        }

        if (cancelled) return

        dispatch({
          type: 'SET_PREV_YEAR_AUTO_DATA',
          payload: {
            prevYearSales: discountToSalesData(mergedDiscount),
            prevYearDiscount: mergedDiscount,
            prevYearCategoryTimeSales: { records: mergedCTSRecords },
          },
        })
      } catch {
        // IndexedDB エラー時は静かに無視（前年データなしで動作を継続）
      }
    })()

    return () => { cancelled = true }
  }, [targetYear, targetMonth, hasPrevYearData, hasCurrentData, dispatch])
}
