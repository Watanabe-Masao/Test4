import { describe, it, expect } from 'vitest'
import { buildAllIndices } from '../RawDataTabBuilders'
import type { MonthlyData } from '@/domain/models/MonthlyData'

function monthlyMock(overrides: Partial<Record<string, unknown>> = {}): MonthlyData {
  return {
    classifiedSales: { records: [] },
    purchase: { records: [] },
    interStoreIn: { records: [] },
    interStoreOut: { records: [] },
    flowers: { records: [] },
    directProduce: { records: [] },
    consumables: { records: [] },
    categoryTimeSales: { records: [] },
    ...overrides,
  } as unknown as MonthlyData
}

describe('buildAllIndices', () => {
  it('returns empty indices when both current and prevYear are null', () => {
    const result = buildAllIndices(null, null)
    expect(result.csAgg).toEqual({})
    expect(result.prevCsAgg).toEqual({})
    expect(result.purchaseIdx).toEqual({})
    expect(result.interStoreInIdx).toEqual({})
    expect(result.interStoreOutIdx).toEqual({})
    expect(result.flowersIdx).toEqual({})
    expect(result.directProduceIdx).toEqual({})
    expect(result.consumablesIdx).toEqual({})
    expect(result.ctsIdx).toEqual({})
  })

  it('aggregates CTS records into store×day totals', () => {
    const current = monthlyMock({
      categoryTimeSales: {
        records: [
          { storeId: 'S1', day: 1, totalAmount: 100 },
          { storeId: 'S1', day: 1, totalAmount: 50 },
          { storeId: 'S1', day: 2, totalAmount: 200 },
          { storeId: 'S2', day: 1, totalAmount: 300 },
        ],
      },
    })
    const result = buildAllIndices(current, null)
    expect(result.ctsIdx.S1[1].amount).toBe(150)
    expect(result.ctsIdx.S1[2].amount).toBe(200)
    expect(result.ctsIdx.S2[1].amount).toBe(300)
  })

  it('indexes purchase and auxiliary records by store and day', () => {
    const current = monthlyMock({
      purchase: {
        records: [{ storeId: 'S1', day: 5, year: 2024, month: 1, totalAmount: 1000 }],
      },
      interStoreIn: {
        records: [{ storeId: 'S2', day: 3, year: 2024, month: 1 }],
      },
      interStoreOut: {
        records: [{ storeId: 'S2', day: 4, year: 2024, month: 1 }],
      },
      flowers: {
        records: [{ storeId: 'S1', day: 2, year: 2024, month: 1 }],
      },
      directProduce: {
        records: [{ storeId: 'S1', day: 7, year: 2024, month: 1 }],
      },
      consumables: {
        records: [{ storeId: 'S1', day: 8, year: 2024, month: 1 }],
      },
    })
    const result = buildAllIndices(current, null)
    expect(result.purchaseIdx.S1?.[5]).toBeDefined()
    expect(result.interStoreInIdx.S2?.[3]).toBeDefined()
    expect(result.interStoreOutIdx.S2?.[4]).toBeDefined()
    expect(result.flowersIdx.S1?.[2]).toBeDefined()
    expect(result.directProduceIdx.S1?.[7]).toBeDefined()
    expect(result.consumablesIdx.S1?.[8]).toBeDefined()
  })

  it('returns empty purchaseIdx when current is null but aggregates prevYear csAgg', () => {
    const prev = monthlyMock()
    const result = buildAllIndices(null, prev)
    expect(result.csAgg).toEqual({})
    expect(result.prevCsAgg).toEqual({})
    expect(result.purchaseIdx).toEqual({})
    expect(result.ctsIdx).toEqual({})
  })
})
