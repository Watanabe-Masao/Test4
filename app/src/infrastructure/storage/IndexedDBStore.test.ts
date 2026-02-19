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
import { createEmptyImportedData } from '@/domain/models'
import type { ImportedData, CategoryTimeSalesData } from '@/domain/models'

function makeTestData(overrides: Partial<ImportedData> = {}): ImportedData {
  return {
    ...createEmptyImportedData(),
    stores: new Map([
      ['1', { id: '1', code: '0001', name: '店舗A' }],
      ['2', { id: '2', code: '0002', name: '店舗B' }],
    ]),
    suppliers: new Map([
      ['0000001', { code: '0000001', name: '取引先A' }],
    ]),
    purchase: {
      '1': {
        1: {
          suppliers: {
            '0000001': { name: '取引先A', cost: 10000, price: 13000 },
          },
          total: { cost: 10000, price: 13000 },
        },
      },
    },
    sales: {
      '1': { 1: { sales: 50000 }, 2: { sales: 60000 } },
      '2': { 1: { sales: 40000 } },
    },
    discount: {
      '1': { 1: { sales: 50000, discount: 3000 } },
    },
    settings: new Map([
      ['1', { storeId: '1', openingInventory: 100000, closingInventory: 120000, grossProfitBudget: null }],
    ]),
    budget: new Map([
      ['1', { storeId: '1', daily: new Map([[1, 200000], [2, 210000]]), total: 410000 }],
    ]),
    ...overrides,
  }
}

const TEST_CATEGORY_TIME_SALES: CategoryTimeSalesData = {
  records: [
    {
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
      day: 2,
      storeId: '2',
      department: { code: '02', name: '日用品' },
      line: { code: '002', name: 'ライン2' },
      klass: { code: '0002', name: 'クラス2' },
      timeSlots: [
        { hour: 11, quantity: 5, amount: 30000 },
      ],
      totalQuantity: 5,
      totalAmount: 30000,
    },
  ],
}

