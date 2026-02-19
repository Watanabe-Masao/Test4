import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  saveImportedData,
  loadImportedData,
  getPersistedMeta,
  clearMonthData,
  clearAllData,
  isIndexedDBAvailable,
} from './IndexedDBStore'
import { createEmptyImportedData } from '@/domain/models'
import type { ImportedData } from '@/domain/models'

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
})

describe('clearAllData', () => {
  it('全データが削除される', async () => {
    await saveImportedData(makeTestData(), 2026, 1)
    await saveImportedData(makeTestData(), 2026, 2)

    await clearAllData()

    const meta = await getPersistedMeta()
    expect(meta).toBeNull()
  })
})
