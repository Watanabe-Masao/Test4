/**
 * buildClipBundle テスト
 *
 * StoreResult + PrevYearData + CTS レコードから ClipBundle を構築する処理を検証する。
 */
import { describe, it, expect } from 'vitest'
import { buildClipBundle } from '../buildClipBundle'
import type { BuildClipBundleParams } from '../buildClipBundle'
import type { CategoryTimeSalesRecord, DailyRecord } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData, PrevYearDailyEntry } from '@/application/hooks/analytics'
import type { DiscountEntry } from '@/domain/models/DiscountEntry'

// ─── テストヘルパー ──────────────────────────────────────

const ZERO_DISCOUNT_ENTRIES: readonly DiscountEntry[] = [
  { type: '71', label: '政策売変', amount: 0 },
  { type: '72', label: 'レジ値引', amount: 0 },
  { type: '73', label: '廃棄売変', amount: 0 },
  { type: '74', label: '試食売変', amount: 0 },
]

function makeDailyRecord(day: number, sales: number, customers: number): DailyRecord {
  return {
    day,
    sales,
    customers,
    coreSales: sales,
    grossSales: sales,
    discountAmount: 0,
    discountAbsolute: 0,
    discountEntries: ZERO_DISCOUNT_ENTRIES,
    purchase: { cost: 0, price: 0 },
    interStoreIn: { cost: 0, price: 0 },
    interStoreOut: { cost: 0, price: 0 },
    interDepartmentIn: { cost: 0, price: 0 },
    interDepartmentOut: { cost: 0, price: 0 },
    flowers: { cost: 0, price: 0 },
    directProduce: { cost: 0, price: 0 },
    deliverySales: { cost: 0, price: 0 },
    costInclusion: { cost: 0, items: [] },
    totalCost: 0,
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
  }
}

function makeStoreResult(overrides: Partial<StoreResult> = {}): StoreResult {
  const daily = new Map<number, DailyRecord>()
  daily.set(1, makeDailyRecord(1, 100000, 200))
  daily.set(2, makeDailyRecord(2, 80000, 150))

  const budgetDaily = new Map<number, number>()
  budgetDaily.set(1, 90000)
  budgetDaily.set(2, 85000)

  const dailyCumulative = new Map<number, { sales: number; budget: number }>()
  dailyCumulative.set(1, { sales: 100000, budget: 90000 })
  dailyCumulative.set(2, { sales: 180000, budget: 175000 })

  return {
    storeId: '1',
    openingInventory: null,
    closingInventory: null,
    productInventory: null,
    costInclusionInventory: null,
    inventoryDate: null,
    closingInventoryDay: null,
    budget: 2700000,
    grossProfitBudget: 810000,
    budgetDaily,
    totalSales: 180000,
    totalCoreSales: 170000,
    totalDiscount: -5000,
    totalCustomers: 350,
    transactionValue: 180000 / 350,
    totalCostInclusion: 1000,
    discountEntries: ZERO_DISCOUNT_ENTRIES,
    daily,
    categoryTotals: new Map(),
    supplierTotals: new Map(),
    transferDetails: {
      interStoreIn: { cost: 0, price: 0 },
      interStoreOut: { cost: 0, price: 0 },
      interDepartmentIn: { cost: 0, price: 0 },
      interDepartmentOut: { cost: 0, price: 0 },
      netTransfer: { cost: 0, price: 0 },
    },
    purchaseMaxDay: 2,
    hasDiscountData: true,
    elapsedDays: 2,
    salesDays: 2,
    grossSales: 185000,
    deliverySalesPrice: 10000,
    flowerSalesPrice: 6000,
    directProduceSalesPrice: 4000,
    totalCost: 120000,
    inventoryCost: 110000,
    deliverySalesCost: 10000,
    invMethodCogs: null,
    invMethodGrossProfit: null,
    invMethodGrossProfitRate: null,
    estMethodCogs: 100000,
    estMethodMargin: 80000,
    estMethodMarginRate: 0.4444,
    estMethodClosingInventory: null,
    discountRate: -0.0278,
    discountLossCost: 3000,
    averageMarkupRate: 0.25,
    coreMarkupRate: 0.28,
    costInclusionRate: 0.005,
    averageCustomersPerDay: 175,
    grossProfitRateBudget: 0.3,
    averageDailySales: 90000,
    projectedSales: 2790000,
    projectedAchievement: 1.033,
    budgetAchievementRate: 0.0667,
    budgetProgressRate: 1.029,
    budgetElapsedRate: 0.0648,
    budgetProgressGap: 0.964,
    budgetVariance: 5000,
    requiredDailySales: 87241,
    remainingBudget: 2520000,
    dailyCumulative,
    grossProfitBudgetVariance: 0,
    grossProfitProgressGap: 0,
    requiredDailyGrossProfit: 0,
    projectedGrossProfit: 0,
    projectedGPAchievement: 0,
    observationPeriod: {
      lastRecordedSalesDay: 2,
      elapsedDays: 2,
      salesDays: 2,
      daysInMonth: 31,
      remainingDays: 29,
      status: 'invalid' as const,
      warnings: ['obs_window_incomplete'],
    },
    metricWarnings: new Map(),
    ...overrides,
  }
}

