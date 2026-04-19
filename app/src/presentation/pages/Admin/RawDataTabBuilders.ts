/**
 * RawDataTab の pure builder 関数群
 *
 * React hooks を使わない純粋関数。
 * 全 index 構築を一括実行し、useMemo の数を削減する。
 */
import { aggregateAllStores, indexByStoreDay, type StoreDayIndex } from '@/domain/models/record'
import type { MonthlyData } from '@/domain/models/MonthlyData'

/**
 * CTS レコードを store×day の売上合計に集約。
 *
 * 使用 field は `storeId / day / totalAmount` のみで、dept/line/klass は不要。
 * raw CTS 型と `CategoryLeafDailyEntry` の双方を structural subtype で受け付ける
 * ため、projection を挟まず直接消費できる (category-leaf-daily-entry-shape-break
 * Phase 1: 必要のない projection を強制しない方針)。
 */
function buildCtsIndex(
  records: readonly {
    readonly storeId: string
    readonly day: number
    readonly totalAmount: number
  }[],
): StoreDayIndex<{ amount: number }> {
  const idx: Record<string, Record<number, { amount: number }>> = {}
  for (const rec of records) {
    const store = (idx[rec.storeId] ??= {})
    const existing = store[rec.day]
    store[rec.day] = { amount: (existing?.amount ?? 0) + rec.totalAmount }
  }
  return idx
}

const noRecords: readonly never[] = []

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
    purchaseIdx: indexByStoreDay(current?.purchase.records ?? noRecords),
    interStoreInIdx: indexByStoreDay(current?.interStoreIn.records ?? noRecords),
    interStoreOutIdx: indexByStoreDay(current?.interStoreOut.records ?? noRecords),
    flowersIdx: indexByStoreDay(current?.flowers.records ?? noRecords),
    directProduceIdx: indexByStoreDay(current?.directProduce.records ?? noRecords),
    consumablesIdx: indexByStoreDay(current?.consumables.records ?? noRecords),
    ctsIdx: buildCtsIndex(current?.categoryTimeSales.records ?? noRecords),
  }
}
