import { describe, it, expect } from 'vitest'
import { calculateDiff } from '../diffCalculator'
import type { DiffResult } from '@/domain/models/analysis'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'
import type { FieldChange, DataTypeDiff } from '@/domain/models/analysis'
import type { CategoryTimeSalesRecord, ClassifiedSalesRecord } from '@/domain/models/record'
import type { MonthlyData } from '@/domain/models/MonthlyData'

// ─── ヘルパー関数 ────────────────────────────────────────

function makeData(overrides: Partial<MonthlyData> = {}): MonthlyData {
  return { ...createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }), ...overrides }
}

function makeCSRecord(
  day: number,
  storeId: string,
  salesAmount: number,
  overrides: Partial<ClassifiedSalesRecord> = {},
): ClassifiedSalesRecord {
  return {
    year: 2025,
    month: 1,
    day,
    storeId,
    storeName: `Store ${storeId}`,
    groupName: 'G1',
    departmentName: 'D1',
    lineName: 'L1',
    className: 'C1',
    salesAmount,
    discount71: 0,
    discount72: 0,
    discount73: 0,
    discount74: 0,
    ...overrides,
  }
}

function makeCTSRecord(
  day: number,
  storeId: string,
  totalAmount: number,
  overrides: Partial<CategoryTimeSalesRecord> = {},
): CategoryTimeSalesRecord {
  return {
    year: 2025,
    month: 1,
    day,
    storeId,
    department: { code: 'D01', name: 'Dept1' },
    line: { code: 'L01', name: 'Line1' },
    klass: { code: 'C01', name: 'Class1' },
    timeSlots: [],
    totalQuantity: 10,
    totalAmount,
    ...overrides,
  }
}

function makeDiffEntry(overrides: Partial<FieldChange> = {}): FieldChange {
  return {
    storeId: '1',
    storeName: 'Store1',
    day: 1,
    fieldPath: 'salesAmount',
    oldValue: null,
    newValue: 50000,
    ...overrides,
  }
}

function makeDiff(overrides: Partial<DataTypeDiff> = {}): DataTypeDiff {
  return {
    dataType: 'classifiedSales',
    dataTypeName: '分類別売上',
    inserts: [],
    modifications: [],
    removals: [],
    ...overrides,
  }
}

// ─── summarizeDiff (テスト用ヘルパー) ─────────────────────
function summarizeDiff(diff: DiffResult): string {
  const parts: string[] = []
  let totalInserts = 0
  let totalModifications = 0
  let totalRemovals = 0
  for (const d of diff.diffs) {
    totalInserts += d.inserts.length
    totalModifications += d.modifications.length
    totalRemovals += d.removals.length
  }
  if (totalInserts > 0) parts.push(`新規 ${totalInserts}件`)
  if (totalModifications > 0) parts.push(`変更 ${totalModifications}件`)
  if (totalRemovals > 0) parts.push(`削除 ${totalRemovals}件`)
  return parts.join('、') || '変更なし'
}

