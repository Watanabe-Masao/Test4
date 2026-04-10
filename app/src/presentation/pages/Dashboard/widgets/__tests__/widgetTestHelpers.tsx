/**
 * ウィジェットテスト用ヘルパー
 *
 * モック WidgetContext / StoreResult / PrevYearData を構築し、
 * ThemeProvider でラップしたレンダー関数を提供する。
 */
import type { ReactElement } from 'react'
import { ThemeProvider } from 'styled-components'
import { render } from '@testing-library/react'
import { darkTheme } from '@/presentation/theme'
import { EMPTY_DEPT_KPI_INDEX } from '@/application/usecases/departmentKpi/indexBuilder'
import type { WidgetContext } from '../types'
import type { StoreExplanations } from '@/domain/models/analysis'
import type { DailyRecord, CostPricePair } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import { ZERO_DISCOUNT_ENTRIES } from '@/domain/models/record'
import type { PrevYearData, PrevYearDailyEntry } from '@/application/hooks/analytics'
import { formatCurrency } from '@/domain/formatting'

const ZERO: CostPricePair = { cost: 0, price: 0 }

/** 最小限の DailyRecord を作成 */
export function makeDailyRecord(
  overrides: Partial<DailyRecord> & { day: number; sales: number },
): DailyRecord {
  const defaults: DailyRecord = {
    day: overrides.day,
    sales: overrides.sales,
    coreSales: overrides.sales,
    grossSales: overrides.sales,
    totalCost: 0,
    purchase: ZERO,
    deliverySales: ZERO,
    interStoreIn: ZERO,
    interStoreOut: ZERO,
    interDepartmentIn: ZERO,
    interDepartmentOut: ZERO,
    flowers: ZERO,
    directProduce: ZERO,
    costInclusion: { cost: 0, items: [] },
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
  return { ...defaults, ...overrides }
}

/** 最小限の StoreResult を作成 */
export function makeStoreResult(overrides: Partial<StoreResult> = {}): StoreResult {
  const defaults: StoreResult = {
    storeId: '1',
    openingInventory: null,
    closingInventory: null,
    productInventory: null,
    costInclusionInventory: null,
    inventoryDate: null,
    closingInventoryDay: null,
    totalSales: 100000,
    totalCoreSales: 90000,
    deliverySalesPrice: 0,
    flowerSalesPrice: 0,
    directProduceSalesPrice: 0,
    grossSales: 100000,
    totalCost: 70000,
    inventoryCost: 70000,
    deliverySalesCost: 0,
    invMethodCogs: null,
    invMethodGrossProfit: null,
    invMethodGrossProfitRate: null,
    estMethodCogs: 70000,
    estMethodMargin: 20000,
    estMethodMarginRate: 0.22,
    estMethodClosingInventory: null,
    totalCustomers: 0,
    transactionValue: 0,
    averageCustomersPerDay: 0,
    totalDiscount: 2000,
    discountRate: 0.02,
    discountEntries: [],
    discountLossCost: 1500,
    averageMarkupRate: 0.25,
    coreMarkupRate: 0.26,
    totalCostInclusion: 1000,
    costInclusionRate: 0.01,
    budget: 3000000,
    grossProfitBudget: 750000,
    grossProfitRateBudget: 0.25,
    budgetDaily: new Map(),
    daily: new Map(),
    categoryTotals: new Map(),
    supplierTotals: new Map(),
    transferDetails: {
      interStoreIn: ZERO,
      interStoreOut: ZERO,
      interDepartmentIn: ZERO,
      interDepartmentOut: ZERO,
      netTransfer: ZERO,
    },
    purchaseMaxDay: 15,
    hasDiscountData: true,
    elapsedDays: 15,
    salesDays: 10,
    averageDailySales: 10000,
    projectedSales: 3100000,
    projectedAchievement: 1.03,
    budgetAchievementRate: 0.5,
    budgetProgressRate: 1.0,
    budgetElapsedRate: 0.5,
    budgetProgressGap: 0.5,
    budgetVariance: 0,
    requiredDailySales: 0,
    remainingBudget: 1500000,
    dailyCumulative: new Map(),
    grossProfitBudgetVariance: 0,
    grossProfitProgressGap: 0,
    requiredDailyGrossProfit: 0,
    projectedGrossProfit: 0,
    projectedGPAchievement: 0,
    observationPeriod: {
      lastRecordedSalesDay: 15,
      elapsedDays: 15,
      salesDays: 10,
      daysInMonth: 30,
      remainingDays: 15,
      status: 'ok' as const,
      warnings: [],
    },
    metricWarnings: new Map(),
  }
  return { ...defaults, ...overrides }
}

/** 空の PrevYearData */
export function makeEmptyPrevYear(): PrevYearData {
  return {
    hasPrevYear: false,
    source: 'disabled',
    daily: new Map(),
    totalSales: 0,
    totalDiscount: 0,
    totalCustomers: 0,
    totalCtsQuantity: 0,
    grossSales: 0,
    discountRate: 0,
    totalDiscountEntries: ZERO_DISCOUNT_ENTRIES,
  }
}

/** 前年データ付き PrevYearData */
export function makePrevYear(
  daily: Map<string, PrevYearDailyEntry>,
  overrides: Partial<PrevYearData> = {},
): PrevYearData {
  let totalSales = 0
  let totalDiscount = 0
  let totalCustomers = 0
  for (const entry of daily.values()) {
    totalSales += entry.sales
    totalDiscount += entry.discount
    totalCustomers += entry.customers
  }
  const grossSales = totalSales + totalDiscount
  const discountRate = totalSales > 0 ? totalDiscount / totalSales : 0
  return {
    hasPrevYear: true,
    source: 'loaded',
    daily,
    totalSales,
    totalDiscount,
    totalCustomers,
    totalCtsQuantity: 0,
    grossSales,
    discountRate,
    totalDiscountEntries: ZERO_DISCOUNT_ENTRIES,
    ...overrides,
  }
}

/** readModels モックを result.totalCustomers から導出 */
function makeReadModels(totalCustomers: number): WidgetContext['readModels'] {
  return {
    customerFact: {
      status: 'ready' as const,
      data: {
        grandTotalCustomers: totalCustomers,
        daily: [],
        meta: { usedFallback: false, missingPolicy: 'zero' as const, dataVersion: 1 },
      },
    },
    purchaseCost: { status: 'idle' as const },
    salesFact: { status: 'idle' as const },
    discountFact: { status: 'idle' as const },
    allReady: false,
    anyLoading: false,
    anyError: false,
  }
}

/** 最小限の WidgetContext を作成 */
export function makeWidgetContext(overrides: Partial<WidgetContext> = {}): WidgetContext {
  const result = overrides.result ?? makeStoreResult()
  return {
    result,
    daysInMonth: 28,
    targetRate: 0.25,
    warningRate: 0.23,
    year: 2026,
    month: 2,
    settings: {
      targetYear: 2026,
      targetMonth: 2,
      dataEndDay: null,
      defaultMarkupRate: 0.3,
      defaultBudget: 0,
      targetGrossProfitRate: 0.25,
      warningThreshold: 0.23,
      storeLocations: {},
    } as WidgetContext['settings'],
    storeKey: '1',
    prevYear: makeEmptyPrevYear(),
    allStoreResults: new Map(),
    stores: new Map(),
    currentDateRange: {
      from: { year: 2026, month: 2, day: 1 },
      to: { year: 2026, month: 2, day: 28 },
    },
    prevYearScope: undefined,
    selectedStoreIds: new Set(),
    dataEndDay: null,
    dataMaxDay: 0,
    elapsedDays: undefined,
    departmentKpi: EMPTY_DEPT_KPI_INDEX,
    explanations: new Map() as StoreExplanations,
    onExplain: () => {},
    monthlyHistory: [],
    queryExecutor: { isReady: false, execute: async () => null },
    duckDataVersion: 0,
    loadedMonthCount: 0,
    weatherPersist: null,
    prevYearMonthlyKpi: {
      hasPrevYear: false,
      sameDow: {
        sales: 0,
        customers: 0,
        transactionValue: 0,
        ctsQuantity: 0,
        dailyMapping: [],
        storeContributions: [],
      },
      sameDate: {
        sales: 0,
        customers: 0,
        transactionValue: 0,
        ctsQuantity: 0,
        dailyMapping: [],
        storeContributions: [],
      },
      sourceYear: 0,
      sourceMonth: 0,
      dowOffset: 0,
      monthlyTotal: { sales: 0, customers: 0, transactionValue: 0, ctsQuantity: 0 },
    },
    dowGap: {
      dowCounts: Array.from({ length: 7 }, (_, i) => ({
        dow: i,
        label: ['日', '月', '火', '水', '木', '金', '土'][i],
        currentCount: 0,
        previousCount: 0,
        diff: 0,
      })),
      estimatedImpact: 0,
      isValid: false,
      prevDowDailyAvg: [0, 0, 0, 0, 0, 0, 0],
      prevDowDailyAvgCustomers: [0, 0, 0, 0, 0, 0, 0],
      hasPrevDowSales: false,
      isSameStructure: true,
      missingDataWarnings: [],
    },
    onPrevYearDetail: () => {},
    fmtCurrency: formatCurrency,
    observationStatus: 'ok' as const,
    comparisonScope: {
      period1: { from: { year: 2026, month: 2, day: 1 }, to: { year: 2026, month: 2, day: 28 } },
      period2: { from: { year: 2025, month: 2, day: 1 }, to: { year: 2025, month: 2, day: 28 } },
      preset: 'prevYearSameDow' as const,
      alignmentMode: 'sameDayOfWeek' as const,
      dowOffset: 0,
      effectivePeriod1: {
        from: { year: 2026, month: 2, day: 1 },
        to: { year: 2026, month: 2, day: 28 },
      },
      effectivePeriod2: {
        from: { year: 2025, month: 2, day: 1 },
        to: { year: 2025, month: 2, day: 28 },
      },
      queryRanges: [
        { year: 2025, month: 1 },
        { year: 2025, month: 2 },
        { year: 2025, month: 3 },
      ],
      alignmentMap: [],
      sourceMonth: { year: 2025, month: 2 },
    },
    currentCtsQuantity: { total: 0, byStore: new Map(), byDay: new Map(), byStoreDay: new Map() },
    readModels: makeReadModels(result.totalCustomers),
    ...overrides,
  }
}

/** ThemeProvider でラップしてレンダー */
export function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}
