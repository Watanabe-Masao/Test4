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
  PurchaseData,
  TransferData,
} from '@/domain/models/record'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'

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
  const hasPrevYearData = useDataStore(
    (s) => (s.appData.prevYear?.classifiedSales.records.length ?? 0) > 0,
  )
  const hasCurrentData = useDataStore(
    (s) => (s.appData.current?.classifiedSales.records.length ?? 0) > 0,
  )
  const settings = useSettingsStore((s) => s.settings)
  const repo = useRepository()

  const { targetYear, targetMonth } = settings

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
        // 全スライスを並列ロード（逐次 await → Promise.all で I/O 待ち短縮）
        const [
          prevCS,
          prevCTS,
          prevPrevCS,
          prevPrevCTS,
          prevNextCS,
          prevNextCTS,
          prevFlowers,
          prevPurchase,
          prevDirectProduce,
          prevInterStoreIn,
          prevInterStoreOut,
        ] = await Promise.all([
          repo.loadDataSlice<ClassifiedSalesData>(sourceYear, sourceMonth, 'classifiedSales'),
          repo.loadDataSlice<CategoryTimeSalesData>(sourceYear, sourceMonth, 'categoryTimeSales'),
          repo.loadDataSlice<ClassifiedSalesData>(prev.year, prev.month, 'classifiedSales'),
          repo.loadDataSlice<CategoryTimeSalesData>(prev.year, prev.month, 'categoryTimeSales'),
          repo.loadDataSlice<ClassifiedSalesData>(next.year, next.month, 'classifiedSales'),
          repo.loadDataSlice<CategoryTimeSalesData>(next.year, next.month, 'categoryTimeSales'),
          repo.loadDataSlice<SpecialSalesData>(sourceYear, sourceMonth, 'flowers'),
          repo.loadDataSlice<PurchaseData>(sourceYear, sourceMonth, 'purchase'),
          repo.loadDataSlice<SpecialSalesData>(sourceYear, sourceMonth, 'directProduce'),
          repo.loadDataSlice<TransferData>(sourceYear, sourceMonth, 'interStoreIn'),
          repo.loadDataSlice<TransferData>(sourceYear, sourceMonth, 'interStoreOut'),
        ])
        if (cancelled || !prevCS || prevCS.records.length === 0) return

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

        const base = createEmptyMonthlyData({
          year: sourceYear,
          month: sourceMonth,
          importedAt: new Date().toISOString(),
        })
        useDataStore.getState().setPrevYearMonthData({
          ...base,
          classifiedSales: { records: mergedCSRecords },
          categoryTimeSales: { records: mergedCTSRecords },
          flowers: prevFlowers ?? { records: [] },
          purchase: prevPurchase ?? { records: [] },
          directProduce: prevDirectProduce ?? { records: [] },
          interStoreIn: prevInterStoreIn ?? { records: [] },
          interStoreOut: prevInterStoreOut ?? { records: [] },
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
