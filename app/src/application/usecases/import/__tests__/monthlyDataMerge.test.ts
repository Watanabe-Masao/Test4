/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  mergeMonthlyData,
  mergeMonthlyInsertsOnly,
  DEFAULT_MERGE_ACTION,
} from '@/application/usecases/import/monthlyDataMerge'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { DataOrigin } from '@/domain/models/DataOrigin'

const origin = (year: number, month: number): DataOrigin =>
  ({ year, month, source: 'file' }) as unknown as DataOrigin

const base = (year = 2024, month = 1): MonthlyData => createEmptyMonthlyData(origin(year, month))

const withPurchase = (
  data: MonthlyData,
  records: ReadonlyArray<{ storeId: string; day: number }>,
): MonthlyData => ({
  ...data,
  purchase: { records: records as unknown as MonthlyData['purchase']['records'] },
})

describe('DEFAULT_MERGE_ACTION', () => {
  it('is "overwrite"', () => {
    expect(DEFAULT_MERGE_ACTION).toBe('overwrite')
  })
})

describe('mergeMonthlyData', () => {
  it('returns incoming when existing is null', () => {
    const incoming = base(2024, 3)
    expect(mergeMonthlyData(null, incoming)).toBe(incoming)
  })

  it('overwrite: merges store maps from both', () => {
    const existing = base()
    const incoming = base()
    const withStores = (
      d: MonthlyData,
      pairs: ReadonlyArray<[string, { id: string; name: string }]>,
    ): MonthlyData =>
      ({ ...d, stores: new Map(pairs as unknown as Array<[string, never]>) }) as MonthlyData
    const e = withStores(existing, [['s1', { id: 's1', name: 'Store 1' }]])
    const i = withStores(incoming, [['s2', { id: 's2', name: 'Store 2' }]])
    const merged = mergeMonthlyData(e, i)
    expect(merged.stores.size).toBe(2)
    expect(merged.stores.has('s1')).toBe(true)
    expect(merged.stores.has('s2')).toBe(true)
  })

  it('overwrite: keeps existing non-empty when incoming is empty (replaceIfNonEmpty)', () => {
    const existing = withPurchase(base(), [{ storeId: 's1', day: 5 }])
    const incoming = base() // purchase empty
    const merged = mergeMonthlyData(existing, incoming, 'overwrite')
    expect(merged.purchase.records.length).toBe(1)
  })

  it('overwrite: replaces purchase when incoming has records', () => {
    const existing = withPurchase(base(), [{ storeId: 's1', day: 5 }])
    const incoming = withPurchase(base(), [
      { storeId: 's2', day: 10 },
      { storeId: 's2', day: 11 },
    ])
    const merged = mergeMonthlyData(existing, incoming, 'overwrite')
    expect(merged.purchase.records.length).toBe(2)
    expect(merged.purchase.records[0]!.storeId).toBe('s2')
  })

  it('keep-existing: uses inserts-only merge (no dup keys)', () => {
    const existing = withPurchase(base(), [
      { storeId: 's1', day: 1 },
      { storeId: 's1', day: 2 },
    ])
    const incoming = withPurchase(base(), [
      { storeId: 's1', day: 2 }, // duplicate
      { storeId: 's1', day: 3 }, // new
    ])
    const merged = mergeMonthlyData(existing, incoming, 'keep-existing')
    expect(merged.purchase.records.length).toBe(3)
  })
})

describe('mergeMonthlyInsertsOnly', () => {
  it('takes incoming purchase when existing purchase is empty', () => {
    const existing = base()
    const incoming = withPurchase(base(), [{ storeId: 's1', day: 1 }])
    const merged = mergeMonthlyInsertsOnly(existing, incoming, new Set())
    expect(merged.purchase.records.length).toBe(1)
  })

  it('keeps existing purchase when incoming is empty', () => {
    const existing = withPurchase(base(), [{ storeId: 's1', day: 1 }])
    const incoming = base()
    const merged = mergeMonthlyInsertsOnly(existing, incoming, new Set())
    expect(merged.purchase.records.length).toBe(1)
  })

  it('only inserts non-duplicate records by storeId+day key', () => {
    const existing = withPurchase(base(), [
      { storeId: 's1', day: 1 },
      { storeId: 's2', day: 1 },
    ])
    const incoming = withPurchase(base(), [
      { storeId: 's1', day: 1 }, // dup
      { storeId: 's1', day: 2 }, // new
      { storeId: 's3', day: 1 }, // new
    ])
    const merged = mergeMonthlyInsertsOnly(existing, incoming, new Set())
    expect(merged.purchase.records.length).toBe(4)
  })

  it('respects importedTypes filter (skips unlisted types)', () => {
    const existing = withPurchase(base(), [{ storeId: 's1', day: 1 }])
    const incoming = withPurchase(base(), [
      { storeId: 's1', day: 1 },
      { storeId: 's2', day: 2 },
    ])
    // purchase NOT in importedTypes → existing unchanged
    const merged = mergeMonthlyInsertsOnly(existing, incoming, new Set(['classifiedSales']))
    expect(merged.purchase.records.length).toBe(1)
  })

  it('merges store maps — only new keys inserted', () => {
    const existing = {
      ...base(),
      stores: new Map([['s1', { id: 's1', name: 'A' }]]) as unknown as MonthlyData['stores'],
    } as MonthlyData
    const incoming = {
      ...base(),
      stores: new Map([
        ['s1', { id: 's1', name: 'DUP' }], // dup — ignored
        ['s2', { id: 's2', name: 'B' }], // new
      ]) as unknown as MonthlyData['stores'],
    } as MonthlyData
    const merged = mergeMonthlyInsertsOnly(existing, incoming, new Set())
    expect(merged.stores.size).toBe(2)
    expect((merged.stores.get('s1') as unknown as { name: string }).name).toBe('A') // kept existing
  })
})
