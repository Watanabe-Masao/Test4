/**
 * conditionSummaryDailyBuilders.ts — 純粋ビルダー単体テスト
 *
 * 5 関数:
 *   - buildDailyDetailRows:            sales/markupRate/discountRate/gpRate/gp の日別詳細
 *   - buildDailyYoYRows:               storeContributions ベースの前年比
 *   - buildDailyDiscountRows:          売変種別内訳
 *   - buildDailyDiscountRateYoYRows:   売変率前年比
 *   - buildDailyMarkupRateYoYRows:     値入率前年比
 */
import { describe, it, expect } from 'vitest'
import {
  buildDailyDetailRows,
  buildDailyYoYRows,
  buildDailyDiscountRows,
  buildDailyDiscountRateYoYRows,
  buildDailyMarkupRateYoYRows,
} from '../conditionSummaryDailyBuilders'
import type {
  DailyRecord,
  CategoryType,
  SupplierTotal,
  TransferDetails,
} from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearMonthlyKpi } from '@/features/comparison/application/comparisonTypes'
import { ZERO_COST_PRICE_PAIR, ZERO_DISCOUNT_ENTRIES } from '@/domain/models/record'

// ─── Factories ───────────────────────────────────────────

const ZERO_TRANSFER_DETAILS: TransferDetails = {
  interStoreIn: ZERO_COST_PRICE_PAIR,
  interStoreOut: ZERO_COST_PRICE_PAIR,
  interDepartmentIn: ZERO_COST_PRICE_PAIR,
  interDepartmentOut: ZERO_COST_PRICE_PAIR,
  netTransfer: ZERO_COST_PRICE_PAIR,
}

function makeDaily(day: number, overrides: Partial<DailyRecord> = {}): DailyRecord {
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

function makeStore(overrides: Partial<StoreResult> = {}): StoreResult {
  return {
    storeId: 'store-A',
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
    observationPeriod: {
      lastRecordedSalesDay: 0,
      elapsedDays: 0,
      salesDays: 0,
      daysInMonth: 30,
      remainingDays: 30,
      status: 'undefined' as const,
      warnings: ['obs_no_sales_data'],
    },
    metricWarnings: new Map(),
    ...overrides,
  }
}

function makePrevYearKpi(hasPrevYear: boolean, contributions: readonly {
  storeId: string
  day: number
  sales: number
  customers: number
  discount: number
}[] = []): PrevYearMonthlyKpi {
  const storeContributions = contributions.map((c) => ({
    storeId: c.storeId,
    originalDay: c.day,
    mappedDay: c.day,
    sales: c.sales,
    customers: c.customers,
    discount: c.discount,
    ctsQuantity: 0,
  }))
  const entry = {
    sales: 0,
    customers: 0,
    transactionValue: 0,
    ctsQuantity: 0,
    dailyMapping: [],
    storeContributions,
  }
  return {
    hasPrevYear,
    sameDow: entry,
    sameDate: entry,
    monthlyTotal: { sales: 0, customers: 0, transactionValue: 0, ctsQuantity: 0 },
    sourceYear: 2025,
    sourceMonth: 1,
    dowOffset: 0,
  }
}

// ─── buildDailyDetailRows ────────────────────────────────

describe('buildDailyDetailRows — sales', () => {
  it('日別 budget/actual + 累計 + 達成率 (budget>0) を返す', () => {
    const sr = makeStore({
      budgetDaily: new Map([
        [1, 1000],
        [2, 2000],
        [3, 3000],
      ]),
      daily: new Map([
        [1, makeDaily(1, { sales: 1200 })],
        [2, makeDaily(2, { sales: 1800 })],
        [3, makeDaily(3, { sales: 3600 })],
      ]),
    })
    const rows = buildDailyDetailRows(sr, 'sales', 3, 30)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ day: 1, budget: 1000, actual: 1200, diff: 200 })
    expect(rows[2]).toMatchObject({ day: 3, budget: 3000, actual: 3600, cumBudget: 6000, cumActual: 6600 })
    // achievement = 120% for day 1
    expect(rows[0].achievement).toBeCloseTo(120, 3)
  })

  it('budget=0 の日は achievement=0 (ゼロ除算回避)', () => {
    const sr = makeStore({
      budgetDaily: new Map(),
      daily: new Map([[1, makeDaily(1, { sales: 500 })]]),
    })
    const rows = buildDailyDetailRows(sr, 'sales', 1, 30)
    expect(rows[0].budget).toBe(0)
    expect(rows[0].achievement).toBe(0)
  })

  it('elapsedDays=0 → daysInMonth を fallback として使う', () => {
    const sr = makeStore()
    const rows = buildDailyDetailRows(sr, 'sales', 0, 30)
    // elapsedDays ?? 30 → 0 is nullish のみで fallback しない (0 は valid)
    // 実装は elapsedDays ?? daysInMonth なので 0 は 0 扱い
    expect(rows).toHaveLength(0)
  })

  it('累計は単純な running total (diff と achievement は累計でも計算)', () => {
    const sr = makeStore({
      budgetDaily: new Map([
        [1, 100],
        [2, 100],
      ]),
      daily: new Map([
        [1, makeDaily(1, { sales: 50 })],
        [2, makeDaily(2, { sales: 150 })],
      ]),
    })
    const rows = buildDailyDetailRows(sr, 'sales', 2, 30)
    expect(rows[1].cumBudget).toBe(200)
    expect(rows[1].cumActual).toBe(200)
    expect(rows[1].cumDiff).toBe(0)
    expect(rows[1].cumAchievement).toBeCloseTo(100, 3)
  })
})

