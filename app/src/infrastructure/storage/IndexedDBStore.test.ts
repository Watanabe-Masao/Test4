import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  saveImportedData,
  loadImportedData,
  getPersistedMeta,
  clearMonthData,
  clearAllData,
  isIndexedDBAvailable,
  saveDataSlice,
} from './IndexedDBStore'
import { createEmptyImportedData } from '@/domain/models/storeTypes'
import type { CategoryTimeSalesData, BudgetData } from '@/domain/models/record'
import type { ImportedData } from '@/domain/models/storeTypes'

function makeCSRecord(day: number, storeId: string, salesAmount: number, discount = 0) {
  return {
    year: 2026,
    month: 2,
    day,
    storeId,
    storeName: `Store ${storeId}`,
    groupName: 'G1',
    departmentName: 'D1',
    lineName: 'L1',
    className: 'C1',
    salesAmount,
    discount71: discount,
    discount72: 0,
    discount73: 0,
    discount74: 0,
  }
}

function makeTestData(overrides: Partial<ImportedData> = {}): ImportedData {
  return {
    ...createEmptyImportedData(),
    stores: new Map([
      ['1', { id: '1', code: '0001', name: '店舗A' }],
      ['2', { id: '2', code: '0002', name: '店舗B' }],
    ]),
    suppliers: new Map([['0000001', { code: '0000001', name: '取引先A' }]]),
    purchase: {
      records: [
        {
          year: 2026,
          month: 2,
          day: 1,
          storeId: '1',
          suppliers: {
            '0000001': { name: '取引先A', cost: 10000, price: 13000 },
          },
          total: { cost: 10000, price: 13000 },
        },
      ],
    },
    classifiedSales: {
      records: [
        makeCSRecord(1, '1', 50000, 3000),
        makeCSRecord(2, '1', 60000),
        makeCSRecord(1, '2', 40000),
      ],
    },
    settings: new Map([
      [
        '1',
        {
          storeId: '1',
          openingInventory: 100000,
          closingInventory: 120000,
          grossProfitBudget: null,
          productInventory: null,
          costInclusionInventory: null,
          inventoryDate: null,
          closingInventoryDay: null,
        },
      ],
    ]),
    budget: new Map([
      [
        '1',
        {
          storeId: '1',
          daily: new Map([
            [1, 200000],
            [2, 210000],
          ]),
          total: 410000,
        },
      ],
    ]),
    ...overrides,
  }
}

const TEST_CATEGORY_TIME_SALES: CategoryTimeSalesData = {
  records: [
    {
      year: 2025,
      month: 6,
      day: 1,
      storeId: '1',
      department: { code: '01', name: '食品' },
      line: { code: '001', name: 'ライン1' },
      klass: { code: '0001', name: 'クラス1' },
      timeSlots: [
        { hour: 9, quantity: 10, amount: 50000 },
        { hour: 10, quantity: 15, amount: 75000 },
      ],
      totalQuantity: 25,
      totalAmount: 125000,
    },
    {
      year: 2025,
      month: 6,
      day: 2,
      storeId: '2',
      department: { code: '02', name: '日用品' },
      line: { code: '002', name: 'ライン2' },
      klass: { code: '0002', name: 'クラス2' },
      timeSlots: [{ hour: 11, quantity: 5, amount: 30000 }],
      totalQuantity: 5,
      totalAmount: 30000,
    },
  ],
}

// fake-indexeddb は各テスト間でDB状態が共有される可能性があるため、
// 毎回クリアする
beforeEach(async () => {
  await clearAllData().catch((err) => {
    console.warn('[test setup] clearAllData failed:', err)
  })
})

describe('isIndexedDBAvailable', () => {
  it('fake-indexeddb 環境で true を返す', () => {
    expect(isIndexedDBAvailable()).toBe(true)
  })
})

