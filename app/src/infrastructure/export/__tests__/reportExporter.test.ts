import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { Store } from '@/domain/models/Store'
import type { Explanation, MetricUnit } from '@/domain/models/Explanation'

// Mock exportToCsv to capture the rows
vi.mock('../csvExporter', () => ({
  exportToCsv: vi.fn(),
}))

import { exportToCsv } from '../csvExporter'
import {
  exportDailySalesReport,
  exportStoreKpiReport,
  exportMonthlyPLReport,
  exportExplanationReport,
  exportTextSummaryReport,
} from '../reportExporter'

type Row = (string | number | null)[]

const mockExportToCsv = vi.mocked(exportToCsv)

function getLastCallRows(): Row[] {
  const lastCall = mockExportToCsv.mock.calls[mockExportToCsv.mock.calls.length - 1]
  return lastCall[0] as Row[]
}

function getLastCallOptions(): { filename: string } {
  const lastCall = mockExportToCsv.mock.calls[mockExportToCsv.mock.calls.length - 1]
  return lastCall[1] as { filename: string }
}

function makeDailyMap(): ReadonlyMap<
  number,
  {
    sales: number
    purchase: { cost: number; price: number }
    customers: number
    discountAmount: number
  }
> {
  return new Map([
    [
      1,
      {
        sales: 10000,
        purchase: { cost: 7000, price: 8000 },
        customers: 50,
        discountAmount: 200,
      },
    ],
    [
      2,
      {
        sales: 12000,
        purchase: { cost: 8000, price: 9500 },
        customers: 0,
        discountAmount: 100,
      },
    ],
  ])
}

function makeStoreResult(overrides: Partial<StoreResult> = {}): StoreResult {
  return {
    storeId: 'S001',
    openingInventory: 100000,
    closingInventory: 90000,
    productInventory: 85000,
    costInclusionInventory: 5000,
    inventoryDate: '2025/1/1',
    closingInventoryDay: null,
    budget: 500000,
    grossProfitBudget: 100000,
    budgetDaily: new Map(),
    totalSales: 22000,
    totalCoreSales: 20000,
    totalDiscount: 300,
    totalCustomers: 50,
    totalCostInclusion: 1000,
    discountEntries: [],
    daily: makeDailyMap() as StoreResult['daily'],
    categoryTotals: new Map(),
    supplierTotals: new Map(),
    transferDetails: {
      interStoreIn: { cost: 0, price: 0 },
      interStoreOut: { cost: 0, price: 0 },
      interDepartmentIn: { cost: 0, price: 0 },
      interDepartmentOut: { cost: 0, price: 0 },
    },
    purchaseMaxDay: 2,
    hasDiscountData: true,
    elapsedDays: 2,
    salesDays: 2,
    grossSales: 22300,
    deliverySalesPrice: 0,
    flowerSalesPrice: 0,
    directProduceSalesPrice: 0,
    totalCost: 15000,
    inventoryCost: 15000,
    deliverySalesCost: 0,
    invMethodCogs: 25000,
    invMethodGrossProfit: -3000,
    invMethodGrossProfitRate: -0.136,
    estMethodCogs: 14000,
    estMethodMargin: 8000,
    estMethodMarginRate: 0.364,
    estMethodClosingInventory: 91000,
    discountRate: 0.013,
    discountLossCost: 200,
    averageMarkupRate: 0.3,
    coreMarkupRate: 0.32,
    costInclusionRate: 0.045,
    averageCustomersPerDay: 25,
    grossProfitRateBudget: 0.2,
    averageDailySales: 11000,
    projectedSales: 341000,
    projectedAchievement: 0.682,
    budgetAchievementRate: 0.044,
    budgetProgressRate: 0.67,
    budgetElapsedRate: 0.065,
    budgetProgressGap: 0.605,
    budgetVariance: -478000,
    requiredDailySales: 17000,
    remainingBudget: 478000,
    dailyCumulative: new Map(),
    ...overrides,
  } as StoreResult
}

beforeEach(() => {
  mockExportToCsv.mockClear()
})

