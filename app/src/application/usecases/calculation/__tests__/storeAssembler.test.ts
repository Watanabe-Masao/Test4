/**
 * storeAssembler のユニットテスト
 *
 * assembleStoreResult 関数の正常系・エッジケースを検証する。
 * CalculationOrchestrator のテストでは間接的にテストされているが、
 * ここでは MonthlyAccumulator を直接構築して境界条件をテストする。
 */
import { describe, it, expect } from 'vitest'
import { assembleStoreResult } from '../storeAssembler'
import { createEmptyImportedData, ZERO_COST_PRICE_PAIR } from '@/domain/models'
import { createDefaultSettings } from '@/domain/constants/defaults'
import type { ImportedData, AppSettings, DailyRecord } from '@/domain/models'
import type { MonthlyAccumulator } from '../types'

const DEFAULT_SETTINGS: AppSettings = {
  ...createDefaultSettings(),
  targetYear: 2025,
  targetMonth: 1,
}

/** 最小限の DailyRecord を生成 */
function makeDailyRecord(day: number, sales: number, cost = 0): DailyRecord {
  return {
    day,
    sales,
    coreSales: sales,
    grossSales: sales,
    totalCost: cost,
    purchase: { cost, price: cost > 0 ? Math.round(cost * 1.3) : 0 },
    deliverySales: ZERO_COST_PRICE_PAIR,
    interStoreIn: ZERO_COST_PRICE_PAIR,
    interStoreOut: ZERO_COST_PRICE_PAIR,
    interDepartmentIn: ZERO_COST_PRICE_PAIR,
    interDepartmentOut: ZERO_COST_PRICE_PAIR,
    flowers: ZERO_COST_PRICE_PAIR,
    directProduce: ZERO_COST_PRICE_PAIR,
    costInclusion: { cost: 0, items: [] },
    customers: 0,
    discountAmount: 0,
    discountAbsolute: 0,
    discountEntries: [],
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
  }
}

/** 最小限の MonthlyAccumulator を生成 */
function makeAccumulator(overrides: Partial<MonthlyAccumulator> = {}): MonthlyAccumulator {
  return {
    daily: new Map(),
    categoryTotals: new Map(),
    supplierTotals: new Map(),
    totalSales: 0,
    totalCost: 0,
    totalFlowerPrice: 0,
    totalFlowerCost: 0,
    totalDirectProducePrice: 0,
    totalDirectProduceCost: 0,
    totalPurchaseCost: 0,
    totalPurchasePrice: 0,
    totalDiscount: 0,
    totalDiscountEntries: [],
    totalCostInclusion: 0,
    totalCustomers: 0,
    salesDays: 0,
    elapsedDays: 0,
    purchaseMaxDay: 0,
    hasDiscountData: false,
    transferTotals: {
      interStoreIn: ZERO_COST_PRICE_PAIR,
      interStoreOut: ZERO_COST_PRICE_PAIR,
      interDepartmentIn: ZERO_COST_PRICE_PAIR,
      interDepartmentOut: ZERO_COST_PRICE_PAIR,
    },
    ...overrides,
  }
}

