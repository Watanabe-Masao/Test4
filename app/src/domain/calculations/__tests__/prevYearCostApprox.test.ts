/**
 * prevYearCostApprox.test.ts — buildPrevYearCostApprox の pure function 検証
 *
 * SP-B ADR-B-004 PR2 で新設。
 *
 * @responsibility R:test
 *
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { buildPrevYearCostApprox } from '../prevYearCostApprox'
import type { PrevYearData } from '@/features/comparison/application/comparisonTypes'
import type { DateKey } from '@/domain/models/CalendarDate'

const dk = (day: number): DateKey => `2025-04-${String(day).padStart(2, '0')}` as DateKey

function makePrevYear(
  hasPrevYear: boolean,
  totalSales: number,
  daily: Array<[DateKey, { sales: number; discount: number }]> = [],
): PrevYearData {
  return {
    hasPrevYear,
    totalSales,
    totalCost: 0,
    totalDiscount: 0,
    totalDiscountEntries: 0,
    discountRate: 0,
    daily: new Map(daily.map(([k, v]) => [k, { ...v, customers: 0 }])),
  } as unknown as PrevYearData
}

describe('buildPrevYearCostApprox', () => {
  it('hasPrevYear=false の時 undefined を返す', () => {
    expect(buildPrevYearCostApprox(makePrevYear(false, 0))).toBeUndefined()
  })

  it('totalSales <= 0 の時 undefined を返す', () => {
    expect(buildPrevYearCostApprox(makePrevYear(true, 0))).toBeUndefined()
    expect(buildPrevYearCostApprox(makePrevYear(true, -100))).toBeUndefined()
  })

  it('有効データの時、day → (sales - discount) の Map を返す', () => {
    const result = buildPrevYearCostApprox(
      makePrevYear(true, 1000, [
        [dk(1), { sales: 500, discount: 50 }],
        [dk(2), { sales: 400, discount: 30 }],
        [dk(3), { sales: 100, discount: 10 }],
      ]),
    )
    expect(result).toBeDefined()
    expect(result?.get(1)).toBe(450)
    expect(result?.get(2)).toBe(370)
    expect(result?.get(3)).toBe(90)
  })

  it('sales=0 の day は 0 を返す（discount を引かない）', () => {
    const result = buildPrevYearCostApprox(
      makePrevYear(true, 100, [
        [dk(1), { sales: 0, discount: 50 }],
        [dk(2), { sales: 100, discount: 0 }],
      ]),
    )
    expect(result?.get(1)).toBe(0)
    expect(result?.get(2)).toBe(100)
  })

  it('空 daily Map でも空 Map を返す（undefined ではない）', () => {
    const result = buildPrevYearCostApprox(makePrevYear(true, 100))
    expect(result).toBeDefined()
    expect(result?.size).toBe(0)
  })
})
