/**
 * StorePIComparisonChart.builders.ts — pure data transformation test
 *
 * 検証対象:
 * - buildStorePIData:
 *   - customers=0 の店舗はスキップ
 *   - metric='piAmount' / 'piQty' でソート順が変わる
 *   - ctsQuantityByStore / storeCustomerMap 反映
 *   - stores map で name を引く / なければ id fallback
 * - buildHeatmapData:
 *   - カテゴリ Top10 抽出 (全店合算ソート)
 *   - heatData の [catIdx, storeIdx, value] 構造
 *   - maxVal 計算
 *   - 店舗重複排除
 */
import { describe, it, expect } from 'vitest'
import { buildStorePIData, buildHeatmapData } from '../StorePIComparisonChart.builders'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { Store } from '@/domain/models/Store'
import type { StoreCategoryPIOutput } from '@/application/queries/cts/StoreCategoryPIHandler'

function makeResult(totalSales: number): StoreResult {
  return { totalSales } as unknown as StoreResult
}

function makeStore(id: string, name: string): Store {
  return { id, name } as unknown as Store
}

// ─── buildStorePIData ────────────────────────────────

describe('buildStorePIData', () => {
  it('customers=0 の店舗はスキップする', () => {
    const allResults = new Map([
      ['s1', makeResult(10000)],
      ['s2', makeResult(20000)],
    ])
    const stores = new Map([
      ['s1', makeStore('s1', 'Store 1')],
      ['s2', makeStore('s2', 'Store 2')],
    ])
    const customers = new Map([
      ['s1', 100],
      ['s2', 0], // スキップされる
    ])
    const result = buildStorePIData(allResults, stores, 'piAmount', undefined, customers)
    expect(result).toHaveLength(1)
    expect(result[0].storeId).toBe('s1')
  })

  it('piAmount = totalSales / customers * 1000 で四捨五入', () => {
    const allResults = new Map([['s1', makeResult(10000)]])
    const stores = new Map([['s1', makeStore('s1', 'Store 1')]])
    const customers = new Map([['s1', 100]])
    const result = buildStorePIData(allResults, stores, 'piAmount', undefined, customers)
    // 10000 / 100 * 1000 = 100000
    expect(result[0].piAmount).toBe(100000)
  })

  it('piQty = qty / customers * 1000', () => {
    const allResults = new Map([['s1', makeResult(0)]])
    const stores = new Map([['s1', makeStore('s1', 'Store 1')]])
    const customers = new Map([['s1', 50]])
    const ctsQty = new Map([['s1', 250]])
    const result = buildStorePIData(allResults, stores, 'piQty', ctsQty, customers)
    // 250 / 50 * 1000 = 5000
    expect(result[0].piQty).toBe(5000)
  })

  it("metric='piAmount' は piAmount 降順ソート", () => {
    const allResults = new Map([
      ['s1', makeResult(10000)],
      ['s2', makeResult(20000)],
      ['s3', makeResult(5000)],
    ])
    const stores = new Map([
      ['s1', makeStore('s1', 'A')],
      ['s2', makeStore('s2', 'B')],
      ['s3', makeStore('s3', 'C')],
    ])
    const customers = new Map([
      ['s1', 100],
      ['s2', 100],
      ['s3', 100],
    ])
    const result = buildStorePIData(allResults, stores, 'piAmount', undefined, customers)
    expect(result.map((r) => r.storeId)).toEqual(['s2', 's1', 's3'])
  })

  it("metric='piQty' は piQty 降順ソート", () => {
    const allResults = new Map([
      ['s1', makeResult(0)],
      ['s2', makeResult(0)],
    ])
    const stores = new Map([
      ['s1', makeStore('s1', 'A')],
      ['s2', makeStore('s2', 'B')],
    ])
    const customers = new Map([
      ['s1', 100],
      ['s2', 100],
    ])
    const ctsQty = new Map([
      ['s1', 100],
      ['s2', 300],
    ])
    const result = buildStorePIData(allResults, stores, 'piQty', ctsQty, customers)
    expect(result[0].storeId).toBe('s2')
  })

  it('stores map に無ければ name に storeId fallback', () => {
    const allResults = new Map([['unknown-id', makeResult(10000)]])
    const stores = new Map<string, Store>()
    const customers = new Map([['unknown-id', 10]])
    const result = buildStorePIData(allResults, stores, 'piAmount', undefined, customers)
    expect(result[0].name).toBe('unknown-id')
  })

  it('customers map が undefined なら全てスキップ', () => {
    const allResults = new Map([['s1', makeResult(10000)]])
    const stores = new Map([['s1', makeStore('s1', 'A')]])
    const result = buildStorePIData(allResults, stores, 'piAmount', undefined, undefined)
    expect(result).toEqual([])
  })
})