describe('saveImportedData / loadImportedData', () => {
  it('保存したデータを読み込める', async () => {
    const data = makeTestData()
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded).not.toBeNull()
    expect(loaded!.stores.size).toBe(2)
    expect(loaded!.stores.get('1')?.name).toBe('店舗A')
    expect(loaded!.suppliers.size).toBe(1)
    expect(loaded!.suppliers.get('0000001')?.name).toBe('取引先A')
  })

  it('分類別売上データが正しく復元される', async () => {
    const data = makeTestData()
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.classifiedSales.records).toHaveLength(3)
    const store1Day1 = loaded!.classifiedSales.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(store1Day1?.salesAmount).toBe(50000)
    expect(store1Day1?.discount71).toBe(3000)
    const store2Day1 = loaded!.classifiedSales.records.find((r) => r.storeId === '2' && r.day === 1)
    expect(store2Day1?.salesAmount).toBe(40000)
  })

  it('仕入データの入れ子構造が復元される', async () => {
    const data = makeTestData()
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    const entry = loaded!.purchase.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(entry?.total.cost).toBe(10000)
    expect(entry?.suppliers['0000001']?.name).toBe('取引先A')
  })

  it('在庫設定（Map）が復元される', async () => {
    const data = makeTestData()
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.settings.size).toBe(1)
    expect(loaded!.settings.get('1')?.openingInventory).toBe(100000)
    expect(loaded!.settings.get('1')?.closingInventory).toBe(120000)
  })

  it('予算データ（Map<string, BudgetData>）が復元される', async () => {
    const data = makeTestData()
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.budget.size).toBe(1)
    const budget = loaded!.budget.get('1')
    expect(budget?.total).toBe(410000)
    expect(budget?.daily.get(1)).toBe(200000)
    expect(budget?.daily.get(2)).toBe(210000)
  })

  it('異なる年月のデータは読み込まれない', async () => {
    const data = makeTestData()
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 3) // 3月を指定
    expect(loaded).toBeNull()
  })

  it('データを上書き保存できる', async () => {
    const data1 = makeTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    await saveImportedData(data1, 2026, 2)

    const data2 = makeTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 99999)] },
    })
    await saveImportedData(data2, 2026, 2)

    const loaded = await loadImportedData(2026, 2)
    const rec = loaded!.classifiedSales.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.salesAmount).toBe(99999)
  })

  it('空のデータも保存・復元できる', async () => {
    const data = createEmptyImportedData()
    await saveImportedData(data, 2026, 1)

    const loaded = await loadImportedData(2026, 1)
    expect(loaded).not.toBeNull()
    expect(loaded!.stores.size).toBe(0)
    expect(loaded!.classifiedSales.records).toHaveLength(0)
  })

  // ─── 前年分類別売上データの保持テスト ─────────────────────────

  it('前年分類別売上データは DB に保存されない（実際の年月に通常データとして保存される）', async () => {
    const data = makeTestData({
      prevYearClassifiedSales: {
        records: [makeCSRecord(1, '1', 45000), makeCSRecord(2, '1', 55000)],
      },
    })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    // prevYearClassifiedSales は当月のDBエントリには含まれない
    expect(loaded!.prevYearClassifiedSales.records).toHaveLength(0)
  })

  // ─── categoryTimeSales の保持テスト ─────────────────────

  it('categoryTimeSales データが保存・復元される', async () => {
    const data = makeTestData({ categoryTimeSales: TEST_CATEGORY_TIME_SALES })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.categoryTimeSales.records).toHaveLength(2)
    const r0 = loaded!.categoryTimeSales.records[0]
    expect(r0.day).toBe(1)
    expect(r0.storeId).toBe('1')
    expect(r0.department.name).toBe('食品')
    expect(r0.timeSlots).toHaveLength(2)
    expect(r0.timeSlots[0].hour).toBe(9)
    expect(r0.timeSlots[0].amount).toBe(50000)
    expect(r0.totalQuantity).toBe(25)
    expect(r0.totalAmount).toBe(125000)

    const r1 = loaded!.categoryTimeSales.records[1]
    expect(r1.storeId).toBe('2')
    expect(r1.department.name).toBe('日用品')
  })

  it('空の categoryTimeSales が正しく復元される', async () => {
    const data = makeTestData({ categoryTimeSales: { records: [] } })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.categoryTimeSales.records).toHaveLength(0)
  })

  it('categoryTimeSales を上書き保存できる', async () => {
    const data1 = makeTestData({ categoryTimeSales: TEST_CATEGORY_TIME_SALES })
    await saveImportedData(data1, 2026, 2)

    const updated: CategoryTimeSalesData = {
      records: [
        {
          year: 2026,
          month: 2,
          day: 5,
          storeId: '3',
          department: { code: '03', name: '衣料' },
          line: { code: '003', name: 'ライン3' },
          klass: { code: '0003', name: 'クラス3' },
          timeSlots: [{ hour: 14, quantity: 20, amount: 80000 }],
          totalQuantity: 20,
          totalAmount: 80000,
        },
      ],
    }
    const data2 = makeTestData({ categoryTimeSales: updated })
    await saveImportedData(data2, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.categoryTimeSales.records).toHaveLength(1)
    expect(loaded!.categoryTimeSales.records[0].storeId).toBe('3')
    expect(loaded!.categoryTimeSales.records[0].department.name).toBe('衣料')
  })
})