function makePrevYearData(overrides: Partial<PrevYearData> = {}): PrevYearData {
  const daily = new Map<string, PrevYearDailyEntry>()
  daily.set('2025-01-01', { sales: 95000, customers: 190, discount: -3000, ctsQuantity: 0 })
  daily.set('2025-01-02', { sales: 75000, customers: 140, discount: -2000, ctsQuantity: 0 })

  return {
    hasPrevYear: true,
    source: 'loaded' as const,
    daily,
    totalSales: 170000,
    totalDiscount: -5000,
    totalCustomers: 330,
    totalCtsQuantity: 0,
    grossSales: 175000,
    discountRate: -0.0294,
    totalDiscountEntries: ZERO_DISCOUNT_ENTRIES,
    ...overrides,
  }
}

function makeCtsRecord(
  day: number,
  deptCode: string,
  totalQuantity: number,
  totalAmount: number,
): CategoryTimeSalesRecord {
  return {
    year: 2025,
    month: 1,
    day,
    storeId: '1',
    department: { code: deptCode, name: `Dept${deptCode}` },
    line: { code: '01', name: 'Line01' },
    klass: { code: '001', name: 'Class001' },
    timeSlots: [{ hour: 10, quantity: totalQuantity, amount: totalAmount }],
    totalQuantity,
    totalAmount,
  }
}

function makeDefaultParams(overrides: Partial<BuildClipBundleParams> = {}): BuildClipBundleParams {
  return {
    result: makeStoreResult(),
    prevYear: makePrevYearData(),
    year: 2025,
    month: 1,
    storeName: '店舗A',
    ctsRecords: [makeCtsRecord(1, '01', 50, 100000)],
    ctsPrevRecords: [makeCtsRecord(1, '01', 45, 95000)],
    ...overrides,
  }
}

// ─── テスト ──────────────────────────────────────────────

