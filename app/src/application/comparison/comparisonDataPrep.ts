/**
 * comparisonDataPrep — 比較集計の入力データ準備（pure function）
 *
 * useComparisonModule 内で daily / kpi 集計の両方に必要な
 * SourceDataIndex, targetIds の準備を共通化する。
 * React 依存なし。
 */
import type { ImportedData } from '@/domain/models/storeTypes'
import type { ClassifiedSalesDaySummary } from '@/domain/models/ClassifiedSales'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models/record'
import { aggregateAllStores, indexByStoreDay } from '@/domain/models/record'
import type { SourceDataIndex, SourceMonthContext } from '@/application/comparison/sourceDataIndex'
import { buildSourceDataIndex } from '@/application/comparison/sourceDataIndex'

/** prepareComparisonInputs の出力 */
export interface ComparisonInputs {
  readonly sourceIndex: SourceDataIndex
  readonly targetIds: readonly string[]
}

/** 内部: raw 素材（allAgg + flowersIndex + targetIds） */
interface RawInputs {
  readonly allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>>
  readonly targetIds: readonly string[]
  readonly flowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined
}

/** raw 素材を準備する（allAgg + flowersIndex + targetIds） */
function prepareRawInputs(
  data: ImportedData,
  selectedStoreIds: ReadonlySet<string>,
  isAllStores: boolean,
): RawInputs | null {
  const prevYearCS = data.prevYearClassifiedSales
  if (prevYearCS.records.length === 0) return null

  const allAgg = aggregateAllStores(prevYearCS)
  const allStoreIds = Object.keys(allAgg)
  if (allStoreIds.length === 0) return null

  const targetIds = isAllStores ? allStoreIds : allStoreIds.filter((id) => selectedStoreIds.has(id))
  if (targetIds.length === 0) return null

  const prevYearFlowers = data.prevYearFlowers
  const flowersIndex =
    prevYearFlowers.records.length > 0 ? indexByStoreDay(prevYearFlowers.records) : undefined

  return { allAgg, targetIds, flowersIndex }
}

/**
 * 比較集計に必要な入力データを準備する。
 *
 * 前年分類別売上が空、対象店舗がない、またはソース月が不明な場合は null を返す。
 * SourceDataIndex を構築し、allAgg のリナンバリング詳細を封じ込める。
 */
export function prepareComparisonInputs(
  data: ImportedData,
  selectedStoreIds: ReadonlySet<string>,
  isAllStores: boolean,
  sourceMonthCtx: SourceMonthContext,
): ComparisonInputs | null {
  const raw = prepareRawInputs(data, selectedStoreIds, isAllStores)
  if (!raw) return null

  const sourceIndex = buildSourceDataIndex(raw.allAgg, raw.flowersIndex, sourceMonthCtx)
  return { sourceIndex, targetIds: raw.targetIds }
}