describe('exportDailySalesReport', () => {
  it('generates daily sales rows with header and summary', () => {
    const result = makeStoreResult()
    const store: Store = { id: 'S001', code: 'S001', name: 'テスト店' }

    exportDailySalesReport(result, store, 2025, 1)

    expect(mockExportToCsv).toHaveBeenCalledTimes(1)
    const rows = getLastCallRows()

    // Header row
    expect(rows[0]).toEqual([
      '日',
      '売上',
      '仕入(売価)',
      '仕入(原価)',
      '粗利(推定)',
      '客数',
      '売変額',
      '客単価',
    ])

    // Day 1 row (customers=50 > 0, so txValue = round(10000/50) = 200)
    expect(rows[1][0]).toBe(1)
    expect(rows[1][1]).toBe(10000)
    expect(rows[1][2]).toBe(8000)
    expect(rows[1][3]).toBe(7000)
    expect(rows[1][4]).toBe(3000) // sales - cost = 10000 - 7000
    expect(rows[1][5]).toBe(50)
    expect(rows[1][6]).toBe(200)
    expect(rows[1][7]).toBe(200) // 10000/50

    // Day 2 row (customers=0, so txValue = null)
    expect(rows[2][5]).toBe(0)
    expect(rows[2][7]).toBeNull()

    // Summary row
    const lastRow = rows[rows.length - 1]
    expect(lastRow[0]).toBe('合計')
    expect(lastRow[1]).toBe(22000)
  })

  it('uses "全店" when store is null', () => {
    const result = makeStoreResult()

    exportDailySalesReport(result, null, 2025, 1)

    const options = getLastCallOptions()
    expect(options.filename).toContain('全店')
  })

  it('includes store name in filename', () => {
    const result = makeStoreResult()
    const store: Store = { id: 'S001', code: 'S001', name: '北店' }

    exportDailySalesReport(result, store, 2025, 3)

    const options = getLastCallOptions()
    expect(options.filename).toBe('日別売上_北店_2025年3月')
  })

  it('handles null customers in summary', () => {
    const result = makeStoreResult({ totalCustomers: undefined as unknown as number })

    exportDailySalesReport(result, null, 2025, 1)

    // Should not throw
    expect(mockExportToCsv).toHaveBeenCalledTimes(1)
  })
})

describe('exportStoreKpiReport', () => {
  it('generates store KPI rows with header', () => {
    const storeResults = new Map<string, StoreResult>([['S001', makeStoreResult()]])
    const stores = new Map<string, Store>([
      ['S001', { id: 'S001', code: 'S001', name: 'テスト店' }],
    ])

    exportStoreKpiReport(storeResults, stores, 2025, 1)

    expect(mockExportToCsv).toHaveBeenCalledTimes(1)
    const rows = getLastCallRows()
    expect(rows[0][0]).toBe('店舗ID')
    expect(rows[1][0]).toBe('S001')
    expect(rows[1][1]).toBe('テスト店')
    expect(rows[1][2]).toBe(22000) // totalSales
  })

  it('uses storeId as name when store not found', () => {
    const storeResults = new Map<string, StoreResult>([
      ['S999', makeStoreResult({ storeId: 'S999' })],
    ])
    const stores = new Map<string, Store>()

    exportStoreKpiReport(storeResults, stores, 2025, 1)

    const rows = getLastCallRows()
    expect(rows[1][1]).toBe('S999')
  })

  it('handles null values for rates', () => {
    const result = makeStoreResult({
      budgetAchievementRate: 0,
      invMethodGrossProfit: null,
      invMethodGrossProfitRate: null,
      estMethodMargin: undefined as unknown as number,
      estMethodMarginRate: undefined as unknown as number,
      totalCustomers: 0,
      averageDailySales: 0,
      projectedSales: 0,
    })
    const storeResults = new Map([['S001', result]])
    const stores = new Map<string, Store>()

    exportStoreKpiReport(storeResults, stores, 2025, 6)

    expect(mockExportToCsv).toHaveBeenCalledTimes(1)
    const options = getLastCallOptions()
    expect(options.filename).toBe('店舗別KPI_2025年6月')
  })

  it('calculates txValue correctly when customers > 0', () => {
    const result = makeStoreResult({ totalSales: 100000, totalCustomers: 200 })
    const storeResults = new Map([['S001', result]])
    const stores = new Map<string, Store>()

    exportStoreKpiReport(storeResults, stores, 2025, 1)

    const rows = getLastCallRows()
    // txValue = round(100000 / 200) = 500
    expect(rows[1][10]).toBe(500)
  })

  it('returns null txValue when customers is 0', () => {
    const result = makeStoreResult({ totalSales: 100000, totalCustomers: 0 })
    const storeResults = new Map([['S001', result]])
    const stores = new Map<string, Store>()

    exportStoreKpiReport(storeResults, stores, 2025, 1)

    const rows = getLastCallRows()
    expect(rows[1][10]).toBeNull()
  })
})

