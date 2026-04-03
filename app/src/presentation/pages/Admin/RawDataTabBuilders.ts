/**
 * RawDataTab の pure builder 関数群
 *
 * React hooks を使わない純粋関数。
 * 全 index 構築を一括実行し、useMemo の数を削減する。
 */
import { aggregateAllStores, indexByStoreDay, type StoreDayIndex } from '@/domain/models/record'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import type { MonthlyData } from '@/domain/models/MonthlyData'

/** CTS レコードを store×day の売上合計に集約 */
function buildCtsIndex(
  records: readonly CategoryTimeSalesRecord[],
): StoreDayIndex<{ amount: number }> {
  const idx: Record<string, Record<number, { amount: number }>> = {}
  for (const rec of records) {
    const store = (idx[rec.storeId] ??= {})
    const existing = store[rec.day]
    store[rec.day] = { amount: (existing?.amount ?? 0) + rec.totalAmount }
  }
  return idx
}

const EMPTY_RECORDS: readonly never[] = []

export interface RawDataIndices {
  readonly csAgg: StoreDayIndex<{ sales: number; discount: number }>
  readonly prevCsAgg: StoreDayIndex<{ sales: number; discount: number }>
  readonly purchaseIdx: StoreDayIndex<unknown>
  readonly interStoreInIdx: StoreDayIndex<unknown>
  readonly interStoreOutIdx: StoreDayIndex<unknown>
  readonly flowersIdx: StoreDayIndex<unknown>
  readonly directProduceIdx: StoreDayIndex<unknown>
  readonly consumablesIdx: StoreDayIndex<unknown>
  readonly ctsIdx: StoreDayIndex<{ amount: number }>
}

/** 全 index を一括構築する pure 関数 */
export function buildAllIndices(
  current: MonthlyData | null,
  prevYear: MonthlyData | null,
): RawDataIndices {
  return {
    csAgg: current ? aggregateAllStores(current.classifiedSales) : {},
    prevCsAgg: prevYear ? aggregateAllStores(prevYear.classifiedSales) : {},
    purchaseIdx: indexByStoreDay(current?.purchase.records ?? EMPTY_RECORDS),
    interStoreInIdx: indexByStoreDay(current?.interStoreIn.records ?? EMPTY_RECORDS),
    interStoreOutIdx: indexByStoreDay(current?.interStoreOut.records ?? EMPTY_RECORDS),
    flowersIdx: indexByStoreDay(current?.flowers.records ?? EMPTY_RECORDS),
    directProduceIdx: indexByStoreDay(current?.directProduce.records ?? EMPTY_RECORDS),
    consumablesIdx: indexByStoreDay(current?.consumables.records ?? EMPTY_RECORDS),
    ctsIdx: buildCtsIndex(current?.categoryTimeSales.records ?? EMPTY_RECORDS),
  }
}
