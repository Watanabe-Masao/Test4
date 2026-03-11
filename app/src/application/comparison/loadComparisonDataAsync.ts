/**
 * 比較データ非同期ロード — useLoadComparisonData から抽出した純粋非同期関数
 *
 * React hook の useEffect 内にあった ~130 行の async IIFE を独立させ、
 * テスト可能かつ責務を明確にした。
 */
import type { DataRepository } from '@/domain/repositories'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type {
  ClassifiedSalesData,
  ClassifiedSalesRecord,
  CategoryTimeSalesData,
  CategoryTimeSalesRecord,
  SpecialSalesData,
} from '@/domain/models'
import type { QueryMonth } from '@/domain/models/ComparisonScope'
import type { LoadAction } from './comparisonLoadLogic'
import { mergeAdjacentMonthRecords, adjacentMonth } from './adjacentMonthUtils'

/** ロード結果（store 更新用データ） */
export interface ComparisonLoadResult {
  readonly prevYearClassifiedSales: { records: ClassifiedSalesRecord[] }
  readonly prevYearCategoryTimeSales: { records: CategoryTimeSalesRecord[] }
  readonly prevYearFlowers: SpecialSalesData
}

/** 比較データを IndexedDB から非同期ロードし、マージ済みデータを返す */
export async function loadComparisonDataAsync(
  repo: DataRepository,
  sourceYear: number,
  sourceMonth: number,
  ranges: readonly QueryMonth[],
  dispatch: (action: LoadAction) => void,
  isCancelled: () => boolean,
): Promise<ComparisonLoadResult | null> {
  const loadedRanges: QueryMonth[] = []

  dispatch({ type: 'start', requestedRanges: ranges })

  const prev = adjacentMonth(sourceYear, sourceMonth, -1)
  const next = adjacentMonth(sourceYear, sourceMonth, 1)

  // ソース月のデータをロード
  const prevCS = await repo.loadDataSlice<ClassifiedSalesData>(
    sourceYear,
    sourceMonth,
    'classifiedSales',
  )
  if (isCancelled()) return null
  if (!prevCS || prevCS.records.length === 0) {
    dispatch({
      type: 'partial',
      requestedRanges: ranges,
      loadedRanges: [],
      error: 'No classified sales data found for comparison period',
    })
    return null
  }
  loadedRanges.push({ year: sourceYear, month: sourceMonth })

  // カテゴリ時間帯売上
  const prevCTS = await repo.loadDataSlice<CategoryTimeSalesData>(
    sourceYear,
    sourceMonth,
    'categoryTimeSales',
  )
  if (isCancelled()) return null

  // 前月（underflow 用）
  const prevPrevCS = await repo.loadDataSlice<ClassifiedSalesData>(
    prev.year,
    prev.month,
    'classifiedSales',
  )
  if (isCancelled()) return null
  if (prevPrevCS) loadedRanges.push({ year: prev.year, month: prev.month })

  const prevPrevCTS = await repo.loadDataSlice<CategoryTimeSalesData>(
    prev.year,
    prev.month,
    'categoryTimeSales',
  )
  if (isCancelled()) return null

  // 翌月（overflow 用）
  const prevNextCS = await repo.loadDataSlice<ClassifiedSalesData>(
    next.year,
    next.month,
    'classifiedSales',
  )
  if (isCancelled()) return null
  if (prevNextCS) loadedRanges.push({ year: next.year, month: next.month })

  const prevNextCTS = await repo.loadDataSlice<CategoryTimeSalesData>(
    next.year,
    next.month,
    'categoryTimeSales',
  )
  if (isCancelled()) return null

  const daysInSourceMonth = getDaysInMonth(sourceYear, sourceMonth)
  if (isNaN(daysInSourceMonth) || daysInSourceMonth <= 0) {
    dispatch({
      type: 'error',
      requestedRanges: ranges,
      loadedRanges,
      error: `Invalid days in month: ${sourceYear}-${sourceMonth}`,
    })
    return null
  }

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

  if (isCancelled()) return null

  // 花データ（客数）
  const prevFlowers = await repo.loadDataSlice<SpecialSalesData>(sourceYear, sourceMonth, 'flowers')
  if (isCancelled()) return null

  dispatch({
    type: 'success',
    requestedRanges: ranges,
    loadedRanges,
  })

  return {
    prevYearClassifiedSales: { records: mergedCSRecords },
    prevYearCategoryTimeSales: { records: mergedCTSRecords },
    prevYearFlowers: prevFlowers ?? { records: [] },
  }
}