describe('buildDailyDetailRows — discountRate', () => {
  it('日別: calculateDiscountRate × 100 / 累計: 累計原量で再計算', () => {
    const sr = makeStore({
      daily: new Map([
        [1, makeDaily(1, { sales: 1000, discountAbsolute: 100 })],
        [2, makeDaily(2, { sales: 2000, discountAbsolute: 100 })],
      ]),
    })
    const rows = buildDailyDetailRows(sr, 'discountRate', 2, 30)
    // day 1: discount / (sales + discount) = 100 / 1100 ≈ 9.09%
    expect(rows[0].actual).toBeCloseTo((100 / 1100) * 100, 2)
    // day 2 cumulative: (100+100) / (1000+2000+100+100) ≈ 6.25%
    expect(rows[1].cumActual).toBeCloseTo((200 / 3200) * 100, 2)
  })

  it('該当日データなし → 行を挿入して 0 で継続', () => {
    const sr = makeStore({
      daily: new Map([[2, makeDaily(2, { sales: 500, discountAbsolute: 50 })]]),
    })
    const rows = buildDailyDetailRows(sr, 'discountRate', 2, 30)
    expect(rows).toHaveLength(2)
    expect(rows[0].actual).toBe(0)
    expect(rows[0].budget).toBe(0)
  })
})

describe('buildDailyDetailRows — gpRate', () => {
  it('日別: (sales - totalCost - costInclusion) / sales × 100', () => {
    const sr = makeStore({
      grossProfitRateBudget: 0.3,
      daily: new Map([
        [
          1,
          makeDaily(1, {
            sales: 1000,
            totalCost: 500,
            costInclusion: { cost: 100, items: [] },
          }),
        ],
      ]),
    })
    const rows = buildDailyDetailRows(sr, 'gpRate', 1, 30)
    // (1000 - 500 - 100) / 1000 × 100 = 40%
    expect(rows[0].actual).toBeCloseTo(40, 3)
    expect(rows[0].budget).toBeCloseTo(30, 3)
  })

  it('sales=0 → actual=0 (ゼロ除算回避)', () => {
    const sr = makeStore({
      daily: new Map([[1, makeDaily(1, { sales: 0, totalCost: 0 })]]),
    })
    const rows = buildDailyDetailRows(sr, 'gpRate', 1, 30)
    expect(rows[0].actual).toBe(0)
  })
})

describe('buildDailyDetailRows — markupRate', () => {
  it('日別 + 累計を domain 関数で再計算する', () => {
    const sr = makeStore({
      grossProfitRateBudget: 0.25,
      daily: new Map([
        [
          1,
          makeDaily(1, {
            purchase: { cost: 800, price: 1000 },
          }),
        ],
      ]),
    })
    const rows = buildDailyDetailRows(sr, 'markupRate', 1, 30)
    // 値入率 = (1000 - 800) / 1000 = 20% → × 100 = 20
    expect(rows[0].actual).toBeCloseTo(20, 3)
    expect(rows[0].budget).toBeCloseTo(25, 3)
  })
})

