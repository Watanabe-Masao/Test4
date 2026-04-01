/**
 * comparisonDataPrep — 比較集計の入力データ準備（pure function）
 *
 * useComparisonModule 内で daily / kpi 集計の両方に必要な
 * SourceDataIndex, targetIds の準備を共通化する。
 * React 依存なし。
 */
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { ClassifiedSalesDaySummary } from '@/domain/models/ClassifiedSales'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models/record'
import { aggregateAllStores, indexByStoreDay } from '@/domain/models/record'
import type { SourceDataIndex, SourceMonthContext } from '@/application/comparison/sourceDataIndex'
import {
  buildSourceDataIndex,
  buildFlowersFullIndex,
  indexCtsQuantityByStoreDay,
  buildCtsFullIndex,
} from '@/application/comparison/sourceDataIndex'

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
  prevYear: MonthlyData,
  selectedStoreIds: ReadonlySet<string>,
  isAllStores: boolean,
): RawInputs | null {
  const prevYearCS = prevYear.classifiedSales
  if (prevYearCS.records.length === 0) return null

  const allAgg = aggregateAllStores(prevYearCS)
  const allStoreIds = Object.keys(allAgg)
  if (allStoreIds.length === 0) return null

  const targetIds = isAllStores ? allStoreIds : allStoreIds.filter((id) => selectedStoreIds.has(id))
  if (targetIds.length === 0) return null

  const prevYearFlowers = prevYear.flowers
  const flowersIndex =
    prevYearFlowers.records.length > 0 ? indexByStoreDay(prevYearFlowers.records) : undefined

  return { allAgg, targetIds, flowersIndex }
}

/**
 * 比較集計に必要な入力データを準備する。
 *
 * 前年 MonthlyData が null、分類別売上が空、対象店舗がない場合は null を返す。
 * SourceDataIndex を構築し、allAgg のリナンバリング詳細を封じ込める。
 */
export function prepareComparisonInputs(
  prevYear: MonthlyData | null,
  selectedStoreIds: ReadonlySet<string>,
  isAllStores: boolean,
  sourceMonthCtx: SourceMonthContext,
): ComparisonInputs | null {
  if (!prevYear) return null

  const raw = prepareRawInputs(prevYear, selectedStoreIds, isAllStores)
  if (!raw) return null

  const prevYearFlowers = prevYear.flowers
  const flowersFullIndex =
    prevYearFlowers.records.length > 0 ? buildFlowersFullIndex(prevYearFlowers.records) : undefined

  // CTS（販売点数）インデックス構築
  const prevYearCts = prevYear.categoryTimeSales
  const ctsIndex =
    prevYearCts.records.length > 0 ? indexCtsQuantityByStoreDay(prevYearCts.records) : undefined
  const ctsFullIndex =
    prevYearCts.records.length > 0 ? buildCtsFullIndex(prevYearCts.records) : undefined

  const sourceIndex = buildSourceDataIndex(
    raw.allAgg,
    raw.flowersIndex,
    sourceMonthCtx,
    flowersFullIndex,
    ctsIndex,
    ctsFullIndex,
  )
  return { sourceIndex, targetIds: raw.targetIds }
}