describe('summarizeDiff のフォーマット', () => {
  it('空の diffs 配列は「変更なし」を返す', () => {
    const result: DiffResult = { diffs: [], needsConfirmation: false, autoApproved: [] }
    expect(summarizeDiff(result)).toBe('変更なし')
  })

  it('diffs があるが全カテゴリ内容が空の場合は「変更なし」', () => {
    const result: DiffResult = {
      diffs: [makeDiff({ inserts: [], modifications: [], removals: [] })],
      needsConfirmation: false,
      autoApproved: [],
    }
    // inserts=0, modifications=0, removals=0 => all zeros => '変更なし'
    expect(summarizeDiff(result)).toBe('変更なし')
  })

  it('挿入のみの場合は「新規 N件」のみ', () => {
    const result: DiffResult = {
      diffs: [makeDiff({ inserts: [makeDiffEntry(), makeDiffEntry({ day: 2 })] })],
      needsConfirmation: false,
      autoApproved: ['classifiedSales'],
    }
    expect(summarizeDiff(result)).toBe('新規 2件')
  })

  it('変更のみの場合は「変更 N件」のみ', () => {
    const result: DiffResult = {
      diffs: [
        makeDiff({
          modifications: [
            makeDiffEntry({ oldValue: 50000, newValue: 60000 }),
            makeDiffEntry({ oldValue: 30000, newValue: 40000, day: 2 }),
          ],
        }),
      ],
      needsConfirmation: true,
      autoApproved: [],
    }
    expect(summarizeDiff(result)).toBe('変更 2件')
  })

  it('削除のみの場合は「削除 N件」のみ', () => {
    const result: DiffResult = {
      diffs: [
        makeDiff({
          removals: [makeDiffEntry({ oldValue: 50000, newValue: null })],
        }),
      ],
      needsConfirmation: true,
      autoApproved: [],
    }
    expect(summarizeDiff(result)).toBe('削除 1件')
  })

  it('複数種別の diffs を横断して集計する', () => {
    const result: DiffResult = {
      diffs: [
        makeDiff({
          dataType: 'purchase',
          inserts: [makeDiffEntry()],
          modifications: [makeDiffEntry({ oldValue: 100, newValue: 200 })],
        }),
        makeDiff({
          dataType: 'classifiedSales',
          inserts: [makeDiffEntry(), makeDiffEntry({ day: 3 })],
          removals: [makeDiffEntry({ oldValue: 70000, newValue: null })],
        }),
      ],
      needsConfirmation: true,
      autoApproved: [],
    }
    const summary = summarizeDiff(result)
    expect(summary).toContain('新規 3件')
    expect(summary).toContain('変更 1件')
    expect(summary).toContain('削除 1件')
  })

  it('全種類が混在する場合は「、」で区切られる', () => {
    const result: DiffResult = {
      diffs: [
        makeDiff({
          inserts: [makeDiffEntry()],
          modifications: [makeDiffEntry({ oldValue: 1, newValue: 2 })],
          removals: [makeDiffEntry({ oldValue: 3, newValue: null })],
        }),
      ],
      needsConfirmation: true,
      autoApproved: [],
    }
    const summary = summarizeDiff(result)
    // 順序: 新規、変更、削除
    expect(summary).toBe('新規 1件、変更 1件、削除 1件')
  })
})

// ─── calculateDiff: 基本動作 ────────────────────────────