describe('getPersistedMeta', () => {
  it('保存後にメタデータが取得できる', async () => {
    await saveImportedData(makeTestData(), 2026, 2)

    const meta = await getPersistedMeta()
    expect(meta).not.toBeNull()
    expect(meta!.year).toBe(2026)
    expect(meta!.month).toBe(2)
    expect(meta!.savedAt).toBeTruthy()
  })

  it('未保存時は null を返す', async () => {
    const meta = await getPersistedMeta()
    expect(meta).toBeNull()
  })
})

describe('clearMonthData', () => {
  it('指定月のデータのみ削除される', async () => {
    await saveImportedData(makeTestData(), 2026, 1)
    await saveImportedData(makeTestData(), 2026, 2)

    await clearMonthData(2026, 1)

    // 1月は削除されたが、metaは2月を指しているのでloadは成功
    const loaded2 = await loadImportedData(2026, 2)
    expect(loaded2).not.toBeNull()
  })

  it('categoryTimeSales も削除される', async () => {
    const data = makeTestData({ categoryTimeSales: TEST_CATEGORY_TIME_SALES })
    await saveImportedData(data, 2026, 2)

    // データがあることを確認
    const before = await loadImportedData(2026, 2)
    expect(before!.categoryTimeSales.records).toHaveLength(2)

    await clearMonthData(2026, 2)

    // 再保存してロード（clearMonthDataはmetaを消さないので再保存が必要）
    const emptyData = createEmptyImportedData()
    await saveImportedData(emptyData, 2026, 2)
    const after = await loadImportedData(2026, 2)
    expect(after!.categoryTimeSales.records).toHaveLength(0)
  })

  it('分類別売上データも削除される', async () => {
    const data = makeTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    await saveImportedData(data, 2026, 2)

    await clearMonthData(2026, 2)

    // 再保存してロード
    const emptyData = createEmptyImportedData()
    await saveImportedData(emptyData, 2026, 2)
    const after = await loadImportedData(2026, 2)
    expect(after!.classifiedSales.records).toHaveLength(0)
  })
})

describe('clearAllData', () => {
  it('全データが削除される', async () => {
    await saveImportedData(makeTestData(), 2026, 1)
    await saveImportedData(makeTestData(), 2026, 2)

    await clearAllData()

    const meta = await getPersistedMeta()
    expect(meta).toBeNull()
  })

  it('categoryTimeSales を含む全データが削除される', async () => {
    const data = makeTestData({ categoryTimeSales: TEST_CATEGORY_TIME_SALES })
    await saveImportedData(data, 2026, 2)

    await clearAllData()

    const meta = await getPersistedMeta()
    expect(meta).toBeNull()
  })
})

