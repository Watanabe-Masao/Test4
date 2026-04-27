/**
 * serialDayRecord のユニットテスト
 *
 * toSerialRecords / aggregateBySerial / toContinuousArray の動作を検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  toSerialRecords,
  aggregateBySerial,
  toContinuousArray,
} from '@/application/usecases/calculation/serialDayRecord'
import { dateKeyToSerial } from '@/domain/models/DaySerial'
import type { DateKey } from '@/domain/models/CalendarDate'

interface RawRow {
  dateKey: string
  storeId: string
  sales: number
  coreSales: number
  grossSales: number
  discountAbsolute: number
  purchaseCost: number
  purchasePrice: number
  interStoreInCost: number
  interStoreInPrice: number
  interStoreOutCost: number
  interStoreOutPrice: number
  interDeptInCost: number
  interDeptInPrice: number
  interDeptOutCost: number
  interDeptOutPrice: number
  flowersCost: number
  flowersPrice: number
  directProduceCost: number
  directProducePrice: number
  costInclusionCost: number
  customers: number
}

const mkRow = (overrides: Partial<RawRow>): RawRow => ({
  dateKey: '2026-03-01',
  storeId: 'S1',
  sales: 0,
  coreSales: 0,
  grossSales: 0,
  discountAbsolute: 0,
  purchaseCost: 0,
  purchasePrice: 0,
  interStoreInCost: 0,
  interStoreInPrice: 0,
  interStoreOutCost: 0,
  interStoreOutPrice: 0,
  interDeptInCost: 0,
  interDeptInPrice: 0,
  interDeptOutCost: 0,
  interDeptOutPrice: 0,
  flowersCost: 0,
  flowersPrice: 0,
  directProduceCost: 0,
  directProducePrice: 0,
  costInclusionCost: 0,
  customers: 0,
  ...overrides,
})

describe('toSerialRecords', () => {
  it('空配列は空配列を返す', () => {
    expect(toSerialRecords([])).toEqual([])
  })

  it('dateKey を serial に変換する', () => {
    const rows = [mkRow({ dateKey: '2026-03-01', sales: 1000 })]
    const result = toSerialRecords(rows)
    expect(result).toHaveLength(1)
    expect(result[0].serial).toBe(dateKeyToSerial('2026-03-01' as DateKey))
    expect(result[0].sales).toBe(1000)
    expect(result[0].dateKey).toBe('2026-03-01')
  })

  it('serial 昇順にソートする', () => {
    const rows = [
      mkRow({ dateKey: '2026-03-05' }),
      mkRow({ dateKey: '2026-03-01' }),
      mkRow({ dateKey: '2026-03-03' }),
    ]
    const result = toSerialRecords(rows)
    expect(result.map((r) => r.dateKey)).toEqual(['2026-03-01', '2026-03-03', '2026-03-05'])
    expect(result[0].serial < result[1].serial).toBe(true)
    expect(result[1].serial < result[2].serial).toBe(true)
  })

  it('全フィールドをコピーする', () => {
    const rows = [
      mkRow({
        dateKey: '2026-03-01',
        storeId: 'S2',
        sales: 100,
        coreSales: 90,
        grossSales: 110,
        discountAbsolute: 10,
        purchaseCost: 70,
        purchasePrice: 100,
        customers: 50,
      }),
    ]
    const result = toSerialRecords(rows)
    expect(result[0].storeId).toBe('S2')
    expect(result[0].sales).toBe(100)
    expect(result[0].coreSales).toBe(90)
    expect(result[0].grossSales).toBe(110)
    expect(result[0].discountAbsolute).toBe(10)
    expect(result[0].purchaseCost).toBe(70)
    expect(result[0].purchasePrice).toBe(100)
    expect(result[0].customers).toBe(50)
  })
})

describe('aggregateBySerial', () => {
  it('同一 serial を合算する', () => {
    const rows = [
      mkRow({ dateKey: '2026-03-01', storeId: 'S1', sales: 100, customers: 10 }),
      mkRow({ dateKey: '2026-03-01', storeId: 'S2', sales: 200, customers: 20 }),
      mkRow({ dateKey: '2026-03-02', storeId: 'S1', sales: 50, customers: 5 }),
    ]
    const records = toSerialRecords(rows)
    const map = aggregateBySerial(records)
    expect(map.size).toBe(2)

    const serial1 = dateKeyToSerial('2026-03-01' as DateKey)
    const serial2 = dateKeyToSerial('2026-03-02' as DateKey)

    expect(map.get(serial1)?.sales).toBe(300)
    expect(map.get(serial1)?.customers).toBe(30)
    expect(map.get(serial2)?.sales).toBe(50)
    expect(map.get(serial2)?.customers).toBe(5)
  })

  it('空配列は空マップ', () => {
    expect(aggregateBySerial([]).size).toBe(0)
  })

  it('単一レコードは単一エントリ', () => {
    const records = toSerialRecords([mkRow({ sales: 42, grossSales: 50 })])
    const map = aggregateBySerial(records)
    expect(map.size).toBe(1)
    const entry = map.get(records[0].serial)
    expect(entry?.sales).toBe(42)
    expect(entry?.grossSales).toBe(50)
  })
})

describe('toContinuousArray', () => {
  it('範囲内の全シリアルを返す（データありは値、なしは0）', () => {
    const records = toSerialRecords([
      mkRow({ dateKey: '2026-03-01', sales: 100 }),
      mkRow({ dateKey: '2026-03-03', sales: 300 }),
    ])
    const map = aggregateBySerial(records)
    const from = dateKeyToSerial('2026-03-01' as DateKey)
    const to = dateKeyToSerial('2026-03-04' as DateKey)

    const arr = toContinuousArray(map, from, to)
    expect(arr).toHaveLength(4)
    expect(arr[0].sales).toBe(100)
    expect(arr[1].sales).toBe(0) // missing day
    expect(arr[1].customers).toBe(0)
    expect(arr[2].sales).toBe(300)
    expect(arr[3].sales).toBe(0)
  })

  it('from === to は 1 要素配列', () => {
    const records = toSerialRecords([mkRow({ dateKey: '2026-03-05', sales: 77 })])
    const map = aggregateBySerial(records)
    const s = dateKeyToSerial('2026-03-05' as DateKey)
    const arr = toContinuousArray(map, s, s)
    expect(arr).toHaveLength(1)
    expect(arr[0].sales).toBe(77)
  })

  it('全日欠損でも範囲全体を 0 埋めする', () => {
    const map = aggregateBySerial([])
    const from = dateKeyToSerial('2026-03-01' as DateKey)
    const to = dateKeyToSerial('2026-03-03' as DateKey)
    const arr = toContinuousArray(map, from, to)
    expect(arr).toHaveLength(3)
    for (const a of arr) {
      expect(a.sales).toBe(0)
      expect(a.customers).toBe(0)
      expect(a.purchaseCost).toBe(0)
    }
  })

  it('serial 昇順に並ぶ', () => {
    const records = toSerialRecords([mkRow({ dateKey: '2026-03-02', sales: 200 })])
    const map = aggregateBySerial(records)
    const from = dateKeyToSerial('2026-03-01' as DateKey)
    const to = dateKeyToSerial('2026-03-04' as DateKey)
    const arr = toContinuousArray(map, from, to)
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i].serial).toBeGreaterThan(arr[i - 1].serial)
    }
  })
})
