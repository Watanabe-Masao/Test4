/**
 * backupFormat の pure 関数テスト
 *
 * hydrateMonthlyData は JSON.parse 結果（plain object）を
 * MonthlyData に復元する純粋関数。Map フィールド復元の検証。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { hydrateMonthlyData, isCompressionSupported } from './backupFormat'
import type { DataOrigin } from '@/domain/models/DataOrigin'

const origin = { kind: 'imported' } as unknown as DataOrigin

describe('hydrateMonthlyData', () => {
  it('converts plain stores object to Map', () => {
    const raw = {
      stores: { s1: { id: 's1', name: 'Store1' }, s2: { id: 's2', name: 'Store2' } },
    }
    const result = hydrateMonthlyData(raw, origin)
    expect(result.stores).toBeInstanceOf(Map)
    expect(result.stores.size).toBe(2)
    expect(result.stores.get('s1')).toEqual({ id: 's1', name: 'Store1' })
  })

  it('returns empty Maps for missing fields', () => {
    const result = hydrateMonthlyData({}, origin)
    expect(result.stores).toBeInstanceOf(Map)
    expect(result.stores.size).toBe(0)
    expect(result.suppliers).toBeInstanceOf(Map)
    expect(result.settings).toBeInstanceOf(Map)
    expect(result.budget).toBeInstanceOf(Map)
  })

  it('preserves existing Map instances', () => {
    const existing = new Map([['s1', { id: 's1' }]])
    const raw = { stores: existing }
    const result = hydrateMonthlyData(raw, origin)
    expect(result.stores).toBeInstanceOf(Map)
    expect(result.stores.get('s1')).toEqual({ id: 's1' })
  })

  it('hydrates budget Map with daily inner Map', () => {
    const raw = {
      budget: {
        s1: {
          storeId: 's1',
          total: 1000,
          daily: { '1': 100, '2': 200 },
        },
      },
    }
    const result = hydrateMonthlyData(raw, origin)
    const b = result.budget.get('s1')
    expect(b).toBeDefined()
    expect(b?.total).toBe(1000)
    expect(b?.daily).toBeInstanceOf(Map)
    expect(b?.daily.get(1)).toBe(100)
    expect(b?.daily.get(2)).toBe(200)
  })

  it('skips invalid budget entries', () => {
    const raw = {
      budget: {
        good: { storeId: 'good', total: 500, daily: {} },
        bad: { storeId: '', total: 0 }, // empty storeId invalid
      },
    }
    const result = hydrateMonthlyData(raw, origin)
    expect(result.budget.has('good')).toBe(true)
    expect(result.budget.has('bad')).toBe(false)
  })

  it('defaults record collections to empty arrays', () => {
    const result = hydrateMonthlyData({}, origin)
    expect(result.classifiedSales).toEqual({ records: [] })
    expect(result.purchase).toEqual({ records: [] })
    expect(result.interStoreIn).toEqual({ records: [] })
    expect(result.interStoreOut).toEqual({ records: [] })
    expect(result.flowers).toEqual({ records: [] })
    expect(result.directProduce).toEqual({ records: [] })
    expect(result.consumables).toEqual({ records: [] })
    expect(result.categoryTimeSales).toEqual({ records: [] })
    expect(result.departmentKpi).toEqual({ records: [] })
  })

  it('preserves provided record collections', () => {
    const raw = {
      purchase: { records: [{ id: 1 }] },
      flowers: { records: [{ id: 'f1' }] },
    }
    const result = hydrateMonthlyData(raw, origin)
    expect(result.purchase.records).toHaveLength(1)
    expect(result.flowers.records).toHaveLength(1)
  })

  it('attaches the provided origin', () => {
    const result = hydrateMonthlyData({}, origin)
    expect(result.origin).toBe(origin)
  })

  it('returns empty Map when stores field is array (invalid)', () => {
    const raw = { stores: [1, 2, 3] }
    const result = hydrateMonthlyData(raw, origin)
    expect(result.stores.size).toBe(0)
  })
})

describe('isCompressionSupported', () => {
  it('returns a boolean', () => {
    expect(typeof isCompressionSupported()).toBe('boolean')
  })
})
