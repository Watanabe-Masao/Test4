/**
 * dailyRecords クエリモジュールのユニットテスト
 *
 * dailyRecordTotalCost 純粋関数をテストする。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { dailyRecordTotalCost, type DailyRecordRow } from '../queries/dailyRecords'

function makeDailyRow(overrides: Partial<DailyRecordRow> = {}): DailyRecordRow {
  return {
    storeId: '1',
    dateKey: '2025-02-01',
    year: 2025,
    month: 2,
    day: 1,
    sales: 500000,
    coreSales: 450000,
    grossSales: 480000,
    discount71: 0,
    discount72: 0,
    discount73: 10000,
    discount74: 5000,
    discountAmount: 15000,
    discountAbsolute: 15000,
    purchaseCost: 100000,
    purchasePrice: 110000,
    interStoreInCost: 20000,
    interStoreInPrice: 22000,
    interStoreOutCost: 15000,
    interStoreOutPrice: 16000,
    interDeptInCost: 5000,
    interDeptInPrice: 5500,
    interDeptOutCost: 3000,
    interDeptOutPrice: 3300,
    flowersCost: 8000,
    flowersPrice: 9000,
    directProduceCost: 12000,
    directProducePrice: 13000,
    costInclusionCost: 2000,
    customers: 300,
    budgetAmount: 600000,
    ...overrides,
  }
}

describe('dailyRecordTotalCost', () => {
  it('全コスト要素を合算する', () => {
    const row = makeDailyRow()
    // 100000 + 20000 + 15000 + 5000 + 3000 + 8000 + 12000 = 163000
    expect(dailyRecordTotalCost(row)).toBe(163000)
  })

  it('全て0の場合は0', () => {
    const row = makeDailyRow({
      purchaseCost: 0,
      interStoreInCost: 0,
      interStoreOutCost: 0,
      interDeptInCost: 0,
      interDeptOutCost: 0,
      flowersCost: 0,
      directProduceCost: 0,
    })
    expect(dailyRecordTotalCost(row)).toBe(0)
  })

  it('負の値がある場合も正しく計算', () => {
    const row = makeDailyRow({
      purchaseCost: 100000,
      interStoreInCost: 0,
      interStoreOutCost: -5000, // 戻り
      interDeptInCost: 0,
      interDeptOutCost: 0,
      flowersCost: 0,
      directProduceCost: 0,
    })
    expect(dailyRecordTotalCost(row)).toBe(95000)
  })

  it('costInclusionCost は含まれない', () => {
    const row = makeDailyRow({
      purchaseCost: 100000,
      interStoreInCost: 0,
      interStoreOutCost: 0,
      interDeptInCost: 0,
      interDeptOutCost: 0,
      flowersCost: 0,
      directProduceCost: 0,
      costInclusionCost: 99999,
    })
    // costInclusionCost は totalCost に含まれない
    expect(dailyRecordTotalCost(row)).toBe(100000)
  })
})