describe('saveDataSlice', () => {
  it('指定した種別のみが更新される', async () => {
    const original = makeTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000, 3000)] },
      purchase: {
        records: [
          {
            year: 2026,
            month: 2,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 100, price: 130 },
          },
        ],
      },
    })
    await saveImportedData(original, 2026, 2)

    // classifiedSales のみ更新
    const updated = makeTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 99999)] },
      purchase: {
        records: [
          {
            year: 2026,
            month: 2,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 200, price: 260 },
          },
        ],
      },
    })
    await saveDataSlice(updated, 2026, 2, ['classifiedSales'])

    const loaded = await loadImportedData(2026, 2)

    // classifiedSales は更新されている
    const rec = loaded!.classifiedSales.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.salesAmount).toBe(99999)
    // purchase は元のまま（saveDataSlice は指定種別のみ保存）
    const pRec = loaded!.purchase.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(pRec?.total.cost).toBe(100)
  })

  it('categoryTimeSales が saveDataSlice で保存される', async () => {
    const original = makeTestData({ categoryTimeSales: { records: [] } })
    await saveImportedData(original, 2026, 2)

    const updated = makeTestData({ categoryTimeSales: TEST_CATEGORY_TIME_SALES })
    await saveDataSlice(updated, 2026, 2, ['categoryTimeSales'])

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.categoryTimeSales.records).toHaveLength(2)
    expect(loaded!.categoryTimeSales.records[0].department.name).toBe('食品')
  })

  it('複数データ種別を同時に保存できる', async () => {
    const original = makeTestData()
    await saveImportedData(original, 2026, 2)

    const updated = makeTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 88888)] },
      purchase: {
        records: [
          {
            year: 2026,
            month: 2,
            day: 1,
            storeId: '1',
            suppliers: { '0000001': { name: '取引先A', cost: 20000, price: 26000 } },
            total: { cost: 20000, price: 26000 },
          },
        ],
      },
      categoryTimeSales: TEST_CATEGORY_TIME_SALES,
    })
    await saveDataSlice(updated, 2026, 2, ['classifiedSales', 'purchase', 'categoryTimeSales'])

    const loaded = await loadImportedData(2026, 2)

    const rec = loaded!.classifiedSales.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(rec?.salesAmount).toBe(88888)
    const pEntry = loaded!.purchase.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(pEntry?.total.cost).toBe(20000)
    expect(loaded!.categoryTimeSales.records).toHaveLength(2)
  })

  it('saveDataSlice はメタデータを更新する', async () => {
    const data = makeTestData()
    await saveImportedData(data, 2026, 2)

    const metaBefore = await getPersistedMeta()
    const savedAtBefore = metaBefore!.savedAt

    // 少し待機してから saveDataSlice
    await new Promise((r) => setTimeout(r, 10))

    await saveDataSlice(data, 2026, 2, ['classifiedSales'])

    const metaAfter = await getPersistedMeta()
    expect(metaAfter!.year).toBe(2026)
    expect(metaAfter!.month).toBe(2)
    // savedAt が更新されている
    expect(metaAfter!.savedAt).not.toBe(savedAtBefore)
  })

  it('stores / suppliers は常に更新される', async () => {
    const original = makeTestData()
    await saveImportedData(original, 2026, 2)

    const updated = makeTestData({
      stores: new Map([
        ['1', { id: '1', code: '0001', name: '店舗A_更新' }],
        ['3', { id: '3', code: '0003', name: '店舗C' }],
      ]),
    })
    await saveDataSlice(updated, 2026, 2, ['classifiedSales'])

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.stores.get('1')?.name).toBe('店舗A_更新')
    expect(loaded!.stores.get('3')?.name).toBe('店舗C')
    expect(loaded!.stores.has('2')).toBe(false) // 元の店舗Bは消える（全置換）
  })
})

// ─── データ整合性テスト ────────────────────────────────────

