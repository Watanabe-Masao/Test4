import { describe, it, expect } from 'vitest'
import {
  inp,
  dailyEvidence,
  dailyBreakdown,
  supplierDetails,
  costComponentDetails,
  salesComponentDetails,
  expandDailyEvidence,
} from '@/application/usecases/explanation/explanationHelpers'
import type { DailyRecord } from '@/domain/models/record'

// minimal DailyRecord builder
function buildDailyRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  const base: DailyRecord = {
    day: 1,
    sales: 0,
    coreSales: 0,
    grossSales: 0,
    totalCost: 0,
    purchase: { cost: 0, price: 0 },
    deliverySales: { cost: 0, price: 0 },
    interStoreIn: { cost: 0, price: 0 },
    interStoreOut: { cost: 0, price: 0 },
    interDepartmentIn: { cost: 0, price: 0 },
    interDepartmentOut: { cost: 0, price: 0 },
    flowers: { cost: 0, price: 0 },
    directProduce: { cost: 0, price: 0 },
    costInclusion: { cost: 0, items: [] },
    customers: 0,
    discountAmount: 0,
    discountAbsolute: 0,
    discountEntries: [],
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
  } as unknown as DailyRecord
  return { ...base, ...overrides } as DailyRecord
}

describe('explanationHelpers', () => {
  describe('inp', () => {
    it('constructs ExplanationInput with name/value/unit', () => {
      const result = inp('売上', 100, 'yen')
      expect(result.name).toBe('売上')
      expect(result.value).toBe(100)
      expect(result.unit).toBe('yen')
      expect(result.metric).toBeUndefined()
    })

    it('attaches optional metric id', () => {
      const result = inp('売上', 100, 'yen', 'salesTotal')
      expect(result.metric).toBe('salesTotal')
    })
  })

  describe('dailyEvidence', () => {
    it('maps each day key to an EvidenceRef', () => {
      const daily = new Map<number, unknown>([
        [1, {}],
        [2, {}],
        [5, {}],
      ])
      const refs = dailyEvidence('classifiedSales', 'store-1', daily)
      expect(refs).toHaveLength(3)
      expect(refs[0]).toEqual({
        kind: 'daily',
        dataType: 'classifiedSales',
        storeId: 'store-1',
        day: 1,
      })
      expect(refs[2].kind).toBe('daily')
    })

    it('returns empty array when daily empty', () => {
      const refs = dailyEvidence('purchase', 'store-1', new Map())
      expect(refs).toEqual([])
    })
  })

  describe('dailyBreakdown', () => {
    it('returns entries sorted by day', () => {
      const daily = new Map<number, DailyRecord>([
        [3, buildDailyRecord({ day: 3, sales: 300 })],
        [1, buildDailyRecord({ day: 1, sales: 100 })],
        [2, buildDailyRecord({ day: 2, sales: 200 })],
      ])
      const entries = dailyBreakdown(daily, (r) => r.sales)
      expect(entries.map((e) => e.day)).toEqual([1, 2, 3])
      expect(entries.map((e) => e.value)).toEqual([100, 200, 300])
    })

    it('attaches details when detailsGetter provided', () => {
      const daily = new Map<number, DailyRecord>([
        [1, buildDailyRecord({ day: 1, sales: 100 })],
      ])
      const entries = dailyBreakdown(
        daily,
        (r) => r.sales,
        () => [{ label: 'a', value: 1, unit: 'yen' }],
      )
      expect(entries[0].details).toHaveLength(1)
      expect(entries[0].details![0].label).toBe('a')
    })
  })

  describe('supplierDetails', () => {
    it('maps supplier breakdown entries', () => {
      const rec = buildDailyRecord({
        supplierBreakdown: new Map([
          ['S1', { cost: 100, price: 150 }],
          ['S2', { cost: 200, price: 250 }],
        ]),
      })
      const details = supplierDetails(rec)
      expect(details).toHaveLength(2)
      expect(details[0].label).toContain('S1')
      expect(details[0].value).toBe(100)
      expect(details[0].unit).toBe('yen')
    })

    it('returns empty array for empty breakdown', () => {
      const rec = buildDailyRecord()
      expect(supplierDetails(rec)).toEqual([])
    })
  })

  describe('costComponentDetails', () => {
    it('includes only non-zero components', () => {
      const rec = buildDailyRecord({
        purchase: { cost: 100, price: 150 },
        interStoreIn: { cost: 50, price: 60 },
      })
      const details = costComponentDetails(rec)
      expect(details).toHaveLength(2)
      expect(details.some((d) => d.label === '仕入原価' && d.value === 100)).toBe(true)
      expect(details.some((d) => d.label === '店間入' && d.value === 50)).toBe(true)
    })

    it('returns empty when all components zero', () => {
      const rec = buildDailyRecord()
      expect(costComponentDetails(rec)).toEqual([])
    })
  })

  describe('salesComponentDetails', () => {
    it('always includes coreSales', () => {
      const rec = buildDailyRecord({ coreSales: 500 })
      const details = salesComponentDetails(rec)
      expect(details[0].label).toBe('コア売上')
      expect(details[0].value).toBe(500)
    })

    it('adds flowers and directProduce when non-zero', () => {
      const rec = buildDailyRecord({
        coreSales: 500,
        flowers: { cost: 10, price: 20 },
        directProduce: { cost: 5, price: 15 },
      })
      const details = salesComponentDetails(rec)
      expect(details.some((d) => d.label === '花売価' && d.value === 20)).toBe(true)
      expect(details.some((d) => d.label === '産直売価' && d.value === 15)).toBe(true)
    })
  })

  describe('expandDailyEvidence', () => {
    it('returns single store refs when storeId is not aggregate', () => {
      const daily = new Map<number, unknown>([
        [1, {}],
        [2, {}],
      ])
      const refs = expandDailyEvidence('purchase', 'store-1', daily, ['s1', 's2'])
      expect(refs).toHaveLength(2)
    })

    it('expands all store refs when aggregate', () => {
      const daily = new Map<number, unknown>([
        [1, {}],
        [2, {}],
      ])
      const refs = expandDailyEvidence('purchase', 'aggregate', daily, ['s1', 's2'])
      // 2 stores x 2 days
      expect(refs).toHaveLength(4)
    })

    it('falls back to single when allStoreIds empty and storeId=aggregate', () => {
      const daily = new Map<number, unknown>([[1, {}]])
      const refs = expandDailyEvidence('purchase', 'aggregate', daily, [])
      expect(refs).toHaveLength(1)
      expect(refs[0].storeId).toBe('aggregate')
    })
  })
})
