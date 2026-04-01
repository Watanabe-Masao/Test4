/**
 * ExplanationService のユニットテスト
 *
 * StoreResult から各指標の Explanation を生成する機能を検証する。
 * 計算を再実行せず、StoreResult の値をそのまま使うことを確認。
 */
import { describe, it, expect } from 'vitest'
import {
  generateExplanations,
  generateTextSummary,
  generateMetricSummary,
} from '../ExplanationService'
import { calculateStoreResult } from '@/application/usecases/calculation/CalculationOrchestrator'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'
import { createDefaultSettings } from '@/domain/constants/defaults'
import type { Explanation } from '@/domain/models/analysis'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { StoreResult, AppSettings } from '@/domain/models/storeTypes'

const DEFAULT_SETTINGS: AppSettings = {
  ...createDefaultSettings(),
  targetYear: 2025,
  targetMonth: 1,
}

function makeCSRecord(
  day: number,
  storeId: string,
  salesAmount: number,
  d71 = 0,
  d72 = 0,
  d73 = 0,
  d74 = 0,
) {
  return {
    year: 2025,
    month: 1,
    day,
    storeId,
    storeName: `Store ${storeId}`,
    groupName: 'G',
    departmentName: 'D',
    lineName: 'L',
    className: 'C',
    salesAmount,
    discount71: d71,
    discount72: d72,
    discount73: d73,
    discount74: d74,
  }
}

function buildTestData(overrides: Partial<MonthlyData> = {}): MonthlyData {
  return {
    ...createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }),
    stores: new Map([['1', { id: '1', code: '0001', name: '店舗A' }]]),
    ...overrides,
  }
}

/** CalculationOrchestrator 経由で StoreResult を生成するヘルパー */
function makeStoreResult(data: MonthlyData, settings = DEFAULT_SETTINGS): StoreResult {
  return calculateStoreResult('1', data, settings, 28)
}

// ─── generateExplanations ──────────────────────────────────