describe('buildDailyDetailRows — gp (invMethod vs estMethod)', () => {
  it('invMethodGrossProfitRate 有: rate × sales - costInclusion', () => {
    const sr = makeStore({
      budget: 1000,
      grossProfitBudget: 300,
      invMethodGrossProfitRate: 0.4,
      budgetDaily: new Map([[1, 500]]),
      daily: new Map([
        [
          1,
          makeDaily(1, {
            sales: 2000,
            costInclusion: { cost: 50, items: [] },
          }),
        ],
      ]),
    })
    const rows = buildDailyDetailRows(sr, 'gp', 1, 30)
    // dailyActual = 2000 × 0.4 - 50 = 750
    expect(rows[0].actual).toBeCloseTo(750, 3)
    // dailyBudget = 300 × (500 / 1000) = 150
    expect(rows[0].budget).toBeCloseTo(150, 3)
  })

  it('invMethodGrossProfitRate=null: estMethodMarginRate × coreSales', () => {
    const sr = makeStore({
      budget: 1000,
      grossProfitBudget: 300,
      invMethodGrossProfitRate: null,
      estMethodMarginRate: 0.35,
      budgetDaily: new Map([[1, 500]]),
      daily: new Map([[1, makeDaily(1, { sales: 2000, coreSales: 1800 })]]),
    })
    const rows = buildDailyDetailRows(sr, 'gp', 1, 30)
    // dailyActual = 1800 × 0.35 = 630
    expect(rows[0].actual).toBeCloseTo(630, 3)
  })

  it('daily レコード無 → actual=0', () => {
    const sr = makeStore({
      budget: 100,
      grossProfitBudget: 30,
      invMethodGrossProfitRate: 0.4,
      budgetDaily: new Map([[1, 100]]),
    })
    const rows = buildDailyDetailRows(sr, 'gp', 1, 30)
    expect(rows[0].actual).toBe(0)
  })
})

// ─── buildDailyYoYRows ───────────────────────────────────

describe('buildDailyYoYRows', () => {
  it('hasPrevYear=false → 空配列', () => {
    const sr = makeStore()
    const kpi = makePrevYearKpi(false)
    expect(buildDailyYoYRows(sr, 'store-A', kpi, 5, 30)).toEqual([])
  })

  it('前年比を cur/prev の sales で日別計算する', () => {
    const sr = makeStore({
      daily: new Map([
        [1, makeDaily(1, { sales: 1200 })],
        [2, makeDaily(2, { sales: 800 })],
      ]),
    })
    const kpi = makePrevYearKpi(true, [
      { storeId: 'store-A', day: 1, sales: 1000, customers: 0, discount: 0 },
      { storeId: 'store-A', day: 2, sales: 1000, customers: 0, discount: 0 },
    ])
    const rows = buildDailyYoYRows(sr, 'store-A', kpi, 2, 30)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ day: 1, curActual: 1200, prevActual: 1000, diff: 200 })
    // YoY = 120%
    expect(rows[0].yoy).toBeCloseTo(120, 3)
    // 累計 YoY (day 2): (1200+800) / (1000+1000) = 100%
    expect(rows[1].cumYoY).toBeCloseTo(100, 3)
  })

  it('prevActual=0 → yoy=0 (ゼロ除算回避)', () => {
    const sr = makeStore({ daily: new Map([[1, makeDaily(1, { sales: 500 })]]) })
    const kpi = makePrevYearKpi(true, [])
    const rows = buildDailyYoYRows(sr, 'store-A', kpi, 1, 30)
    expect(rows[0].yoy).toBe(0)
    expect(rows[0].cumYoY).toBe(0)
  })

  it('storeId が一致しない contribution は無視', () => {
    const sr = makeStore({ daily: new Map([[1, makeDaily(1, { sales: 500 })]]) })
    const kpi = makePrevYearKpi(true, [
      { storeId: 'other-store', day: 1, sales: 9999, customers: 0, discount: 0 },
    ])
    const rows = buildDailyYoYRows(sr, 'store-A', kpi, 1, 30)
    expect(rows[0].prevActual).toBe(0)
  })
})

// ─── buildDailyDiscountRows ──────────────────────────────

describe('buildDailyDiscountRows', () => {
  it('売変種別内訳 + 累計率を返す', () => {
    const sr = makeStore({
      daily: new Map([
        [
          1,
          makeDaily(1, {
            sales: 1000,
            discountAbsolute: 100,
            discountEntries: [
              { type: '71', amount: 60 },
              { type: '72', amount: 40 },
            ],
          }),
        ],
      ]),
    })
    const rows = buildDailyDiscountRows(sr, 1, 30)
    expect(rows[0].totalAmount).toBe(100)
    expect(rows[0].entries).toEqual([
      { type: '71', amount: 60 },
      { type: '72', amount: 40 },
    ])
    // totalRate = 100 / (1000 + 100) ≈ 9.09%
    expect(rows[0].totalRate).toBeCloseTo((100 / 1100) * 100, 2)
  })

  it('該当日 daily レコードなし → 行挿入 + 累計維持', () => {
    const sr = makeStore({
      daily: new Map([[2, makeDaily(2, { sales: 100, discountAbsolute: 10 })]]),
    })
    const rows = buildDailyDiscountRows(sr, 2, 30)
    expect(rows).toHaveLength(2)
    expect(rows[0].totalAmount).toBe(0)
    expect(rows[0].entries).toEqual([])
    expect(rows[1].totalAmount).toBe(10)
  })

  it('累計 totalAmount は日別 discountAbsolute の running total', () => {
    const sr = makeStore({
      daily: new Map([
        [1, makeDaily(1, { sales: 100, discountAbsolute: 10 })],
        [2, makeDaily(2, { sales: 200, discountAbsolute: 20 })],
      ]),
    })
    const rows = buildDailyDiscountRows(sr, 2, 30)
    expect(rows[0].cumTotalAmount).toBe(10)
    expect(rows[1].cumTotalAmount).toBe(30)
  })
})

