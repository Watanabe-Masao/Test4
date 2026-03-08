/**
 * aggregateStoreResults のユニットテスト
 *
 * 複数 StoreResult を合算する関数の正常系・エッジケースを検証する。
 */
import { describe, it, expect } from 'vitest'
import { aggregateStoreResults } from '@/application/usecases/calculation/aggregateResults'
import type {
  StoreResult,
  DailyRecord,
  CategoryType,
  SupplierTotal,
  TransferDetails,
} from '@/domain/models'
import { ZERO_COST_PRICE_PAIR, ZERO_DISCOUNT_ENTRIES } from '@/domain/models'

/** 最小限の DailyRecord を生成 */
function makeDailyRecord(day: number, overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    day,
    sales: 0,
    coreSales: 0,
    grossSales: 0,
    totalCost: 0,
    purchase: ZERO_COST_PRICE_PAIR,
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
    ...overrides,
  }
}

const ZERO_TRANSFER_DETAILS: TransferDetails = {
  interStoreIn: ZERO_COST_PRICE_PAIR,
  interStoreOut: ZERO_COST_PRICE_PAIR,
  interDepartmentIn: ZERO_COST_PRICE_PAIR,
  interDepartmentOut: ZERO_COST_PRICE_PAIR,
  netTransfer: ZERO_COST_PRICE_PAIR,
}

/** 最小限の StoreResult を生成（全フィールドゼロ、overrides で上書き） */
function makeStoreResult(overrides: Partial<StoreResult> = {}): StoreResult {
  return {
    storeId: 'test-store',
    openingInventory: null,
    closingInventory: null,
    productInventory: null,
    costInclusionInventory: null,
    inventoryDate: null,
    closingInventoryDay: null,
    purchaseMaxDay: 0,
    hasDiscountData: false,
    totalSales: 0,
    totalCoreSales: 0,
    deliverySalesPrice: 0,
    flowerSalesPrice: 0,
    directProduceSalesPrice: 0,
    grossSales: 0,
    totalCost: 0,
    inventoryCost: 0,
    deliverySalesCost: 0,
    invMethodCogs: null,
    invMethodGrossProfit: null,
    invMethodGrossProfitRate: null,
    estMethodCogs: 0,
    estMethodMargin: 0,
    estMethodMarginRate: 0,
    estMethodClosingInventory: null,
    totalCustomers: 0,
    transactionValue: 0,
    averageCustomersPerDay: 0,
    totalDiscount: 0,
    discountRate: 0,
    discountLossCost: 0,
    discountEntries: [...ZERO_DISCOUNT_ENTRIES],
    averageMarkupRate: 0,
    coreMarkupRate: 0,
    totalCostInclusion: 0,
    costInclusionRate: 0,
    budget: 0,
    grossProfitBudget: 0,
    grossProfitRateBudget: 0,
    budgetDaily: new Map<number, number>(),
    daily: new Map<number, DailyRecord>(),
    categoryTotals: new Map<CategoryType, { cost: number; price: number }>(),
    supplierTotals: new Map<string, SupplierTotal>(),
    transferDetails: ZERO_TRANSFER_DETAILS,
    elapsedDays: 0,
    salesDays: 0,
    averageDailySales: 0,
    projectedSales: 0,
    projectedAchievement: 0,
    budgetAchievementRate: 0,
    budgetProgressRate: 0,
    budgetElapsedRate: 0,
    budgetProgressGap: 0,
    budgetVariance: 0,
    requiredDailySales: 0,
    remainingBudget: 0,
    dailyCumulative: new Map<number, { sales: number; budget: number }>(),
    grossProfitBudgetVariance: 0,
    grossProfitProgressGap: 0,
    requiredDailyGrossProfit: 0,
    projectedGrossProfit: 0,
    projectedGPAchievement: 0,
    ...overrides,
  }
}