describe('assembleStoreResult', () => {
  it('ゼロデータ: 全フィールドが安全に初期化される', () => {
    const acc = makeAccumulator()
    const data = createEmptyImportedData()

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.storeId).toBe('1')
    expect(result.totalSales).toBe(0)
    expect(result.totalCost).toBe(0)
    expect(result.totalCoreSales).toBe(0)
    expect(result.deliverySalesPrice).toBe(0)
    expect(result.deliverySalesCost).toBe(0)
    expect(result.inventoryCost).toBe(0)
    expect(result.grossSales).toBe(0)
    expect(result.discountRate).toBe(0)
    expect(result.averageMarkupRate).toBe(0)
    expect(result.totalCustomers).toBe(0)
    expect(result.averageCustomersPerDay).toBe(0)
    expect(result.totalCostInclusion).toBe(0)
    expect(result.costInclusionRate).toBe(0)
    expect(result.invMethodCogs).toBeNull()
    expect(result.invMethodGrossProfit).toBeNull()
    expect(result.invMethodGrossProfitRate).toBeNull()
    expect(result.openingInventory).toBeNull()
    expect(result.closingInventory).toBeNull()
  })

  it('売上のみ（仕入なし）: 値入率はデフォルト値', () => {
    const daily = new Map([[1, makeDailyRecord(1, 50000)]])
    const acc = makeAccumulator({
      totalSales: 50000,
      salesDays: 1,
      elapsedDays: 1,
      daily,
    })
    const data = createEmptyImportedData()

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.totalSales).toBe(50000)
    // 仕入なしのため coreMarkupRate = defaultMarkupRate
    expect(result.coreMarkupRate).toBe(DEFAULT_SETTINGS.defaultMarkupRate)
    // 仕入なしのため averageMarkupRate = 0（除算不可）
    expect(result.averageMarkupRate).toBe(0)
  })

  it('花と産直の売上納品: コア売上が正しく計算される', () => {
    const acc = makeAccumulator({
      totalSales: 100000,
      totalFlowerPrice: 15000,
      totalFlowerCost: 12000,
      totalDirectProducePrice: 10000,
      totalDirectProduceCost: 8500,
      salesDays: 1,
      elapsedDays: 1,
    })
    const data = createEmptyImportedData()

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.deliverySalesPrice).toBe(25000) // 花15000 + 産直10000
    expect(result.deliverySalesCost).toBe(20500) // 花12000 + 産直8500
    expect(result.totalCoreSales).toBe(75000) // 100000 - 15000 - 10000
    expect(result.inventoryCost).toBe(-20500) // totalCost(0) - deliverySalesCost(20500)
  })

  it('移動データ: transferDetails が正しく組み立てられる', () => {
    const acc = makeAccumulator({
      totalSales: 50000,
      totalPurchaseCost: 20000,
      totalPurchasePrice: 26000,
      transferTotals: {
        interStoreIn: { cost: 5000, price: 6500 },
        interStoreOut: { cost: -3000, price: -3900 },
        interDepartmentIn: { cost: 1000, price: 1300 },
        interDepartmentOut: { cost: -500, price: -650 },
      },
    })
    const data = createEmptyImportedData()

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.transferDetails.interStoreIn).toEqual({ cost: 5000, price: 6500 })
    expect(result.transferDetails.interStoreOut).toEqual({ cost: -3000, price: -3900 })
    expect(result.transferDetails.interDepartmentIn).toEqual({ cost: 1000, price: 1300 })
    expect(result.transferDetails.interDepartmentOut).toEqual({ cost: -500, price: -650 })
    // netTransfer = 全移動の合計
    expect(result.transferDetails.netTransfer.cost).toBe(5000 + -3000 + 1000 + -500)
    expect(result.transferDetails.netTransfer.price).toBe(6500 + -3900 + 1300 + -650)
  })

  it('予算: 日別予算がない場合は均等日割り', () => {
    const acc = makeAccumulator({
      totalSales: 100000,
      salesDays: 5,
      elapsedDays: 5,
    })
    const data: ImportedData = {
      ...createEmptyImportedData(),
      budget: new Map([['1', { storeId: '1', total: 2800000, daily: new Map() }]]),
    }

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.budget).toBe(2800000)
    expect(result.budgetDaily.size).toBe(28)
    // 均等日割り: 2800000 / 28 = 100000/日
    expect(result.budgetDaily.get(1)).toBe(100000)
    expect(result.budgetDaily.get(28)).toBe(100000)
  })

  it('予算: 日別予算ありの場合はそのまま使用', () => {
    const daily = new Map([
      [1, 300000],
      [2, 200000],
    ])
    const acc = makeAccumulator({
      totalSales: 500000,
      salesDays: 2,
      elapsedDays: 2,
    })
    const data: ImportedData = {
      ...createEmptyImportedData(),
      budget: new Map([['1', { storeId: '1', total: 6000000, daily }]]),
    }

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.budget).toBe(6000000)
    expect(result.budgetDaily).toBe(daily)
  })

  it('予算: 予算0の場合は空の budgetDaily', () => {
    const acc = makeAccumulator()
    const data: ImportedData = {
      ...createEmptyImportedData(),
      budget: new Map([['1', { storeId: '1', total: 0, daily: new Map() }]]),
    }

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.budget).toBe(0)
    expect(result.budgetDaily.size).toBe(0)
  })

  it('取引先値入率の後計算', () => {
    const supplierTotals = new Map([
      [
        '001',
        {
          supplierCode: '001',
          supplierName: 'A',
          category: 'other' as const,
          cost: 10000,
          price: 13000,
          markupRate: 0,
        },
      ],
      [
        '002',
        {
          supplierCode: '002',
          supplierName: 'B',
          category: 'other' as const,
          cost: 20000,
          price: 30000,
          markupRate: 0,
        },
      ],
    ])
    const acc = makeAccumulator({
      totalSales: 100000,
      totalPurchaseCost: 30000,
      totalPurchasePrice: 43000,
      supplierTotals,
    })
    const data = createEmptyImportedData()

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    // 取引先A: (13000 - 10000) / 13000 ≈ 0.2308
    expect(result.supplierTotals.get('001')!.markupRate).toBeCloseTo(3000 / 13000, 6)
    // 取引先B: (30000 - 20000) / 30000 ≈ 0.3333
    expect(result.supplierTotals.get('002')!.markupRate).toBeCloseTo(10000 / 30000, 6)
  })

  it('原価算入率の計算', () => {
    const acc = makeAccumulator({
      totalSales: 200000,
      totalCostInclusion: 6000,
      salesDays: 1,
      elapsedDays: 1,
    })
    const data = createEmptyImportedData()

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.totalCostInclusion).toBe(6000)
    // 原価算入率 = 6000 / 200000 = 0.03
    expect(result.costInclusionRate).toBeCloseTo(0.03, 6)
  })

  it('売上0の場合: 原価算入率が0（ゼロ除算回避）', () => {
    const acc = makeAccumulator({
      totalSales: 0,
      totalCostInclusion: 1000,
    })
    const data = createEmptyImportedData()

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.costInclusionRate).toBe(0)
  })

  it('売変データ: 粗売上と売変率の計算', () => {
    const acc = makeAccumulator({
      totalSales: 100000,
      totalDiscount: 10000,
      hasDiscountData: true,
    })
    const data = createEmptyImportedData()

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.grossSales).toBe(110000) // 売上 + 売変額
    expect(result.hasDiscountData).toBe(true)
    // 売変率 = 10000 / (100000 + 10000) ≈ 0.0909
    expect(result.discountRate).toBeCloseTo(10000 / 110000, 6)
  })

  it('粗利予算: settings に grossProfitBudget がある場合', () => {
    const acc = makeAccumulator({ totalSales: 100000 })
    const data: ImportedData = {
      ...createEmptyImportedData(),
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: null,
            closingInventory: null,
            grossProfitBudget: 500000,
            productInventory: null,
            costInclusionInventory: null,
            inventoryDate: null,
            closingInventoryDay: null,
          },
        ],
      ]),
    }

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.grossProfitBudget).toBe(500000)
  })

  it('平均客数: 営業日数0の場合はゼロ除算回避', () => {
    const acc = makeAccumulator({
      totalCustomers: 100,
      salesDays: 0,
    })
    const data = createEmptyImportedData()

    const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 28)

    expect(result.averageCustomersPerDay).toBe(0)
  })

  describe('設定データの月検証', () => {
    const settingsFor202501: AppSettings = {
      ...createDefaultSettings(),
      targetYear: 2025,
      targetMonth: 1,
    }

    it('inventoryDate が対象月と一致 → grossProfitBudget が採用される', () => {
      const acc = makeAccumulator({ totalSales: 1000000, salesDays: 10, elapsedDays: 10 })
      const data: ImportedData = {
        ...createEmptyImportedData(),
        settings: new Map([
          [
            '1',
            {
              storeId: '1',
              openingInventory: 500000,
              closingInventory: 600000,
              grossProfitBudget: 1500000,
              productInventory: null,
              costInclusionInventory: null,
              inventoryDate: '2025/1/1',
              closingInventoryDay: null,
            },
          ],
        ]),
      }

      const result = assembleStoreResult('1', acc, data, settingsFor202501, 31)

      expect(result.grossProfitBudget).toBe(1500000)
      expect(result.grossProfitRateBudget).toBeGreaterThan(0)
    })

    it('inventoryDate が対象月と不一致 → grossProfitBudget が 0 になる', () => {
      const acc = makeAccumulator({ totalSales: 1000000, salesDays: 10, elapsedDays: 10 })
      const data: ImportedData = {
        ...createEmptyImportedData(),
        settings: new Map([
          [
            '1',
            {
              storeId: '1',
              openingInventory: 500000,
              closingInventory: 600000,
              grossProfitBudget: 1500000,
              productInventory: null,
              costInclusionInventory: null,
              inventoryDate: '2024/12/1',
              closingInventoryDay: null,
            },
          ],
        ]),
      }

      const result = assembleStoreResult('1', acc, data, settingsFor202501, 31)

      expect(result.grossProfitBudget).toBe(0)
      expect(result.grossProfitRateBudget).toBe(0)
    })

    it('inventoryDate が null → 後方互換で grossProfitBudget を採用', () => {
      const acc = makeAccumulator({ totalSales: 1000000, salesDays: 10, elapsedDays: 10 })
      const data: ImportedData = {
        ...createEmptyImportedData(),
        settings: new Map([
          [
            '1',
            {
              storeId: '1',
              openingInventory: 500000,
              closingInventory: 600000,
              grossProfitBudget: 1500000,
              productInventory: null,
              costInclusionInventory: null,
              inventoryDate: null,
              closingInventoryDay: null,
            },
          ],
        ]),
      }

      const result = assembleStoreResult('1', acc, data, settingsFor202501, 31)

      expect(result.grossProfitBudget).toBe(1500000)
    })
  })

  // ─── 観測期間の統合テスト（Phase 2） ────────────────────
  describe('observationPeriod integration', () => {
    it('ゼロデータ → status: undefined, warnings に obs_no_sales_data', () => {
      const acc = makeAccumulator()
      const data = createEmptyImportedData()

      const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 30)

      expect(result.observationPeriod.status).toBe('undefined')
      expect(result.observationPeriod.lastRecordedSalesDay).toBe(0)
      expect(result.observationPeriod.salesDays).toBe(0)
      expect(result.observationPeriod.warnings).toContain('obs_no_sales_data')
      expect(result.metricWarnings.has('observationPeriod')).toBe(true)
    })

    it('少ない日数（< minDaysForValid=5） → status: invalid', () => {
      const daily = new Map([
        [1, makeDailyRecord(1, 100000)],
        [2, makeDailyRecord(2, 80000)],
        [3, makeDailyRecord(3, 90000)],
      ])
      const acc = makeAccumulator({
        totalSales: 270000,
        salesDays: 3,
        elapsedDays: 3,
        daily,
      })
      const data = createEmptyImportedData()

      const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 31)

      expect(result.observationPeriod.status).toBe('invalid')
      expect(result.observationPeriod.lastRecordedSalesDay).toBe(3)
      expect(result.observationPeriod.elapsedDays).toBe(3)
      expect(result.observationPeriod.salesDays).toBe(3)
      expect(result.observationPeriod.daysInMonth).toBe(31)
      expect(result.observationPeriod.remainingDays).toBe(28)
      expect(result.observationPeriod.warnings).toContain('obs_window_incomplete')
    })

    it('中程度の日数（5-9日） → status: partial', () => {
      const daily = new Map<number, DailyRecord>()
      for (let d = 1; d <= 7; d++) {
        daily.set(d, makeDailyRecord(d, 50000))
      }
      const acc = makeAccumulator({
        totalSales: 350000,
        salesDays: 7,
        elapsedDays: 7,
        daily,
      })
      const data = createEmptyImportedData()

      const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 30)

      expect(result.observationPeriod.status).toBe('partial')
      expect(result.observationPeriod.lastRecordedSalesDay).toBe(7)
      expect(result.observationPeriod.warnings).toContain('obs_window_incomplete')
    })

    it('十分な日数（≥10日） → status: ok, warnings なし', () => {
      const daily = new Map<number, DailyRecord>()
      for (let d = 1; d <= 15; d++) {
        daily.set(d, makeDailyRecord(d, 40000))
      }
      const acc = makeAccumulator({
        totalSales: 600000,
        salesDays: 15,
        elapsedDays: 15,
        daily,
      })
      const data = createEmptyImportedData()

      const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 30)

      expect(result.observationPeriod.status).toBe('ok')
      expect(result.observationPeriod.lastRecordedSalesDay).toBe(15)
      expect(result.observationPeriod.remainingDays).toBe(15)
      expect(result.observationPeriod.warnings).toHaveLength(0)
      expect(result.metricWarnings.has('observationPeriod')).toBe(false)
    })

    it('elapsedDays と observationPeriod.elapsedDays は一致する', () => {
      const daily = new Map([
        [1, makeDailyRecord(1, 100000)],
        [5, makeDailyRecord(5, 80000)],
        [10, makeDailyRecord(10, 90000)],
      ])
      const acc = makeAccumulator({
        totalSales: 270000,
        salesDays: 3,
        elapsedDays: 10,
        daily,
      })
      const data = createEmptyImportedData()

      const result = assembleStoreResult('1', acc, data, DEFAULT_SETTINGS, 31)

      expect(result.observationPeriod.lastRecordedSalesDay).toBe(10)
      expect(result.observationPeriod.elapsedDays).toBe(10)
      expect(result.elapsedDays).toBe(result.observationPeriod.elapsedDays)
    })
  })
})
