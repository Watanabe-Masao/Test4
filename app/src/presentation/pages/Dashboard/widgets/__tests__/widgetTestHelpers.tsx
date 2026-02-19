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
import type { WidgetContext } from '../types'
import type { StoreResult, DailyRecord, CostPricePair } from '@/domain/models'
import type { PrevYearData, PrevYearDailyEntry } from '@/application/hooks'

const ZERO: CostPricePair = { cost: 0, price: 0 }

/** 最小限の DailyRecord を作成 */
export function makeDailyRecord(overrides: Partial<DailyRecord> & { day: number; sales: number }): DailyRecord {
  return {
    coreSales: overrides.coreSales ?? overrides.sales,
    grossSales: overrides.grossSales ?? overrides.sales,
    purchase: overrides.purchase ?? ZERO,
    deliverySales: overrides.deliverySales ?? ZERO,
    interStoreIn: overrides.interStoreIn ?? ZERO,
    interStoreOut: overrides.interStoreOut ?? ZERO,
    interDepartmentIn: overrides.interDepartmentIn ?? ZERO,
    interDepartmentOut: overrides.interDepartmentOut ?? ZERO,
    flowers: overrides.flowers ?? ZERO,
    directProduce: overrides.directProduce ?? ZERO,
    consumable: overrides.consumable ?? { cost: 0, items: [] },
    discountAmount: overrides.discountAmount ?? 0,
    discountAbsolute: overrides.discountAbsolute ?? 0,
    supplierBreakdown: overrides.supplierBreakdown ?? new Map(),
    transferBreakdown: overrides.transferBreakdown ?? {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
    ...overrides,
  }
}

/** 最小限の StoreResult を作成 */
export function makeStoreResult(overrides: Partial<StoreResult> = {}): StoreResult {
  const defaults: StoreResult = {
    storeId: '1',
    openingInventory: null,
    closingInventory: null,
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
    averageCustomersPerDay: 0,
    totalDiscount: 2000,
    discountRate: 0.02,
    discountLossCost: 1500,
    averageMarkupRate: 0.25,
    coreMarkupRate: 0.26,
    totalConsumable: 1000,
    consumableRate: 0.01,
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
    elapsedDays: 15,
    salesDays: 10,
    averageDailySales: 10000,
    projectedSales: 3100000,
    projectedAchievement: 1.03,
    budgetAchievementRate: 0.5,
    budgetProgressRate: 1.0,
    remainingBudget: 1500000,
    dailyCumulative: new Map(),
  }
  return { ...defaults, ...overrides }
}

/** 空の PrevYearData */
export function makeEmptyPrevYear(): PrevYearData {
  return {
    hasPrevYear: false,
    daily: new Map(),
    totalSales: 0,
    totalDiscount: 0,
    totalCustomers: 0,
  }
}

/** 前年データ付き PrevYearData */
export function makePrevYear(
  daily: Map<number, PrevYearDailyEntry>,
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
  return {
    hasPrevYear: true,
    daily,
    totalSales,
    totalDiscount,
    totalCustomers,
    ...overrides,
  }
}

/** 最小限の WidgetContext を作成 */
export function makeWidgetContext(overrides: Partial<WidgetContext> = {}): WidgetContext {
  return {
    result: makeStoreResult(),
    daysInMonth: 28,
    targetRate: 0.25,
    warningRate: 0.23,
    year: 2026,
    month: 2,
    budgetChartData: [],
    storeKey: '1',
    prevYear: makeEmptyPrevYear(),
    allStoreResults: new Map(),
    stores: new Map(),
    categoryTimeSales: { records: [] },
    selectedStoreIds: new Set(),
    ...overrides,
  }
}

/** ThemeProvider でラップしてレンダー */
export function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    ),
  })
}
