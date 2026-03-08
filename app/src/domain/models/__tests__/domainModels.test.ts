import { describe, it, expect } from 'vitest'
import {
  // ClassifiedSales exports
  DISCOUNT_TYPES,
  ZERO_DISCOUNT_ENTRIES,
  extractDiscountEntries,
  sumDiscountEntries,
  addDiscountEntries,
  classifiedSalesRecordKey,
  aggregateForStore,
  aggregateAllStores,
  classifiedSalesMaxDay,
  mergeClassifiedSalesData,
  // DataTypes exports
  categoryTimeSalesRecordKey,
  mergeCategoryTimeSalesData,
} from '@/domain/models'
import type {
  ClassifiedSalesRecord,
  ClassifiedSalesData,
  DiscountEntry,
  CategoryTimeSalesRecord,
  CategoryTimeSalesData,
} from '@/domain/models'

// ─── Test helpers ──────────────────────────────────────────

function makeClassifiedSalesRecord(
  overrides: Partial<ClassifiedSalesRecord> = {},
): ClassifiedSalesRecord {
  return {
    year: 2026,
    month: 3,
    day: 1,
    storeId: 'S001',
    storeName: 'Store A',
    groupName: 'GroupX',
    departmentName: 'DeptA',
    lineName: 'LineA',
    className: 'ClassA',
    salesAmount: 1000,
    discount71: -100,
    discount72: -50,
    discount73: -30,
    discount74: -20,
    ...overrides,
  }
}

