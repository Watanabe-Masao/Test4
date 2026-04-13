/**
 * PurchaseCostTypes — Zod 契約の純粋テスト
 */
import { describe, it, expect } from 'vitest'
import {
  PurchaseCostQueryInput,
  PurchaseDaySupplierRow,
  CategoryDayRow,
  PurchaseCanonical,
  DeliverySalesCanonical,
  TransfersCanonical,
  PurchaseCostReadModel,
} from './PurchaseCostTypes'

describe('PurchaseCostQueryInput', () => {
  it('accepts minimal input (dateFrom/dateTo only)', () => {
    const parsed = PurchaseCostQueryInput.parse({
      dateFrom: '2024-06-01',
      dateTo: '2024-06-30',
    })
    expect(parsed.dateFrom).toBe('2024-06-01')
    expect(parsed.storeIds).toBeUndefined()
  })

  it('accepts storeIds array', () => {
    const parsed = PurchaseCostQueryInput.parse({
      dateFrom: '2024-06-01',
      dateTo: '2024-06-30',
      storeIds: ['S01', 'S02'],
    })
    expect(parsed.storeIds).toEqual(['S01', 'S02'])
  })

  it('rejects missing dateFrom', () => {
    expect(() => PurchaseCostQueryInput.parse({ dateTo: '2024-06-30' })).toThrow()
  })

  it('rejects non-string date', () => {
    expect(() =>
      PurchaseCostQueryInput.parse({ dateFrom: 20240601, dateTo: '2024-06-30' }),
    ).toThrow()
  })

  it('rejects non-string storeIds elements', () => {
    expect(() =>
      PurchaseCostQueryInput.parse({
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
        storeIds: [1, 2],
      }),
    ).toThrow()
  })
})

describe('PurchaseDaySupplierRow', () => {
  it('parses valid supplier row', () => {
    const row = PurchaseDaySupplierRow.parse({
      storeId: 'S01',
      day: 15,
      supplierCode: 'SUP-A',
      cost: 1000,
      price: 1500,
    })
    expect(row.day).toBe(15)
    expect(row.cost).toBe(1000)
  })

  it('rejects missing supplierCode', () => {
    expect(() =>
      PurchaseDaySupplierRow.parse({
        storeId: 'S01',
        day: 15,
        cost: 1000,
        price: 1500,
      }),
    ).toThrow()
  })

  it('rejects non-number cost', () => {
    expect(() =>
      PurchaseDaySupplierRow.parse({
        storeId: 'S01',
        day: 15,
        supplierCode: 'A',
        cost: '1000',
        price: 1500,
      }),
    ).toThrow()
  })
})

describe('CategoryDayRow', () => {
  it('parses valid category row', () => {
    const row = CategoryDayRow.parse({
      storeId: 'S01',
      day: 1,
      categoryKey: 'flowers',
      cost: 500,
      price: 800,
    })
    expect(row.categoryKey).toBe('flowers')
  })

  it('accepts zero values', () => {
    const row = CategoryDayRow.parse({
      storeId: 'S01',
      day: 1,
      categoryKey: 'directProduce',
      cost: 0,
      price: 0,
    })
    expect(row.cost).toBe(0)
  })

  it('rejects null cost', () => {
    expect(() =>
      CategoryDayRow.parse({
        storeId: 'S01',
        day: 1,
        categoryKey: 'flowers',
        cost: null,
        price: 100,
      }),
    ).toThrow()
  })
})

describe('PurchaseCanonical / DeliverySalesCanonical / TransfersCanonical', () => {
  it('parses empty canonical with zero totals', () => {
    const pc = PurchaseCanonical.parse({ rows: [], totalCost: 0, totalPrice: 0 })
    expect(pc.rows).toHaveLength(0)
  })

  it('parses DeliverySalesCanonical with rows', () => {
    const dc = DeliverySalesCanonical.parse({
      rows: [{ storeId: 'S01', day: 1, categoryKey: 'flowers', cost: 100, price: 200 }],
      totalCost: 100,
      totalPrice: 200,
    })
    expect(dc.rows).toHaveLength(1)
  })

  it('parses TransfersCanonical with multiple rows', () => {
    const tc = TransfersCanonical.parse({
      rows: [
        { storeId: 'S01', day: 1, categoryKey: 'interStoreIn', cost: 100, price: 150 },
        { storeId: 'S01', day: 1, categoryKey: 'interStoreOut', cost: 50, price: 80 },
      ],
      totalCost: 150,
      totalPrice: 230,
    })
    expect(tc.rows).toHaveLength(2)
  })
})

describe('PurchaseCostReadModel', () => {
  const makeModel = () => ({
    purchase: { rows: [], totalCost: 100, totalPrice: 150 },
    deliverySales: { rows: [], totalCost: 50, totalPrice: 80 },
    transfers: { rows: [], totalCost: 20, totalPrice: 30 },
    grandTotalCost: 170,
    grandTotalPrice: 260,
    inventoryPurchaseCost: 120,
    inventoryPurchasePrice: 180,
    meta: {
      usedFallback: false,
      missingPolicy: 'zero' as const,
      rounding: {
        amountMethod: 'round' as const,
        amountPrecision: 0 as const,
        rateMethod: 'raw' as const,
      },
      missingDays: {
        purchase: 0,
        deliverySales: 0,
        transfers: 0,
        composite: 0,
      },
      dataVersion: 1,
    },
  })

  it('parses valid read model', () => {
    const parsed = PurchaseCostReadModel.parse(makeModel())
    expect(parsed.grandTotalCost).toBe(170)
    expect(parsed.meta.missingPolicy).toBe('zero')
  })

  it('rejects invalid missingPolicy literal', () => {
    const bad = makeModel()
    ;(bad.meta as unknown as { missingPolicy: string }).missingPolicy = 'skip'
    expect(() => PurchaseCostReadModel.parse(bad)).toThrow()
  })

  it('rejects missing meta.missingDays field', () => {
    const bad = makeModel()
    delete (bad.meta as unknown as { missingDays?: unknown }).missingDays
    expect(() => PurchaseCostReadModel.parse(bad)).toThrow()
  })

  it('rejects non-literal amountPrecision', () => {
    const bad = makeModel()
    ;(bad.meta.rounding as unknown as { amountPrecision: number }).amountPrecision = 2
    expect(() => PurchaseCostReadModel.parse(bad)).toThrow()
  })

  it('requires dataVersion to be a number', () => {
    const bad = makeModel()
    ;(bad.meta as unknown as { dataVersion: unknown }).dataVersion = 'v1'
    expect(() => PurchaseCostReadModel.parse(bad)).toThrow()
  })
})