describe('exportMonthlyPLReport', () => {
  it('generates P&L rows', () => {
    const result = makeStoreResult()
    const store: Store = { id: 'S001', code: 'S001', name: 'テスト店' }

    exportMonthlyPLReport(result, store, 2025, 1)

    expect(mockExportToCsv).toHaveBeenCalledTimes(1)
    const rows = getLastCallRows()
    expect(rows[0]).toEqual(['項目', '金額', '備考'])
    expect(rows[1][0]).toBe('売上高')
    expect(rows[1][1]).toBe(22000)
  })

  it('formats rates as percentage strings', () => {
    const result = makeStoreResult({
      invMethodGrossProfitRate: 0.256,
      estMethodMarginRate: 0.364,
      budgetAchievementRate: 0.89,
      budgetProgressRate: 0.67,
      projectedAchievement: 0.95,
    })

    exportMonthlyPLReport(result, null, 2025, 1)

    const rows = getLastCallRows()
    // Find the row with 粗利率(在庫法)
    const gpRateRow = rows.find((r) => r[0] === '粗利率(在庫法)')
    expect(gpRateRow).toBeDefined()
    expect(gpRateRow![1]).toBe('25.60%')
  })

  it('handles null inventory values', () => {
    const result = makeStoreResult({
      openingInventory: null,
      closingInventory: null,
      invMethodCogs: null,
      invMethodGrossProfit: null,
      invMethodGrossProfitRate: null,
    })

    exportMonthlyPLReport(result, null, 2025, 1)

    const rows = getLastCallRows()
    const openingRow = rows.find((r) => r[0] === '期首棚卸高')
    expect(openingRow![1]).toBeNull()
  })

  it('uses "全店" when store is null', () => {
    const result = makeStoreResult()

    exportMonthlyPLReport(result, null, 2025, 1)

    const options = getLastCallOptions()
    expect(options.filename).toContain('全店')
  })

  it('includes store name in filename', () => {
    const result = makeStoreResult()
    const store: Store = { id: 'S001', code: 'S001', name: '南店' }

    exportMonthlyPLReport(result, store, 2025, 12)

    const options = getLastCallOptions()
    expect(options.filename).toBe('月次PL_南店_2025年12月')
  })

  it('handles zero budget achievement rate', () => {
    const result = makeStoreResult({
      budgetAchievementRate: 0,
      budgetProgressRate: 0,
      projectedAchievement: 0,
    })

    exportMonthlyPLReport(result, null, 2025, 1)

    const rows = getLastCallRows()
    const achievementRow = rows.find((r) => r[0] === '予算達成率')
    // 0 is falsy so it returns null
    expect(achievementRow![1]).toBeNull()
  })
})