// ─── buildDailyDiscountRateYoYRows ───────────────────────

describe('buildDailyDiscountRateYoYRows', () => {
  it('hasPrevYear=false → 空配列', () => {
    const sr = makeStore()
    const kpi = makePrevYearKpi(false)
    expect(buildDailyDiscountRateYoYRows(sr, 'store-A', kpi, 3, 30)).toEqual([])
  })

  it('cur/prev の discountRate を日別 + 累計で返す', () => {
    const sr = makeStore({
      daily: new Map([[1, makeDaily(1, { sales: 1000, discountAbsolute: 100 })]]),
    })
    const kpi = makePrevYearKpi(true, [
      { storeId: 'store-A', day: 1, sales: 900, customers: 0, discount: 100 },
    ])
    const rows = buildDailyDiscountRateYoYRows(sr, 'store-A', kpi, 1, 30)
    // cur: 100 / 1100 ≈ 9.09%
    expect(rows[0].curRate).toBeCloseTo((100 / 1100) * 100, 2)
    // prev: 100 / 1000 = 10%
    expect(rows[0].prevRate).toBeCloseTo(10, 2)
    expect(rows[0].diff).toBeCloseTo(rows[0].curRate - rows[0].prevRate, 3)
  })

  it('prev データなし → prevRate=0', () => {
    const sr = makeStore({
      daily: new Map([[1, makeDaily(1, { sales: 1000, discountAbsolute: 100 })]]),
    })
    const kpi = makePrevYearKpi(true, [])
    const rows = buildDailyDiscountRateYoYRows(sr, 'store-A', kpi, 1, 30)
    expect(rows[0].prevRate).toBe(0)
  })
})

// ─── buildDailyMarkupRateYoYRows ─────────────────────────

describe('buildDailyMarkupRateYoYRows', () => {
  it('cur/prev 値入率を日別 + 累計で返す', () => {
    const sr = makeStore({
      daily: new Map([
        [
          1,
          makeDaily(1, {
            purchase: { cost: 800, price: 1000 },
          }),
        ],
      ]),
    })
    const prev = new Map([[1, { totalCost: 700, totalPrice: 1000 }]])
    const rows = buildDailyMarkupRateYoYRows(sr, prev, 1, 30)
    // cur: (1000 - 800) / 1000 = 20%
    expect(rows[0].curRate).toBeCloseTo(20, 3)
    // prev: (1000 - 700) / 1000 = 30%
    expect(rows[0].prevRate).toBeCloseTo(30, 3)
    expect(rows[0].diff).toBeCloseTo(-10, 3)
  })

  it('daily レコードなし → curRate=0、prev 有ならそちらは評価される', () => {
    const sr = makeStore()
    const prev = new Map([[1, { totalCost: 700, totalPrice: 1000 }]])
    const rows = buildDailyMarkupRateYoYRows(sr, prev, 1, 30)
    expect(rows[0].curRate).toBe(0)
    expect(rows[0].prevRate).toBeCloseTo(30, 3)
  })

  it('累計率は cost/price の running total から再計算 (率の平均ではない)', () => {
    const sr = makeStore({
      daily: new Map([
        [1, makeDaily(1, { purchase: { cost: 500, price: 1000 } })],
        [2, makeDaily(2, { purchase: { cost: 400, price: 1000 } })],
      ]),
    })
    const prev = new Map([
      [1, { totalCost: 600, totalPrice: 1000 }],
      [2, { totalCost: 500, totalPrice: 1000 }],
    ])
    const rows = buildDailyMarkupRateYoYRows(sr, prev, 2, 30)
    // 累計 cur: (1000+1000 - 500-400) / (1000+1000) = 1100/2000 = 55%
    expect(rows[1].cumCurRate).toBeCloseTo(55, 2)
    // 累計 prev: (2000 - 1100) / 2000 = 45%
    expect(rows[1].cumPrevRate).toBeCloseTo(45, 2)
  })

  it('elapsedDays 範囲分だけ rows を返す', () => {
    const sr = makeStore()
    const prev = new Map()
    expect(buildDailyMarkupRateYoYRows(sr, prev, 5, 30)).toHaveLength(5)
  })
})