// fake-indexeddb は各テスト間でDB状態が共有される可能性があるため、
// 毎回クリアする
beforeEach(async () => {
  await clearAllData().catch(() => {})
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

  it('売上データの StoreDayRecord が正しく復元される', async () => {
    const data = makeTestData()
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.sales['1']?.[1]?.sales).toBe(50000)
    expect(loaded!.sales['1']?.[2]?.sales).toBe(60000)
    expect(loaded!.sales['2']?.[1]?.sales).toBe(40000)
  })

  it('仕入データの入れ子構造が復元される', async () => {
    const data = makeTestData()
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    const entry = loaded!.purchase['1']?.[1]
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
      sales: { '1': { 1: { sales: 50000 } } },
    })
    await saveImportedData(data1, 2026, 2)

    const data2 = makeTestData({
      sales: { '1': { 1: { sales: 99999 } } },
    })
    await saveImportedData(data2, 2026, 2)

    const loaded = await loadImportedData(2026, 2)
    expect(loaded!.sales['1']?.[1]?.sales).toBe(99999)
  })

  it('空のデータも保存・復元できる', async () => {
    const data = createEmptyImportedData()
    await saveImportedData(data, 2026, 1)

    const loaded = await loadImportedData(2026, 1)
    expect(loaded).not.toBeNull()
    expect(loaded!.stores.size).toBe(0)
    expect(Object.keys(loaded!.sales)).toHaveLength(0)
  })

  // ─── 客数フィールドの保持テスト ─────────────────────────

  it('売上データの customers フィールドが保持される', async () => {
    const data = makeTestData({
      sales: {
        '1': {
          1: { sales: 50000, customers: 120 },
          2: { sales: 60000, customers: 150 },
        },
        '2': {
          1: { sales: 40000, customers: 80 },
        },
      },
    })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.sales['1']?.[1]?.customers).toBe(120)
    expect(loaded!.sales['1']?.[2]?.customers).toBe(150)
    expect(loaded!.sales['2']?.[1]?.customers).toBe(80)
  })

  it('売変データの customers フィールドが保持される', async () => {
    const data = makeTestData({
      discount: {
        '1': {
          1: { sales: 50000, discount: 3000, customers: 100 },
          2: { sales: 60000, discount: 4000, customers: 130 },
        },
      },
    })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.discount['1']?.[1]?.customers).toBe(100)
    expect(loaded!.discount['1']?.[2]?.customers).toBe(130)
  })

  it('customers が undefined の売上データも正しく復元される', async () => {
    const data = makeTestData({
      sales: {
        '1': { 1: { sales: 50000 } },
      },
    })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.sales['1']?.[1]?.sales).toBe(50000)
    expect(loaded!.sales['1']?.[1]?.customers).toBeUndefined()
  })

  it('前年売上データの customers が保持される', async () => {
    const data = makeTestData({
      prevYearSales: {
        '1': {
          1: { sales: 45000, customers: 90 },
          2: { sales: 55000, customers: 110 },
        },
      },
    })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.prevYearSales['1']?.[1]?.customers).toBe(90)
    expect(loaded!.prevYearSales['1']?.[2]?.customers).toBe(110)
  })

  it('前年売変データの customers が保持される', async () => {
    const data = makeTestData({
      prevYearDiscount: {
        '1': {
          1: { sales: 45000, discount: 2000, customers: 88 },
        },
      },
    })
    await saveImportedData(data, 2026, 2)

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.prevYearDiscount['1']?.[1]?.customers).toBe(88)
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
      records: [{
        day: 5,
        storeId: '3',
        department: { code: '03', name: '衣料' },
        line: { code: '003', name: 'ライン3' },
        klass: { code: '0003', name: 'クラス3' },
        timeSlots: [{ hour: 14, quantity: 20, amount: 80000 }],
        totalQuantity: 20,
        totalAmount: 80000,
      }],
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

  it('客数付き売上データも削除される', async () => {
    const data = makeTestData({
      sales: { '1': { 1: { sales: 50000, customers: 120 } } },
    })
    await saveImportedData(data, 2026, 2)

    await clearMonthData(2026, 2)

    // 再保存してロード
    const emptyData = createEmptyImportedData()
    await saveImportedData(emptyData, 2026, 2)
    const after = await loadImportedData(2026, 2)
    expect(Object.keys(after!.sales)).toHaveLength(0)
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
  it('指定した StoreDayRecord 種別のみが更新される', async () => {
    const original = makeTestData({
      sales: { '1': { 1: { sales: 50000 } } },
      discount: { '1': { 1: { sales: 50000, discount: 3000 } } },
    })
    await saveImportedData(original, 2026, 2)

    // sales のみ更新
    const updated = makeTestData({
      sales: { '1': { 1: { sales: 99999, customers: 200 } } },
      discount: { '1': { 1: { sales: 70000, discount: 5000 } } },
    })
    await saveDataSlice(updated, 2026, 2, ['sales'])

    const loaded = await loadImportedData(2026, 2)

    // sales は更新されている
    expect(loaded!.sales['1']?.[1]?.sales).toBe(99999)
    expect(loaded!.sales['1']?.[1]?.customers).toBe(200)
    // discount は元のまま（saveDataSlice は指定種別のみ保存）
    expect(loaded!.discount['1']?.[1]?.discount).toBe(3000)
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
      sales: { '1': { 1: { sales: 88888, customers: 300 } } },
      purchase: {
        '1': {
          1: {
            suppliers: { '0000001': { name: '取引先A', cost: 20000, price: 26000 } },
            total: { cost: 20000, price: 26000 },
          },
        },
      },
      categoryTimeSales: TEST_CATEGORY_TIME_SALES,
    })
    await saveDataSlice(updated, 2026, 2, ['sales', 'purchase', 'categoryTimeSales'])

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.sales['1']?.[1]?.sales).toBe(88888)
    expect(loaded!.sales['1']?.[1]?.customers).toBe(300)
    expect(loaded!.purchase['1']?.[1]?.total.cost).toBe(20000)
    expect(loaded!.categoryTimeSales.records).toHaveLength(2)
  })

  it('saveDataSlice はメタデータを更新する', async () => {
    const data = makeTestData()
    await saveImportedData(data, 2026, 2)

    const metaBefore = await getPersistedMeta()
    const savedAtBefore = metaBefore!.savedAt

    // 少し待機してから saveDataSlice
    await new Promise((r) => setTimeout(r, 10))

    await saveDataSlice(data, 2026, 2, ['sales'])

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
    await saveDataSlice(updated, 2026, 2, ['sales'])

    const loaded = await loadImportedData(2026, 2)

    expect(loaded!.stores.get('1')?.name).toBe('店舗A_更新')
    expect(loaded!.stores.get('3')?.name).toBe('店舗C')
    expect(loaded!.stores.has('2')).toBe(false) // 元の店舗Bは消える（全置換）
  })
})
