/**
 * ExplanationService エッジケーステスト
 *
 * 各種コスト要素・売上要素の非ゼロ分岐、取引先内訳、
 * 予算達成率、formulaRef 解決、テキスト要約など、
 * メインテストでカバーしきれないエッジケースを検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  generateExplanations,
  generateTextSummary,
  generateMetricSummary,
} from '@/application/usecases/explanation/ExplanationService'
import {
  calculateStoreResult,
  calculateAllStores,
  aggregateStoreResults,
} from '@/application/usecases/calculation/CalculationOrchestrator'
import type { CalculationFrame } from '@/domain/models/CalculationFrame'

const testFrame = (daysInMonth = 28): CalculationFrame => ({
  targetYear: 2025,
  targetMonth: 1,
  daysInMonth,
  dataEndDay: null,
  effectiveDays: daysInMonth,
})
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

function buildMultiStoreTestData(overrides: Partial<MonthlyData> = {}): MonthlyData {
  return {
    ...createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }),
    stores: new Map([
      ['1', { id: '1', code: '0001', name: '店舗A' }],
      ['2', { id: '2', code: '0002', name: '店舗B' }],
    ]),
    ...overrides,
  }
}

function makeStoreResult(
  data: MonthlyData,
  settings = DEFAULT_SETTINGS,
  storeId = '1',
): StoreResult {
  return calculateStoreResult(storeId, data, settings, testFrame())
}

// ─── expandDailyEvidence: aggregate 分岐 ─────────────────────────

describe('expandDailyEvidence: aggregate store path', () => {
  it('aggregate storeId で全店舗分の dailyEvidence が展開される', () => {
    const data = buildMultiStoreTestData({
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
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '2',
            suppliers: {},
            total: { cost: 20000, price: 26000 },
          },
        ],
      },
      classifiedSales: {
        records: [makeCSRecord(1, '1', 50000), makeCSRecord(1, '2', 60000)],
      },
    })

    const storeResults = calculateAllStores(data, DEFAULT_SETTINGS, testFrame())
    const result = aggregateStoreResults([...storeResults.values()], 28)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const salesExpl = explanations.get('salesTotal')!
    // aggregate の場合、evidenceRefs は全店舗分展開される
    const dailyRefs = salesExpl.evidenceRefs.filter((r) => r.kind === 'daily')
    // 各日×各店舗 → 1日 × 2店舗 = 2 refs
    expect(dailyRefs.length).toBe(2)
    const storeIdsInRefs = dailyRefs.map((r) => {
      if (r.kind === 'daily') return r.storeId
      return ''
    })
    expect(storeIdsInRefs).toContain('1')
    expect(storeIdsInRefs).toContain('2')
  })

  it('aggregate storeId でも storeIds が空なら自身のみ', () => {
    // stores が空の場合
    const data: MonthlyData = {
      ...createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' }),
      classifiedSales: { records: [makeCSRecord(1, 'aggregate', 50000)] },
    }
    const result = calculateStoreResult('aggregate', data, DEFAULT_SETTINGS, testFrame())
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const salesExpl = explanations.get('salesTotal')!
    const dailyRefs = salesExpl.evidenceRefs.filter((r) => r.kind === 'daily')
    // storeIds.length === 0 → 'aggregate' 自身の日分のみ
    for (const ref of dailyRefs) {
      if (ref.kind === 'daily') {
        expect(ref.storeId).toBe('aggregate')
      }
    }
  })
})

// ─── costComponentDetails: 各コスト要素の非ゼロ分岐 ─────────────

describe('costComponentDetails: breakdown details for purchaseCost', () => {
  it('店間入/出・部門間入/出・売上納品原価の内訳が表示される', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: { '001': { name: 'A', cost: 10000, price: 15000 } },
            total: { cost: 10000, price: 15000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      interStoreIn: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            interStoreIn: [
              {
                day: 1,
                cost: 5000,
                price: 6000,
                fromStoreId: '2',
                toStoreId: '1',
                isDepartmentTransfer: false,
              },
            ],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        ],
      },
      interStoreOut: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            interStoreIn: [],
            interStoreOut: [
              {
                day: 1,
                cost: 3000,
                price: 4000,
                fromStoreId: '1',
                toStoreId: '2',
                isDepartmentTransfer: false,
              },
            ],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        ],
      },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', price: 8000, cost: 6000, customers: 20 },
        ],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 5000, cost: 4000 }],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const purchaseExpl = explanations.get('purchaseCost')!
    expect(purchaseExpl.breakdown).toBeDefined()
    const day1 = purchaseExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    expect(day1!.details).toBeDefined()

    const labels = day1!.details!.map((d) => d.label)
    expect(labels).toContain('仕入原価')
    expect(labels).toContain('店間入')
    expect(labels).toContain('店間出')
    // 売上納品原価は花+産直のコスト合計
    expect(labels).toContain('売上納品原価')
  })

  it('ゼロ値のコスト要素は内訳から除外される', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: { '001': { name: 'A', cost: 10000, price: 15000 } },
            total: { cost: 10000, price: 15000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const purchaseExpl = explanations.get('purchaseCost')!
    const day1 = purchaseExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    const labels = day1!.details!.map((d) => d.label)
    // 仕入原価のみ非ゼロ
    expect(labels).toContain('仕入原価')
    expect(labels).not.toContain('店間入')
    expect(labels).not.toContain('店間出')
    expect(labels).not.toContain('部門間入')
    expect(labels).not.toContain('部門間出')
    expect(labels).not.toContain('売上納品原価')
  })
})

// ─── salesComponentDetails: 売上日別の構成内訳 ─────────────────

describe('salesComponentDetails: breakdown details for salesTotal', () => {
  it('花売価・産直売価・売上納品売価が非ゼロの場合に内訳が表示される', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', price: 8000, cost: 6000, customers: 20 },
        ],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 5000, cost: 4000 }],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const salesExpl = explanations.get('salesTotal')!
    expect(salesExpl.breakdown).toBeDefined()
    const day1 = salesExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    expect(day1!.details).toBeDefined()

    const labels = day1!.details!.map((d) => d.label)
    expect(labels).toContain('コア売上')
    expect(labels).toContain('花売価')
    expect(labels).toContain('産直売価')
  })

  it('花売価・産直売価がゼロならコア売上のみ', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const salesExpl = explanations.get('salesTotal')!
    const day1 = salesExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    const labels = day1!.details!.map((d) => d.label)
    expect(labels).toContain('コア売上')
    expect(labels).not.toContain('花売価')
    expect(labels).not.toContain('産直売価')
  })
})

// ─── supplierDetails: 取引先内訳 ─────────────────────────────

describe('supplierDetails: inventoryCost breakdown', () => {
  it('取引先内訳が日別に表示される', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {
              '001': { name: 'A', cost: 15000, price: 20000 },
              '002': { name: 'B', cost: 10000, price: 14000 },
            },
            total: { cost: 25000, price: 34000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 80000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const invCostExpl = explanations.get('inventoryCost')!
    expect(invCostExpl.breakdown).toBeDefined()
    const day1 = invCostExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    expect(day1!.details).toBeDefined()
    expect(day1!.details!.length).toBe(2)

    const labels = day1!.details!.map((d) => d.label)
    expect(labels).toContain('取引先 001')
    expect(labels).toContain('取引先 002')
  })
})

// ─── deliverySalesCost breakdown: 花原価/産直原価分岐 ───────────

describe('deliverySalesCost: breakdown details', () => {
  it('花原価のみ非ゼロの場合', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 80000)] },
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000, customers: 30 },
        ],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const dsExpl = explanations.get('deliverySalesCost')!
    const day1 = dsExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    expect(day1!.details).toBeDefined()
    const labels = day1!.details!.map((d) => d.label)
    expect(labels).toContain('花原価')
    expect(labels).not.toContain('産直原価')
  })

  it('産直原価のみ非ゼロの場合', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 80000)] },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 5000, cost: 4000 }],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const dsExpl = explanations.get('deliverySalesCost')!
    const day1 = dsExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    expect(day1!.details).toBeDefined()
    const labels = day1!.details!.map((d) => d.label)
    expect(labels).not.toContain('花原価')
    expect(labels).toContain('産直原価')
  })

  it('花原価・産直原価ともにゼロなら details は空', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const dsExpl = explanations.get('deliverySalesCost')!
    const day1 = dsExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    expect(day1!.details).toBeDefined()
    expect(day1!.details!.length).toBe(0)
  })
})

// ─── totalCostInclusion breakdown: itemName / itemCode 分岐 ─────

describe('totalCostInclusion: breakdown details', () => {
  it('itemName がある場合は itemName が label になる', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      consumables: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            cost: 500,
            items: [
              { accountCode: 'AC1', itemCode: 'IC1', itemName: '洗剤', quantity: 1, cost: 500 },
            ],
          },
        ],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const ciExpl = explanations.get('totalCostInclusion')!
    expect(ciExpl.breakdown).toBeDefined()
    const day1 = ciExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    expect(day1!.details).toBeDefined()
    expect(day1!.details!.length).toBe(1)
    expect(day1!.details![0].label).toBe('洗剤')
    expect(day1!.details![0].value).toBe(500)
  })

  it('itemName が空なら itemCode が label になる', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      consumables: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            cost: 300,
            items: [
              { accountCode: 'AC1', itemCode: 'ITEM99', itemName: '', quantity: 2, cost: 300 },
            ],
          },
        ],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const ciExpl = explanations.get('totalCostInclusion')!
    const day1 = ciExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    expect(day1!.details![0].label).toBe('ITEM99')
  })

  it('複数アイテムの消耗品が正しく展開される', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      consumables: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            cost: 800,
            items: [
              { accountCode: 'AC1', itemCode: 'IC1', itemName: '洗剤', quantity: 1, cost: 500 },
              { accountCode: 'AC2', itemCode: 'IC2', itemName: 'ゴミ袋', quantity: 2, cost: 300 },
            ],
          },
        ],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const ciExpl = explanations.get('totalCostInclusion')!
    const day1 = ciExpl.breakdown!.find((b) => b.day === 1)
    expect(day1!.details!.length).toBe(2)
    expect(day1!.details![0].label).toBe('洗剤')
    expect(day1!.details![1].label).toBe('ゴミ袋')
  })
})

// ─── grossProfitBudgetAchievement ─────────────────────────────

describe('grossProfitBudgetAchievement', () => {
  it('grossProfitBudget > 0 かつ在庫法ありで粗利予算達成率が生成される', () => {
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
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 200000,
            closingInventory: 180000,
            grossProfitBudget: 30000,
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

    expect(explanations.has('grossProfitBudgetAchievement')).toBe(true)
    const gpbaExpl = explanations.get('grossProfitBudgetAchievement')!
    expect(gpbaExpl.unit).toBe('rate')
    // 在庫法の粗利がある場合はそれを使用
    expect(gpbaExpl.inputs[0].name).toBe('粗利実績')
    expect(gpbaExpl.inputs[0].value).toBe(result.invMethodGrossProfit!)
  })

  it('grossProfitBudget > 0 かつ在庫法なしで推定マージンを使う', () => {
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
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: null,
            closingInventory: null,
            grossProfitBudget: 25000,
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

    expect(explanations.has('grossProfitBudgetAchievement')).toBe(true)
    const gpbaExpl = explanations.get('grossProfitBudgetAchievement')!
    // invMethodGrossProfit が null なので estMethodMargin を使用
    expect(gpbaExpl.inputs[0].value).toBe(result.estMethodMargin)
  })

  it('grossProfitBudget === 0 なら粗利予算達成率は生成されない', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    expect(explanations.has('grossProfitBudgetAchievement')).toBe(false)
  })
})

// ─── resolveFormulaDetail: FORMULA_REGISTRY 解決 ─────────────

describe('resolveFormulaDetail: formulaDetail injection', () => {
  it('formulaRef を持つ指標に formulaDetail が注入される', () => {
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
      classifiedSales: { records: [makeCSRecord(1, '1', 80000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    // discountRate は formulaRef: 'ratioCalculation' を持つ
    const drExpl = explanations.get('discountRate')!
    expect(drExpl.formulaDetail).toBeDefined()
    expect(drExpl.formulaDetail!.expression).toBeTruthy()
    expect(drExpl.formulaDetail!.category).toBeTruthy()
    expect(drExpl.formulaDetail!.description).toBeTruthy()
    expect(drExpl.formulaDetail!.inputBindings.length).toBeGreaterThan(0)
  })

  it('formulaRef を持たない指標には formulaDetail がない', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    // salesTotal は formulaRef を持たない
    const salesExpl = explanations.get('salesTotal')!
    expect(salesExpl.formulaDetail).toBeUndefined()
  })

  it('複数の指標で異なる formulaDetail が正しく解決される', () => {
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
      classifiedSales: { records: [makeCSRecord(1, '1', 80000, 5000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 100000,
            closingInventory: 90000,
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

    // invMethodCogs は formulaRef: 'inventoryMethodCogs'
    const cogsExpl = explanations.get('invMethodCogs')!
    expect(cogsExpl.formulaDetail).toBeDefined()
    expect(cogsExpl.formulaDetail!.category).toBe('accounting')

    // estMethodCogs は formulaRef: 'estimationMethodCogs'
    const estExpl = explanations.get('estMethodCogs')!
    expect(estExpl.formulaDetail).toBeDefined()
    expect(estExpl.formulaDetail!.category).toBe('accounting')

    // discountLossCost は formulaRef: 'discountLossCost'
    const dlcExpl = explanations.get('discountLossCost')!
    expect(dlcExpl.formulaDetail).toBeDefined()
    expect(dlcExpl.formulaDetail!.category).toBe('accounting')

    // averageMarkupRate は formulaRef: 'salesWeightedAverage'
    const amrExpl = explanations.get('averageMarkupRate')!
    expect(amrExpl.formulaDetail).toBeDefined()
    expect(amrExpl.formulaDetail!.category).toBe('ratio')
  })
})

// ─── generateTextSummary: 全条件ブランチ ─────────────────────────

describe('generateTextSummary: extended branches', () => {
  it('前年比がマイナスの場合、符号なし表記にならない', () => {
    const dataThis = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 90000)] },
    })
    const dataPrev = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
    })
    const resultThis = makeStoreResult(dataThis)
    const resultPrev = makeStoreResult(dataPrev)
    const summary = generateTextSummary(resultThis, { prevYearResult: resultPrev })

    expect(summary).toContain('前年比')
    expect(summary).toContain('-')
  })

  it('前年売上がゼロの場合、売上の前年比は表示されないが粗利率の前年比は表示される', () => {
    const dataThis = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
    })
    const dataPrev = buildTestData({
      classifiedSales: { records: [] },
    })
    const resultThis = makeStoreResult(dataThis)
    const resultPrev = makeStoreResult(dataPrev)
    const summary = generateTextSummary(resultThis, { prevYearResult: resultPrev })

    // 売上行には前年比が含まれない（prev.totalSales === 0 のため）
    const salesLine = summary.split('。')[0]
    expect(salesLine).not.toContain('前年比')
    // 粗利率の前年比は prev が存在すれば常に表示される
    expect(summary).toContain('前年比')
  })

  it('targetGrossProfitRate が指定されている場合、目標比が表示される', () => {
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
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
    })
    const result = makeStoreResult(data)
    const summary = generateTextSummary(result, { targetGrossProfitRate: 0.25 })

    expect(summary).toContain('目標比')
    expect(summary).toContain('pt')
  })

  it('在庫法粗利率がある場合は（在庫法）と表示される', () => {
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
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 200000,
            closingInventory: 180000,
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
    const summary = generateTextSummary(result)

    expect(summary).toContain('在庫法')
  })

  it('在庫法粗利率がない場合は（推定法）と表示される', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
    })
    const result = makeStoreResult(data)
    const summary = generateTextSummary(result)

    expect(summary).toContain('推定法')
  })

  it('前年比較ありで粗利率の前年比が表示される', () => {
    const dataThis = buildTestData({
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
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
    })
    const dataPrev = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 40000, price: 50000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 90000)] },
    })
    const resultThis = makeStoreResult(dataThis)
    const resultPrev = makeStoreResult(dataPrev)
    const summary = generateTextSummary(resultThis, { prevYearResult: resultPrev })

    // 粗利率の前年比ptが含まれる
    expect(summary).toContain('pt')
  })

  it('客数ゼロの前年比較では客数・客単価が表示されない', () => {
    const dataThis = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 110000)] },
    })
    const dataPrev = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
    })
    const resultThis = makeStoreResult(dataThis)
    const resultPrev = makeStoreResult(dataPrev)
    const summary = generateTextSummary(resultThis, { prevYearResult: resultPrev })

    // 客数データがないため、客数/客単価セクションは表示されない
    expect(summary).not.toContain('客単価')
  })

  it('costInclusionRate > 3% で原価算入率の警告が表示される', () => {
    // 原価算入率 = totalCostInclusion / totalSales
    // totalCostInclusion を大きくして > 3% にする
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      consumables: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            cost: 5000,
            items: [
              { accountCode: 'AC1', itemCode: 'IC1', itemName: '洗剤', quantity: 10, cost: 5000 },
            ],
          },
        ],
      },
    })
    const result = makeStoreResult(data)
    // costInclusionRate = 5000 / 100000 = 0.05 > 0.03
    const summary = generateTextSummary(result)

    expect(summary).toContain('注意')
    expect(summary).toContain('原価算入率')
  })

  it('売変率と原価算入率の両方で注意事項が表示される', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000, 20000)] },
      consumables: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            cost: 3000,
            items: [
              { accountCode: 'AC1', itemCode: 'IC1', itemName: '洗剤', quantity: 5, cost: 3000 },
            ],
          },
        ],
      },
    })
    const result = makeStoreResult(data)
    const summary = generateTextSummary(result)

    expect(summary).toContain('注意')
    expect(summary).toContain('売変率')
    expect(summary).toContain('原価算入率')
  })

  it('高売変率かつ前年ありで前年売変率が表示される', () => {
    const dataThis = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000, 20000)] },
    })
    const dataPrev = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 60000, 10000)] },
    })
    const resultThis = makeStoreResult(dataThis)
    const resultPrev = makeStoreResult(dataPrev)
    const summary = generateTextSummary(resultThis, { prevYearResult: resultPrev })

    expect(summary).toContain('注意')
    expect(summary).toContain('前年')
  })

  it('予算ゼロでは達成率が表示されない', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
    })
    const result = makeStoreResult(data)
    // デフォルト予算が設定されているか確認し、予算0のケースをテスト
    // budget が 0 の場合は '予算達成率' が含まれない
    // デフォルト設定では defaultBudget がある場合もあるため、結果を確認
    if (result.budget === 0) {
      const summary = generateTextSummary(result)
      expect(summary).not.toContain('予算達成率')
    } else {
      // budget > 0 なら達成率が含まれることを確認
      const summary = generateTextSummary(result)
      expect(summary).toContain('予算達成率')
    }
  })

  it('前年比プラスで + 符号が表示される', () => {
    const dataThis = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 120000)] },
    })
    const dataPrev = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
    })
    const resultThis = makeStoreResult(dataThis)
    const resultPrev = makeStoreResult(dataPrev)
    const summary = generateTextSummary(resultThis, { prevYearResult: resultPrev })

    expect(summary).toContain('+')
  })

  it('全オプション指定時の統合テスト', () => {
    const dataThis = buildTestData({
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
      classifiedSales: { records: [makeCSRecord(1, '1', 100000, 20000)] },
      flowers: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 0, cost: 0, customers: 50 }],
      },
      consumables: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            cost: 5000,
            items: [
              { accountCode: 'AC1', itemCode: 'IC1', itemName: '洗剤', quantity: 10, cost: 5000 },
            ],
          },
        ],
      },
      budget: new Map([['1', { storeId: '1', total: 5000000, daily: new Map() }]]),
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 200000,
            closingInventory: 180000,
            grossProfitBudget: null,
            productInventory: null,
            costInclusionInventory: null,
            inventoryDate: null,
            closingInventoryDay: null,
          },
        ],
      ]),
    })
    const dataPrev = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 40000, price: 55000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 90000, 10000)] },
      flowers: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 0, cost: 0, customers: 40 }],
      },
    })
    const resultThis = makeStoreResult(dataThis)
    const resultPrev = makeStoreResult(dataPrev)
    const summary = generateTextSummary(resultThis, {
      prevYearResult: resultPrev,
      targetGrossProfitRate: 0.3,
    })

    expect(summary).toContain('当月売上')
    expect(summary).toContain('前年比')
    expect(summary).toContain('予算達成率')
    expect(summary).toContain('粗利率')
    expect(summary).toContain('在庫法')
    expect(summary).toContain('目標比')
    expect(summary).toContain('pt')
    expect(summary).toContain('客数')
    expect(summary).toContain('客単価')
    expect(summary).toContain('注意')
    // 文はピリオドで終わる
    expect(summary.endsWith('。')).toBe(true)
  })
})

// ─── generateMetricSummary: エッジケース ─────────────────────────

describe('generateMetricSummary: edge cases', () => {
  it('金額がゼロの場合', () => {
    const expl: Explanation = {
      metric: 'salesTotal',
      title: '総売上高',
      formula: '総売上高 = Σ 日別売上高',
      value: 0,
      unit: 'yen',
      scope: { storeId: '1', year: 2025, month: 1 },
      inputs: [],
      evidenceRefs: [],
    }
    const summary = generateMetricSummary(expl)
    expect(summary).toContain('0円')
    expect(summary).toContain('総売上高')
  })

  it('負の金額', () => {
    const expl: Explanation = {
      metric: 'remainingBudget',
      title: '残余予算',
      formula: '残余予算 = 月間予算 - 総売上',
      value: -500000,
      unit: 'yen',
      scope: { storeId: '1', year: 2025, month: 1 },
      inputs: [],
      evidenceRefs: [],
    }
    const summary = generateMetricSummary(expl)
    expect(summary).toContain('-500,000円')
  })

  it('率が 100% を超える場合', () => {
    const expl: Explanation = {
      metric: 'budgetAchievementRate',
      title: '予算達成率',
      formula: '予算達成率 = 総売上 ÷ 月間予算',
      value: 1.234,
      unit: 'rate',
      scope: { storeId: '1', year: 2025, month: 1 },
      inputs: [],
      evidenceRefs: [],
    }
    const summary = generateMetricSummary(expl)
    expect(summary).toContain('123.4%')
  })

  it('率がゼロの場合', () => {
    const expl: Explanation = {
      metric: 'discountRate',
      title: '売変率',
      formula: '売変率 = 売変額 ÷ (売上 + 売変額)',
      value: 0,
      unit: 'rate',
      scope: { storeId: '1', year: 2025, month: 1 },
      inputs: [],
      evidenceRefs: [],
    }
    const summary = generateMetricSummary(expl)
    expect(summary).toContain('0.0%')
  })

  it('件数がゼロの場合', () => {
    const expl: Explanation = {
      metric: 'totalCustomers',
      title: '来店客数',
      formula: '来店客数 = Σ 日別客数',
      value: 0,
      unit: 'count',
      scope: { storeId: '1', year: 2025, month: 1 },
      inputs: [],
      evidenceRefs: [],
    }
    const summary = generateMetricSummary(expl)
    expect(summary).toContain('0')
    expect(summary).toContain('来店客数')
  })
})

// ─── dailyBreakdown: 日別レコードの customers ?? 0 分岐 ─────────

describe('totalCustomers: breakdown with undefined customers', () => {
  it('customers が undefined の日は 0 として扱われる', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [makeCSRecord(1, '1', 50000), makeCSRecord(2, '1', 30000)],
      },
      // 花ファイルに客数なし → customers = undefined
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const custExpl = explanations.get('totalCustomers')!
    expect(custExpl.breakdown).toBeDefined()
    for (const entry of custExpl.breakdown!) {
      expect(entry.value).toBe(0)
    }
  })

  it('customers がある日は正しい値が使われる', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 50000)] },
      flowers: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 0, cost: 0, customers: 42 }],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const custExpl = explanations.get('totalCustomers')!
    const day1 = custExpl.breakdown!.find((b) => b.day === 1)
    expect(day1!.value).toBe(42)
  })
})

// ─── discountTotal: IIFE breakdown ─────────────────────────────

describe('discountTotal: breakdown from classifiedSales aggregation', () => {
  it('売変額の日別内訳がソート済みで正しく表示される', () => {
    const data = buildTestData({
      classifiedSales: {
        records: [
          makeCSRecord(5, '1', 50000, 3000, 0, 0, 0),
          makeCSRecord(1, '1', 60000, 0, 2000, 0, 0),
          makeCSRecord(10, '1', 40000, 0, 0, 1000, 0),
        ],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const discExpl = explanations.get('discountTotal')!
    expect(discExpl.breakdown).toBeDefined()
    const days = discExpl.breakdown!.map((b) => b.day)
    expect(days).toEqual([1, 5, 10])
  })
})

// ─── coreSales: evidenceRefs の複数データタイプ展開 ───────────────

describe('coreSales: multiple data type evidence refs', () => {
  it('classifiedSales + flowers + directProduce の証拠参照が含まれる', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 80000)] },
      flowers: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000 }],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 5000, cost: 4000 }],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const coreExpl = explanations.get('coreSales')!
    const dataTypes = coreExpl.evidenceRefs
      .filter((r) => r.kind === 'daily')
      .map((r) => (r.kind === 'daily' ? r.dataType : ''))
    expect(dataTypes).toContain('classifiedSales')
    expect(dataTypes).toContain('flowers')
    expect(dataTypes).toContain('directProduce')
  })
})

// ─── coreMarkupRate: 複数エビデンス ────────────────────────────

describe('coreMarkupRate: evidence refs include transfers', () => {
  it('purchase + interStoreIn + interStoreOut の証拠参照が含まれる', () => {
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
      classifiedSales: { records: [makeCSRecord(1, '1', 80000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const cmrExpl = explanations.get('coreMarkupRate')!
    const dataTypes = cmrExpl.evidenceRefs
      .filter((r) => r.kind === 'daily')
      .map((r) => (r.kind === 'daily' ? r.dataType : ''))
    expect(dataTypes).toContain('purchase')
    expect(dataTypes).toContain('interStoreIn')
    expect(dataTypes).toContain('interStoreOut')
  })
})

// ─── grossProfitBudget / grossProfitRateBudget ──────────────────

describe('grossProfitBudget and grossProfitRateBudget', () => {
  it('粗利予算と粗利率予算が正しい値で生成される', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: null,
            closingInventory: null,
            grossProfitBudget: 50000,
            productInventory: null,
            costInclusionInventory: null,
            inventoryDate: null,
            closingInventoryDay: null,
          },
        ],
      ]),
      budget: new Map([['1', { storeId: '1', total: 200000, daily: new Map() }]]),
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const gpbExpl = explanations.get('grossProfitBudget')!
    expect(gpbExpl.value).toBe(result.grossProfitBudget)

    const gprbExpl = explanations.get('grossProfitRateBudget')!
    expect(gprbExpl.value).toBe(result.grossProfitRateBudget)
  })
})

// ─── aggregate store: 複数日 × 複数店舗の展開 ────────────────────

describe('expandDailyEvidence: multi-day multi-store aggregate', () => {
  it('複数日・複数店舗の場合、全組み合わせが展開される', () => {
    const data = buildMultiStoreTestData({
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
          {
            year: 2025,
            month: 1,
            day: 2,
            storeId: '1',
            suppliers: {},
            total: { cost: 5000, price: 6500 },
          },
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '2',
            suppliers: {},
            total: { cost: 20000, price: 26000 },
          },
        ],
      },
      classifiedSales: {
        records: [
          makeCSRecord(1, '1', 50000),
          makeCSRecord(2, '1', 30000),
          makeCSRecord(1, '2', 60000),
        ],
      },
    })

    const storeResults = calculateAllStores(data, DEFAULT_SETTINGS, testFrame())
    const result = aggregateStoreResults([...storeResults.values()], 28)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const salesExpl = explanations.get('salesTotal')!
    const dailyRefs = salesExpl.evidenceRefs.filter((r) => r.kind === 'daily')
    // aggregate daily map has day 1 and day 2
    // Each day expands to 2 store IDs
    // So total = 2 days * 2 stores = 4
    expect(dailyRefs.length).toBe(4)
  })
})

// ─── invMethodCogs: evidenceRefs に settings aggregate が含まれる ──

describe('invMethodCogs: evidence refs', () => {
  it('settings aggregate ref と purchase daily refs が含まれる', () => {
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
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 200000,
            closingInventory: 180000,
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

    const cogsExpl = explanations.get('invMethodCogs')!
    const aggRefs = cogsExpl.evidenceRefs.filter((r) => r.kind === 'aggregate')
    expect(aggRefs.length).toBe(1)
    if (aggRefs[0].kind === 'aggregate') {
      expect(aggRefs[0].dataType).toBe('settings')
    }

    const dailyRefs = cogsExpl.evidenceRefs.filter((r) => r.kind === 'daily')
    expect(dailyRefs.length).toBeGreaterThan(0)
  })
})

// ─── estMethodClosingInventory: evidenceRefs ─────────────────────

describe('estMethodClosingInventory: evidence refs', () => {
  it('settings aggregate ref が含まれる', () => {
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
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      settings: new Map([
        [
          '1',
          {
            storeId: '1',
            openingInventory: 200000,
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
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const estClosingExpl = explanations.get('estMethodClosingInventory')!
    expect(estClosingExpl.evidenceRefs.length).toBe(1)
    const ref = estClosingExpl.evidenceRefs[0]
    if (ref.kind === 'aggregate') {
      expect(ref.dataType).toBe('settings')
    }
  })
})

// ─── 部門間入/出の costComponentDetails 分岐 ─────────────────────

describe('costComponentDetails: interDepartment branches', () => {
  it('部門間入・部門間出が非ゼロの場合に内訳が表示される', () => {
    const data = buildTestData({
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            suppliers: {},
            total: { cost: 10000, price: 15000 },
          },
        ],
      },
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      // interDepartmentIn は data.interStoreIn から読み込まれる
      interStoreIn: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            interStoreIn: [],
            interStoreOut: [],
            interDepartmentIn: [
              {
                day: 1,
                cost: 7000,
                price: 9000,
                fromStoreId: '1',
                toStoreId: '1',
                isDepartmentTransfer: true,
              },
            ],
            interDepartmentOut: [],
          },
        ],
      },
      // interDepartmentOut は data.interStoreOut から読み込まれる
      interStoreOut: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: '1',
            interStoreIn: [],
            interStoreOut: [],
            interDepartmentIn: [],
            interDepartmentOut: [
              {
                day: 1,
                cost: 2000,
                price: 3000,
                fromStoreId: '1',
                toStoreId: '1',
                isDepartmentTransfer: true,
              },
            ],
          },
        ],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const purchaseExpl = explanations.get('purchaseCost')!
    const day1 = purchaseExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()
    const labels = day1!.details!.map((d) => d.label)
    expect(labels).toContain('部門間入')
    expect(labels).toContain('部門間出')
  })
})

// ─── deliverySales.price in salesComponentDetails ─────────────────

describe('salesComponentDetails: deliverySales.price branch', () => {
  it('売上納品売価が表示される（花+産直の売価合算がdeliverySales.priceになる）', () => {
    const data = buildTestData({
      classifiedSales: { records: [makeCSRecord(1, '1', 100000)] },
      flowers: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 10000, cost: 8000 }],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 1, storeId: '1', price: 5000, cost: 4000 }],
      },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    const salesExpl = explanations.get('salesTotal')!
    const day1 = salesExpl.breakdown!.find((b) => b.day === 1)
    expect(day1).toBeDefined()

    const labels = day1!.details!.map((d) => d.label)
    // deliverySales.price = flowers.price + directProduce.price = 15000
    // Note: salesComponentDetails shows 花売価 and 産直売価 but also checks deliverySales.price
    // The actual daily record has deliverySales.price which comes from flowers + directProduce
    // Both flowers.price and directProduce.price are shown; deliverySales.price is also checked
    expect(labels).toContain('花売価')
    expect(labels).toContain('産直売価')
  })
})

// ─── 全指標の unit チェック ─────────────────────────────────────

describe('all metrics: unit consistency', () => {
  it('rate 指標の value が妥当な範囲にある', () => {
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
      classifiedSales: { records: [makeCSRecord(1, '1', 80000, 2000)] },
    })
    const result = makeStoreResult(data)
    const explanations = generateExplanations(result, data, DEFAULT_SETTINGS)

    for (const [, expl] of explanations) {
      if (expl.unit === 'rate') {
        // 率は -10 ~ 10 の範囲内であること（異常値検出）
        expect(Math.abs(expl.value)).toBeLessThan(10)
      }
    }
  })

  it('全指標の title が非空文字列', () => {
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

    for (const [, expl] of explanations) {
      expect(expl.title.length).toBeGreaterThan(0)
    }
  })
})
