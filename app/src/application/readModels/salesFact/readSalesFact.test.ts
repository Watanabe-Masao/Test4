/**
 * readSalesFact — 分析用正本テスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  SalesFactReadModel,
  type SalesFactReadModel as SalesFactReadModelType,
} from './SalesFactTypes'
import {
  toStoreSalesRows,
  toDailySalesRows,
  toHourlySalesRows,
  toDeptSalesRows,
} from './readSalesFact'

function makeTestModel(): SalesFactReadModelType {
  return {
    daily: [
      {
        storeId: 'S001',
        day: 1,
        dow: 6,
        deptCode: 'D01',
        deptName: '食品',
        lineCode: 'L01',
        lineName: '生鮮',
        klassCode: 'K01',
        klassName: '青果',
        totalAmount: 500_000,
        totalQuantity: 200,
      },
      {
        storeId: 'S001',
        day: 1,
        dow: 6,
        deptCode: 'D02',
        deptName: '日用品',
        lineCode: 'L02',
        lineName: '消耗品',
        klassCode: 'K02',
        klassName: 'トイレタリー',
        totalAmount: 300_000,
        totalQuantity: 150,
      },
      {
        storeId: 'S002',
        day: 1,
        dow: 6,
        deptCode: 'D01',
        deptName: '食品',
        lineCode: 'L01',
        lineName: '生鮮',
        klassCode: 'K01',
        klassName: '青果',
        totalAmount: 200_000,
        totalQuantity: 100,
      },
      {
        storeId: 'S001',
        day: 2,
        dow: 0,
        deptCode: 'D01',
        deptName: '食品',
        lineCode: 'L01',
        lineName: '生鮮',
        klassCode: 'K01',
        klassName: '青果',
        totalAmount: 400_000,
        totalQuantity: 180,
      },
    ],
    hourly: [
      {
        storeId: 'S001',
        day: 1,
        deptCode: 'D01',
        lineCode: 'L01',
        klassCode: 'K01',
        hour: 10,
        amount: 100_000,
        quantity: 50,
      },
      {
        storeId: 'S001',
        day: 1,
        deptCode: 'D01',
        lineCode: 'L01',
        klassCode: 'K01',
        hour: 11,
        amount: 150_000,
        quantity: 60,
      },
      {
        storeId: 'S001',
        day: 1,
        deptCode: 'D01',
        lineCode: 'L01',
        klassCode: 'K01',
        hour: 12,
        amount: 250_000,
        quantity: 90,
      },
    ],
    grandTotalAmount: 1_400_000,
    grandTotalQuantity: 630,
    meta: { usedFallback: false, missingPolicy: 'zero', dataVersion: 1 },
  }
}

describe('SalesFactReadModel', () => {
  it('Zod parse が正しいデータを受け入れる', () => {
    const model = makeTestModel()
    expect(() => SalesFactReadModel.parse(model)).not.toThrow()
  })

  it('grandTotalAmount = Σ daily[].totalAmount', () => {
    const model = makeTestModel()
    const sum = model.daily.reduce((s, r) => s + r.totalAmount, 0)
    expect(model.grandTotalAmount).toBe(sum)
  })

  it('grandTotalQuantity = Σ daily[].totalQuantity', () => {
    const model = makeTestModel()
    const sum = model.daily.reduce((s, r) => s + r.totalQuantity, 0)
    expect(model.grandTotalQuantity).toBe(sum)
  })
})

describe('導出ヘルパー', () => {
  it('toStoreSalesRows: 店舗別合計の総和 = grandTotal', () => {
    const model = makeTestModel()
    const rows = toStoreSalesRows(model)
    expect(rows.length).toBe(2)
    const sum = rows.reduce((s, r) => s + r.totalAmount, 0)
    expect(sum).toBe(model.grandTotalAmount)
  })

  it('toDailySalesRows: 日別合計の総和 = grandTotal', () => {
    const model = makeTestModel()
    const rows = toDailySalesRows(model)
    expect(rows.length).toBe(2)
    const sum = rows.reduce((s, r) => s + r.totalAmount, 0)
    expect(sum).toBe(model.grandTotalAmount)
  })

  it('toHourlySalesRows: 時間帯別合計', () => {
    const model = makeTestModel()
    const rows = toHourlySalesRows(model)
    expect(rows.length).toBe(3)
    expect(rows[0].hour).toBe(10)
    expect(rows[2].hour).toBe(12)
  })

  it('toDeptSalesRows: 部門別合計の総和 = grandTotal', () => {
    const model = makeTestModel()
    const rows = toDeptSalesRows(model)
    expect(rows.length).toBe(2)
    const sum = rows.reduce((s, r) => s + r.totalAmount, 0)
    expect(sum).toBe(model.grandTotalAmount)
  })

  it('販売点数も正しく集約される', () => {
    const model = makeTestModel()
    const storeRows = toStoreSalesRows(model)
    const qtySum = storeRows.reduce((s, r) => s + r.totalQuantity, 0)
    expect(qtySum).toBe(model.grandTotalQuantity)
  })
})
