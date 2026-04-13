/**
 * dailyBuilderHelpers のユニットテスト
 *
 * buildTransferBreakdown / aggregateSupplierDay / accumulateDay を検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  buildTransferBreakdown,
  aggregateSupplierDay,
  accumulateDay,
  type MutableMonthlyAccumulator,
} from '@/application/usecases/calculation/dailyBuilderHelpers'
import type {
  TransferDayEntry,
  SupplierTotal,
  CostInclusionDailyRecord,
} from '@/domain/models/record'
import { ZERO_COST_PRICE_PAIR, ZERO_DISCOUNT_ENTRIES } from '@/domain/models/record'

const mkTransferRecord = (cost: number, price: number, from: string, to: string, dept = false) => ({
  day: 1,
  cost,
  price,
  fromStoreId: from,
  toStoreId: to,
  isDepartmentTransfer: dept,
})

describe('buildTransferBreakdown', () => {
  it('両方 undefined なら全てゼロ + 空配列', () => {
    const result = buildTransferBreakdown(undefined, undefined)
    expect(result.interStoreIn).toEqual(ZERO_COST_PRICE_PAIR)
    expect(result.interStoreOut).toEqual(ZERO_COST_PRICE_PAIR)
    expect(result.interDepartmentIn).toEqual(ZERO_COST_PRICE_PAIR)
    expect(result.interDepartmentOut).toEqual(ZERO_COST_PRICE_PAIR)
    expect(result.breakdown.interStoreIn).toEqual([])
    expect(result.breakdown.interStoreOut).toEqual([])
    expect(result.breakdown.interDepartmentIn).toEqual([])
    expect(result.breakdown.interDepartmentOut).toEqual([])
  })

  it('interIn の移動レコードを集計 + 明細化する', () => {
    const interInDay: TransferDayEntry = {
      year: 2026,
      month: 3,
      day: 1,
      storeId: 'dummy',
      interStoreIn: [mkTransferRecord(100, 150, 'A', 'B'), mkTransferRecord(50, 80, 'A', 'B')],
      interStoreOut: [],
      interDepartmentIn: [mkTransferRecord(30, 40, 'dept1', 'dept2', true)],
      interDepartmentOut: [],
    }
    const result = buildTransferBreakdown(interInDay, undefined)
    expect(result.interStoreIn.cost).toBe(150)
    expect(result.interStoreIn.price).toBe(230)
    expect(result.interDepartmentIn.cost).toBe(30)
    expect(result.interDepartmentIn.price).toBe(40)
    expect(result.breakdown.interStoreIn).toHaveLength(2)
    expect(result.breakdown.interStoreIn[0]).toEqual({
      fromStoreId: 'A',
      toStoreId: 'B',
      cost: 100,
      price: 150,
    })
    expect(result.breakdown.interDepartmentIn).toHaveLength(1)
  })

  it('interOut の移動レコードを集計する', () => {
    const interOutDay: TransferDayEntry = {
      year: 2026,
      month: 3,
      day: 1,
      storeId: 'dummy',
      interStoreIn: [],
      interStoreOut: [mkTransferRecord(200, 300, 'X', 'Y')],
      interDepartmentIn: [],
      interDepartmentOut: [mkTransferRecord(10, 15, 'd1', 'd2', true)],
    }
    const result = buildTransferBreakdown(undefined, interOutDay)
    expect(result.interStoreOut.cost).toBe(200)
    expect(result.interStoreOut.price).toBe(300)
    expect(result.interDepartmentOut.cost).toBe(10)
    expect(result.interDepartmentOut.price).toBe(15)
    // interIn は undefined で zero
    expect(result.interStoreIn).toEqual(ZERO_COST_PRICE_PAIR)
    expect(result.breakdown.interStoreIn).toEqual([])
  })
})

describe('aggregateSupplierDay', () => {
  it('空オブジェクトは空マップ、既存 totals は不変', () => {
    const totals = new Map<string, SupplierTotal>()
    const breakdown = aggregateSupplierDay({}, totals)
    expect(breakdown.size).toBe(0)
    expect(totals.size).toBe(0)
  })

  it('新規取引先を totals に追加する', () => {
    const totals = new Map<string, SupplierTotal>()
    const breakdown = aggregateSupplierDay(
      {
        '001': { cost: 100, price: 150, name: 'Supplier A' },
        '002': { cost: 50, price: 80, name: 'Supplier B' },
      },
      totals,
    )
    expect(breakdown.get('001')).toEqual({ cost: 100, price: 150 })
    expect(breakdown.get('002')).toEqual({ cost: 50, price: 80 })
    expect(totals.size).toBe(2)
    expect(totals.get('001')?.supplierName).toBe('Supplier A')
    expect(totals.get('001')?.cost).toBe(100)
    expect(totals.get('001')?.price).toBe(150)
    expect(totals.get('001')?.category).toBe('other')
    expect(totals.get('001')?.markupRate).toBe(0)
  })

  it('既存取引先を合算する', () => {
    const totals = new Map<string, SupplierTotal>([
      [
        '001',
        {
          supplierCode: '001',
          supplierName: 'Supplier A',
          category: 'other',
          cost: 100,
          price: 150,
          markupRate: 0.25,
        },
      ],
    ])
    aggregateSupplierDay({ '001': { cost: 50, price: 60, name: 'Supplier A' } }, totals)
    expect(totals.get('001')?.cost).toBe(150)
    expect(totals.get('001')?.price).toBe(210)
  })
})

describe('accumulateDay', () => {
  const makeAcc = (): MutableMonthlyAccumulator => ({
    totalSales: 0,
    totalPurchaseCost: 0,
    totalPurchasePrice: 0,
    totalFlowerPrice: 0,
    totalFlowerCost: 0,
    totalDirectProducePrice: 0,
    totalDirectProduceCost: 0,
    totalDiscount: 0,
    totalDiscountEntries: [...ZERO_DISCOUNT_ENTRIES],
    totalCostInclusion: 0,
    totalCustomers: 0,
    transferTotals: {
      interStoreIn: { ...ZERO_COST_PRICE_PAIR },
      interStoreOut: { ...ZERO_COST_PRICE_PAIR },
      interDepartmentIn: { ...ZERO_COST_PRICE_PAIR },
      interDepartmentOut: { ...ZERO_COST_PRICE_PAIR },
    },
  })

  const zeroCostInclusion: CostInclusionDailyRecord = { cost: 0, items: [] }

  it('スカラー値を単純加算する', () => {
    const acc = makeAcc()
    accumulateDay(acc, {
      sales: 1000,
      purchase: { cost: 700, price: 950 },
      flowers: { cost: 50, price: 80 },
      directProduce: { cost: 30, price: 40 },
      discountAbsolute: 20,
      discountEntries: ZERO_DISCOUNT_ENTRIES,
      costInclusion: { cost: 10, items: [] },
      customers: 100,
      interStoreIn: ZERO_COST_PRICE_PAIR,
      interStoreOut: ZERO_COST_PRICE_PAIR,
      interDepartmentIn: ZERO_COST_PRICE_PAIR,
      interDepartmentOut: ZERO_COST_PRICE_PAIR,
    })
    expect(acc.totalSales).toBe(1000)
    expect(acc.totalPurchaseCost).toBe(700)
    expect(acc.totalPurchasePrice).toBe(950)
    expect(acc.totalFlowerCost).toBe(50)
    expect(acc.totalFlowerPrice).toBe(80)
    expect(acc.totalDirectProduceCost).toBe(30)
    expect(acc.totalDirectProducePrice).toBe(40)
    expect(acc.totalDiscount).toBe(20)
    expect(acc.totalCostInclusion).toBe(10)
    expect(acc.totalCustomers).toBe(100)
  })

  it('複数日を累積する', () => {
    const acc = makeAcc()
    const day1 = {
      sales: 100,
      purchase: ZERO_COST_PRICE_PAIR,
      flowers: ZERO_COST_PRICE_PAIR,
      directProduce: ZERO_COST_PRICE_PAIR,
      discountAbsolute: 5,
      discountEntries: ZERO_DISCOUNT_ENTRIES,
      costInclusion: zeroCostInclusion,
      customers: 10,
      interStoreIn: ZERO_COST_PRICE_PAIR,
      interStoreOut: ZERO_COST_PRICE_PAIR,
      interDepartmentIn: ZERO_COST_PRICE_PAIR,
      interDepartmentOut: ZERO_COST_PRICE_PAIR,
    }
    accumulateDay(acc, day1)
    accumulateDay(acc, day1)
    expect(acc.totalSales).toBe(200)
    expect(acc.totalCustomers).toBe(20)
    expect(acc.totalDiscount).toBe(10)
  })

  it('移動合計を合算する', () => {
    const acc = makeAcc()
    accumulateDay(acc, {
      sales: 0,
      purchase: ZERO_COST_PRICE_PAIR,
      flowers: ZERO_COST_PRICE_PAIR,
      directProduce: ZERO_COST_PRICE_PAIR,
      discountAbsolute: 0,
      discountEntries: ZERO_DISCOUNT_ENTRIES,
      costInclusion: zeroCostInclusion,
      customers: 0,
      interStoreIn: { cost: 10, price: 15 },
      interStoreOut: { cost: 5, price: 8 },
      interDepartmentIn: { cost: 3, price: 4 },
      interDepartmentOut: { cost: 2, price: 3 },
    })
    expect(acc.transferTotals.interStoreIn).toEqual({ cost: 10, price: 15 })
    expect(acc.transferTotals.interStoreOut).toEqual({ cost: 5, price: 8 })
    expect(acc.transferTotals.interDepartmentIn).toEqual({ cost: 3, price: 4 })
    expect(acc.transferTotals.interDepartmentOut).toEqual({ cost: 2, price: 3 })
  })
})