describe('generateExplanations', () => {
  it('基本: 全主要指標の Explanation が生成される', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 10000, price: 13000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    // 売上系
    expect(explanations.has('salesTotal')).toBe(true)
    expect(explanations.has('coreSales')).toBe(true)
    expect(explanations.has('grossSales')).toBe(true)
    // 原価系
    expect(explanations.has('purchaseCost')).toBe(true)
    expect(explanations.has('inventoryCost')).toBe(true)
    expect(explanations.has('deliverySalesCost')).toBe(true)
    // 売変系
    expect(explanations.has('discountTotal')).toBe(true)
    expect(explanations.has('discountRate')).toBe(true)
    expect(explanations.has('discountLossCost')).toBe(true)
    // 値入率
    expect(explanations.has('averageMarkupRate')).toBe(true)
    expect(explanations.has('coreMarkupRate')).toBe(true)
    // 推定法
    expect(explanations.has('estMethodCogs')).toBe(true)
    expect(explanations.has('estMethodMargin')).toBe(true)
    expect(explanations.has('estMethodMarginRate')).toBe(true)
    // 客数・消耗品
    expect(explanations.has('totalCustomers')).toBe(true)
    expect(explanations.has('totalCostInclusion')).toBe(true)
    // 予算系
    expect(explanations.has('budget')).toBe(true)
    expect(explanations.has('budgetAchievementRate')).toBe(true)
    expect(explanations.has('budgetProgressRate')).toBe(true)
    expect(explanations.has('projectedSales')).toBe(true)
    expect(explanations.has('remainingBudget')).toBe(true)
  })

  it('値が StoreResult と一致する（計算を再実行していない）', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: { '001': { name: 'A', cost: 30000, price: 40000 } },
            total: { cost: 30000, price: 40000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 80000, 5000)] },
      flowers: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000 }],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    expect(explanations.get('salesTotal')!.value).toBe(result.totalSales)
    expect(explanations.get('coreSales')!.value).toBe(result.totalCoreSales)
    expect(explanations.get('grossSales')!.value).toBe(result.grossSales)
    expect(explanations.get('purchaseCost')!.value).toBe(result.totalCost)
    expect(explanations.get('discountTotal')!.value).toBe(result.totalDiscount)
    expect(explanations.get('discountRate')!.value).toBe(result.discountRate)
    expect(explanations.get('averageMarkupRate')!.value).toBe(result.averageMarkupRate)
    expect(explanations.get('coreMarkupRate')!.value).toBe(result.coreMarkupRate)
    expect(explanations.get('estMethodCogs')!.value).toBe(result.estMethodCogs)
    expect(explanations.get('budget')!.value).toBe(result.budget)
  })

  it('在庫法: 在庫設定ありで在庫法指標が含まれる', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 50000, price: 65000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 80000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 100000,
            closingInventory: 120000,
            grossProfitBudget: null,
            productInventory: null,
            costInclusionInventory: null,
            inventoryDate: null,
            closingInventoryDay: null,
          },
        ],
      ]),
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    expect(explanations.has('invMethodCogs')).toBe(true)
    expect(explanations.has('invMethodGrossProfit')).toBe(true)
    expect(explanations.has('invMethodGrossProfitRate')).toBe(true)
    expect(explanations.get('invMethodCogs')!.value).toBe(result.invMethodCogs)
  })

  it('在庫法: 在庫設定なしで在庫法指標が含まれない', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    expect(explanations.has('invMethodCogs')).toBe(false)
    expect(explanations.has('invMethodGrossProfit')).toBe(false)
    expect(explanations.has('invMethodGrossProfitRate')).toBe(false)
  })

  it('推定期末在庫: 期首在庫ありの場合のみ含まれる', () => {
    const dataWith = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 50000, price: 65000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 80000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 100000,
            closingInventory: null,
            grossProfitBudget: null,
            productInventory: null,
            costInclusionInventory: null,
            inventoryDate: null,
            closingInventoryDay: null,
          },
        ],
      ]),
    })
    const resultWith = makeStoreResult(dataWith)
    const explWith = generateExplanations(resultWith, dataWith, DEFAULT_SETTINGS)
    expect(explWith.has('estMethodClosingInventory')).toBe(true)

    const dataWithout = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const resultWithout = makeStoreResult(dataWithout)
    const explWithout = generateExplanations(resultWithout, dataWithout, DEFAULT_SETTINGS)
    expect(explWithout.has('estMethodClosingInventory')).toBe(false)
  })

  it('formula が全指標で非空文字列', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 10000, price: 13000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 100000,
            closingInventory: 120000,
            grossProfitBudget: null,
            productInventory: null,
            costInclusionInventory: null,
            inventoryDate: null,
            closingInventoryDay: null,
          },
        ],
      ]),
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    for (const [, expl] of explanations) {
      expect(expl.formula.length).toBeGreaterThan(0)
    }
  })

  it('inputs の参照先 MetricId が実在する（指標間ナビゲーション整合性）', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 30000, price: 40000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 80000, 3000)] },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000, customers: 30 },
        ],
      },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 100000,
            closingInventory: 120000,
            grossProfitBudget: null,
            productInventory: null,
            costInclusionInventory: null,
            inventoryDate: null,
            closingInventoryDay: null,
          },
        ],
      ]),
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const allMetricIds = new Set(explanations.keys())
    for (const [metricId, expl] of explanations) {
      for (const input of expl.inputs) {
        if (input.metric) {
          expect(
            allMetricIds.has(input.metric),
            `${metricId} の input "${input.name}" が参照する metric "${input.metric}" が存在しない`,
          ).toBe(true)
        }
      }
    }
  })

  it('breakdown の日別内訳が日昇順でソートされている', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 5,
            storeId: '1',
            suppliers: {},
            total: { cost: 10000, price: 13000 },
          },
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 20000, price: 26000 },
          },
          {
            year: 2025,
            month: 1,
            day: 10,
            storeId: '1',
            suppliers: {},
            total: { cost: 30000, price: 39000 },
          },
        ],
      },
      classifiedSales: {
        records: [
          makeCSRecord(5, '1', 15000),
          makeCSRecord(1, '1', 30000),
          makeCSRecord(10, '1', 45000),
        ],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const salesExpl = explanations.get('salesTotal')!
    expect(salesExpl.breakdown).toBeDefined()
    const days = salesExpl.breakdown!.map((b) => b.day)
    expect(days).toEqual([1, 5, 10])
  })

  it('breakdown の日別売上合計が月間合計と一致', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [makeCSRecord(1, '1', 30000), makeCSRecord(5, '1', 20000)],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const salesExpl = explanations.get('salesTotal')!
    const breakdownTotal = salesExpl.breakdown!.reduce((sum, b) => sum + b.value, 0)
    expect(breakdownTotal).toBe(result.totalSales)
  })

  it('scope に正しい年月・店舗IDが設定される', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const expl = explanations.get('salesTotal')!
    expect(expl.scope.storeId).toBe('1')
    expect(expl.scope.year).toBe(2025)
    expect(expl.scope.month).toBe(1)
  })

  it('deliverySalesCost の inputs に正しい値が設定される', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 80000)] },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000, customers: 30 },
        ],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 5000, cost: 4000 }],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const expl = explanations.get('deliverySalesCost')!
    // inputs は1つだけ: 売上納品原価の合計値
    expect(expl.inputs).toHaveLength(1)
    expect(expl.inputs[0].value).toBe(result.deliverySalesCost)
  })

  it('purchaseCost の breakdown 日別合計が totalCost と一致する', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: { '001': { name: 'A', cost: 30000, price: 40000 } },
            total: { cost: 30000, price: 40000 },
          },
          {
            year: 2025,
            month: 1,
            day: 5,
            storeId: '1',
            suppliers: { '002': { name: 'B', cost: 20000, price: 25000 } },
            total: { cost: 20000, price: 25000 },
          },
        ],
      },
      classifiedSales: {
        records: [makeCSRecord(1, '1', 50000), makeCSRecord(5, '1', 40000)],
      },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', price: 5000, cost: 3000, customers: 20 },
        ],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const purchaseExpl = explanations.get('purchaseCost')!
    expect(purchaseExpl.breakdown).toBeDefined()
    const breakdownTotal = purchaseExpl.breakdown!.reduce((sum, b) => sum + b.value, 0)
    expect(breakdownTotal).toBe(result.totalCost)
  })

  it('inventoryCost の breakdown 日別合計が inventoryCost と一致する', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: { '001': { name: 'A', cost: 30000, price: 40000 } },
            total: { cost: 30000, price: 40000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', price: 5000, cost: 3000, customers: 20 },
        ],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const invCostExpl = explanations.get('inventoryCost')!
    expect(invCostExpl.breakdown).toBeDefined()
    const breakdownTotal = invCostExpl.breakdown!.reduce((sum, b) => sum + b.value, 0)
    expect(breakdownTotal).toBe(result.inventoryCost)
  })
})

