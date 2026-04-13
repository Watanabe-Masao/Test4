import { describe, it, expect } from 'vitest'
import { recordsToCategoryQtyAmt } from '@/presentation/pages/Dashboard/widgets/categoryFactorUtils'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

const rec = (
  dept: string,
  line: string,
  klass: string,
  qty: number,
  amt: number,
): CategoryTimeSalesRecord =>
  ({
    department: { code: dept, name: `Dept${dept}` },
    line: { code: line, name: `Line${line}` },
    klass: { code: klass, name: `Klass${klass}` },
    totalQuantity: qty,
    totalAmount: amt,
  }) as unknown as CategoryTimeSalesRecord

describe('recordsToCategoryQtyAmt', () => {
  it('returns empty array for empty input', () => {
    expect(recordsToCategoryQtyAmt([])).toEqual([])
  })

  it('builds key from dept|line|klass', () => {
    const out = recordsToCategoryQtyAmt([rec('D1', 'L1', 'K1', 5, 100)])
    expect(out).toHaveLength(1)
    expect(out[0].key).toBe('D1|L1|K1')
    expect(out[0].qty).toBe(5)
    expect(out[0].amt).toBe(100)
  })

  it('preserves order and does not merge duplicates', () => {
    const out = recordsToCategoryQtyAmt([
      rec('D1', 'L1', 'K1', 5, 100),
      rec('D1', 'L1', 'K1', 3, 50),
      rec('D2', 'L2', 'K2', 10, 200),
    ])
    expect(out).toHaveLength(3)
    expect(out[0].qty).toBe(5)
    expect(out[1].qty).toBe(3)
    expect(out[2].key).toBe('D2|L2|K2')
  })

  it('handles zero quantities and amounts', () => {
    const out = recordsToCategoryQtyAmt([rec('D1', 'L1', 'K1', 0, 0)])
    expect(out[0].qty).toBe(0)
    expect(out[0].amt).toBe(0)
  })

  it('maps all records to CategoryQtyAmt shape', () => {
    const out = recordsToCategoryQtyAmt([rec('A', 'B', 'C', 1, 10), rec('X', 'Y', 'Z', 2, 20)])
    for (const item of out) {
      expect(item).toHaveProperty('key')
      expect(item).toHaveProperty('qty')
      expect(item).toHaveProperty('amt')
    }
  })
})
