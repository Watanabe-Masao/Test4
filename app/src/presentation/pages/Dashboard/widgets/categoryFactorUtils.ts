/**
 * カテゴリ別要因分解ユーティリティ
 *
 * CategoryFactorBreakdown.tsx から分離した純粋関数群。
 *
 * @responsibility R:unclassified
 */
import {
  decomposePriceMix as decomposePriceMixDomain,
  type CategoryQtyAmt,
} from '@/application/hooks/calculation'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'

export function recordsToCategoryQtyAmt(
  records: readonly CategoryLeafDailyEntry[],
): CategoryQtyAmt[] {
  return records.map((r) => ({
    key: `${r.deptCode}|${r.lineCode}|${r.klassCode}`,
    qty: r.totalQuantity,
    amt: r.totalAmount,
  }))
}

/**
 * CategoryLeafDailyEntry[] を受け取り、ドメイン層の decomposePriceMix に委譲する。
 */
export function decomposePriceMix(
  curRecords: readonly CategoryLeafDailyEntry[],
  prevRecords: readonly CategoryLeafDailyEntry[],
): { priceEffect: number; mixEffect: number } | null {
  return decomposePriceMixDomain(
    recordsToCategoryQtyAmt(curRecords),
    recordsToCategoryQtyAmt(prevRecords),
  )
}
