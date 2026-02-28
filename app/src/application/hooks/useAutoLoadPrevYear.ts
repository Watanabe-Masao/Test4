import { useEffect } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { calculationCache } from '@/application/services/calculationCache'
import { useRepository } from '../context/useRepository'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type {
  ClassifiedSalesData,
  ClassifiedSalesRecord,
  CategoryTimeSalesData,
  CategoryTimeSalesRecord,
} from '@/domain/models'

/**
 * 前年自動同期日数。
 * 同曜日オフセットにより月末データが翌月にはみ出す場合に備え、
 * 翌月先頭の数日を拡張day番号として取り込む。
 * 同様に、前月末尾の数日も負の拡張day番号として取り込む。
 */
export const OVERFLOW_DAYS = 6

/** 隣接月の年月を算出する */
export function adjacentMonth(
  year: number,
  month: number,
  delta: 1 | -1,
): { year: number; month: number } {
  if (delta === 1) {
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  }
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/**
 * ソース月 ± 1ヶ月のレコードを拡張day番号でマージする。
 *
 * - 前月末 OVERFLOW_DAYS 日 → day = rec.day - daysInPrevMonth（≤0）
 * - 当月 → day そのまま
 * - 翌月頭 OVERFLOW_DAYS 日 → day = daysInSourceMonth + rec.day（>daysInSourceMonth）
 *
 * 全レコードの year/month は sourceYear/sourceMonth に正規化される。
 *
 * @typeParam T ClassifiedSalesRecord | CategoryTimeSalesRecord
 */
export function mergeAdjacentMonthRecords<
  T extends { readonly day: number; readonly year: number; readonly month: number },
>(
  sourceRecords: readonly T[],
  prevMonthRecords: readonly T[] | null | undefined,
  nextMonthRecords: readonly T[] | null | undefined,
  sourceYear: number,
  sourceMonth: number,
  daysInSourceMonth: number,
  daysInPrevMonth: number,
): T[] {
  // 本月レコード: year/month をソース年月に正規化
  const merged: T[] = sourceRecords.map((rec) => ({
    ...rec,
    year: sourceYear,
    month: sourceMonth,
  }))

  // 前月末尾（underflow）: 拡張day = rec.day - daysInPrevMonth（≤0）
  if (prevMonthRecords && daysInPrevMonth > 0) {
    const underflowStart = daysInPrevMonth - OVERFLOW_DAYS
    for (const rec of prevMonthRecords) {
      if (rec.day > underflowStart) {
        merged.push({
          ...rec,
          year: sourceYear,
          month: sourceMonth,
          day: rec.day - daysInPrevMonth,
        })
      }
    }
  }

  // 翌月先頭（overflow）: 拡張day = daysInSourceMonth + rec.day
  if (nextMonthRecords) {
    for (const rec of nextMonthRecords) {
      if (rec.day <= OVERFLOW_DAYS) {
        merged.push({
          ...rec,
          year: sourceYear,
          month: sourceMonth,
          day: daysInSourceMonth + rec.day,
        })
      }
    }
  }

  return merged
}

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

        useDataStore.getState().setPrevYearAutoData({
          prevYearClassifiedSales: { records: mergedCSRecords },
          prevYearCategoryTimeSales: { records: mergedCTSRecords },
        })
        calculationCache.clear()
        useUiStore.getState().invalidateCalculation()
      } catch {
        // IndexedDB エラー時は静かに無視
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sourceYear, sourceMonth, hasPrevYearData, hasCurrentData, repo])
}