describe('aggregateStoreResults', () => {
  // ───────────────────────────────────────────────────────
  // 1. 空配列で例外を投げる
  // ───────────────────────────────────────────────────────
  it('throws if results array is empty', () => {
    expect(() => aggregateStoreResults([], 30)).toThrow('Cannot aggregate 0 results')
  })

  // ───────────────────────────────────────────────────────
  // 2. 単一店舗はパススルー
  // ───────────────────────────────────────────────────────
  describe('single store passthrough', () => {
    it('preserves numeric totals from a single store', () => {
      const store = makeStoreResult({
        storeId: 'S001',
        totalSales: 100000,
        totalCoreSales: 90000,
        grossSales: 105000,
        totalCost: 70000,
        inventoryCost: 65000,
        deliverySalesCost: 5000,
        deliverySalesPrice: 8000,
        totalDiscount: 5000,
        totalCostInclusion: 2000,
        totalCustomers: 300,
        budget: 120000,
        grossProfitBudget: 30000,
        elapsedDays: 15,
        salesDays: 14,
        purchaseMaxDay: 15,
        hasDiscountData: true,
        estMethodCogs: 60000,
        estMethodMargin: 30000,
        discountLossCost: 1000,
      })

      const result = aggregateStoreResults([store], 30)

      expect(result.storeId).toBe('aggregate')
      expect(result.totalSales).toBe(100000)
      expect(result.totalCoreSales).toBe(90000)
      expect(result.grossSales).toBe(105000)
      expect(result.totalCost).toBe(70000)
      expect(result.inventoryCost).toBe(65000)
      expect(result.deliverySalesCost).toBe(5000)
      expect(result.deliverySalesPrice).toBe(8000)
      expect(result.totalDiscount).toBe(5000)
      expect(result.totalCostInclusion).toBe(2000)
      expect(result.totalCustomers).toBe(300)
      expect(result.budget).toBe(120000)
      expect(result.grossProfitBudget).toBe(30000)
      expect(result.elapsedDays).toBe(15)
      expect(result.salesDays).toBe(14)
      expect(result.purchaseMaxDay).toBe(15)
      expect(result.hasDiscountData).toBe(true)
      expect(result.estMethodCogs).toBe(60000)
      expect(result.estMethodMargin).toBe(30000)
      expect(result.discountLossCost).toBe(1000)
    })

    it('preserves daily records from a single store', () => {
      const daily = new Map<number, DailyRecord>()
      daily.set(1, makeDailyRecord(1, { sales: 5000, customers: 20 }))
      daily.set(2, makeDailyRecord(2, { sales: 7000, customers: 25 }))

      const store = makeStoreResult({ daily })
      const result = aggregateStoreResults([store], 30)

      expect(result.daily.size).toBe(2)
      expect(result.daily.get(1)?.sales).toBe(5000)
      expect(result.daily.get(1)?.customers).toBe(20)
      expect(result.daily.get(2)?.sales).toBe(7000)
    })
  })

  // ───────────────────────────────────────────────────────
  // 3. 2店舗の合算
  // ───────────────────────────────────────────────────────
  describe('two stores aggregation', () => {
    it('sums numeric fields across two stores', () => {
      const storeA = makeStoreResult({
        storeId: 'A',
        totalSales: 100000,
        totalCoreSales: 80000,
        deliverySalesPrice: 5000,
        grossSales: 105000,
        totalCost: 70000,
        inventoryCost: 65000,
        deliverySalesCost: 5000,
        totalDiscount: 3000,
        totalCostInclusion: 1000,
        totalCustomers: 200,
        budget: 120000,
        grossProfitBudget: 30000,
        estMethodCogs: 40000,
        estMethodMargin: 40000,
        discountLossCost: 500,
        elapsedDays: 10,
        salesDays: 9,
        purchaseMaxDay: 10,
        hasDiscountData: false,
      })
      const storeB = makeStoreResult({
        storeId: 'B',
        totalSales: 200000,
        totalCoreSales: 170000,
        deliverySalesPrice: 10000,
        grossSales: 210000,
        totalCost: 140000,
        inventoryCost: 130000,
        deliverySalesCost: 10000,
        totalDiscount: 7000,
        totalCostInclusion: 2000,
        totalCustomers: 400,
        budget: 250000,
        grossProfitBudget: 60000,
        estMethodCogs: 80000,
        estMethodMargin: 90000,
        discountLossCost: 1500,
        elapsedDays: 12,
        salesDays: 11,
        purchaseMaxDay: 14,
        hasDiscountData: true,
      })

      const result = aggregateStoreResults([storeA, storeB], 30)

      // Sums
      expect(result.totalSales).toBe(300000)
      expect(result.totalCoreSales).toBe(250000)
      expect(result.deliverySalesPrice).toBe(15000)
      expect(result.grossSales).toBe(315000)
      expect(result.totalCost).toBe(210000)
      expect(result.inventoryCost).toBe(195000)
      expect(result.deliverySalesCost).toBe(15000)
      expect(result.totalDiscount).toBe(10000)
      expect(result.totalCostInclusion).toBe(3000)
      expect(result.totalCustomers).toBe(600)
      expect(result.budget).toBe(370000)
      expect(result.grossProfitBudget).toBe(90000)
      expect(result.estMethodCogs).toBe(120000)
      expect(result.estMethodMargin).toBe(130000)
      expect(result.discountLossCost).toBe(2000)

      // Max
      expect(result.elapsedDays).toBe(12)
      expect(result.salesDays).toBe(11)
      expect(result.purchaseMaxDay).toBe(14)

      // OR
      expect(result.hasDiscountData).toBe(true)
    })

    it('computes derived averageDailySales and projectedSales', () => {
      const store = makeStoreResult({
        totalSales: 140000,
        salesDays: 14,
        elapsedDays: 14,
      })

      const daysInMonth = 30
      const result = aggregateStoreResults([store], daysInMonth)

      // averageDailySales = 140000 / 14 = 10000
      expect(result.averageDailySales).toBe(10000)
      // projectedSales = 140000 + 10000 * (30 - 14) = 300000
      expect(result.projectedSales).toBe(300000)
    })

    it('computes budgetAchievementRate and budgetProgressRate', () => {
      const budgetDaily = new Map<number, number>()
      for (let d = 1; d <= 30; d++) {
        budgetDaily.set(d, 10000)
      }
      const store = makeStoreResult({
        totalSales: 200000,
        budget: 300000,
        elapsedDays: 20,
        salesDays: 20,
        budgetDaily,
      })

      const result = aggregateStoreResults([store], 30)

      // budgetAchievementRate = 200000 / 300000
      expect(result.budgetAchievementRate).toBeCloseTo(200000 / 300000)
      // cumulativeBudget for days 1..20 = 200000
      // budgetProgressRate = 200000 / 200000 = 1
      expect(result.budgetProgressRate).toBeCloseTo(1.0)
    })

    it('merges categoryTotals across stores', () => {
      const catA = new Map<CategoryType, { cost: number; price: number }>()
      catA.set('market', { cost: 100, price: 130 })
      catA.set('lfc', { cost: 50, price: 65 })

      const catB = new Map<CategoryType, { cost: number; price: number }>()
      catB.set('market', { cost: 200, price: 260 })
      catB.set('processed', { cost: 80, price: 100 })

      const storeA = makeStoreResult({ categoryTotals: catA })
      const storeB = makeStoreResult({ categoryTotals: catB })

      const result = aggregateStoreResults([storeA, storeB], 30)

      expect(result.categoryTotals.get('market')).toEqual({ cost: 300, price: 390 })
      expect(result.categoryTotals.get('lfc')).toEqual({ cost: 50, price: 65 })
      expect(result.categoryTotals.get('processed')).toEqual({ cost: 80, price: 100 })
    })

    it('merges supplierTotals with recalculated markupRate', () => {
      const supA = new Map<string, SupplierTotal>()
      supA.set('SUP001', {
        supplierCode: 'SUP001',
        supplierName: 'Supplier One',
        category: 'market',
        cost: 100,
        price: 200,
        markupRate: 0.5,
      })

      const supB = new Map<string, SupplierTotal>()
      supB.set('SUP001', {
        supplierCode: 'SUP001',
        supplierName: 'Supplier One',
        category: 'market',
        cost: 300,
        price: 400,
        markupRate: 0.25,
      })

      const storeA = makeStoreResult({ supplierTotals: supA })
      const storeB = makeStoreResult({ supplierTotals: supB })

      const result = aggregateStoreResults([storeA, storeB], 30)

      const merged = result.supplierTotals.get('SUP001')
      expect(merged).toBeDefined()
      expect(merged!.cost).toBe(400)
      expect(merged!.price).toBe(600)
      // markupRate = (600 - 400) / 600 = 1/3
      expect(merged!.markupRate).toBeCloseTo(1 / 3)
    })

    it('merges budgetDaily across stores', () => {
      const bdA = new Map<number, number>()
      bdA.set(1, 1000)
      bdA.set(2, 2000)

      const bdB = new Map<number, number>()
      bdB.set(1, 500)
      bdB.set(3, 1500)

      const storeA = makeStoreResult({ budgetDaily: bdA })
      const storeB = makeStoreResult({ budgetDaily: bdB })

      const result = aggregateStoreResults([storeA, storeB], 30)

      expect(result.budgetDaily.get(1)).toBe(1500)
      expect(result.budgetDaily.get(2)).toBe(2000)
      expect(result.budgetDaily.get(3)).toBe(1500)
    })

    it('aggregates transferDetails across stores', () => {
      const storeA = makeStoreResult({
        transferDetails: {
          interStoreIn: { cost: 10, price: 15 },
          interStoreOut: { cost: 5, price: 8 },
          interDepartmentIn: { cost: 3, price: 4 },
          interDepartmentOut: { cost: 1, price: 2 },
          netTransfer: { cost: 19, price: 29 },
        },
      })
      const storeB = makeStoreResult({
        transferDetails: {
          interStoreIn: { cost: 20, price: 25 },
          interStoreOut: { cost: 10, price: 12 },
          interDepartmentIn: { cost: 7, price: 6 },
          interDepartmentOut: { cost: 2, price: 3 },
          netTransfer: { cost: 39, price: 46 },
        },
      })

      const result = aggregateStoreResults([storeA, storeB], 30)

      expect(result.transferDetails.interStoreIn).toEqual({ cost: 30, price: 40 })
      expect(result.transferDetails.interStoreOut).toEqual({ cost: 15, price: 20 })
      expect(result.transferDetails.interDepartmentIn).toEqual({ cost: 10, price: 10 })
      expect(result.transferDetails.interDepartmentOut).toEqual({ cost: 3, price: 5 })
      // netTransfer is recalculated as sum of all four
      expect(result.transferDetails.netTransfer).toEqual({
        cost: 30 + 15 + 10 + 3,
        price: 40 + 20 + 10 + 5,
      })
    })

    it('hasDiscountData is false when no store has discount data', () => {
      const storeA = makeStoreResult({ hasDiscountData: false })
      const storeB = makeStoreResult({ hasDiscountData: false })

      const result = aggregateStoreResults([storeA, storeB], 30)
      expect(result.hasDiscountData).toBe(false)
    })
  })

  // ───────────────────────────────────────────────────────
  // 4. 在庫の null ハンドリング
  // ───────────────────────────────────────────────────────
  describe('null inventory handling', () => {
    it('returns null inventory when all stores have null', () => {
      const storeA = makeStoreResult({ openingInventory: null, closingInventory: null })
      const storeB = makeStoreResult({ openingInventory: null, closingInventory: null })

      const result = aggregateStoreResults([storeA, storeB], 30)

      expect(result.openingInventory).toBeNull()
      expect(result.closingInventory).toBeNull()
      expect(result.invMethodCogs).toBeNull()
      expect(result.invMethodGrossProfit).toBeNull()
      expect(result.invMethodGrossProfitRate).toBeNull()
    })

    it('sums inventory when all stores have values', () => {
      const storeA = makeStoreResult({
        openingInventory: 50000,
        closingInventory: 40000,
        totalSales: 100000,
        totalCost: 60000,
      })
      const storeB = makeStoreResult({
        openingInventory: 30000,
        closingInventory: 25000,
        totalSales: 80000,
        totalCost: 50000,
      })

      const result = aggregateStoreResults([storeA, storeB], 30)

      expect(result.openingInventory).toBe(80000)
      expect(result.closingInventory).toBe(65000)
      // invMethodCogs = opening + totalCost - closing = 80000 + 110000 - 65000 = 125000
      expect(result.invMethodCogs).toBe(125000)
      // invMethodGrossProfit = totalSales - cogs = 180000 - 125000 = 55000
      expect(result.invMethodGrossProfit).toBe(55000)
      // invMethodGrossProfitRate = 55000 / 180000
      expect(result.invMethodGrossProfitRate).toBeCloseTo(55000 / 180000)
    })

    it('sums inventory when some stores have values and others null', () => {
      const storeA = makeStoreResult({
        openingInventory: 50000,
        closingInventory: 40000,
        totalSales: 100000,
        totalCost: 60000,
      })
      const storeB = makeStoreResult({
        openingInventory: null,
        closingInventory: null,
        totalSales: 80000,
        totalCost: 50000,
      })

      const result = aggregateStoreResults([storeA, storeB], 30)

      // hasOpening is true because at least one store has it
      expect(result.openingInventory).toBe(50000)
      // hasClosing is true because at least one store has it
      expect(result.closingInventory).toBe(40000)
      // invMethodCogs = 50000 + 110000 - 40000 = 120000
      expect(result.invMethodCogs).toBe(120000)
    })

    it('handles mixed null opening but non-null closing', () => {
      const storeA = makeStoreResult({
        openingInventory: 50000,
        closingInventory: null,
      })

      const result = aggregateStoreResults([storeA], 30)

      expect(result.openingInventory).toBe(50000)
      expect(result.closingInventory).toBeNull()
      // Cannot compute invMethod without both inventories
      expect(result.invMethodCogs).toBeNull()
    })

    it('handles estMethodClosingInventory null aggregation', () => {
      const storeA = makeStoreResult({ estMethodClosingInventory: 10000 })
      const storeB = makeStoreResult({ estMethodClosingInventory: null })

      const result = aggregateStoreResults([storeA, storeB], 30)

      // hasEstClosing is true because at least one is non-null
      expect(result.estMethodClosingInventory).toBe(10000)
    })

    it('returns null estMethodClosingInventory when all null', () => {
      const storeA = makeStoreResult({ estMethodClosingInventory: null })
      const storeB = makeStoreResult({ estMethodClosingInventory: null })

      const result = aggregateStoreResults([storeA, storeB], 30)

      expect(result.estMethodClosingInventory).toBeNull()
    })
  })

  // ───────────────────────────────────────────────────────
  // 5. 日別レコードのマージ
  // ───────────────────────────────────────────────────────
  describe('daily record merging', () => {
    it('merges daily records for the same day across stores', () => {
      const dailyA = new Map<number, DailyRecord>()
      dailyA.set(
        1,
        makeDailyRecord(1, {
          sales: 5000,
          coreSales: 4000,
          grossSales: 5500,
          totalCost: 3000,
          customers: 10,
          discountAmount: 500,
          discountAbsolute: 500,
          purchase: { cost: 3000, price: 4000 },
        }),
      )

      const dailyB = new Map<number, DailyRecord>()
      dailyB.set(
        1,
        makeDailyRecord(1, {
          sales: 8000,
          coreSales: 7000,
          grossSales: 8800,
          totalCost: 5000,
          customers: 15,
          discountAmount: 800,
          discountAbsolute: 800,
          purchase: { cost: 5000, price: 6500 },
        }),
      )

      const storeA = makeStoreResult({ daily: dailyA })
      const storeB = makeStoreResult({ daily: dailyB })

      const result = aggregateStoreResults([storeA, storeB], 30)

      const day1 = result.daily.get(1)
      expect(day1).toBeDefined()
      expect(day1!.sales).toBe(13000)
      expect(day1!.coreSales).toBe(11000)
      expect(day1!.grossSales).toBe(14300)
      expect(day1!.totalCost).toBe(8000)
      expect(day1!.customers).toBe(25)
      expect(day1!.discountAmount).toBe(1300)
      expect(day1!.discountAbsolute).toBe(1300)
      expect(day1!.purchase).toEqual({ cost: 8000, price: 10500 })
    })

    it('keeps separate daily records for different days', () => {
      const dailyA = new Map<number, DailyRecord>()
      dailyA.set(1, makeDailyRecord(1, { sales: 5000 }))

      const dailyB = new Map<number, DailyRecord>()
      dailyB.set(2, makeDailyRecord(2, { sales: 8000 }))

      const storeA = makeStoreResult({ daily: dailyA })
      const storeB = makeStoreResult({ daily: dailyB })

      const result = aggregateStoreResults([storeA, storeB], 30)

      expect(result.daily.size).toBe(2)
      expect(result.daily.get(1)?.sales).toBe(5000)
      expect(result.daily.get(2)?.sales).toBe(8000)
    })

    it('merges supplierBreakdown within daily records', () => {
      const sbA = new Map<string, { cost: number; price: number }>()
      sbA.set('SUP1', { cost: 100, price: 150 })

      const sbB = new Map<string, { cost: number; price: number }>()
      sbB.set('SUP1', { cost: 200, price: 300 })
      sbB.set('SUP2', { cost: 50, price: 70 })

      const dailyA = new Map<number, DailyRecord>()
      dailyA.set(1, makeDailyRecord(1, { supplierBreakdown: sbA }))

      const dailyB = new Map<number, DailyRecord>()
      dailyB.set(1, makeDailyRecord(1, { supplierBreakdown: sbB }))

      const storeA = makeStoreResult({ daily: dailyA })
      const storeB = makeStoreResult({ daily: dailyB })

      const result = aggregateStoreResults([storeA, storeB], 30)

      const mergedSB = result.daily.get(1)!.supplierBreakdown
      expect(mergedSB.get('SUP1')).toEqual({ cost: 300, price: 450 })
      expect(mergedSB.get('SUP2')).toEqual({ cost: 50, price: 70 })
    })

    it('merges CostPricePair fields in daily records', () => {
      const dailyA = new Map<number, DailyRecord>()
      dailyA.set(
        1,
        makeDailyRecord(1, {
          flowers: { cost: 10, price: 20 },
          directProduce: { cost: 5, price: 8 },
          deliverySales: { cost: 15, price: 28 },
          interStoreIn: { cost: 3, price: 4 },
        }),
      )

      const dailyB = new Map<number, DailyRecord>()
      dailyB.set(
        1,
        makeDailyRecord(1, {
          flowers: { cost: 15, price: 25 },
          directProduce: { cost: 7, price: 12 },
          deliverySales: { cost: 22, price: 37 },
          interStoreIn: { cost: 6, price: 9 },
        }),
      )

      const storeA = makeStoreResult({ daily: dailyA })
      const storeB = makeStoreResult({ daily: dailyB })

      const result = aggregateStoreResults([storeA, storeB], 30)

      const day1 = result.daily.get(1)!
      expect(day1.flowers).toEqual({ cost: 25, price: 45 })
      expect(day1.directProduce).toEqual({ cost: 12, price: 20 })
      expect(day1.deliverySales).toEqual({ cost: 37, price: 65 })
      expect(day1.interStoreIn).toEqual({ cost: 9, price: 13 })
    })

    it('merges costInclusion in daily records', () => {
      const dailyA = new Map<number, DailyRecord>()
      dailyA.set(
        1,
        makeDailyRecord(1, {
          costInclusion: {
            cost: 100,
            items: [
              { accountCode: 'A01', itemCode: 'I01', itemName: 'Item1', quantity: 1, cost: 100 },
            ],
          },
        }),
      )

      const dailyB = new Map<number, DailyRecord>()
      dailyB.set(
        1,
        makeDailyRecord(1, {
          costInclusion: {
            cost: 200,
            items: [
              { accountCode: 'A02', itemCode: 'I02', itemName: 'Item2', quantity: 2, cost: 200 },
            ],
          },
        }),
      )

      const storeA = makeStoreResult({ daily: dailyA })
      const storeB = makeStoreResult({ daily: dailyB })

      const result = aggregateStoreResults([storeA, storeB], 30)

      const day1 = result.daily.get(1)!
      expect(day1.costInclusion.cost).toBe(300)
      expect(day1.costInclusion.items).toHaveLength(2)
    })

    it('handles undefined customers in daily record merge (treated as 0)', () => {
      const dailyA = new Map<number, DailyRecord>()
      dailyA.set(1, makeDailyRecord(1, { customers: undefined }))

      const dailyB = new Map<number, DailyRecord>()
      dailyB.set(1, makeDailyRecord(1, { customers: 10 }))

      const storeA = makeStoreResult({ daily: dailyA })
      const storeB = makeStoreResult({ daily: dailyB })

      const result = aggregateStoreResults([storeA, storeB], 30)

      expect(result.daily.get(1)!.customers).toBe(10)
    })

    it('concatenates transferBreakdown entries in daily records', () => {
      const tbEntryA = { fromStoreId: 'A', toStoreId: 'B', cost: 10, price: 15 }
      const tbEntryB = { fromStoreId: 'C', toStoreId: 'D', cost: 20, price: 30 }

      const dailyA = new Map<number, DailyRecord>()
      dailyA.set(
        1,
        makeDailyRecord(1, {
          transferBreakdown: {
            interStoreIn: [tbEntryA],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        }),
      )

      const dailyB = new Map<number, DailyRecord>()
      dailyB.set(
        1,
        makeDailyRecord(1, {
          transferBreakdown: {
            interStoreIn: [tbEntryB],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        }),
      )

      const storeA = makeStoreResult({ daily: dailyA })
      const storeB = makeStoreResult({ daily: dailyB })

      const result = aggregateStoreResults([storeA, storeB], 30)

      const day1 = result.daily.get(1)!
      expect(day1.transferBreakdown.interStoreIn).toHaveLength(2)
      expect(day1.transferBreakdown.interStoreIn[0]).toEqual(tbEntryA)
      expect(day1.transferBreakdown.interStoreIn[1]).toEqual(tbEntryB)
    })
  })

  // ───────────────────────────────────────────────────────
  // Derived field computations
  // ───────────────────────────────────────────────────────
  describe('derived fields', () => {
    it('sets storeId to aggregate', () => {
      const result = aggregateStoreResults([makeStoreResult()], 30)
      expect(result.storeId).toBe('aggregate')
    })

    it('sets productInventory, costInclusionInventory, inventoryDate, closingInventoryDay to null', () => {
      const result = aggregateStoreResults(
        [
          makeStoreResult({
            productInventory: 5000,
            costInclusionInventory: 1000,
            inventoryDate: '2025/1/15',
            closingInventoryDay: 15,
          }),
        ],
        30,
      )
      expect(result.productInventory).toBeNull()
      expect(result.costInclusionInventory).toBeNull()
      expect(result.inventoryDate).toBeNull()
      expect(result.closingInventoryDay).toBeNull()
    })

    it('computes discountRate from aggregated totalSales and totalDiscount', () => {
      const store = makeStoreResult({
        totalSales: 100000,
        totalDiscount: 5000,
      })

      const result = aggregateStoreResults([store], 30)

      // discountRate = totalDiscount / (totalSales + totalDiscount) = 5000 / 105000
      expect(result.discountRate).toBeCloseTo(5000 / 105000)
    })

    it('computes averageCustomersPerDay', () => {
      const store = makeStoreResult({
        totalCustomers: 300,
        salesDays: 15,
      })

      const result = aggregateStoreResults([store], 30)
      expect(result.averageCustomersPerDay).toBe(20)
    })

    it('computes grossProfitRateBudget', () => {
      const store = makeStoreResult({
        budget: 400000,
        grossProfitBudget: 100000,
      })

      const result = aggregateStoreResults([store], 30)
      expect(result.grossProfitRateBudget).toBeCloseTo(0.25)
    })

    it('computes costInclusionRate', () => {
      const store = makeStoreResult({
        totalSales: 200000,
        totalCostInclusion: 4000,
      })

      const result = aggregateStoreResults([store], 30)
      expect(result.costInclusionRate).toBeCloseTo(0.02)
    })

    it('computes dailyCumulative across daysInMonth', () => {
      const daily = new Map<number, DailyRecord>()
      daily.set(1, makeDailyRecord(1, { sales: 1000 }))
      daily.set(2, makeDailyRecord(2, { sales: 2000 }))

      const budgetDaily = new Map<number, number>()
      budgetDaily.set(1, 500)
      budgetDaily.set(2, 700)

      const store = makeStoreResult({ daily, budgetDaily })
      const result = aggregateStoreResults([store], 3)

      expect(result.dailyCumulative.get(1)).toEqual({ sales: 1000, budget: 500 })
      expect(result.dailyCumulative.get(2)).toEqual({ sales: 3000, budget: 1200 })
      // Day 3 has no sales or budget records
      expect(result.dailyCumulative.get(3)).toEqual({ sales: 3000, budget: 1200 })
    })

    it('computes remainingBudget and requiredDailySales', () => {
      const budgetDaily = new Map<number, number>()
      for (let d = 1; d <= 30; d++) {
        budgetDaily.set(d, 10000)
      }
      const store = makeStoreResult({
        totalSales: 100000,
        budget: 300000,
        elapsedDays: 10,
        salesDays: 10,
        budgetDaily,
      })

      const result = aggregateStoreResults([store], 30)

      expect(result.remainingBudget).toBe(200000)
      // remainingDays = 30 - 10 = 20
      // requiredDailySales = 200000 / 20 = 10000
      expect(result.requiredDailySales).toBe(10000)
    })

    it('computes estMethodMarginRate from aggregated values', () => {
      const storeA = makeStoreResult({
        totalCoreSales: 80000,
        estMethodMargin: 20000,
      })
      const storeB = makeStoreResult({
        totalCoreSales: 120000,
        estMethodMargin: 40000,
      })

      const result = aggregateStoreResults([storeA, storeB], 30)

      // estMethodMarginRate = totalEstMargin / totalCoreSales = 60000 / 200000 = 0.3
      expect(result.estMethodMarginRate).toBeCloseTo(0.3)
    })
  })
})
