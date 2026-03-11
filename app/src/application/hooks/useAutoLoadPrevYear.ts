import { useEffect } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { invalidateAfterStateChange } from '@/application/services/stateInvalidation'
import { useRepository } from '../context/useRepository'
import { getDaysInMonth } from '@/domain/constants/defaults'
import {
  OVERFLOW_DAYS,
  adjacentMonth,
  mergeAdjacentMonthRecords,
} from '@/application/comparison/adjacentMonthUtils'
import type {
  ClassifiedSalesData,
  ClassifiedSalesRecord,
  CategoryTimeSalesData,
  CategoryTimeSalesRecord,
  SpecialSalesData,
} from '@/domain/models'

// バレル re-export（後方互換）
export { OVERFLOW_DAYS, adjacentMonth, mergeAdjacentMonthRecords }

/**
 * IndexedDB に保存済みの前年同月データを自動的にロードし、
 * prevYearClassifiedSales / prevYearCategoryTimeSales として
 * ステートに反映するフック。
 *
 * 動作条件:
 * - 当年データ（classifiedSales）がロード済み
 * - 前年データ（prevYearClassifiedSales）がまだ空（明示インポート優先）
 *
 * ソース月の前後1ヶ月も読み込み、拡張day番号でマージする。
 * 全マージレコードの year/month は sourceYear/sourceMonth に正規化される。
 */
export function useAutoLoadPrevYear(): void {
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)
  const repo = useRepository()

  const { targetYear, targetMonth } = settings
  const hasPrevYearData = data.prevYearClassifiedSales.records.length > 0
  const hasCurrentData = data.classifiedSales.records.length > 0

  // ソース年月（オーバーライドまたは自動）
  const rawSourceYear = settings.prevYearSourceYear
  const rawSourceMonth = settings.prevYearSourceMonth
  const sourceYear =
    typeof rawSourceYear === 'number' && !isNaN(rawSourceYear) ? rawSourceYear : targetYear - 1
  const sourceMonth =
    typeof rawSourceMonth === 'number' &&
    !isNaN(rawSourceMonth) &&
    rawSourceMonth >= 1 &&
    rawSourceMonth <= 12
      ? rawSourceMonth
      : targetMonth

  useEffect(() => {
    if (hasPrevYearData || !hasCurrentData) return
    if (isNaN(sourceYear) || isNaN(sourceMonth)) return

    let cancelled = false
    const prev = adjacentMonth(sourceYear, sourceMonth, -1)
    const next = adjacentMonth(sourceYear, sourceMonth, 1)

    ;(async () => {
      try {
        // ソース年月の分類別売上データをロード
        const prevCS = await repo.loadDataSlice<ClassifiedSalesData>(
          sourceYear,
          sourceMonth,
          'classifiedSales',
        )
        if (cancelled || !prevCS || prevCS.records.length === 0) return

        // ソース年月の分類別時間帯売上をロード
        const prevCTS = await repo.loadDataSlice<CategoryTimeSalesData>(
          sourceYear,
          sourceMonth,
          'categoryTimeSales',
        )
        if (cancelled) return

        // ソース前月（underflow 用）
        const prevPrevCS = await repo.loadDataSlice<ClassifiedSalesData>(
          prev.year,
          prev.month,
          'classifiedSales',
        )
        if (cancelled) return
        const prevPrevCTS = await repo.loadDataSlice<CategoryTimeSalesData>(
          prev.year,
          prev.month,
          'categoryTimeSales',
        )
        if (cancelled) return

        // ソース翌月（overflow 用）
        const prevNextCS = await repo.loadDataSlice<ClassifiedSalesData>(
          next.year,
          next.month,
          'classifiedSales',
        )
        if (cancelled) return
        const prevNextCTS = await repo.loadDataSlice<CategoryTimeSalesData>(
          next.year,
          next.month,
          'categoryTimeSales',
        )
        if (cancelled) return

        const daysInSourceMonth = getDaysInMonth(sourceYear, sourceMonth)
        if (isNaN(daysInSourceMonth) || daysInSourceMonth <= 0) return

        const daysInPrevMonth = getDaysInMonth(prev.year, prev.month)

        const mergedCSRecords = mergeAdjacentMonthRecords<ClassifiedSalesRecord>(
          prevCS.records,
          prevPrevCS?.records,
          prevNextCS?.records,
          sourceYear,
          sourceMonth,
          daysInSourceMonth,
          daysInPrevMonth,
        )

        const mergedCTSRecords = mergeAdjacentMonthRecords<CategoryTimeSalesRecord>(
          prevCTS?.records ?? [],
          prevPrevCTS?.records,
          prevNextCTS?.records,
          sourceYear,
          sourceMonth,
          daysInSourceMonth,
          daysInPrevMonth,
        )

        if (cancelled) return

        // 前年花データ（客数）をロード
        const prevFlowers = await repo.loadDataSlice<SpecialSalesData>(
          sourceYear,
          sourceMonth,
          'flowers',
        )
        if (cancelled) return

        useDataStore.getState().setPrevYearAutoData({
          prevYearClassifiedSales: { records: mergedCSRecords },
          prevYearCategoryTimeSales: { records: mergedCTSRecords },
          prevYearFlowers: prevFlowers ?? { records: [] },
        })
        invalidateAfterStateChange()
      } catch {
        // IndexedDB エラー時は静かに無視
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sourceYear, sourceMonth, hasPrevYearData, hasCurrentData, repo])
}
