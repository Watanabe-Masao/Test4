/**
 * DrilldownWaterfall の pure builder 関数群
 *
 * React hooks を使わない純粋関数。
 * 依存関係が類似する useMemo を統合する。
 *
 * @responsibility R:unclassified
 */
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import { decomposePriceMix } from './categoryFactorUtils'

export interface RecordAggregates {
  readonly curTotalQty: number
  readonly prevTotalQty: number
  readonly hasQuantity: boolean
  readonly priceMix: { priceEffect: number; mixEffect: number } | null
}

/**
 * curTotalQty + prevTotalQty + priceMix を一括計算する。
 * 3 useMemo → 1 に統合。
 */
export function buildRecordAggregates(
  dayRecords: readonly CategoryLeafDailyEntry[],
  prevDayRecords: readonly CategoryLeafDailyEntry[],
): RecordAggregates {
  const curTotalQty = dayRecords.reduce((s, r) => s + r.totalQuantity, 0)
  const prevTotalQty = prevDayRecords.reduce((s, r) => s + r.totalQuantity, 0)
  const hasQuantity = curTotalQty > 0 && prevTotalQty > 0

  const priceMix =
    dayRecords.length > 0 && prevDayRecords.length > 0
      ? decomposePriceMix(dayRecords, prevDayRecords)
      : null

  return { curTotalQty, prevTotalQty, hasQuantity, priceMix }
}
