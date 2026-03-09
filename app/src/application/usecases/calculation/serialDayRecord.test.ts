/**
 * SerialDayRecord 変換・集約のテスト
 *
 * 月跨ぎデータがシリアル値で正しく処理されることを検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  toSerialRecords,
  aggregateBySerial,
  toContinuousArray,
} from './serialDayRecord'
import { dateKeyToSerial, serialToDateKey } from '@/domain/models/DaySerial'

// ── テストヘルパー ──

function makeRow(dateKey: string, storeId: string, sales: number, customers = 0) {
  return {
    dateKey,
    storeId,
    sales,
    coreSales: sales,
    grossSales: sales,
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
    customers,
  }
}

describe('toSerialRecords', () => {
  it('dateKey をシリアル値に変換する', () => {
    const rows = [makeRow('2026-03-01', 'S1', 100)]
    const result = toSerialRecords(rows)
    expect(result).toHaveLength(1)
    expect(result[0].serial).toBe(dateKeyToSerial('2026-03-01'))
    expect(result[0].storeId).toBe('S1')
    expect(result[0].sales).toBe(100)
  })

  it('結果は serial 昇順にソートされる', () => {
    const rows = [
      makeRow('2026-03-03', 'S1', 300),
      makeRow('2026-03-01', 'S1', 100),
      makeRow('2026-03-02', 'S1', 200),
    ]
    const result = toSerialRecords(rows)
    expect(result.map((r) => r.sales)).toEqual([100, 200, 300])
    expect(result[0].serial).toBeLessThan(result[1].serial)
    expect(result[1].serial).toBeLessThan(result[2].serial)
  })

  it('月跨ぎデータも連続したシリアル値になる', () => {
    const rows = [
      makeRow('2026-02-27', 'S1', 100),
      makeRow('2026-02-28', 'S1', 200),
      makeRow('2026-03-01', 'S1', 300),
      makeRow('2026-03-02', 'S1', 400),
    ]
    const result = toSerialRecords(rows)

    // 2/27→2/28: +1, 2/28→3/1: +1, 3/1→3/2: +1
    // 月境界を跨いでも差は常に1
    expect(result[1].serial - result[0].serial).toBe(1)
    expect(result[2].serial - result[1].serial).toBe(1) // 月跨ぎ
    expect(result[3].serial - result[2].serial).toBe(1)
  })

  it('年跨ぎデータも連続したシリアル値になる', () => {
    const rows = [
      makeRow('2025-12-31', 'S1', 100),
      makeRow('2026-01-01', 'S1', 200),
    ]
    const result = toSerialRecords(rows)
    expect(result[1].serial - result[0].serial).toBe(1) // 年跨ぎ
  })
})

describe('aggregateBySerial', () => {
  it('同一シリアル（同日）の複数店舗を合算する', () => {
    const records = toSerialRecords([
      makeRow('2026-03-01', 'S1', 100, 10),
      makeRow('2026-03-01', 'S2', 200, 20),
    ])
    const agg = aggregateBySerial(records)
    const serial = dateKeyToSerial('2026-03-01')
    expect(agg.get(serial)!.sales).toBe(300)
    expect(agg.get(serial)!.customers).toBe(30)
  })

  it('異なるシリアル（異なる日）は別エントリになる', () => {
    const records = toSerialRecords([
      makeRow('2026-03-01', 'S1', 100),
      makeRow('2026-03-02', 'S1', 200),
    ])
    const agg = aggregateBySerial(records)
    expect(agg.size).toBe(2)
  })
})

describe('toContinuousArray', () => {
  it('データが無い日を0で埋めて連続配列を返す', () => {
    const records = toSerialRecords([
      makeRow('2026-03-01', 'S1', 100),
      makeRow('2026-03-03', 'S1', 300),
      // 3/2 にデータなし
    ])
    const agg = aggregateBySerial(records)
    const from = dateKeyToSerial('2026-03-01')
    const to = dateKeyToSerial('2026-03-03')
    const arr = toContinuousArray(agg, from, to)

    expect(arr).toHaveLength(3)
    expect(arr[0].sales).toBe(100) // 3/1
    expect(arr[1].sales).toBe(0) // 3/2（データなし→0）
    expect(arr[2].sales).toBe(300) // 3/3
  })

  it('月跨ぎ範囲でも隙間なく連続する', () => {
    const records = toSerialRecords([
      makeRow('2026-02-27', 'S1', 100),
      makeRow('2026-02-28', 'S1', 200),
      makeRow('2026-03-01', 'S1', 300),
    ])
    const agg = aggregateBySerial(records)
    const from = dateKeyToSerial('2026-02-27')
    const to = dateKeyToSerial('2026-03-01')
    const arr = toContinuousArray(agg, from, to)

    expect(arr).toHaveLength(3)
    expect(arr[0].sales).toBe(100)
    expect(arr[1].sales).toBe(200)
    expect(arr[2].sales).toBe(300)

    // 月跨ぎでも serial は連続
    expect(arr[1].serial - arr[0].serial).toBe(1)
    expect(arr[2].serial - arr[1].serial).toBe(1) // 2/28→3/1
  })

  it('空範囲は全て0で埋まった配列を返す', () => {
    const agg = aggregateBySerial([])
    const from = dateKeyToSerial('2026-03-01')
    const to = dateKeyToSerial('2026-03-03')
    const arr = toContinuousArray(agg, from, to)

    expect(arr).toHaveLength(3)
    expect(arr.every((d) => d.sales === 0)).toBe(true)
  })

  it('period1 と period2 を独立して処理できる', () => {
    // period1: 2026-03-01 ～ 2026-03-05
    const p1Records = toSerialRecords([
      makeRow('2026-03-01', 'S1', 1000),
      makeRow('2026-03-02', 'S1', 1100),
      makeRow('2026-03-03', 'S1', 1200),
      makeRow('2026-03-04', 'S1', 1300),
      makeRow('2026-03-05', 'S1', 1400),
    ])
    const p1Agg = aggregateBySerial(p1Records)
    const p1From = dateKeyToSerial('2026-03-01')
    const p1To = dateKeyToSerial('2026-03-05')
    const p1Arr = toContinuousArray(p1Agg, p1From, p1To)

    // period2: 2025-03-01 ～ 2025-03-05（前年同期）
    const p2Records = toSerialRecords([
      makeRow('2025-03-01', 'S1', 800),
      makeRow('2025-03-02', 'S1', 850),
      makeRow('2025-03-03', 'S1', 900),
      makeRow('2025-03-04', 'S1', 950),
      makeRow('2025-03-05', 'S1', 1000),
    ])
    const p2Agg = aggregateBySerial(p2Records)
    const p2From = dateKeyToSerial('2025-03-01')
    const p2To = dateKeyToSerial('2025-03-05')
    const p2Arr = toContinuousArray(p2Agg, p2From, p2To)

    // 両テーブルは同じ長さ（5日間）
    expect(p1Arr).toHaveLength(5)
    expect(p2Arr).toHaveLength(5)

    // period1 と period2 の日次比較（インデックスで対応）
    const diffs = p1Arr.map((p1, i) => p1.sales - p2Arr[i].sales)
    expect(diffs).toEqual([200, 250, 300, 350, 400])

    // serial 値は異なるが、配列インデックスで1:1対応
    expect(p1Arr[0].serial).not.toBe(p2Arr[0].serial)
    expect(serialToDateKey(p1Arr[0].serial)).toBe('2026-03-01')
    expect(serialToDateKey(p2Arr[0].serial)).toBe('2025-03-01')
  })

  it('移動平均が月跨ぎでも正しく計算できる', () => {
    // 2/26～3/4 の9日間データ
    const records = toSerialRecords([
      makeRow('2026-02-26', 'S1', 100),
      makeRow('2026-02-27', 'S1', 200),
      makeRow('2026-02-28', 'S1', 300),
      makeRow('2026-03-01', 'S1', 400), // 月跨ぎ
      makeRow('2026-03-02', 'S1', 500),
      makeRow('2026-03-03', 'S1', 600),
      makeRow('2026-03-04', 'S1', 700),
    ])
    const agg = aggregateBySerial(records)
    const from = dateKeyToSerial('2026-02-26')
    const to = dateKeyToSerial('2026-03-04')
    const arr = toContinuousArray(agg, from, to)

    // 7日移動平均: arr[6] = (100+200+300+400+500+600+700) / 7 = 400
    const window = 7
    const salesValues = arr.map((d) => d.sales)
    const ma7AtDay7 =
      salesValues.slice(0, window).reduce((a, b) => a + b, 0) / window

    expect(ma7AtDay7).toBe(400)
    // 月跨ぎを意識せず、連続整数インデックスで移動平均が計算できる
  })
})