// ─── generateTextSummary ──────────────────────────────────

describe('generateTextSummary', () => {
  it('基本要約: 売上額が含まれる', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 30000, price: 40000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 1000000)] },
    })
    const result = makeStoreResult(data)
    const summary = generateTextSummary(result)

    expect(summary).toContain('当月売上')
    expect(summary).toContain('1,000,000')
    expect(summary).toContain('粗利率')
  })

  it('前年比較ありで前年比が含まれる', () => {
    const dataThis = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 110000)] },
    })
    const dataPrev = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
    })
    const resultThis = makeStoreResult(dataThis)
    const resultPrev = makeStoreResult(dataPrev)
    const summary = generateTextSummary(resultThis, { prevYearResult: resultPrev })

    expect(summary).toContain('前年比')
  })

  it('予算ありで達成率が含まれる', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 500000)] },
      budget: new Map([['1', { storeId: '1', total: 6000000, daily: new Map() }]]),
    })
    const result = makeStoreResult(data)
    const summary = generateTextSummary(result)

    expect(summary).toContain('予算達成率')
  })

  it('高売変率（>5%）で注意事項が含まれる', () => {
    // 売変率 = 30000 / (50000 + 30000) = 37.5%
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000, 30000)] },
    })
    const result = makeStoreResult(data)
    const summary = generateTextSummary(result)

    expect(summary).toContain('注意')
    expect(summary).toContain('売変率')
  })

  it('客数ありの前年比較で客数・客単価が含まれる', () => {
    const dataThis = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 110000)] },
      flowers: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 0, cost: 0, customers: 50 }],
      },
    })
    const dataPrev = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      flowers: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 0, cost: 0, customers: 40 }],
      },
    })
    const resultThis = makeStoreResult(dataThis)
    const resultPrev = makeStoreResult(dataPrev)
    const summary = generateTextSummary(resultThis, { prevYearResult: resultPrev })

    expect(summary).toContain('客数')
    expect(summary).toContain('客単価')
  })
})

// ─── generateMetricSummary ──────────────────────────────────

describe('generateMetricSummary', () => {
  it('金額指標のフォーマット', () => {
    const expl: Explanation = {
      metric: 'salesTotal',
      title: '総売上高',
      formula: '総売上高 = Σ 日別売上高',
      value: 12345678,
      unit: 'yen',
      scope: { storeId: '1', year: 2025, month: 1 },
      inputs: [],
      evidenceRefs: [],
    }
    const summary = generateMetricSummary(expl)
    expect(summary).toContain('総売上高')
    expect(summary).toContain('12,345,678円')
    expect(summary).toContain('計算式')
  })

  it('率指標のフォーマット', () => {
    const expl: Explanation = {
      metric: 'discountRate',
      title: '売変率',
      formula: '売変率 = 売変額 ÷ (売上 + 売変額)',
      value: 0.0523,
      unit: 'rate',
      scope: { storeId: '1', year: 2025, month: 1 },
      inputs: [],
      evidenceRefs: [],
    }
    const summary = generateMetricSummary(expl)
    expect(summary).toContain('売変率')
    expect(summary).toContain('5.2%')
  })

  it('件数指標のフォーマット', () => {
    const expl: Explanation = {
      metric: 'totalCustomers',
      title: '来店客数',
      formula: '来店客数 = Σ 日別客数',
      value: 1234,
      unit: 'count',
      scope: { storeId: '1', year: 2025, month: 1 },
      inputs: [],
      evidenceRefs: [],
    }
    const summary = generateMetricSummary(expl)
    expect(summary).toContain('来店客数')
    expect(summary).toContain('1,234')
  })
})
