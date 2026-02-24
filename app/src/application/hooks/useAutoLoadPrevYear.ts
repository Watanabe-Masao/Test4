import { useEffect } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import { useRepository } from '../context/RepositoryContext'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type { ClassifiedSalesData, ClassifiedSalesRecord, CategoryTimeSalesData, CategoryTimeSalesRecord } from '@/domain/models'

/**
 * 前年自動同期日数。
 * 同曜日オフセットにより月末データが翌月にはみ出す場合に備え、
 * 翌月先頭の数日を拡張day番号として取り込む。
 */
const OVERFLOW_DAYS = 6

/**
 * IndexedDB に保存済みの前年同月データを自動的にロードし、
 * prevYearClassifiedSales / prevYearCategoryTimeSales として
 * ステートに反映するフック。
 *
 * 動作条件:
 * - 当年データ（classifiedSales）がロード済み
 * - 前年データ（prevYearClassifiedSales）がまだ空（明示インポート優先）
 */
export function useAutoLoadPrevYear(): void {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const repo = useRepository()

  const { targetYear, targetMonth } = state.settings
  const hasPrevYearData = state.data.prevYearClassifiedSales.records.length > 0
  const hasCurrentData = state.data.classifiedSales.records.length > 0

  // ソース年月（オーバーライドまたは自動）
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
        // ソース年月の分類別売上データをロード
        const prevCS = await repo.loadDataSlice<ClassifiedSalesData>(sourceYear, sourceMonth, 'classifiedSales')
        if (cancelled || !prevCS || prevCS.records.length === 0) return

        // ソース年月の分類別時間帯売上をロード
        const prevCTS = await repo.loadDataSlice<CategoryTimeSalesData>(sourceYear, sourceMonth, 'categoryTimeSales')
        if (cancelled) return

        // ソース翌月（overflow 用）
        const prevNextCS = await repo.loadDataSlice<ClassifiedSalesData>(nextMonthYear, nextMonth, 'classifiedSales')
        if (cancelled) return
        const prevNextCTS = await repo.loadDataSlice<CategoryTimeSalesData>(nextMonthYear, nextMonth, 'categoryTimeSales')
        if (cancelled) return

        const daysInSourceMonth = getDaysInMonth(sourceYear, sourceMonth)
        if (isNaN(daysInSourceMonth) || daysInSourceMonth <= 0) return

        // 分類別売上: 本月 + 翌月先頭を拡張day番号で結合
        const mergedCSRecords: ClassifiedSalesRecord[] = [...prevCS.records]
        if (prevNextCS?.records) {
          for (const rec of prevNextCS.records) {
            if (rec.day <= OVERFLOW_DAYS) {
              mergedCSRecords.push({ ...rec, day: daysInSourceMonth + rec.day })
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
            prevYearClassifiedSales: { records: mergedCSRecords },
            prevYearCategoryTimeSales: { records: mergedCTSRecords },
          },
        })
      } catch {
        // IndexedDB エラー時は静かに無視
      }
    })()

    return () => { cancelled = true }
  }, [sourceYear, sourceMonth, hasPrevYearData, hasCurrentData, dispatch, repo])
}
