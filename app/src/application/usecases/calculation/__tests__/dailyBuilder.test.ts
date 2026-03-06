import { describe, it, expect } from 'vitest'
import { buildDailyRecords } from '../dailyBuilder'
import { createEmptyImportedData } from '@/domain/models'
import type { ImportedData } from '@/domain/models'

/* ── ヘルパー ───────────────────────────────── */

function makeData(overrides: Partial<ImportedData> = {}): ImportedData {
  return { ...createEmptyImportedData(), ...overrides }
}

function csRecord(day: number, storeId: string, salesAmount: number, d71 = 0) {
  return {
    year: 2025,
    month: 1,
    day,
    storeId,
    storeName: `Store ${storeId}`,
    groupName: 'G1',
    departmentName: 'D1',
    lineName: 'L1',
    className: 'C1',
    salesAmount,
    discount71: d71,
    discount72: 0,
    discount73: 0,
    discount74: 0,
  }
}

/* ── buildDailyRecords ──────────────────────── */

describe('buildDailyRecords', () => {
  it('売上データから日別レコードを構築する', () => {
    const data = makeData({
      classifiedSales: {
        records: [csRecord(1, 's1', 50000, 1000), csRecord(2, 's1', 30000)],
      },
    })
    const result = buildDailyRecords('s1', data, 31)

    expect(result.daily.size).toBeGreaterThan(0)
    expect(result.totalSales).toBe(80000)
    expect(result.totalDiscount).toBe(1000)
    expect(result.salesDays).toBe(2) // 売上がある日のみ
    expect(result.elapsedDays).toBe(2)
  })

  it('花データのcost/priceが日別レコードに反映される', () => {
    const data = makeData({
      classifiedSales: { records: [csRecord(1, 's1', 100000)] },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: 's1', cost: 5000, price: 8000, customers: 50 },
        ],
      },
    })
    const result = buildDailyRecords('s1', data, 31)

    expect(result.totalFlowerCost).toBe(5000)
    expect(result.totalFlowerPrice).toBe(8000)
    expect(result.totalCustomers).toBe(50)
  })

  it('店間移動 (in/out) が仕入原価に反映される', () => {
    const data = makeData({
      classifiedSales: { records: [csRecord(1, 's1', 100000)] },
      interStoreIn: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: 's1',
            interStoreIn: [
              {
                day: 1,
                fromStoreId: 's2',
                toStoreId: 's1',
                cost: 3000,
                price: 4000,
                isDepartmentTransfer: false,
              },
            ],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        ],
      },
    })
    const result = buildDailyRecords('s1', data, 31)

    expect(result.transferTotals.interStoreIn.cost).toBe(3000)
    expect(result.transferTotals.interStoreIn.price).toBe(4000)
  })

  it('該当日にデータがない店舗は0値の集計になる', () => {
    const data = makeData({
      classifiedSales: { records: [] }, // 空
    })
    const result = buildDailyRecords('s1', data, 31)

    expect(result.totalSales).toBe(0)
    expect(result.totalCost).toBe(0)
    expect(result.totalCustomers).toBe(0)
    expect(result.salesDays).toBe(0)
    expect(result.daily.size).toBe(0)
  })

  it('仕入データが日別costに反映される', () => {
    const data = makeData({
      classifiedSales: { records: [csRecord(1, 's1', 100000)] },
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: 's1',
            total: { cost: 40000, price: 60000 },
            suppliers: {},
          },
        ],
      },
    })
    const result = buildDailyRecords('s1', data, 31)

    expect(result.totalPurchaseCost).toBe(40000)
    expect(result.totalPurchasePrice).toBe(60000)
  })
})