describe('buildClipBundle', () => {
  it('基本構造が正しく構築される', () => {
    const bundle = buildClipBundle(makeDefaultParams())

    expect(bundle.version).toBe(1)
    expect(bundle.year).toBe(2025)
    expect(bundle.month).toBe(1)
    expect(bundle.daysInMonth).toBe(31)
    expect(bundle.storeName).toBe('店舗A')
    expect(bundle.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('日別データが daysInMonth 分生成される', () => {
    const bundle = buildClipBundle(makeDefaultParams())

    expect(bundle.daily).toHaveLength(31)
    // Day 1 has data
    expect(bundle.daily[0].day).toBe(1)
    expect(bundle.daily[0].sales).toBe(100000)
    expect(bundle.daily[0].customers).toBe(200)
    expect(bundle.daily[0].budget).toBe(90000)
    // Day 2 has data
    expect(bundle.daily[1].day).toBe(2)
    expect(bundle.daily[1].sales).toBe(80000)
    // Day 3 has no data → defaults to 0
    expect(bundle.daily[2].day).toBe(3)
    expect(bundle.daily[2].sales).toBe(0)
    expect(bundle.daily[2].customers).toBe(0)
  })

  it('前年日別データは存在する日だけ含まれる', () => {
    const bundle = buildClipBundle(makeDefaultParams())

    expect(bundle.prevYearDaily).toHaveLength(2)
    expect(bundle.prevYearDaily[0].day).toBe(1)
    expect(bundle.prevYearDaily[0].sales).toBe(95000)
    expect(bundle.prevYearDaily[0].customers).toBe(190)
    expect(bundle.prevYearDaily[0].discount).toBe(-3000)
    expect(bundle.prevYearDaily[1].day).toBe(2)
    expect(bundle.prevYearDaily[1].sales).toBe(75000)
  })

  it('サマリー KPI がコピーされる', () => {
    const bundle = buildClipBundle(makeDefaultParams())

    expect(bundle.summary.totalSales).toBe(180000)
    expect(bundle.summary.totalCoreSales).toBe(170000)
    expect(bundle.summary.totalCustomers).toBe(350)
    expect(bundle.summary.totalDiscount).toBe(-5000)
    expect(bundle.summary.budget).toBe(2700000)
    expect(bundle.summary.grossProfitBudget).toBe(810000)
    expect(bundle.summary.averageMarkupRate).toBe(0.25)
    expect(bundle.summary.coreMarkupRate).toBe(0.28)
    expect(bundle.summary.invMethodGrossProfit).toBeNull()
    expect(bundle.summary.invMethodGrossProfitRate).toBeNull()
    expect(bundle.summary.estMethodMargin).toBe(80000)
    expect(bundle.summary.estMethodMarginRate).toBe(0.4444)
    expect(bundle.summary.averageDailySales).toBe(90000)
    expect(bundle.summary.projectedSales).toBe(2790000)
    expect(bundle.summary.totalCostInclusion).toBe(1000)
  })

  it('前年サマリーがコピーされる', () => {
    const bundle = buildClipBundle(makeDefaultParams())

    expect(bundle.prevYear.hasPrevYear).toBe(true)
    expect(bundle.prevYear.totalSales).toBe(170000)
    expect(bundle.prevYear.totalCustomers).toBe(330)
    expect(bundle.prevYear.totalDiscount).toBe(-5000)
  })

  it('CTS レコードがシリアライズ形式に変換される', () => {
    const bundle = buildClipBundle(makeDefaultParams())

    expect(bundle.ctsRecords).toHaveLength(1)
    expect(bundle.ctsRecords[0].day).toBe(1)
    expect(bundle.ctsRecords[0].deptCode).toBe('01')
    expect(bundle.ctsRecords[0].deptName).toBe('Dept01')
    expect(bundle.ctsRecords[0].lineCode).toBe('01')
    expect(bundle.ctsRecords[0].lineName).toBe('Line01')
    expect(bundle.ctsRecords[0].klassCode).toBe('001')
    expect(bundle.ctsRecords[0].klassName).toBe('Class001')
    expect(bundle.ctsRecords[0].totalQuantity).toBe(50)
    expect(bundle.ctsRecords[0].totalAmount).toBe(100000)
    expect(bundle.ctsRecords[0].timeSlots).toHaveLength(1)
    expect(bundle.ctsRecords[0].timeSlots[0].hour).toBe(10)
    expect(bundle.ctsRecords[0].timeSlots[0].quantity).toBe(50)
    expect(bundle.ctsRecords[0].timeSlots[0].amount).toBe(100000)
  })

  it('前年 CTS レコードもシリアライズされる', () => {
    const bundle = buildClipBundle(makeDefaultParams())

    expect(bundle.ctsPrevRecords).toHaveLength(1)
    expect(bundle.ctsPrevRecords[0].totalQuantity).toBe(45)
    expect(bundle.ctsPrevRecords[0].totalAmount).toBe(95000)
  })
})

describe('buildClipBundle — decomposition', () => {
  it('有効な前年データがあればシャープリー分解が生成される', () => {
    const bundle = buildClipBundle(makeDefaultParams())

    expect(bundle.decomposition).not.toBeNull()
    const d = bundle.decomposition!
    expect(d.curSales).toBe(180000)
    expect(d.prevSales).toBe(170000)
    expect(d.curCustomers).toBe(350)
    expect(d.prevCustomers).toBe(330)
    expect(d.curTotalQty).toBe(50)
    expect(d.prevTotalQty).toBe(45)
  })

  it('decompose2 の恒等式: custEffect + ticketEffect = curSales - prevSales', () => {
    const bundle = buildClipBundle(makeDefaultParams())
    const d = bundle.decomposition!

    const salesDiff = d.curSales - d.prevSales
    const sum = d.decompose2.custEffect + d.decompose2.ticketEffect

    expect(Math.abs(sum - salesDiff)).toBeLessThan(1e-10)
  })

  it('decompose3 の恒等式: custEffect + qtyEffect + pricePerItemEffect = curSales - prevSales', () => {
    const bundle = buildClipBundle(makeDefaultParams())
    const d = bundle.decomposition!

    expect(d.decompose3).not.toBeNull()
    const d3 = d.decompose3!
    const salesDiff = d.curSales - d.prevSales
    const sum = d3.custEffect + d3.qtyEffect + d3.pricePerItemEffect

    expect(Math.abs(sum - salesDiff)).toBeLessThan(1e-10)
  })

  it('decompose5 の恒等式: custEffect + qtyEffect + priceEffect + mixEffect = curSales - prevSales', () => {
    const bundle = buildClipBundle(makeDefaultParams())
    const d = bundle.decomposition!

    expect(d.decompose5).not.toBeNull()
    const d5 = d.decompose5!
    const salesDiff = d.curSales - d.prevSales
    const sum = d5.custEffect + d5.qtyEffect + d5.priceEffect + d5.mixEffect

    expect(Math.abs(sum - salesDiff)).toBeLessThan(1e-10)
  })

  it('prevSales が 0 のとき decomposition は null', () => {
    const bundle = buildClipBundle(
      makeDefaultParams({
        prevYear: makePrevYearData({ totalSales: 0 }),
      }),
    )

    expect(bundle.decomposition).toBeNull()
  })

  it('prevCustomers が 0 のとき decomposition は null', () => {
    const bundle = buildClipBundle(
      makeDefaultParams({
        prevYear: makePrevYearData({ totalCustomers: 0 }),
      }),
    )

    expect(bundle.decomposition).toBeNull()
  })

  it('curCustomers が 0 のとき decomposition は null', () => {
    const bundle = buildClipBundle(
      makeDefaultParams({
        result: makeStoreResult({ totalCustomers: 0 }),
      }),
    )

    expect(bundle.decomposition).toBeNull()
  })

  it('CTS レコードの数量が 0 のとき decompose3/5 は null', () => {
    const bundle = buildClipBundle(
      makeDefaultParams({
        ctsRecords: [makeCtsRecord(1, '01', 0, 0)],
        ctsPrevRecords: [makeCtsRecord(1, '01', 0, 0)],
      }),
    )

    expect(bundle.decomposition).not.toBeNull()
    expect(bundle.decomposition!.decompose2).toBeDefined()
    expect(bundle.decomposition!.decompose3).toBeNull()
    expect(bundle.decomposition!.decompose5).toBeNull()
  })

  it('当年 CTS 数量が 0、前年が非 0 でも decompose3/5 は null', () => {
    const bundle = buildClipBundle(
      makeDefaultParams({
        ctsRecords: [makeCtsRecord(1, '01', 0, 0)],
        ctsPrevRecords: [makeCtsRecord(1, '01', 45, 95000)],
      }),
    )

    expect(bundle.decomposition).not.toBeNull()
    expect(bundle.decomposition!.decompose3).toBeNull()
    expect(bundle.decomposition!.decompose5).toBeNull()
  })
})

describe('buildClipBundle — month edge cases', () => {
  it('2月（28日）の daysInMonth が正しい', () => {
    const bundle = buildClipBundle(makeDefaultParams({ year: 2025, month: 2 }))

    expect(bundle.daysInMonth).toBe(28)
    expect(bundle.daily).toHaveLength(28)
  })

  it('閏年2月（29日）の daysInMonth が正しい', () => {
    const bundle = buildClipBundle(makeDefaultParams({ year: 2024, month: 2 }))

    expect(bundle.daysInMonth).toBe(29)
    expect(bundle.daily).toHaveLength(29)
  })

  it('12月の daysInMonth が正しい', () => {
    const bundle = buildClipBundle(makeDefaultParams({ year: 2025, month: 12 }))

    expect(bundle.daysInMonth).toBe(31)
    expect(bundle.daily).toHaveLength(31)
  })
})

describe('buildClipBundle — empty data', () => {
  it('前年データなしの場合', () => {
    const emptyPrev = makePrevYearData({
      hasPrevYear: false,
      source: 'disabled' as const,
      daily: new Map(),
      totalSales: 0,
      totalCustomers: 0,
      totalDiscount: 0,
      grossSales: 0,
      discountRate: 0,
    })

    const bundle = buildClipBundle(makeDefaultParams({ prevYear: emptyPrev }))

    expect(bundle.prevYear.hasPrevYear).toBe(false)
    expect(bundle.prevYearDaily).toHaveLength(0)
    expect(bundle.decomposition).toBeNull()
  })

  it('CTS レコードが空の場合', () => {
    const bundle = buildClipBundle(
      makeDefaultParams({
        ctsRecords: [],
        ctsPrevRecords: [],
      }),
    )

    expect(bundle.ctsRecords).toHaveLength(0)
    expect(bundle.ctsPrevRecords).toHaveLength(0)
    // decompose2 は CTS 不要なので生成される
    expect(bundle.decomposition).not.toBeNull()
    expect(bundle.decomposition!.decompose2).toBeDefined()
    // decompose3/5 は qty=0 なので null
    expect(bundle.decomposition!.decompose3).toBeNull()
    expect(bundle.decomposition!.decompose5).toBeNull()
  })

  it('日別データが空の StoreResult', () => {
    const result = makeStoreResult({ daily: new Map() })
    const bundle = buildClipBundle(makeDefaultParams({ result }))

    // 全日が 0 で埋められる
    expect(bundle.daily).toHaveLength(31)
    for (const entry of bundle.daily) {
      expect(entry.sales).toBe(0)
      expect(entry.customers).toBe(0)
      expect(entry.totalCost).toBe(0)
    }
  })

  it('予算日別データが空のとき budget は 0', () => {
    const result = makeStoreResult({ budgetDaily: new Map() })
    const bundle = buildClipBundle(makeDefaultParams({ result }))

    for (const entry of bundle.daily) {
      expect(entry.budget).toBe(0)
    }
  })
})

describe('buildClipBundle — multiple CTS records', () => {
  it('複数 CTS レコードが正しくシリアライズされる', () => {
    const ctsRecords: CategoryTimeSalesRecord[] = [
      makeCtsRecord(1, '01', 30, 60000),
      makeCtsRecord(1, '02', 20, 40000),
      makeCtsRecord(2, '01', 25, 50000),
    ]

    const bundle = buildClipBundle(makeDefaultParams({ ctsRecords }))

    expect(bundle.ctsRecords).toHaveLength(3)
    expect(bundle.ctsRecords[0].deptCode).toBe('01')
    expect(bundle.ctsRecords[1].deptCode).toBe('02')
    expect(bundle.ctsRecords[2].day).toBe(2)
  })

  it('CTS レコードの timeSlots が複数ある場合も正しくコピーされる', () => {
    const record: CategoryTimeSalesRecord = {
      year: 2025,
      month: 1,
      day: 1,
      storeId: '1',
      department: { code: '01', name: 'Dept01' },
      line: { code: '01', name: 'Line01' },
      klass: { code: '001', name: 'Class001' },
      timeSlots: [
        { hour: 9, quantity: 10, amount: 20000 },
        { hour: 10, quantity: 15, amount: 30000 },
        { hour: 11, quantity: 20, amount: 40000 },
      ],
      totalQuantity: 45,
      totalAmount: 90000,
    }

    const bundle = buildClipBundle(makeDefaultParams({ ctsRecords: [record] }))

    expect(bundle.ctsRecords[0].timeSlots).toHaveLength(3)
    expect(bundle.ctsRecords[0].timeSlots[0].hour).toBe(9)
    expect(bundle.ctsRecords[0].timeSlots[1].hour).toBe(10)
    expect(bundle.ctsRecords[0].timeSlots[2].hour).toBe(11)
    expect(bundle.ctsRecords[0].timeSlots[0].quantity).toBe(10)
    expect(bundle.ctsRecords[0].timeSlots[2].amount).toBe(40000)
  })
})

describe('buildClipBundle — discount handling', () => {
  it('日別の discount が DailyRecord.discountAmount から取得される', () => {
    const daily = new Map<number, DailyRecord>()
    daily.set(1, {
      ...makeDailyRecord(1, 100000, 200),
      discountAmount: -1500,
    })

    const result = makeStoreResult({ daily })
    const bundle = buildClipBundle(makeDefaultParams({ result }))

    expect(bundle.daily[0].discount).toBe(-1500)
  })

  it('日別の totalCost が DailyRecord.totalCost から取得される', () => {
    const daily = new Map<number, DailyRecord>()
    daily.set(1, {
      ...makeDailyRecord(1, 100000, 200),
      totalCost: 75000,
    })

    const result = makeStoreResult({ daily })
    const bundle = buildClipBundle(makeDefaultParams({ result }))

    expect(bundle.daily[0].totalCost).toBe(75000)
  })
})
