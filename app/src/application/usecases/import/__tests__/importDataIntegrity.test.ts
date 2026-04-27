/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { validateReconciliation, validateDataIntegrity } from '../importDataIntegrity'
import type { DataSummaryInput } from '@/application/services/dataSummary'
import type { ClassifiedSalesRecord, CategoryTimeSalesRecord } from '@/domain/models/record'

function makeCS(
  day: number,
  storeId: string,
  salesAmount: number,
  overrides: Partial<ClassifiedSalesRecord> = {},
): ClassifiedSalesRecord {
  return {
    year: 2024,
    month: 1,
    day,
    storeId,
    storeName: 'S',
    groupName: 'G',
    departmentName: 'D',
    lineName: 'L',
    className: 'C',
    salesAmount,
    discount71: 0,
    discount72: 0,
    discount73: 0,
    discount74: 0,
    ...overrides,
  }
}

function makeCTS(
  day: number,
  storeId: string,
  totalAmount: number,
  codeSuffix = '',
): CategoryTimeSalesRecord {
  return {
    year: 2024,
    month: 1,
    day,
    storeId,
    storeName: 'S',
    timeSlot: '09',
    department: { code: `D${codeSuffix}`, name: 'D' },
    line: { code: `L${codeSuffix}`, name: 'L' },
    klass: { code: `K${codeSuffix}`, name: 'K' },
    totalAmount,
    totalQuantity: 10,
  } as unknown as CategoryTimeSalesRecord
}

function makeInput(
  cs: readonly ClassifiedSalesRecord[],
  cts: readonly CategoryTimeSalesRecord[],
  stores = new Map([['s1', { id: 's1', name: 'S1' }]]),
): DataSummaryInput {
  return {
    stores: stores as unknown as DataSummaryInput['stores'],
    classifiedSales: { records: cs },
    categoryTimeSales: { records: cts },
    purchase: { records: [] },
    flowers: { records: [] },
    directProduce: { records: [] },
    interStoreIn: { records: [] },
    interStoreOut: { records: [] },
    consumables: { records: [] },
    departmentKpi: { records: [] },
    settings: new Map(),
    budget: new Map(),
  } as unknown as DataSummaryInput
}

describe('validateReconciliation', () => {
  it('returns no messages when CTS records are empty', () => {
    const out = validateReconciliation(makeInput([makeCS(1, 's1', 100)], []))
    expect(out).toEqual([])
  })

  it('returns no messages when CS records are empty', () => {
    const out = validateReconciliation(makeInput([], [makeCTS(1, 's1', 100)]))
    expect(out).toEqual([])
  })

  it('returns no messages when totals match within tolerance', () => {
    const out = validateReconciliation(
      makeInput([makeCS(1, 's1', 10000)], [makeCTS(1, 's1', 10000)]),
    )
    expect(out).toEqual([])
  })

  it('emits a warning when totals diverge beyond tolerance', () => {
    const out = validateReconciliation(
      makeInput(
        [makeCS(1, 's1', 10000), makeCS(2, 's1', 5000)],
        [makeCTS(1, 's1', 20000), makeCTS(2, 's1', 5000)],
      ),
    )
    expect(out).toHaveLength(1)
    expect(out[0]?.level).toBe('warning')
    expect(out[0]?.message).toMatch(/乖離/)
    expect(out[0]?.details).toBeDefined()
  })

  it('returns no messages when one side sums to zero', () => {
    const out = validateReconciliation(makeInput([makeCS(1, 's1', 0)], [makeCTS(1, 's1', 1000)]))
    expect(out).toEqual([])
  })
})

describe('validateDataIntegrity', () => {
  it('returns empty when data is empty', () => {
    const out = validateDataIntegrity(makeInput([], []))
    expect(out).toEqual([])
  })

  it('flags duplicate classifiedSales records', () => {
    const rec = makeCS(1, 's1', 100)
    const out = validateDataIntegrity(makeInput([rec, { ...rec }], []))
    expect(out.some((m) => m.message.includes('分類別売上') && m.level === 'error')).toBe(true)
  })

  it('flags duplicate categoryTimeSales records', () => {
    const rec = makeCTS(1, 's1', 500)
    const out = validateDataIntegrity(makeInput([], [rec, { ...rec }]))
    expect(out.some((m) => m.message.includes('分類別時間帯') && m.level === 'error')).toBe(true)
  })

  it('flags subtotal markers in classifiedSales', () => {
    const out = validateDataIntegrity(
      makeInput([makeCS(1, 's1', 1000), makeCS(1, 's1', 2000, { className: '合計' })], []),
    )
    const subtotalMsg = out.find((m) => m.message.includes('小計/合計'))
    expect(subtotalMsg).toBeDefined()
    expect(subtotalMsg?.level).toBe('error')
  })

  it('flags abnormally high record density per store', () => {
    // 1 store * 3200 records = warning threshold (>3100)
    const many = Array.from({ length: 3200 }, (_, i) =>
      makeCS(1, 's1', 1, {
        className: `C${i}`,
      }),
    )
    const out = validateDataIntegrity(makeInput(many, []))
    const warn = out.find((m) => m.message.includes('レコード密度'))
    expect(warn?.level).toBe('warning')
  })

  it('does not flag record density when below threshold', () => {
    const records = Array.from({ length: 10 }, (_, i) => makeCS(1, 's1', 1, { className: `C${i}` }))
    const out = validateDataIntegrity(makeInput(records, []))
    expect(out.find((m) => m.message.includes('レコード密度'))).toBeUndefined()
  })
})
