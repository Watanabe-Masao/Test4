/**
 * projectCategoryLeafDailySeries — parity / truth-table test
 *
 * `CategoryTimeSalesRecord[] → CategoryLeafDailySeries` 変換の意味を固定する。
 *
 * 凍結対象:
 *   1. 空入力 → 空 series（dayCount は options 通り伝搬）
 *   2. grandTotals が全 records の totalAmount / totalQuantity の合計と一致
 *   3. entries は入力 records の参照（現状は pass-through）
 *   4. dayCount は options からそのまま伝搬
 */
import { describe, it, expect } from 'vitest'
import { projectCategoryLeafDailySeries } from '../projectCategoryLeafDailySeries'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

function makeRec(
  dept: string,
  line: string,
  klass: string,
  totalAmount: number,
  totalQuantity: number,
): CategoryTimeSalesRecord {
  return {
    timeSlots: [],
    totalAmount,
    totalQuantity,
    department: { code: dept, name: dept },
    line: { code: line, name: line },
    klass: { code: klass, name: klass },
  } as unknown as CategoryTimeSalesRecord
}

describe('projectCategoryLeafDailySeries', () => {
  it('空 records → entries 空 + grandTotals 0 + dayCount 伝搬', () => {
    const result = projectCategoryLeafDailySeries([], { dayCount: 7 })
    expect(result.entries).toEqual([])
    expect(result.grandTotals).toEqual({ amount: 0, quantity: 0 })
    expect(result.dayCount).toBe(7)
  })

  it('grandTotals は全 records の totalAmount / totalQuantity の合計', () => {
    const records = [
      makeRec('D1', 'L1', 'K1', 100, 5),
      makeRec('D1', 'L2', 'K2', 200, 10),
      makeRec('D2', 'L1', 'K3', 300, 15),
    ]
    const result = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    expect(result.grandTotals).toEqual({ amount: 600, quantity: 30 })
  })

  it('entries は records を pass-through で保持（現契約）', () => {
    const records = [makeRec('D1', 'L1', 'K1', 100, 5)]
    const result = projectCategoryLeafDailySeries(records, { dayCount: 1 })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].department.code).toBe('D1')
    expect(result.entries[0].totalAmount).toBe(100)
  })

  it('dayCount は options からそのまま伝搬', () => {
    const result = projectCategoryLeafDailySeries([makeRec('D1', 'L1', 'K1', 1, 1)], {
      dayCount: 30,
    })
    expect(result.dayCount).toBe(30)
  })
})