function makeCategoryTimeSalesRecord(
  overrides: Partial<CategoryTimeSalesRecord> = {},
): CategoryTimeSalesRecord {
  return {
    year: 2026,
    month: 3,
    day: 1,
    storeId: 'S001',
    department: { code: 'D01', name: 'Dept1' },
    line: { code: 'L01', name: 'Line1' },
    klass: { code: 'K01', name: 'Klass1' },
    timeSlots: [{ hour: 10, quantity: 5, amount: 500 }],
    totalQuantity: 5,
    totalAmount: 500,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════
// ClassifiedSales.ts
// ═══════════════════════════════════════════════════════════

describe('ClassifiedSales', () => {
  // ─── DISCOUNT_TYPES constant ─────────────────────────────

  describe('DISCOUNT_TYPES', () => {
    it('should contain exactly 4 discount types', () => {
      expect(DISCOUNT_TYPES).toHaveLength(4)
    })

    it('should have types 71-74 in order', () => {
      const types = DISCOUNT_TYPES.map((d) => d.type)
      expect(types).toEqual(['71', '72', '73', '74'])
    })

    it('should map each type to the correct field name', () => {
      expect(DISCOUNT_TYPES[0].field).toBe('discount71')
      expect(DISCOUNT_TYPES[1].field).toBe('discount72')
      expect(DISCOUNT_TYPES[2].field).toBe('discount73')
      expect(DISCOUNT_TYPES[3].field).toBe('discount74')
    })
  })

  // ─── ZERO_DISCOUNT_ENTRIES constant ──────────────────────

  describe('ZERO_DISCOUNT_ENTRIES', () => {
    it('should have 4 entries with amount 0', () => {
      expect(ZERO_DISCOUNT_ENTRIES).toHaveLength(4)
      for (const entry of ZERO_DISCOUNT_ENTRIES) {
        expect(entry.amount).toBe(0)
      }
    })

    it('should have types matching DISCOUNT_TYPES', () => {
      const types = ZERO_DISCOUNT_ENTRIES.map((e) => e.type)
      expect(types).toEqual(['71', '72', '73', '74'])
    })
  })

  // ─── extractDiscountEntries ──────────────────────────────

  describe('extractDiscountEntries', () => {
    it('should extract discount entries with Math.abs normalization', () => {
      const rec = makeClassifiedSalesRecord({
        discount71: -100,
        discount72: -50,
        discount73: -30,
        discount74: -20,
      })
      const entries = extractDiscountEntries(rec)

      expect(entries).toHaveLength(4)
      expect(entries[0]).toEqual({ type: '71', label: '政策売変', amount: 100 })
      expect(entries[1]).toEqual({ type: '72', label: 'レジ値引', amount: 50 })
      expect(entries[2]).toEqual({ type: '73', label: '廃棄売変', amount: 30 })
      expect(entries[3]).toEqual({ type: '74', label: '試食売変', amount: 20 })
    })

    it('should handle positive discount values (abs still applies)', () => {
      const rec = makeClassifiedSalesRecord({
        discount71: 100,
        discount72: 50,
        discount73: 30,
        discount74: 20,
      })
      const entries = extractDiscountEntries(rec)

      expect(entries[0].amount).toBe(100)
      expect(entries[1].amount).toBe(50)
      expect(entries[2].amount).toBe(30)
      expect(entries[3].amount).toBe(20)
    })

    it('should handle zero discount values', () => {
      const rec = makeClassifiedSalesRecord({
        discount71: 0,
        discount72: 0,
        discount73: 0,
        discount74: 0,
      })
      const entries = extractDiscountEntries(rec)

      for (const entry of entries) {
        expect(entry.amount).toBe(0)
      }
    })

    it('should treat NaN as 0', () => {
      const rec = makeClassifiedSalesRecord({
        discount71: NaN,
        discount72: NaN,
        discount73: NaN,
        discount74: NaN,
      })
      const entries = extractDiscountEntries(rec)

      for (const entry of entries) {
        expect(entry.amount).toBe(0)
      }
    })
  })

  // ─── sumDiscountEntries ──────────────────────────────────

  describe('sumDiscountEntries', () => {
    it('should sum all entry amounts', () => {
      const entries: readonly DiscountEntry[] = [
        { type: '71', label: '政策売変', amount: 100 },
        { type: '72', label: 'レジ値引', amount: 50 },
        { type: '73', label: '廃棄売変', amount: 30 },
        { type: '74', label: '試食売変', amount: 20 },
      ]
      expect(sumDiscountEntries(entries)).toBe(200)
    })

    it('should return 0 for empty array', () => {
      expect(sumDiscountEntries([])).toBe(0)
    })

    it('should return 0 for ZERO_DISCOUNT_ENTRIES', () => {
      expect(sumDiscountEntries(ZERO_DISCOUNT_ENTRIES)).toBe(0)
    })

    it('should handle single entry', () => {
      const entries: readonly DiscountEntry[] = [{ type: '71', label: '政策売変', amount: 42 }]
      expect(sumDiscountEntries(entries)).toBe(42)
    })
  })

  // ─── addDiscountEntries ──────────────────────────────────

  describe('addDiscountEntries', () => {
    it('should add corresponding entries by type', () => {
      const a: readonly DiscountEntry[] = [
        { type: '71', label: '政策売変', amount: 100 },
        { type: '72', label: 'レジ値引', amount: 50 },
        { type: '73', label: '廃棄売変', amount: 30 },
        { type: '74', label: '試食売変', amount: 20 },
      ]
      const b: readonly DiscountEntry[] = [
        { type: '71', label: '政策売変', amount: 10 },
        { type: '72', label: 'レジ値引', amount: 20 },
        { type: '73', label: '廃棄売変', amount: 30 },
        { type: '74', label: '試食売変', amount: 40 },
      ]
      const result = addDiscountEntries(a, b)

      expect(result[0].amount).toBe(110)
      expect(result[1].amount).toBe(70)
      expect(result[2].amount).toBe(60)
      expect(result[3].amount).toBe(60)
    })

    it('should add ZERO_DISCOUNT_ENTRIES without changing the other', () => {
      const a: readonly DiscountEntry[] = [
        { type: '71', label: '政策売変', amount: 100 },
        { type: '72', label: 'レジ値引', amount: 50 },
        { type: '73', label: '廃棄売変', amount: 30 },
        { type: '74', label: '試食売変', amount: 20 },
      ]
      const result = addDiscountEntries(a, ZERO_DISCOUNT_ENTRIES)

      expect(result[0].amount).toBe(100)
      expect(result[1].amount).toBe(50)
      expect(result[2].amount).toBe(30)
      expect(result[3].amount).toBe(20)
    })

    it('should handle empty arrays by defaulting to 0', () => {
      const result = addDiscountEntries([], [])
      expect(result).toHaveLength(4)
      for (const entry of result) {
        expect(entry.amount).toBe(0)
      }
    })

    it('should handle partial entries (missing types default to 0)', () => {
      const a: readonly DiscountEntry[] = [{ type: '71', label: '政策売変', amount: 100 }]
      const b: readonly DiscountEntry[] = [{ type: '73', label: '廃棄売変', amount: 50 }]
      const result = addDiscountEntries(a, b)

      expect(result[0].amount).toBe(100) // 71: 100 + 0
      expect(result[1].amount).toBe(0) // 72: 0 + 0
      expect(result[2].amount).toBe(50) // 73: 0 + 50
      expect(result[3].amount).toBe(0) // 74: 0 + 0
    })

    it('should always produce entries ordered by DISCOUNT_TYPES', () => {
      const a: readonly DiscountEntry[] = [
        { type: '74', label: '試食売変', amount: 10 },
        { type: '71', label: '政策売変', amount: 20 },
      ]
      const b: readonly DiscountEntry[] = []
      const result = addDiscountEntries(a, b)

      const types = result.map((e) => e.type)
      expect(types).toEqual(['71', '72', '73', '74'])
    })
  })

  // ─── classifiedSalesRecordKey ────────────────────────────

  describe('classifiedSalesRecordKey', () => {
    it('should generate a tab-separated key from record fields', () => {
      const rec = makeClassifiedSalesRecord()
      const key = classifiedSalesRecordKey(rec)
      expect(key).toBe('2026\t3\t1\tS001\tGroupX\tDeptA\tLineA\tClassA')
    })

    it('should produce different keys for different days', () => {
      const rec1 = makeClassifiedSalesRecord({ day: 1 })
      const rec2 = makeClassifiedSalesRecord({ day: 2 })
      expect(classifiedSalesRecordKey(rec1)).not.toBe(classifiedSalesRecordKey(rec2))
    })

    it('should produce different keys for different stores', () => {
      const rec1 = makeClassifiedSalesRecord({ storeId: 'S001' })
      const rec2 = makeClassifiedSalesRecord({ storeId: 'S002' })
      expect(classifiedSalesRecordKey(rec1)).not.toBe(classifiedSalesRecordKey(rec2))
    })

    it('should produce different keys for different categories', () => {
      const rec1 = makeClassifiedSalesRecord({ className: 'ClassA' })
      const rec2 = makeClassifiedSalesRecord({ className: 'ClassB' })
      expect(classifiedSalesRecordKey(rec1)).not.toBe(classifiedSalesRecordKey(rec2))
    })
  })

  // ─── aggregateForStore ───────────────────────────────────

  describe('aggregateForStore', () => {
    it('should aggregate records by day for the specified store', () => {
      const data: ClassifiedSalesData = {
        records: [
          makeClassifiedSalesRecord({ day: 1, salesAmount: 1000, discount71: -100 }),
          makeClassifiedSalesRecord({ day: 1, salesAmount: 2000, discount71: -200 }),
          makeClassifiedSalesRecord({ day: 2, salesAmount: 500, discount71: -50 }),
        ],
      }
      const result = aggregateForStore(data, 'S001')

      expect(result[1].sales).toBe(3000)
      expect(result[2].sales).toBe(500)
    })

    it('should compute discount as sum of all discount entries', () => {
      const data: ClassifiedSalesData = {
        records: [
          makeClassifiedSalesRecord({
            day: 1,
            discount71: -100,
            discount72: -50,
            discount73: -30,
            discount74: -20,
          }),
        ],
      }
      const result = aggregateForStore(data, 'S001')
      // abs values: 100 + 50 + 30 + 20 = 200
      expect(result[1].discount).toBe(200)
    })

    it('should filter out records from other stores', () => {
      const data: ClassifiedSalesData = {
        records: [
          makeClassifiedSalesRecord({ storeId: 'S001', day: 1, salesAmount: 1000 }),
          makeClassifiedSalesRecord({ storeId: 'S002', day: 1, salesAmount: 2000 }),
        ],
      }
      const result = aggregateForStore(data, 'S001')

      expect(result[1].sales).toBe(1000)
      expect(result[1]).toBeDefined()
    })

    it('should return empty object when no records match', () => {
      const data: ClassifiedSalesData = {
        records: [makeClassifiedSalesRecord({ storeId: 'S002' })],
      }
      const result = aggregateForStore(data, 'S001')
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should return empty object for empty data', () => {
      const data: ClassifiedSalesData = { records: [] }
      const result = aggregateForStore(data, 'S001')
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should accumulate discount entries across multiple records on same day', () => {
      const data: ClassifiedSalesData = {
        records: [
          makeClassifiedSalesRecord({
            day: 1,
            discount71: -100,
            discount72: 0,
            discount73: 0,
            discount74: 0,
          }),
          makeClassifiedSalesRecord({
            day: 1,
            discount71: -50,
            discount72: -25,
            discount73: 0,
            discount74: 0,
          }),
        ],
      }
      const result = aggregateForStore(data, 'S001')
      const entries = result[1].discountEntries

      const entry71 = entries.find((e) => e.type === '71')
      const entry72 = entries.find((e) => e.type === '72')
      expect(entry71?.amount).toBe(150) // abs(-100) + abs(-50)
      expect(entry72?.amount).toBe(25) // abs(0) + abs(-25)
    })
  })

  // ─── aggregateAllStores ──────────────────────────────────

  describe('aggregateAllStores', () => {
    it('should aggregate records grouped by storeId then by day', () => {
      const data: ClassifiedSalesData = {
        records: [
          makeClassifiedSalesRecord({ storeId: 'S001', day: 1, salesAmount: 1000 }),
          makeClassifiedSalesRecord({ storeId: 'S001', day: 2, salesAmount: 2000 }),
          makeClassifiedSalesRecord({ storeId: 'S002', day: 1, salesAmount: 500 }),
        ],
      }
      const result = aggregateAllStores(data)

      expect(result['S001'][1].sales).toBe(1000)
      expect(result['S001'][2].sales).toBe(2000)
      expect(result['S002'][1].sales).toBe(500)
    })

    it('should return empty object for empty data', () => {
      const data: ClassifiedSalesData = { records: [] }
      const result = aggregateAllStores(data)
      expect(Object.keys(result)).toHaveLength(0)
    })

    it('should aggregate multiple records for same store and day', () => {
      const data: ClassifiedSalesData = {
        records: [
          makeClassifiedSalesRecord({
            storeId: 'S001',
            day: 1,
            salesAmount: 1000,
            discount71: -100,
          }),
          makeClassifiedSalesRecord({
            storeId: 'S001',
            day: 1,
            salesAmount: 500,
            discount71: -50,
          }),
        ],
      }
      const result = aggregateAllStores(data)

      expect(result['S001'][1].sales).toBe(1500)
      // discount entries: abs(-100) + abs(-50) = 150 for type 71
      const entry71 = result['S001'][1].discountEntries.find((e) => e.type === '71')
      expect(entry71?.amount).toBe(150)
    })

    it('should compute discount totals correctly per store per day', () => {
      const data: ClassifiedSalesData = {
        records: [
          makeClassifiedSalesRecord({
            storeId: 'S001',
            day: 1,
            discount71: -100,
            discount72: -50,
            discount73: -30,
            discount74: -20,
          }),
        ],
      }
      const result = aggregateAllStores(data)
      expect(result['S001'][1].discount).toBe(200)
    })
  })

  // ─── classifiedSalesMaxDay ───────────────────────────────

  describe('classifiedSalesMaxDay', () => {
    it('should return the maximum day value', () => {
      const data: ClassifiedSalesData = {
        records: [
          makeClassifiedSalesRecord({ day: 5 }),
          makeClassifiedSalesRecord({ day: 15 }),
          makeClassifiedSalesRecord({ day: 10 }),
        ],
      }
      expect(classifiedSalesMaxDay(data)).toBe(15)
    })

    it('should return 0 for empty data', () => {
      const data: ClassifiedSalesData = { records: [] }
      expect(classifiedSalesMaxDay(data)).toBe(0)
    })

    it('should return the day when there is only one record', () => {
      const data: ClassifiedSalesData = {
        records: [makeClassifiedSalesRecord({ day: 7 })],
      }
      expect(classifiedSalesMaxDay(data)).toBe(7)
    })

    it('should handle day 31 (end of month)', () => {
      const data: ClassifiedSalesData = {
        records: [makeClassifiedSalesRecord({ day: 1 }), makeClassifiedSalesRecord({ day: 31 })],
      }
      expect(classifiedSalesMaxDay(data)).toBe(31)
    })
  })

  // ─── mergeClassifiedSalesData ────────────────────────────

  describe('mergeClassifiedSalesData', () => {
    it('should combine records from both datasets', () => {
      const existing: ClassifiedSalesData = {
        records: [makeClassifiedSalesRecord({ day: 1, className: 'ClassA' })],
      }
      const incoming: ClassifiedSalesData = {
        records: [makeClassifiedSalesRecord({ day: 2, className: 'ClassA' })],
      }
      const result = mergeClassifiedSalesData(existing, incoming)
      expect(result.records).toHaveLength(2)
    })

    it('should overwrite existing records with incoming on key collision', () => {
      const existing: ClassifiedSalesData = {
        records: [makeClassifiedSalesRecord({ day: 1, salesAmount: 1000 })],
      }
      const incoming: ClassifiedSalesData = {
        records: [makeClassifiedSalesRecord({ day: 1, salesAmount: 9999 })],
      }
      const result = mergeClassifiedSalesData(existing, incoming)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].salesAmount).toBe(9999)
    })

    it('should handle merging with empty existing data', () => {
      const existing: ClassifiedSalesData = { records: [] }
      const incoming: ClassifiedSalesData = {
        records: [makeClassifiedSalesRecord({ day: 1 })],
      }
      const result = mergeClassifiedSalesData(existing, incoming)
      expect(result.records).toHaveLength(1)
    })

    it('should handle merging with empty incoming data', () => {
      const existing: ClassifiedSalesData = {
        records: [makeClassifiedSalesRecord({ day: 1 })],
      }
      const incoming: ClassifiedSalesData = { records: [] }
      const result = mergeClassifiedSalesData(existing, incoming)
      expect(result.records).toHaveLength(1)
    })

    it('should handle both empty datasets', () => {
      const result = mergeClassifiedSalesData({ records: [] }, { records: [] })
      expect(result.records).toHaveLength(0)
    })

    it('should preserve records with different keys', () => {
      const existing: ClassifiedSalesData = {
        records: [
          makeClassifiedSalesRecord({ storeId: 'S001', day: 1 }),
          makeClassifiedSalesRecord({ storeId: 'S001', day: 2 }),
        ],
      }
      const incoming: ClassifiedSalesData = {
        records: [makeClassifiedSalesRecord({ storeId: 'S002', day: 1 })],
      }
      const result = mergeClassifiedSalesData(existing, incoming)
      expect(result.records).toHaveLength(3)
    })
  })
})

