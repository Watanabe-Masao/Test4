/**
 * periodMetricsCalculator テスト
 *
 * SQL 生データ（StoreDaySummaryRow[]）から JS 計算で
 * PeriodMetrics を生成する一連の処理を検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  aggregateSummaryRows,
  calculateAllPeriodMetrics,
  type PeriodInventoryConfig,
} from '../periodMetricsCalculator'
import type { DaySummaryInput } from '../periodMetricsCalculator'

function makeRow(overrides: Partial<DaySummaryInput> = {}): DaySummaryInput {
  return {
    day: 1,
    dateKey: '2026-02-01',
    storeId: '1',
    sales: 0,
    coreSales: 0,
    grossSales: 0,
    discountAbsolute: 0,
    purchaseCost: 0,
    purchasePrice: 0,
    interStoreInCost: 0,
    interStoreInPrice: 0,
    interStoreOutCost: 0,
    interStoreOutPrice: 0,
    interDeptInCost: 0,
    interDeptInPrice: 0,
    interDeptOutCost: 0,
    interDeptOutPrice: 0,
    flowersCost: 0,
    flowersPrice: 0,
    directProduceCost: 0,
    directProducePrice: 0,
    costInclusionCost: 0,
    customers: 0,
    ...overrides,
  }
}

describe('aggregateSummaryRows', () => {
  it('空配列から空の Map を返す', () => {
    const result = aggregateSummaryRows([])
    expect(result.size).toBe(0)
  })

  it('単一店舗の行を正しく集約する', () => {
    const rows = [
      makeRow({ storeId: '1', day: 1, dateKey: '2026-02-01', sales: 100000, purchaseCost: 70000 }),
      makeRow({ storeId: '1', day: 2, dateKey: '2026-02-02', sales: 150000, purchaseCost: 80000 }),
    ]
    const result = aggregateSummaryRows(rows)
    expect(result.size).toBe(1)
    const agg = result.get('1')!
    expect(agg.totalSales).toBe(250000)
    expect(agg.totalPurchaseCost).toBe(150000)
  })

  it('複数店舗を店舗別に分離する', () => {
    const rows = [
      makeRow({ storeId: '1', sales: 100000 }),
      makeRow({ storeId: '2', sales: 200000 }),
    ]
    const result = aggregateSummaryRows(rows)
    expect(result.size).toBe(2)
    expect(result.get('1')!.totalSales).toBe(100000)
    expect(result.get('2')!.totalSales).toBe(200000)
  })

  it('salesDays は売上 > 0 の distinct dateKey 数', () => {
    const rows = [
      makeRow({ storeId: '1', day: 1, dateKey: '2026-02-01', sales: 100000 }),
      makeRow({ storeId: '1', day: 2, dateKey: '2026-02-02', sales: 0 }),
      makeRow({ storeId: '1', day: 3, dateKey: '2026-02-03', sales: 50000 }),
    ]
    const result = aggregateSummaryRows(rows)
    const agg = result.get('1')!
    expect(agg.salesDateKeys.size).toBe(2) // day 1 and 3
    expect(agg.dateKeys.size).toBe(3) // all 3 days
  })

  it('hasDiscountData は割引ありの場合 true', () => {
    const rows = [makeRow({ storeId: '1', discountAbsolute: 5000 })]
    const result = aggregateSummaryRows(rows)
    expect(result.get('1')!.hasDiscountData).toBe(true)
  })

  it('purchaseMaxDay は仕入ありの最大日', () => {
    const rows = [
      makeRow({ storeId: '1', day: 5, purchaseCost: 100 }),
      makeRow({ storeId: '1', day: 15, purchaseCost: 200 }),
      makeRow({ storeId: '1', day: 20, purchaseCost: 0 }),
    ]
    const result = aggregateSummaryRows(rows)
    expect(result.get('1')!.purchaseMaxDay).toBe(15)
  })
})

describe('calculateAllPeriodMetrics', () => {
  it('空の行から空配列を返す', () => {
    const result = calculateAllPeriodMetrics([], new Map(), 0.25)
    expect(result).toHaveLength(0)
  })

  it('基本的な計算を正しく行う', () => {
    const rows = [
      makeRow({
        storeId: '1',
        day: 1,
        dateKey: '2026-02-01',
        sales: 1000000,
        coreSales: 900000,
        grossSales: 1050000,
        discountAbsolute: 50000,
        purchaseCost: 600000,
        purchasePrice: 850000,
        flowersCost: 40000,
        flowersPrice: 60000,
        directProduceCost: 20000,
        directProducePrice: 40000,
        costInclusionCost: 5000,
        customers: 100,
      }),
    ]
    const invConfigs = new Map<string, PeriodInventoryConfig>([
      ['1', { openingInventory: 500000, closingInventory: 400000, grossProfitBudget: 200000 }],
    ])
    const result = calculateAllPeriodMetrics(rows, invConfigs, 0.25)

    expect(result).toHaveLength(1)
    const m = result[0]
    expect(m.storeId).toBe('1')
    expect(m.totalSales).toBe(1000000)
    expect(m.totalCoreSales).toBe(900000)
    expect(m.grossSales).toBe(1050000)
    expect(m.deliverySalesPrice).toBe(100000) // 60000 + 40000
    expect(m.deliverySalesCost).toBe(60000) // 40000 + 20000

    // 総仕入原価 = purchase + flowers + directProduce + transfers（消耗品除く）
    expect(m.totalCost).toBe(600000 + 60000) // 660000
    // 在庫仕入原価 = purchase + transfers（花・産直除外）
    expect(m.inventoryCost).toBe(600000)

    // 在庫法
    expect(m.openingInventory).toBe(500000)
    expect(m.closingInventory).toBe(400000)
    // COGS = 期首 + totalCost - 期末 = 500000 + 660000 - 400000 = 760000
    expect(m.invMethodCogs).toBe(760000)
    expect(m.invMethodGrossProfit).toBe(1000000 - 760000)

    // 予算
    expect(m.grossProfitBudget).toBe(200000)

    // 期間情報
    expect(m.salesDays).toBe(1)
    expect(m.totalDays).toBe(1)
    expect(m.hasDiscountData).toBe(true)
  })

  it('在庫設定なしの場合は在庫法が null を返す', () => {
    const rows = [
      makeRow({
        storeId: '1',
        sales: 500000,
        coreSales: 500000,
        purchaseCost: 300000,
        purchasePrice: 400000,
      }),
    ]
    const result = calculateAllPeriodMetrics(rows, new Map(), 0.25)
    const m = result[0]
    expect(m.invMethodCogs).toBeNull()
    expect(m.invMethodGrossProfit).toBeNull()
    expect(m.invMethodGrossProfitRate).toBeNull()
    expect(m.estMethodClosingInventory).toBeNull()
    expect(m.grossProfitBudget).toBe(0)
  })

  it('仕入なしの場合は coreMarkupRate にデフォルト値を使用する', () => {
    const rows = [
      makeRow({
        storeId: '1',
        sales: 100000,
        coreSales: 100000,
      }),
    ]
    const result = calculateAllPeriodMetrics(rows, new Map(), 0.3)
    const m = result[0]
    expect(m.coreMarkupRate).toBe(0.3) // defaultMarkupRate
  })

  it('結果は storeId でソートされる', () => {
    const rows = [
      makeRow({ storeId: '3', sales: 100 }),
      makeRow({ storeId: '1', sales: 200 }),
      makeRow({ storeId: '2', sales: 300 }),
    ]
    const result = calculateAllPeriodMetrics(rows, new Map(), 0.25)
    expect(result.map((r) => r.storeId)).toEqual(['1', '2', '3'])
  })

  it('推定マージン + 推定原価 = コア売上（不変条件）', () => {
    const rows = [
      makeRow({
        storeId: '1',
        sales: 10000000,
        coreSales: 9000000,
        discountAbsolute: 200000,
        purchaseCost: 6000000,
        purchasePrice: 8500000,
        costInclusionCost: 50000,
      }),
    ]
    const result = calculateAllPeriodMetrics(rows, new Map(), 0.25)
    const m = result[0]
    expect(m.estMethodMargin + m.estMethodCogs).toBeCloseTo(9000000, 2)
  })
})