describe('exportExplanationReport', () => {
  function makeExplanation(overrides: Partial<Explanation> = {}): Explanation {
    return {
      metric: 'salesTotal',
      title: '売上合計',
      formula: 'sum(daily sales)',
      value: 1000000,
      unit: 'yen' as MetricUnit,
      scope: { storeId: 'S001', year: 2025, month: 1 },
      inputs: [{ name: '日次売上', value: 1000000, unit: 'yen' as MetricUnit }],
      evidenceRefs: [],
      ...overrides,
    }
  }

  it('generates explanation rows', () => {
    const explanations = new Map<string, Explanation>([['salesTotal', makeExplanation()]])

    exportExplanationReport(explanations, 'テスト店', 2025, 1)

    expect(mockExportToCsv).toHaveBeenCalledTimes(1)
    const rows = getLastCallRows()
    expect(rows[0]).toEqual(['指標名', '値', '単位', '計算式', '入力値一覧'])
    expect(rows[1][0]).toBe('売上合計')
    expect(rows[1][1]).toBe(1000000) // rounded yen value
    expect(rows[1][2]).toBe('円')
  })

  it('formats rate values as percentage', () => {
    const explanations = new Map<string, Explanation>([
      [
        'invMethodGrossProfitRate',
        makeExplanation({
          metric: 'invMethodGrossProfitRate',
          title: '粗利率',
          value: 0.256,
          unit: 'rate',
          inputs: [],
        }),
      ],
    ])

    exportExplanationReport(explanations, 'テスト店', 2025, 1)

    const rows = getLastCallRows()
    expect(rows[1][1]).toBe(25.6) // value * 100, toFixed(2)
    expect(rows[1][2]).toBe('%')
  })

  it('formats count values as-is', () => {
    const explanations = new Map<string, Explanation>([
      [
        'totalCustomers',
        makeExplanation({
          metric: 'totalCustomers',
          title: '客数',
          value: 150,
          unit: 'count',
          inputs: [],
        }),
      ],
    ])

    exportExplanationReport(explanations, 'テスト店', 2025, 1)

    const rows = getLastCallRows()
    expect(rows[1][1]).toBe(150)
    expect(rows[1][2]).toBe('件')
  })

  it('formats yen inputs in formatInputsList', () => {
    const explanations = new Map<string, Explanation>([
      [
        'salesTotal',
        makeExplanation({
          inputs: [{ name: '売上', value: 123456, unit: 'yen' }],
        }),
      ],
    ])

    exportExplanationReport(explanations, 'テスト店', 2025, 1)

    const rows = getLastCallRows()
    const inputsStr = rows[1][4] as string
    expect(inputsStr).toContain('売上=')
    expect(inputsStr).toContain('123,456')
  })

  it('formats rate inputs as percentage in formatInputsList', () => {
    const explanations = new Map<string, Explanation>([
      [
        'test',
        makeExplanation({
          inputs: [{ name: '粗利率', value: 0.256, unit: 'rate' }],
        }),
      ],
    ])

    exportExplanationReport(explanations, 'テスト店', 2025, 1)

    const rows = getLastCallRows()
    const inputsStr = rows[1][4] as string
    expect(inputsStr).toContain('粗利率=25.60%')
  })

  it('formats count inputs with locale in formatInputsList', () => {
    const explanations = new Map<string, Explanation>([
      [
        'test',
        makeExplanation({
          inputs: [{ name: '客数', value: 1234, unit: 'count' }],
        }),
      ],
    ])

    exportExplanationReport(explanations, 'テスト店', 2025, 1)

    const rows = getLastCallRows()
    const inputsStr = rows[1][4] as string
    expect(inputsStr).toContain('客数=')
  })

  it('joins multiple inputs with semicolon', () => {
    const explanations = new Map<string, Explanation>([
      [
        'test',
        makeExplanation({
          inputs: [
            { name: 'A', value: 100, unit: 'yen' },
            { name: 'B', value: 200, unit: 'yen' },
          ],
        }),
      ],
    ])

    exportExplanationReport(explanations, 'テスト店', 2025, 1)

    const rows = getLastCallRows()
    const inputsStr = rows[1][4] as string
    expect(inputsStr).toContain('; ')
  })

  it('sets correct filename', () => {
    const explanations = new Map<string, Explanation>()

    exportExplanationReport(explanations, '本店', 2025, 6)

    const options = getLastCallOptions()
    expect(options.filename).toBe('指標説明_本店_2025年6月')
  })
})

describe('exportTextSummaryReport', () => {
  it('generates text summary rows', () => {
    exportTextSummaryReport('テスト要約文', 'テスト店', 2025, 1)

    expect(mockExportToCsv).toHaveBeenCalledTimes(1)
    const rows = getLastCallRows()
    expect(rows[0]).toEqual(['店舗', '年', '月', 'テキスト要約'])
    expect(rows[1]).toEqual(['テスト店', 2025, 1, 'テスト要約文'])
  })

  it('sets correct filename', () => {
    exportTextSummaryReport('要約', '全店', 2025, 12)

    const options = getLastCallOptions()
    expect(options.filename).toBe('テキスト要約_全店_2025年12月')
  })

  it('handles empty summary text', () => {
    exportTextSummaryReport('', '店舗A', 2025, 3)

    const rows = getLastCallRows()
    expect(rows[1][3]).toBe('')
  })
})