describe('data integrity', () => {
  it('保存→復元のラウンドトリップでデータが完全一致する', async () => {
    const data = makeTestData({
      categoryTimeSales: TEST_CATEGORY_TIME_SALES,
    })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)
    expect(loaded).not.toBeNull()

    // 店舗
    expect(loaded!.stores.size).toBe(data.stores.size)
    for (const [id, store] of data.stores) {
      expect(loaded!.stores.get(id)?.name).toBe(store.name)
      expect(loaded!.stores.get(id)?.code).toBe(store.code)
    }

    // 取引先
    expect(loaded!.suppliers.size).toBe(data.suppliers.size)

    // 分類別売上: レコード数一致 + 各フィールド一致
    expect(loaded!.classifiedSales.records).toHaveLength(data.classifiedSales.records.length)
    for (let i = 0; i < data.classifiedSales.records.length; i++) {
      const orig = data.classifiedSales.records[i]
      const load = loaded!.classifiedSales.records[i]
      expect(load.year).toBe(orig.year)
      expect(load.month).toBe(orig.month)
      expect(load.day).toBe(orig.day)
      expect(load.storeId).toBe(orig.storeId)
      expect(load.salesAmount).toBe(orig.salesAmount)
      expect(load.discount71).toBe(orig.discount71)
    }

    // 仕入
    const origPurchase = data.purchase.records.find((r) => r.storeId === '1' && r.day === 1)
    const loadPurchase = loaded!.purchase.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(loadPurchase?.total.cost).toBe(origPurchase?.total.cost)
    expect(loadPurchase?.total.price).toBe(origPurchase?.total.price)

    // 在庫設定
    expect(loaded!.settings.size).toBe(data.settings.size)
    expect(loaded!.settings.get('1')?.openingInventory).toBe(
      data.settings.get('1')?.openingInventory,
    )

    // 予算
    expect(loaded!.budget.size).toBe(data.budget.size)
    const origBudget = data.budget.get('1')!
    const loadBudget = loaded!.budget.get('1')!
    expect(loadBudget.total).toBe(origBudget.total)
    expect(loadBudget.daily.get(1)).toBe(origBudget.daily.get(1))
    expect(loadBudget.daily.get(2)).toBe(origBudget.daily.get(2))

    // categoryTimeSales
    expect(loaded!.categoryTimeSales.records).toHaveLength(data.categoryTimeSales.records.length)
  })

  it('NaN/Infinity を含むデータが 0 に正規化されて保存される', async () => {
    const data = makeTestData({
      purchase: {
        records: [
          {
            year: 2026,
            month: 2,
            day: 1,
            storeId: '1',
            suppliers: {
              '0000001': { name: '取引先A', cost: NaN, price: Infinity },
            },
            total: { cost: NaN, price: -Infinity },
          },
        ],
      },
      classifiedSales: {
        records: [makeCSRecord(1, '1', 50000)],
      },
    })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)
    expect(loaded).not.toBeNull()

    // NaN と Infinity は 0 に正規化される
    const entry = loaded!.purchase.records.find((r) => r.storeId === '1' && r.day === 1)
    expect(entry?.suppliers['0000001']?.cost).toBe(0)
    expect(entry?.suppliers['0000001']?.price).toBe(0)
    expect(entry?.total.cost).toBe(0)
    expect(entry?.total.price).toBe(0)
  })

  it('予算データの不正な値は除外される', async () => {
    const invalidBudget = new Map<string, BudgetData>([
      [
        '1',
        {
          storeId: '1',
          total: 100000,
          daily: new Map<number, number>([
            [1, 50000],
            [32, 99999], // 無効な日（32日）→ 除外
          ]),
        },
      ],
    ])
    const data = makeTestData({ budget: invalidBudget })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)
    expect(loaded).not.toBeNull()

    const budget = loaded!.budget.get('1')!
    expect(budget.total).toBe(100000)
    expect(budget.daily.get(1)).toBe(50000)
    expect(budget.daily.has(32)).toBe(false) // 32日は除外
  })

  it('prevYearClassifiedSales と prevYearCategoryTimeSales は空で復元される', async () => {
    const data = makeTestData({
      prevYearClassifiedSales: {
        records: [makeCSRecord(1, '1', 30000)],
      },
      prevYearCategoryTimeSales: TEST_CATEGORY_TIME_SALES,
    })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)
    expect(loaded).not.toBeNull()

    // prevYear 系は DB に保存されない
    expect(loaded!.prevYearClassifiedSales.records).toHaveLength(0)
    expect(loaded!.prevYearCategoryTimeSales.records).toHaveLength(0)
  })
})
