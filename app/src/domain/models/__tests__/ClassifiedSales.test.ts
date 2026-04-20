/**
 * ClassifiedSales — 分類別売上の集約 pure tests
 *
 * 検証対象:
 * - classifiedSalesRecordKey: 一意キー生成
 * - aggregateForStore / aggregateAllStores: storeId × day 集約
 * - classifiedSalesMaxDay: 最大日取得
 * - mergeClassifiedSalesData: マージ（同一キー上書き）
 */
import { describe, it, expect } from 'vitest'
import {
  classifiedSalesRecordKey,
  aggregateForStore,
  aggregateAllStores,
  classifiedSalesMaxDay,
  mergeClassifiedSalesData,
  type ClassifiedSalesRecord,
  type ClassifiedSalesData,
} from '../ClassifiedSales'

function rec(overrides: Partial<ClassifiedSalesRecord> = {}): ClassifiedSalesRecord {
  return {
    year: 2026,
    month: 3,
    day: 1,
    storeId: 's1',
    storeName: '東京店',
    groupName: 'G1',
    departmentName: 'D1',
    lineName: 'L1',
    className: 'C1',
    salesAmount: 1000,
    discount71: 10,
    discount72: 20,
    discount73: 30,
    discount74: 40,
    ...overrides,
  }
}

describe('classifiedSalesRecordKey', () => {
  it('同じフィールドなら同じキー', () => {
    const a = rec()
    const b = rec()
    expect(classifiedSalesRecordKey(a)).toBe(classifiedSalesRecordKey(b))
  })

  it('日付違いで異なるキー', () => {
    expect(classifiedSalesRecordKey(rec({ day: 1 }))).not.toBe(
      classifiedSalesRecordKey(rec({ day: 2 })),
    )
  })

  it('店舗違いで異なるキー', () => {
    expect(classifiedSalesRecordKey(rec({ storeId: 's1' }))).not.toBe(
      classifiedSalesRecordKey(rec({ storeId: 's2' })),
    )
  })

  it('カテゴリ違いで異なるキー', () => {
    expect(classifiedSalesRecordKey(rec({ className: 'C1' }))).not.toBe(
      classifiedSalesRecordKey(rec({ className: 'C2' })),
    )
  })
})

describe('aggregateForStore', () => {
  it('空データで空オブジェクト', () => {
    expect(aggregateForStore({ records: [] }, 's1')).toEqual({})
  })

  it('指定店舗のみ集約', () => {
    const data: ClassifiedSalesData = {
      records: [rec({ storeId: 's1', day: 1 }), rec({ storeId: 's2', day: 1 })],
    }
    const r = aggregateForStore(data, 's1')
    expect(Object.keys(r)).toEqual(['1'])
  })

  it('同一 day の売上を合算', () => {
    const data: ClassifiedSalesData = {
      records: [
        rec({ storeId: 's1', day: 1, salesAmount: 100 }),
        rec({ storeId: 's1', day: 1, salesAmount: 200 }),
      ],
    }
    const r = aggregateForStore(data, 's1')
    expect(r[1].sales).toBe(300)
  })

  it('売変内訳を全種類合算', () => {
    const data: ClassifiedSalesData = {
      records: [rec({ storeId: 's1', day: 1 })],
    }
    const r = aggregateForStore(data, 's1')
    // 10+20+30+40 = 100
    expect(r[1].discount).toBe(100)
    expect(r[1].discountEntries).toHaveLength(4)
  })

  it('flowers 情報で客数を取得', () => {
    const data: ClassifiedSalesData = { records: [rec({ storeId: 's1', day: 1 })] }
    const flowers = { records: [{ storeId: 's1', day: 1, customers: 50 }] }
    const r = aggregateForStore(data, 's1', flowers)
    expect(r[1].customers).toBe(50)
  })

  it('flowers なしで customers=0', () => {
    const data: ClassifiedSalesData = { records: [rec({ storeId: 's1', day: 1 })] }
    const r = aggregateForStore(data, 's1')
    expect(r[1].customers).toBe(0)
  })

  it('flowers 重複は last-write-wins', () => {
    const data: ClassifiedSalesData = { records: [rec({ storeId: 's1', day: 1 })] }
    const flowers = {
      records: [
        { storeId: 's1', day: 1, customers: 30 },
        { storeId: 's1', day: 1, customers: 50 },
      ],
    }
    const r = aggregateForStore(data, 's1', flowers)
    expect(r[1].customers).toBe(50)
  })
})

describe('aggregateAllStores', () => {
  it('全店舗を独立に集約', () => {
    const data: ClassifiedSalesData = {
      records: [
        rec({ storeId: 's1', day: 1, salesAmount: 100 }),
        rec({ storeId: 's2', day: 1, salesAmount: 200 }),
      ],
    }
    const r = aggregateAllStores(data)
    expect(r.s1[1].sales).toBe(100)
    expect(r.s2[1].sales).toBe(200)
  })

  it('flowers で店舗別客数を反映', () => {
    const data: ClassifiedSalesData = {
      records: [rec({ storeId: 's1', day: 1 }), rec({ storeId: 's2', day: 1 })],
    }
    const flowers = {
      records: [
        { storeId: 's1', day: 1, customers: 30 },
        { storeId: 's2', day: 1, customers: 60 },
      ],
    }
    const r = aggregateAllStores(data, flowers)
    expect(r.s1[1].customers).toBe(30)
    expect(r.s2[1].customers).toBe(60)
  })

  it('空データで空オブジェクト', () => {
    expect(aggregateAllStores({ records: [] })).toEqual({})
  })
})

describe('classifiedSalesMaxDay', () => {
  it('空で 0', () => {
    expect(classifiedSalesMaxDay({ records: [] })).toBe(0)
  })

  it('最大の day を返す', () => {
    expect(
      classifiedSalesMaxDay({
        records: [rec({ day: 5 }), rec({ day: 20 }), rec({ day: 10 })],
      }),
    ).toBe(20)
  })

  it('全日 1 でも 1 を返す', () => {
    expect(classifiedSalesMaxDay({ records: [rec({ day: 1 })] })).toBe(1)
  })
})

describe('mergeClassifiedSalesData', () => {
  it('同一キーは incoming で上書き', () => {
    const existing: ClassifiedSalesData = {
      records: [rec({ day: 1, salesAmount: 100 })],
    }
    const incoming: ClassifiedSalesData = {
      records: [rec({ day: 1, salesAmount: 999 })],
    }
    const merged = mergeClassifiedSalesData(existing, incoming)
    expect(merged.records).toHaveLength(1)
    expect(merged.records[0].salesAmount).toBe(999)
  })

  it('異なるキーは両方残る', () => {
    const existing: ClassifiedSalesData = { records: [rec({ day: 1 })] }
    const incoming: ClassifiedSalesData = { records: [rec({ day: 2 })] }
    const merged = mergeClassifiedSalesData(existing, incoming)
    expect(merged.records).toHaveLength(2)
  })

  it('空 + 空 = 空', () => {
    expect(mergeClassifiedSalesData({ records: [] }, { records: [] }).records).toHaveLength(0)
  })

  it('空 + 非空 = 非空', () => {
    const incoming: ClassifiedSalesData = { records: [rec()] }
    expect(mergeClassifiedSalesData({ records: [] }, incoming).records).toHaveLength(1)
  })
})
