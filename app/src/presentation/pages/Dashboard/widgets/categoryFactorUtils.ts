/**
 * カテゴリ別要因分解ユーティリティ
 *
 * CategoryFactorBreakdown.tsx から分離した純粋関数群。
 */
import {
  decomposePriceMix as decomposePriceMixDomain,
  type CategoryQtyAmt,
} from '@/application/hooks/calculation'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

export function recordsToCategoryQtyAmt(
  records: readonly CategoryTimeSalesRecord[],
): CategoryQtyAmt[] {
  return records.map((r) => ({
    key: `${r.department.code}|${r.line.code}|${r.klass.code}`,
    qty: r.totalQuantity,
    amt: r.totalAmount,
  }))
}

/**
 * CategoryTimeSalesRecord[] を受け取り、ドメイン層の decomposePriceMix に委譲する。
 */
export function decomposePriceMix(
  curRecords: readonly CategoryTimeSalesRecord[],
  prevRecords: readonly CategoryTimeSalesRecord[],
): { priceEffect: number; mixEffect: number } | null {
  return decomposePriceMixDomain(
    recordsToCategoryQtyAmt(curRecords),
    recordsToCategoryQtyAmt(prevRecords),
  )
}
