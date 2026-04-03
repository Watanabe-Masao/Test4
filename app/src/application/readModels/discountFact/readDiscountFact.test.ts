import { describe, it, expect } from 'vitest'
import {
  DiscountFactReadModel,
  type DiscountFactReadModel as DiscountFactReadModelType,
} from './DiscountFactTypes'
import { toStoreDiscountRows, toDailyDiscountRows, toDeptDiscountRows } from './readDiscountFact'

function makeTestModel(): DiscountFactReadModelType {
  return {
    rows: [
      {
        storeId: 'S001',
        day: 1,
        deptCode: 'D01',
        deptName: '食品',
        lineCode: 'L01',
        lineName: '生鮮',
        klassCode: 'K01',
        klassName: '青果',
        discount71: 10_000,
        discount72: 5_000,
        discount73: 3_000,
        discount74: 2_000,
        discountTotal: 20_000,
      },
      {
        storeId: 'S001',
        day: 1,
        deptCode: 'D02',
        deptName: '日用品',
        lineCode: 'L02',
        lineName: '消耗品',
        klassCode: 'K02',
        klassName: 'トイレタリー',
        discount71: 1_000,
        discount72: 500,
        discount73: 0,
        discount74: 0,
        discountTotal: 1_500,
      },
      {
        storeId: 'S002',
        day: 1,
        deptCode: 'D01',
        deptName: '食品',
        lineCode: 'L01',
        lineName: '生鮮',
        klassCode: 'K01',
        klassName: '青果',
        discount71: 8_000,
        discount72: 4_000,
        discount73: 2_000,
        discount74: 1_000,
        discountTotal: 15_000,
      },
      {
        storeId: 'S001',
        day: 2,
        deptCode: 'D01',
        deptName: '食品',
        lineCode: 'L01',
        lineName: '生鮮',
        klassCode: 'K01',
        klassName: '青果',
        discount71: 12_000,
        discount72: 6_000,
        discount73: 4_000,
        discount74: 1_500,
        discountTotal: 23_500,
      },
    ],
    grandTotal: 60_000,
    grandTotal71: 31_000,
    grandTotal72: 15_500,
    grandTotal73: 9_000,
    grandTotal74: 4_500,
    meta: { usedFallback: false, missingPolicy: 'zero', dataVersion: 1 },
  }
}

describe('DiscountFactReadModel', () => {
  it('Zod parse', () => {
    expect(() => DiscountFactReadModel.parse(makeTestModel())).not.toThrow()
  })

  it('grandTotal = Σ rows[].discountTotal', () => {
    const model = makeTestModel()
    const sum = model.rows.reduce((s, r) => s + r.discountTotal, 0)
    expect(model.grandTotal).toBe(sum)
  })

  it('grandTotal = grandTotal71 + 72 + 73 + 74', () => {
    const model = makeTestModel()
    expect(model.grandTotal).toBe(
      model.grandTotal71 + model.grandTotal72 + model.grandTotal73 + model.grandTotal74,
    )
  })
})

describe('導出ヘルパー', () => {
  it('toStoreDiscountRows: 店舗別合計の総和 = grandTotal', () => {
    const model = makeTestModel()
    const rows = toStoreDiscountRows(model)
    expect(rows.reduce((s, r) => s + r.discountTotal, 0)).toBe(model.grandTotal)
  })

  it('toDailyDiscountRows: 日別合計の総和 = grandTotal', () => {
    const model = makeTestModel()
    const rows = toDailyDiscountRows(model)
    expect(rows.reduce((s, r) => s + r.discountTotal, 0)).toBe(model.grandTotal)
  })

  it('toDeptDiscountRows: 部門別合計の総和 = grandTotal', () => {
    const model = makeTestModel()
    const rows = toDeptDiscountRows(model)
    expect(rows.reduce((s, r) => s + r.discountTotal, 0)).toBe(model.grandTotal)
  })

  it('部門別で71-74の内訳が正しい', () => {
    const model = makeTestModel()
    const rows = toDeptDiscountRows(model)
    const d01 = rows.find((r) => r.deptCode === 'D01')!
    expect(d01.discount71 + d01.discount72 + d01.discount73 + d01.discount74).toBe(
      d01.discountTotal,
    )
  })
})
