/**
 * StorePIComparisonChart.builders — 純粋関数テスト
 *
 * @guard H4 component に acquisition logic 禁止 — 導出は builders で一度だけ
 */
import { describe, it, expect } from 'vitest'
import { buildStorePIData, buildHeatmapData } from './StorePIComparisonChart.builders'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { Store } from '@/domain/models/Store'
import type { StoreCategoryPIOutput } from '@/application/queries/cts/StoreCategoryPIHandler'

function makeStoreResult(overrides: Record<string, unknown> = {}): StoreResult {
  return {
    totalSales: 1000000,
    totalCustomers: 500,
    ...overrides,
  } as unknown as StoreResult
}

function makeStore(id: string, name: string): Store {
  return { id, name } as Store
}

function makeStoreMap(
  ...entries: [string, Partial<StoreResult>][]
): ReadonlyMap<string, StoreResult> {
  return new Map(entries.map(([id, overrides]) => [id, makeStoreResult(overrides)]))
}

function makeStoresMap(...entries: [string, string][]): ReadonlyMap<string, Store> {
  return new Map(entries.map(([id, name]) => [id, makeStore(id, name)]))
}

describe('buildStorePIData', () => {
  it('正常ケース: 2店舗の PI 計算', () => {
    const results = makeStoreMap(
      ['S1', { totalSales: 1000000, totalCustomers: 500 }],
      ['S2', { totalSales: 2000000, totalCustomers: 800 }],
    )
    const stores = makeStoresMap(['S1', 'Store A'], ['S2', 'Store B'])
    const data = buildStorePIData(results, stores, 'piAmount')

    expect(data).toHaveLength(2)
    // S1: 1000000 / 500 * 1000 = 2000000
    expect(data[0].piAmount).toBe(2500000) // S2 is higher: 2000000/800*1000 = 2500000
    expect(data[1].piAmount).toBe(2000000) // S1: 1000000/500*1000 = 2000000
  })

  it('customers=0 の店舗は除外', () => {
    const results = makeStoreMap(
      ['S1', { totalSales: 1000000, totalCustomers: 500 }],
      ['S2', { totalSales: 500000, totalCustomers: 0 }],
    )
    const stores = makeStoresMap(['S1', 'Store A'], ['S2', 'Store B'])
    const data = buildStorePIData(results, stores, 'piAmount')

    expect(data).toHaveLength(1)
    expect(data[0].storeId).toBe('S1')
  })

  it('piQty でソート順が変わる', () => {
    const results = new Map<string, StoreResult>()
    // S1: piAmount high, piQty low
    results.set('S1', {
      totalSales: 2000000,
      totalCustomers: 500,
      totalQuantity: 100,
    } as unknown as StoreResult)
    // S2: piAmount low, piQty high
    results.set('S2', {
      totalSales: 500000,
      totalCustomers: 500,
      totalQuantity: 1000,
    } as unknown as StoreResult)

    const stores = makeStoresMap(['S1', 'Store A'], ['S2', 'Store B'])

    const byAmount = buildStorePIData(results, stores, 'piAmount')
    expect(byAmount[0].storeId).toBe('S1')

    const byQty = buildStorePIData(results, stores, 'piQty')
    expect(byQty[0].storeId).toBe('S2')
  })

  it('空の allStoreResults → 空配列', () => {
    const data = buildStorePIData(new Map(), new Map(), 'piAmount')
    expect(data).toEqual([])
  })

  it('store 名が見つからない場合は storeId をフォールバック', () => {
    const results = makeStoreMap(['S1', { totalSales: 1000000, totalCustomers: 500 }])
    const data = buildStorePIData(results, new Map(), 'piAmount')
    expect(data[0].name).toBe('S1')
  })
})

describe('buildHeatmapData', () => {
  const stores = makeStoresMap(['S1', 'Store A'], ['S2', 'Store B'])

  function makeCatOutput(records: StoreCategoryPIOutput['records']): StoreCategoryPIOutput {
    return {
      records,
      storeCustomers: new Map(),
    }
  }

  it('Top10 カテゴリ抽出', () => {
    const records = Array.from({ length: 15 }, (_, i) => ({
      storeId: 'S1',
      code: `C${i}`,
      name: `Category ${i}`,
      amount: 0,
      quantity: 0,
      piAmount: (15 - i) * 100,
      piQty: 0,
    }))
    const result = buildHeatmapData(makeCatOutput(records), stores, 'piAmount')
    expect(result.categories).toHaveLength(10)
    expect(result.categories[0]).toBe('Category 0') // highest
  })

  it('heatData はタプル [catIdx, storeIdx, value] 形式', () => {
    const records = [
      {
        storeId: 'S1',
        code: 'C1',
        name: 'Cat A',
        amount: 0,
        quantity: 0,
        piAmount: 500,
        piQty: 50,
      },
      {
        storeId: 'S2',
        code: 'C1',
        name: 'Cat A',
        amount: 0,
        quantity: 0,
        piAmount: 300,
        piQty: 30,
      },
    ]
    const result = buildHeatmapData(makeCatOutput(records), stores, 'piAmount')

    expect(result.heatData.length).toBeGreaterThan(0)
    for (const tuple of result.heatData) {
      expect(tuple).toHaveLength(3)
      expect(typeof tuple[0]).toBe('number')
      expect(typeof tuple[1]).toBe('number')
      expect(typeof tuple[2]).toBe('number')
    }
  })

  it('maxVal を正しく追跡', () => {
    const records = [
      { storeId: 'S1', code: 'C1', name: 'Cat A', amount: 0, quantity: 0, piAmount: 500, piQty: 0 },
      {
        storeId: 'S1',
        code: 'C2',
        name: 'Cat B',
        amount: 0,
        quantity: 0,
        piAmount: 1200,
        piQty: 0,
      },
    ]
    const result = buildHeatmapData(makeCatOutput(records), stores, 'piAmount')
    expect(result.maxVal).toBe(1200)
  })

  it('piQty metric でデータを構築', () => {
    const records = [
      {
        storeId: 'S1',
        code: 'C1',
        name: 'Cat A',
        amount: 0,
        quantity: 0,
        piAmount: 500,
        piQty: 99,
      },
    ]
    const result = buildHeatmapData(makeCatOutput(records), stores, 'piQty')
    expect(result.maxVal).toBe(99)
  })

  it('空レコード → 空結果', () => {
    const result = buildHeatmapData(makeCatOutput([]), stores, 'piAmount')
    expect(result.categories).toEqual([])
    expect(result.heatData).toEqual([])
    expect(result.maxVal).toBe(0)
  })
})