// ─── buildHeatmapData ────────────────────────────────

function makeOutput(
  rows: Array<{
    storeId: string
    code: string
    name: string
    amount: number
    quantity: number
    piAmount: number
    piQty: number
  }>,
): StoreCategoryPIOutput {
  return { records: rows, storeCustomers: new Map() } as unknown as StoreCategoryPIOutput
}

describe('buildHeatmapData', () => {
  it('カテゴリ一覧は metric の全店合算順 + Top10', () => {
    const rows = [
      { storeId: 's1', code: 'A', name: 'Apple', amount: 100, quantity: 0, piAmount: 50, piQty: 0 },
      { storeId: 's2', code: 'A', name: 'Apple', amount: 100, quantity: 0, piAmount: 60, piQty: 0 },
      {
        storeId: 's1',
        code: 'B',
        name: 'Banana',
        amount: 100,
        quantity: 0,
        piAmount: 30,
        piQty: 0,
      },
    ]
    const output = makeOutput(rows)
    const stores = new Map([
      ['s1', makeStore('s1', 'Store 1')],
      ['s2', makeStore('s2', 'Store 2')],
    ])
    const result = buildHeatmapData(output, stores, 'piAmount')
    // Apple 合計 110 > Banana 合計 30
    expect(result.categories).toEqual(['Apple', 'Banana'])
  })

  it('カテゴリ数が 10 を超えたら Top10 のみ残す', () => {
    const rows = Array.from({ length: 15 }, (_, i) => ({
      storeId: 's1',
      code: `C${i}`,
      name: `Cat${i}`,
      amount: 100,
      quantity: 0,
      piAmount: 100 - i, // 0 が最大、14 が最小
      piQty: 0,
    }))
    const output = makeOutput(rows)
    const stores = new Map([['s1', makeStore('s1', 'S1')]])
    const result = buildHeatmapData(output, stores, 'piAmount')
    expect(result.categories).toHaveLength(10)
    expect(result.categories[0]).toBe('Cat0')
    expect(result.categories).not.toContain('Cat14')
  })

  it('heatData は [catIdx, storeIdx, value] の 3-tuple 配列', () => {
    const rows = [
      { storeId: 's1', code: 'A', name: 'Apple', amount: 0, quantity: 0, piAmount: 50, piQty: 0 },
    ]
    const output = makeOutput(rows)
    const stores = new Map([['s1', makeStore('s1', 'S1')]])
    const result = buildHeatmapData(output, stores, 'piAmount')
    expect(result.heatData).toHaveLength(1)
    expect(result.heatData[0]).toEqual([0, 0, 50])
  })

  it('maxVal は全 heatData 中の最大値', () => {
    const rows = [
      { storeId: 's1', code: 'A', name: 'Apple', amount: 0, quantity: 0, piAmount: 50, piQty: 0 },
      { storeId: 's2', code: 'A', name: 'Apple', amount: 0, quantity: 0, piAmount: 80, piQty: 0 },
      { storeId: 's3', code: 'A', name: 'Apple', amount: 0, quantity: 0, piAmount: 30, piQty: 0 },
    ]
    const output = makeOutput(rows)
    const stores = new Map([
      ['s1', makeStore('s1', 'S1')],
      ['s2', makeStore('s2', 'S2')],
      ['s3', makeStore('s3', 'S3')],
    ])
    const result = buildHeatmapData(output, stores, 'piAmount')
    expect(result.maxVal).toBe(80)
  })

  it('店舗リストは records 由来で重複排除', () => {
    const rows = [
      { storeId: 's1', code: 'A', name: 'Apple', amount: 0, quantity: 0, piAmount: 10, piQty: 0 },
      { storeId: 's1', code: 'B', name: 'Banana', amount: 0, quantity: 0, piAmount: 20, piQty: 0 },
      { storeId: 's2', code: 'A', name: 'Apple', amount: 0, quantity: 0, piAmount: 15, piQty: 0 },
    ]
    const output = makeOutput(rows)
    const stores = new Map([
      ['s1', makeStore('s1', 'S1')],
      ['s2', makeStore('s2', 'S2')],
    ])
    const result = buildHeatmapData(output, stores, 'piAmount')
    expect(result.storeList.map((s) => s.id)).toEqual(['s1', 's2'])
  })

  it("metric='piQty' で quantity 由来値を使う", () => {
    const rows = [
      { storeId: 's1', code: 'A', name: 'Apple', amount: 0, quantity: 0, piAmount: 0, piQty: 99 },
    ]
    const output = makeOutput(rows)
    const stores = new Map([['s1', makeStore('s1', 'S1')]])
    const result = buildHeatmapData(output, stores, 'piQty')
    expect(result.heatData[0]).toEqual([0, 0, 99])
    expect(result.maxVal).toBe(99)
  })
})
