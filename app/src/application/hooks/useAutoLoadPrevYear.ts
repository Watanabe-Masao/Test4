import { useEffect } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import { loadMonthlySlice } from '@/infrastructure/storage/IndexedDBStore'
import { discountToSalesData } from '@/infrastructure/ImportService'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type { DiscountData, DiscountDayEntry, CategoryTimeSalesData, CategoryTimeSalesRecord } from '@/domain/models'

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
 *
 * prevYearSourceYear / prevYearSourceMonth 設定が指定されている場合、
 * そのソースから取得する（手動マッピング対応）。
 */
export function useAutoLoadPrevYear(): void {
  const state = useAppState()
  const dispatch = useAppDispatch()

  const { targetYear, targetMonth } = state.settings
  const hasPrevYearData = Object.keys(state.data.prevYearDiscount).length > 0
  const hasCurrentData = Object.keys(state.data.discount).length > 0

  // ソース年月（オーバーライドまたは自動）— NaN/undefined ガード
  const rawSourceYear = state.settings.prevYearSourceYear
  const rawSourceMonth = state.settings.prevYearSourceMonth
  const sourceYear = (typeof rawSourceYear === 'number' && !isNaN(rawSourceYear))
    ? rawSourceYear : (targetYear - 1)
  const sourceMonth = (typeof rawSourceMonth === 'number' && !isNaN(rawSourceMonth) && rawSourceMonth >= 1 && rawSourceMonth <= 12)
    ? rawSourceMonth : targetMonth

  useEffect(() => {
    if (hasPrevYearData || !hasCurrentData) return
    if (isNaN(sourceYear) || isNaN(sourceMonth)) return

    let cancelled = false
    const nextMonth = (sourceMonth % 12) + 1
    const nextMonthYear = sourceMonth === 12 ? sourceYear + 1 : sourceYear

    ;(async () => {
      try {
        // ソース年月の売変データをロード
        const prevDiscount = await loadMonthlySlice<DiscountData>(sourceYear, sourceMonth, 'discount')
        if (!prevDiscount || Object.keys(prevDiscount).length === 0) return
        if (cancelled) return

        // ソース年月の分類別時間帯売上をロード
        const prevCTS = await loadMonthlySlice<CategoryTimeSalesData>(sourceYear, sourceMonth, 'categoryTimeSales')

        // ソース翌月（overflow 用）
        const prevNextDiscount = await loadMonthlySlice<DiscountData>(nextMonthYear, nextMonth, 'discount')
        const prevNextCTS = await loadMonthlySlice<CategoryTimeSalesData>(nextMonthYear, nextMonth, 'categoryTimeSales')

        if (cancelled) return

        const daysInSourceMonth = getDaysInMonth(sourceYear, sourceMonth)
        if (isNaN(daysInSourceMonth) || daysInSourceMonth <= 0) return

        // 売変データ: 本月 + 翌月先頭を拡張day番号で結合
        const mergedDiscount: Record<string, Record<number, DiscountDayEntry>> = {}
        for (const [storeId, days] of Object.entries(prevDiscount)) {
          mergedDiscount[storeId] = { ...days }
        }
        if (prevNextDiscount) {
          for (const [storeId, days] of Object.entries(prevNextDiscount)) {
            if (!mergedDiscount[storeId]) mergedDiscount[storeId] = {}
            for (const [dayStr, entry] of Object.entries(days)) {
              const day = Number(dayStr)
              if (!isNaN(day) && day <= OVERFLOW_DAYS) {
                mergedDiscount[storeId][daysInSourceMonth + day] = entry
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
              mergedCTSRecords.push({ ...rec, day: daysInSourceMonth + rec.day })
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
  }, [sourceYear, sourceMonth, hasPrevYearData, hasCurrentData, dispatch])
}