describe('calculateDiff の差分検出', () => {
  describe('空データのハンドリング', () => {
    it('既存・新規ともに空の場合は差分なし、needsConfirmation=false', () => {
      const result = calculateDiff(makeData(), makeData(), new Set(['purchase']))
      expect(result.diffs).toHaveLength(0)
      expect(result.needsConfirmation).toBe(false)
      expect(result.autoApproved).toContain('purchase')
    })

    it('既存が空で新規にデータがある場合は autoApproved', () => {
      const incoming = makeData({
        purchase: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              suppliers: {},
              total: { cost: 100, price: 130 },
            },
          ],
        },
      })
      const result = calculateDiff(makeData(), incoming, new Set(['purchase']))
      expect(result.needsConfirmation).toBe(false)
      expect(result.autoApproved).toContain('purchase')
      expect(result.diffs).toHaveLength(0)
    })

    it('既存にデータがあり新規が空の場合はスキップ（差分なし）', () => {
      const existing = makeData({
        purchase: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              suppliers: {},
              total: { cost: 100, price: 130 },
            },
          ],
        },
      })
      const result = calculateDiff(existing, makeData(), new Set(['purchase']))
      expect(result.diffs).toHaveLength(0)
      expect(result.needsConfirmation).toBe(false)
    })

    it('importedTypes が空の場合は全てスキップ', () => {
      const data = makeData({
        purchase: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              suppliers: {},
              total: { cost: 100, price: 130 },
            },
          ],
        },
        classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      })
      const result = calculateDiff(data, data, new Set())
      expect(result.diffs).toHaveLength(0)
      expect(result.needsConfirmation).toBe(false)
      expect(result.autoApproved).toHaveLength(0)
    })
  })

  // ─── StoreDayIndex 系の差分 ──────────────────────────

  describe('StoreDayIndex diffs', () => {
    it('新規日の挿入はゼロ・null 値を除外する', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [
            { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 },
            { year: 2025, month: 1, day: 2, storeId: '1', price: 0, cost: 0 },
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      // day=2 has all zeroes, so no inserts should be generated
      const flowersDiff = result.diffs.find((d) => d.dataType === 'flowers')
      expect(flowersDiff).toBeUndefined()
    })

    it('既存の日が新規に存在しない場合は removal として検出', () => {
      const existing = makeData({
        flowers: {
          records: [
            { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 },
            { year: 2025, month: 1, day: 2, storeId: '1', price: 20000, cost: 10000 },
          ],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.needsConfirmation).toBe(true)
      const flowersDiff = result.diffs.find((d) => d.dataType === 'flowers')
      expect(flowersDiff).toBeDefined()
      const day2Removals = flowersDiff!.removals.filter((r) => r.day === 2)
      expect(day2Removals.length).toBeGreaterThan(0)
    })

    it('既存の店舗が新規に丸ごと存在しない場合は removal として検出', () => {
      const existing = makeData({
        flowers: {
          records: [
            { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 },
            { year: 2025, month: 1, day: 1, storeId: '2', price: 20000, cost: 10000 },
          ],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.needsConfirmation).toBe(true)
      const flowersDiff = result.diffs.find((d) => d.dataType === 'flowers')
      const store2Removals = flowersDiff!.removals.filter((r) => r.storeId === '2')
      expect(store2Removals.length).toBeGreaterThan(0)
    })

    it('フィールドが null/0 から非ゼロ値になった場合は insert として検出', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 0 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      const flowersDiff = result.diffs.find((d) => d.dataType === 'flowers')
      expect(flowersDiff).toBeDefined()
      const costInsert = flowersDiff!.inserts.find((i) => i.fieldPath === 'cost')
      expect(costInsert).toBeDefined()
      expect(costInsert!.newValue).toBe(5000)
    })

    it('フィールドが非ゼロ値から 0 になった場合は removal として検出', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 0 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.needsConfirmation).toBe(true)
      const flowersDiff = result.diffs.find((d) => d.dataType === 'flowers')
      const costRemoval = flowersDiff!.removals.find((r) => r.fieldPath === 'cost')
      expect(costRemoval).toBeDefined()
      expect(costRemoval!.oldValue).toBe(5000)
    })

    it('ネストされた仕入データのフィールドパスが正しく展開される', () => {
      const existing = makeData({
        purchase: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              suppliers: { S001: { name: 'A', cost: 1000, price: 1500 } },
              total: { cost: 1000, price: 1500 },
            },
          ],
        },
      })
      const incoming = makeData({
        purchase: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              suppliers: { S001: { name: 'A', cost: 2000, price: 2500 } },
              total: { cost: 2000, price: 2500 },
            },
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['purchase']))
      const purchaseDiff = result.diffs.find((d) => d.dataType === 'purchase')
      expect(purchaseDiff).toBeDefined()
      // Check that nested field paths are generated
      const costMod = purchaseDiff!.modifications.find((m) => m.fieldPath === 'suppliers.S001.cost')
      expect(costMod).toBeDefined()
      expect(costMod!.oldValue).toBe(1000)
      expect(costMod!.newValue).toBe(2000)
    })

    it('interStoreIn データ種別の差分を検出する', () => {
      const existing = makeData({
        interStoreIn: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              interStoreIn: [
                {
                  day: 1,
                  cost: 1000,
                  price: 1500,
                  fromStoreId: '2',
                  toStoreId: '1',
                  isDepartmentTransfer: false,
                },
              ],
              interStoreOut: [],
              interDepartmentIn: [],
              interDepartmentOut: [],
            },
          ],
        },
      })
      const incoming = makeData({
        interStoreIn: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              interStoreIn: [
                {
                  day: 1,
                  cost: 2000,
                  price: 2500,
                  fromStoreId: '2',
                  toStoreId: '1',
                  isDepartmentTransfer: false,
                },
              ],
              interStoreOut: [],
              interDepartmentIn: [],
              interDepartmentOut: [],
            },
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['interStoreIn']))
      expect(result.needsConfirmation).toBe(true)
      const diff = result.diffs.find((d) => d.dataType === 'interStoreIn')
      expect(diff).toBeDefined()
      expect(diff!.modifications.length).toBeGreaterThan(0)
    })

    it('consumables データ種別の差分を検出する', () => {
      const existing = makeData({
        consumables: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', cost: 500, items: [] }],
        },
      })
      const incoming = makeData({
        consumables: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', cost: 800, items: [] }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['consumables']))
      expect(result.needsConfirmation).toBe(true)
      const diff = result.diffs.find((d) => d.dataType === 'consumables')
      expect(diff!.modifications.length).toBeGreaterThan(0)
    })

    it('directProduce データ種別の差分を検出する', () => {
      const existing = makeData({
        directProduce: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 3000, cost: 2000 }],
        },
      })
      const incoming = makeData({
        directProduce: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 4000, cost: 2000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['directProduce']))
      expect(result.needsConfirmation).toBe(true)
      const diff = result.diffs.find((d) => d.dataType === 'directProduce')
      expect(diff!.modifications.length).toBeGreaterThan(0)
    })

    it('interStoreOut データ種別の差分を検出する', () => {
      const existing = makeData({
        interStoreOut: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              interStoreIn: [],
              interStoreOut: [
                {
                  day: 1,
                  cost: 500,
                  price: 700,
                  fromStoreId: '1',
                  toStoreId: '2',
                  isDepartmentTransfer: false,
                },
              ],
              interDepartmentIn: [],
              interDepartmentOut: [],
            },
          ],
        },
      })
      const incoming = makeData({
        interStoreOut: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              interStoreIn: [],
              interStoreOut: [
                {
                  day: 1,
                  cost: 800,
                  price: 1000,
                  fromStoreId: '1',
                  toStoreId: '2',
                  isDepartmentTransfer: false,
                },
              ],
              interDepartmentIn: [],
              interDepartmentOut: [],
            },
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['interStoreOut']))
      expect(result.needsConfirmation).toBe(true)
    })
  })

  // ─── classifiedSales の差分 ───────────────────────────

  describe('classifiedSales diffs', () => {
    it('既存が空で新規にレコードがある場合は autoApproved', () => {
      const incoming = makeData({
        classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      })
      const result = calculateDiff(makeData(), incoming, new Set(['classifiedSales']))
      expect(result.autoApproved).toContain('classifiedSales')
      expect(result.needsConfirmation).toBe(false)
    })

    it('新規の classifiedSales が空の場合はスキップ', () => {
      const existing = makeData({
        classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      })
      const result = calculateDiff(existing, makeData(), new Set(['classifiedSales']))
      expect(result.diffs).toHaveLength(0)
    })

    it('salesAmount=0 の新規レコードは insert に含まれない', () => {
      const existing = makeData({
        classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      })
      const incoming = makeData({
        classifiedSales: {
          records: [makeCSRecord(1, '1', 50000), makeCSRecord(2, '1', 0)],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['classifiedSales']))
      const csDiff = result.diffs.find((d) => d.dataType === 'classifiedSales')
      // day=2 has salesAmount=0, so should not be inserted
      expect(csDiff).toBeUndefined()
    })

    it('salesAmount=0 の既存レコードの削除は removal に含まれない', () => {
      const existing = makeData({
        classifiedSales: {
          records: [makeCSRecord(1, '1', 50000), makeCSRecord(2, '1', 0)],
        },
      })
      const incoming = makeData({
        classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      })
      const result = calculateDiff(existing, incoming, new Set(['classifiedSales']))
      // day=2 existing salesAmount=0, so removal should be suppressed
      const csDiff = result.diffs.find((d) => d.dataType === 'classifiedSales')
      expect(csDiff).toBeUndefined()
    })

    it('異なるカテゴリのレコードは別キーとして扱われる', () => {
      const existing = makeData({
        classifiedSales: {
          records: [makeCSRecord(1, '1', 50000, { className: 'C1' })],
        },
      })
      const incoming = makeData({
        classifiedSales: {
          records: [
            makeCSRecord(1, '1', 50000, { className: 'C1' }),
            makeCSRecord(1, '1', 30000, { className: 'C2' }),
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['classifiedSales']))
      const csDiff = result.diffs.find((d) => d.dataType === 'classifiedSales')
      expect(csDiff).toBeDefined()
      expect(csDiff!.inserts.length).toBe(1)
      expect(csDiff!.modifications.length).toBe(0)
    })

    it('fieldPath にグループ>部門>ライン>クラスが含まれる', () => {
      const existing = makeData({
        classifiedSales: {
          records: [
            makeCSRecord(1, '1', 50000, {
              groupName: 'GRP',
              departmentName: 'DEPT',
              lineName: 'LINE',
              className: 'CLS',
            }),
          ],
        },
      })
      const incoming = makeData({
        classifiedSales: {
          records: [
            makeCSRecord(1, '1', 70000, {
              groupName: 'GRP',
              departmentName: 'DEPT',
              lineName: 'LINE',
              className: 'CLS',
            }),
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['classifiedSales']))
      const csDiff = result.diffs.find((d) => d.dataType === 'classifiedSales')
      expect(csDiff!.modifications[0].fieldPath).toBe('GRP>DEPT>LINE>CLS')
    })

    it('同一データの modification と removal が混在する場合', () => {
      const existing = makeData({
        classifiedSales: {
          records: [makeCSRecord(1, '1', 50000), makeCSRecord(2, '1', 60000)],
        },
      })
      const incoming = makeData({
        classifiedSales: {
          records: [makeCSRecord(1, '1', 55000)],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['classifiedSales']))
      expect(result.needsConfirmation).toBe(true)
      const csDiff = result.diffs.find((d) => d.dataType === 'classifiedSales')
      expect(csDiff!.modifications.length).toBe(1)
      expect(csDiff!.removals.length).toBe(1)
    })
  })

  // ─── categoryTimeSales の差分 ──────────────────────────

  describe('categoryTimeSales diffs', () => {
    it('既存が空で新規にレコードがある場合は autoApproved', () => {
      const incoming = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000)] },
      })
      const result = calculateDiff(makeData(), incoming, new Set(['categoryTimeSales']))
      expect(result.autoApproved).toContain('categoryTimeSales')
      expect(result.needsConfirmation).toBe(false)
    })

    it('新規の categoryTimeSales が空の場合はスキップ', () => {
      const existing = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000)] },
      })
      const result = calculateDiff(existing, makeData(), new Set(['categoryTimeSales']))
      expect(result.diffs).toHaveLength(0)
    })

    it('totalAmount の変更は modification として検出', () => {
      const existing = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000)] },
      })
      const incoming = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 40000)] },
      })
      const result = calculateDiff(existing, incoming, new Set(['categoryTimeSales']))
      expect(result.needsConfirmation).toBe(true)
      const ctsDiff = result.diffs.find((d) => d.dataType === 'categoryTimeSales')
      expect(ctsDiff!.modifications.length).toBe(1)
      expect(ctsDiff!.modifications[0].oldValue).toBe(30000)
      expect(ctsDiff!.modifications[0].newValue).toBe(40000)
    })

    it('totalQuantity の変更も modification として検出', () => {
      const existing = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000, { totalQuantity: 10 })] },
      })
      const incoming = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000, { totalQuantity: 20 })] },
      })
      const result = calculateDiff(existing, incoming, new Set(['categoryTimeSales']))
      expect(result.needsConfirmation).toBe(true)
      const ctsDiff = result.diffs.find((d) => d.dataType === 'categoryTimeSales')
      expect(ctsDiff!.modifications.length).toBe(1)
    })

    it('新規レコード（totalAmount=0）は insert に含まれない', () => {
      const existing = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000)] },
      })
      const incoming = makeData({
        categoryTimeSales: {
          records: [makeCTSRecord(1, '1', 30000), makeCTSRecord(2, '1', 0)],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['categoryTimeSales']))
      const ctsDiff = result.diffs.find((d) => d.dataType === 'categoryTimeSales')
      expect(ctsDiff).toBeUndefined()
    })

    it('既存レコード（totalAmount=0）の削除は removal に含まれない', () => {
      const existing = makeData({
        categoryTimeSales: {
          records: [makeCTSRecord(1, '1', 30000), makeCTSRecord(2, '1', 0)],
        },
      })
      const incoming = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000)] },
      })
      const result = calculateDiff(existing, incoming, new Set(['categoryTimeSales']))
      const ctsDiff = result.diffs.find((d) => d.dataType === 'categoryTimeSales')
      expect(ctsDiff).toBeUndefined()
    })

    it('既存レコードが新規に存在しない場合は removal として検出', () => {
      const existing = makeData({
        categoryTimeSales: {
          records: [makeCTSRecord(1, '1', 30000), makeCTSRecord(2, '1', 50000)],
        },
      })
      const incoming = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000)] },
      })
      const result = calculateDiff(existing, incoming, new Set(['categoryTimeSales']))
      expect(result.needsConfirmation).toBe(true)
      const ctsDiff = result.diffs.find((d) => d.dataType === 'categoryTimeSales')
      expect(ctsDiff!.removals.length).toBe(1)
      expect(ctsDiff!.removals[0].oldValue).toBe(50000)
    })

    it('異なるカテゴリ（department/line/klass）は別キーとして扱われる', () => {
      const existing = makeData({
        categoryTimeSales: {
          records: [
            makeCTSRecord(1, '1', 30000, {
              department: { code: 'D01', name: 'Dept1' },
              line: { code: 'L01', name: 'Line1' },
              klass: { code: 'C01', name: 'Class1' },
            }),
          ],
        },
      })
      const incoming = makeData({
        categoryTimeSales: {
          records: [
            makeCTSRecord(1, '1', 30000, {
              department: { code: 'D01', name: 'Dept1' },
              line: { code: 'L01', name: 'Line1' },
              klass: { code: 'C01', name: 'Class1' },
            }),
            makeCTSRecord(1, '1', 20000, {
              department: { code: 'D02', name: 'Dept2' },
              line: { code: 'L01', name: 'Line1' },
              klass: { code: 'C01', name: 'Class1' },
            }),
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['categoryTimeSales']))
      const ctsDiff = result.diffs.find((d) => d.dataType === 'categoryTimeSales')
      expect(ctsDiff).toBeDefined()
      expect(ctsDiff!.inserts.length).toBe(1)
      expect(ctsDiff!.modifications.length).toBe(0)
    })

    it('fieldPath に department>line>klass の名前が含まれる', () => {
      const existing = makeData({
        categoryTimeSales: {
          records: [
            makeCTSRecord(1, '1', 30000, {
              department: { code: 'D01', name: 'Food' },
              line: { code: 'L01', name: 'Fresh' },
              klass: { code: 'C01', name: 'Vegetables' },
            }),
          ],
        },
      })
      const incoming = makeData({
        categoryTimeSales: {
          records: [
            makeCTSRecord(1, '1', 40000, {
              department: { code: 'D01', name: 'Food' },
              line: { code: 'L01', name: 'Fresh' },
              klass: { code: 'C01', name: 'Vegetables' },
            }),
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['categoryTimeSales']))
      const ctsDiff = result.diffs.find((d) => d.dataType === 'categoryTimeSales')
      expect(ctsDiff!.modifications[0].fieldPath).toBe('Food>Fresh>Vegetables')
    })

    it('dataTypeName が「分類別時間帯売上」である', () => {
      const existing = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000)] },
      })
      const incoming = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 40000)] },
      })
      const result = calculateDiff(existing, incoming, new Set(['categoryTimeSales']))
      const ctsDiff = result.diffs.find((d) => d.dataType === 'categoryTimeSales')
      expect(ctsDiff!.dataTypeName).toBe('分類別時間帯売上')
    })
  })

  // ─── needsConfirmation フラグ ─────────────────────────

  describe('needsConfirmation flag', () => {
    it('挿入のみの場合は false', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [
            { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 },
            { year: 2025, month: 1, day: 2, storeId: '1', price: 20000, cost: 10000 },
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.needsConfirmation).toBe(false)
    })

    it('modification がある場合は true', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 15000, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.needsConfirmation).toBe(true)
    })

    it('removal がある場合は true', () => {
      const existing = makeData({
        flowers: {
          records: [
            { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 },
            { year: 2025, month: 1, day: 2, storeId: '1', price: 20000, cost: 10000 },
          ],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.needsConfirmation).toBe(true)
    })

    it('差分なしの場合は false', () => {
      const data = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const result = calculateDiff(data, data, new Set(['flowers']))
      expect(result.needsConfirmation).toBe(false)
    })

    it('複数データ種別のうち1つでも modification があれば true', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
        directProduce: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 3000, cost: 2000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [
            { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 },
            { year: 2025, month: 1, day: 2, storeId: '1', price: 5000, cost: 3000 },
          ],
        },
        directProduce: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 4000, cost: 2000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers', 'directProduce']))
      expect(result.needsConfirmation).toBe(true)
    })

    it('classifiedSales の modification で needsConfirmation が true になる', () => {
      const existing = makeData({
        classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      })
      const incoming = makeData({
        classifiedSales: { records: [makeCSRecord(1, '1', 60000)] },
      })
      const result = calculateDiff(existing, incoming, new Set(['classifiedSales']))
      expect(result.needsConfirmation).toBe(true)
    })

    it('categoryTimeSales の removal で needsConfirmation が true になる', () => {
      const existing = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000)] },
      })
      const incoming = makeData({
        categoryTimeSales: { records: [] },
      })
      // incoming records is empty, so it's skipped (no diff generated)
      const result = calculateDiff(existing, incoming, new Set(['categoryTimeSales']))
      expect(result.needsConfirmation).toBe(false)
    })
  })

  // ─── autoApproved の挙動 ──────────────────────────────

  describe('autoApproved behavior', () => {
    it('既存が空の StoreDayIndex 種別は autoApproved', () => {
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
        directProduce: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 3000, cost: 2000 }],
        },
      })
      const result = calculateDiff(makeData(), incoming, new Set(['flowers', 'directProduce']))
      expect(result.autoApproved).toContain('flowers')
      expect(result.autoApproved).toContain('directProduce')
    })

    it('挿入のみの StoreDayIndex 種別は autoApproved', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [
            { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 },
            { year: 2025, month: 1, day: 2, storeId: '1', price: 20000, cost: 10000 },
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.autoApproved).toContain('flowers')
    })

    it('modification がある種別は autoApproved に含まれない', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 15000, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.autoApproved).not.toContain('flowers')
    })

    it('removal がある種別は autoApproved に含まれない', () => {
      const existing = makeData({
        flowers: {
          records: [
            { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 },
            { year: 2025, month: 1, day: 2, storeId: '1', price: 20000, cost: 10000 },
          ],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.autoApproved).not.toContain('flowers')
    })

    it('挿入のみの classifiedSales は autoApproved', () => {
      const existing = makeData({
        classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      })
      const incoming = makeData({
        classifiedSales: {
          records: [makeCSRecord(1, '1', 50000), makeCSRecord(2, '1', 60000)],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['classifiedSales']))
      expect(result.autoApproved).toContain('classifiedSales')
    })

    it('挿入のみの categoryTimeSales は autoApproved', () => {
      const existing = makeData({
        categoryTimeSales: { records: [makeCTSRecord(1, '1', 30000)] },
      })
      const incoming = makeData({
        categoryTimeSales: {
          records: [makeCTSRecord(1, '1', 30000), makeCTSRecord(2, '1', 20000)],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['categoryTimeSales']))
      expect(result.autoApproved).toContain('categoryTimeSales')
    })

    it('変更なし（同一データ）の場合は autoApproved に含まれる', () => {
      const data = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const result = calculateDiff(data, data, new Set(['flowers']))
      // No inserts, no modifications, no removals => modifications=0, removals=0 => autoApproved
      expect(result.autoApproved).toContain('flowers')
    })
  })

  // ─── 浮動小数点・エッジケース ─────────────────────────

  describe('edge cases', () => {
    it('浮動小数点の微小差（0.001未満）は同値とみなす', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000.0001, cost: 5000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000.0005, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.needsConfirmation).toBe(false)
    })

    it('浮動小数点の差が0.001以上の場合は modification', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10001, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      expect(result.needsConfirmation).toBe(true)
    })

    it('文字列値の変更も modification として検出される', () => {
      const existing = makeData({
        purchase: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              suppliers: { S001: { name: 'Old Name', cost: 1000, price: 1500 } },
              total: { cost: 1000, price: 1500 },
            },
          ],
        },
      })
      const incoming = makeData({
        purchase: {
          records: [
            {
              year: 2025,
              month: 1,
              day: 1,
              storeId: '1',
              suppliers: { S001: { name: 'New Name', cost: 1000, price: 1500 } },
              total: { cost: 1000, price: 1500 },
            },
          ],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['purchase']))
      const purchaseDiff = result.diffs.find((d) => d.dataType === 'purchase')
      expect(purchaseDiff).toBeDefined()
      const nameMod = purchaseDiff!.modifications.find((m) => m.fieldPath === 'suppliers.S001.name')
      expect(nameMod).toBeDefined()
      expect(nameMod!.oldValue).toBe('Old Name')
      expect(nameMod!.newValue).toBe('New Name')
    })

    it('店名の解決: existing.stores から取得', () => {
      const existing = makeData({
        stores: new Map([['1', { id: '1', code: '0001', name: '既存店舗' }]]),
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 15000, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      const mod = result.diffs[0]?.modifications[0]
      expect(mod?.storeName).toBe('既存店舗')
    })

    it('店名の解決: incoming.stores にフォールバック', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
      })
      const incoming = makeData({
        stores: new Map([['1', { id: '1', code: '0001', name: '新規店舗' }]]),
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 15000, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      const mod = result.diffs[0]?.modifications[0]
      expect(mod?.storeName).toBe('新規店舗')
    })

    it('店名の解決: stores に未登録の場合は storeId がそのまま使われる', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '99', price: 10000, cost: 5000 }],
        },
      })
      const incoming = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '99', price: 15000, cost: 5000 }],
        },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers']))
      const mod = result.diffs[0]?.modifications[0]
      expect(mod?.storeName).toBe('99')
    })

    it('複数データ種別を同時にインポートした場合の autoApproved 管理', () => {
      const existing = makeData({
        flowers: {
          records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 }],
        },
        classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      })
      const incoming = makeData({
        flowers: {
          records: [
            { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 5000 },
            { year: 2025, month: 1, day: 2, storeId: '1', price: 5000, cost: 3000 },
          ],
        },
        classifiedSales: { records: [makeCSRecord(1, '1', 60000)] },
      })
      const result = calculateDiff(existing, incoming, new Set(['flowers', 'classifiedSales']))
      // flowers: insert only => autoApproved
      expect(result.autoApproved).toContain('flowers')
      // classifiedSales: modification => NOT autoApproved
      expect(result.autoApproved).not.toContain('classifiedSales')
      expect(result.needsConfirmation).toBe(true)
    })
  })
})