// ═══════════════════════════════════════════════════════════
// DataTypes.ts
// ═══════════════════════════════════════════════════════════

describe('DataTypes', () => {
  // ─── categoryTimeSalesRecordKey ──────────────────────────

  describe('categoryTimeSalesRecordKey', () => {
    it('should generate a tab-separated key from record fields', () => {
      const rec = makeCategoryTimeSalesRecord()
      const key = categoryTimeSalesRecordKey(rec)
      expect(key).toBe('2026\t3\t1\tS001\tD01\tL01\tK01')
    })

    it('should produce different keys for different days', () => {
      const rec1 = makeCategoryTimeSalesRecord({ day: 1 })
      const rec2 = makeCategoryTimeSalesRecord({ day: 2 })
      expect(categoryTimeSalesRecordKey(rec1)).not.toBe(categoryTimeSalesRecordKey(rec2))
    })

    it('should produce different keys for different stores', () => {
      const rec1 = makeCategoryTimeSalesRecord({ storeId: 'S001' })
      const rec2 = makeCategoryTimeSalesRecord({ storeId: 'S002' })
      expect(categoryTimeSalesRecordKey(rec1)).not.toBe(categoryTimeSalesRecordKey(rec2))
    })

    it('should produce different keys for different department codes', () => {
      const rec1 = makeCategoryTimeSalesRecord({ department: { code: 'D01', name: 'Dept1' } })
      const rec2 = makeCategoryTimeSalesRecord({ department: { code: 'D02', name: 'Dept2' } })
      expect(categoryTimeSalesRecordKey(rec1)).not.toBe(categoryTimeSalesRecordKey(rec2))
    })

    it('should produce different keys for different line codes', () => {
      const rec1 = makeCategoryTimeSalesRecord({ line: { code: 'L01', name: 'Line1' } })
      const rec2 = makeCategoryTimeSalesRecord({ line: { code: 'L02', name: 'Line2' } })
      expect(categoryTimeSalesRecordKey(rec1)).not.toBe(categoryTimeSalesRecordKey(rec2))
    })

    it('should produce different keys for different klass codes', () => {
      const rec1 = makeCategoryTimeSalesRecord({ klass: { code: 'K01', name: 'Klass1' } })
      const rec2 = makeCategoryTimeSalesRecord({ klass: { code: 'K02', name: 'Klass2' } })
      expect(categoryTimeSalesRecordKey(rec1)).not.toBe(categoryTimeSalesRecordKey(rec2))
    })

    it('should use code (not name) for department, line, klass', () => {
      const rec = makeCategoryTimeSalesRecord({
        department: { code: 'D01', name: 'DifferentName' },
      })
      const key = categoryTimeSalesRecordKey(rec)
      expect(key).toContain('D01')
      expect(key).not.toContain('DifferentName')
    })
  })

  // ─── mergeCategoryTimeSalesData ──────────────────────────

  describe('mergeCategoryTimeSalesData', () => {
    it('should combine records from both datasets', () => {
      const existing: CategoryTimeSalesData = {
        records: [makeCategoryTimeSalesRecord({ day: 1 })],
      }
      const incoming: CategoryTimeSalesData = {
        records: [makeCategoryTimeSalesRecord({ day: 2 })],
      }
      const result = mergeCategoryTimeSalesData(existing, incoming)
      expect(result.records).toHaveLength(2)
    })

    it('should overwrite existing records with incoming on key collision', () => {
      const existing: CategoryTimeSalesData = {
        records: [makeCategoryTimeSalesRecord({ day: 1, totalAmount: 500 })],
      }
      const incoming: CategoryTimeSalesData = {
        records: [makeCategoryTimeSalesRecord({ day: 1, totalAmount: 9999 })],
      }
      const result = mergeCategoryTimeSalesData(existing, incoming)
      expect(result.records).toHaveLength(1)
      expect(result.records[0].totalAmount).toBe(9999)
    })

    it('should handle merging with empty existing data', () => {
      const existing: CategoryTimeSalesData = { records: [] }
      const incoming: CategoryTimeSalesData = {
        records: [makeCategoryTimeSalesRecord()],
      }
      const result = mergeCategoryTimeSalesData(existing, incoming)
      expect(result.records).toHaveLength(1)
    })

    it('should handle merging with empty incoming data', () => {
      const existing: CategoryTimeSalesData = {
        records: [makeCategoryTimeSalesRecord()],
      }
      const incoming: CategoryTimeSalesData = { records: [] }
      const result = mergeCategoryTimeSalesData(existing, incoming)
      expect(result.records).toHaveLength(1)
    })

    it('should handle both empty datasets', () => {
      const result = mergeCategoryTimeSalesData({ records: [] }, { records: [] })
      expect(result.records).toHaveLength(0)
    })

    it('should preserve records with different keys across stores', () => {
      const existing: CategoryTimeSalesData = {
        records: [
          makeCategoryTimeSalesRecord({ storeId: 'S001', day: 1 }),
          makeCategoryTimeSalesRecord({ storeId: 'S001', day: 2 }),
        ],
      }
      const incoming: CategoryTimeSalesData = {
        records: [makeCategoryTimeSalesRecord({ storeId: 'S002', day: 1 })],
      }
      const result = mergeCategoryTimeSalesData(existing, incoming)
      expect(result.records).toHaveLength(3)
    })

    it('should preserve records with different klass codes on same day/store', () => {
      const existing: CategoryTimeSalesData = {
        records: [makeCategoryTimeSalesRecord({ klass: { code: 'K01', name: 'Klass1' } })],
      }
      const incoming: CategoryTimeSalesData = {
        records: [makeCategoryTimeSalesRecord({ klass: { code: 'K02', name: 'Klass2' } })],
      }
      const result = mergeCategoryTimeSalesData(existing, incoming)
      expect(result.records).toHaveLength(2)
    })
  })
})

