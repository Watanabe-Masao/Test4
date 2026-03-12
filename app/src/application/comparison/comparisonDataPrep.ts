/**
 * comparisonDataPrep — 比較集計の入力データ準備（pure function）
 *
 * useComparisonModule 内で daily / kpi 集計の両方に必要な
 * allAgg, targetIds, flowersIndex の準備を共通化する。
 * React 依存なし。
 */
import type { ImportedData } from '@/domain/models'
import type { ClassifiedSalesDaySummary } from '@/domain/models/ClassifiedSales'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models'
import { aggregateAllStores, indexByStoreDay } from '@/domain/models'

/** prepareComparisonInputs の出力 */
export interface ComparisonInputs {
  readonly allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>
  readonly targetIds: readonly string[]
  readonly flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined
}

/**
 * 比較集計に必要な入力データを準備する。
 *
 * 前年分類別売上が空、または対象店舗がない場合は null を返す。
 */
export function prepareComparisonInputs(
  data: ImportedData,
  selectedStoreIds: ReadonlySet<string>,
  isAllStores: boolean,
): ComparisonInputs | null {
  const prevYearCS = data.prevYearClassifiedSales
  if (prevYearCS.records.length === 0) return null

  const allAgg = aggregateAllStores(prevYearCS)
  const allStoreIds = Object.keys(allAgg)
  if (allStoreIds.length === 0) return null

  const targetIds = isAllStores
    ? allStoreIds
    : allStoreIds.filter((id) => selectedStoreIds.has(id))
  if (targetIds.length === 0) return null

  const prevYearFlowers = data.prevYearFlowers
  const flowersIndex =
    prevYearFlowers.records.length > 0 ? indexByStoreDay(prevYearFlowers.records) : undefined

  return { allAgg, targetIds, flowersIndex }
}
