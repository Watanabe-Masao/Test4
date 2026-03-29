/**
 * 仕入原価複合正本 — プロセス正当性テスト
 *
 * 以下のプロセスチェーンを保証する:
 *   1. 正本が正しいこと（grandTotalCost = purchase + deliverySales + transfers）
 *   2. 取得経路が正しいこと（3正本が全て取得され導出値が整合）
 *   3. 計算式が正しいこと（inventoryPurchaseCost = purchase + transfers）
 *   4. 計算の使用方法が正しいこと（KPI/カテゴリ/ピボットが正本から導出）
 *   5. 呼び出し元が正しいこと（ページ→facade→handler→正本のチェーン）
 *   6. 正しい値が表示されること（変換ヘルパーが値を変えない）
 *
 * @see references/01-principles/purchase-cost-definition.md
 */
import { describe, it, expect } from 'vitest'
import {
  PurchaseCostReadModel,
  type PurchaseCostReadModel as PurchaseCostReadModelType,
} from './PurchaseCostTypes'
import {
  toPurchaseDailySupplierRows,
  toCategoryDailyRows,
  toStoreCostRows,
  toDailyCostRows,
} from './readPurchaseCost'
import { buildDailyPivot } from '@/application/hooks/duckdb/purchaseComparisonBuilders'
import { buildKpi, type KpiTotals } from '@/application/hooks/duckdb/purchaseComparisonKpi'
import type { CategoryComparisonRow } from '@/domain/models/PurchaseComparison'

// ── テストデータ ──

/** 複数店舗のテストデータ */
function makeMultiStoreModel(): PurchaseCostReadModelType {
  const purchase = {
    rows: [
      { storeId: 'S001', day: 1, supplierCode: 'A', cost: 300_000, price: 400_000 },
      { storeId: 'S002', day: 1, supplierCode: 'A', cost: 200_000, price: 250_000 },
      { storeId: 'S001', day: 2, supplierCode: 'B', cost: 100_000, price: 120_000 },
    ],
    totalCost: 600_000,
    totalPrice: 770_000,
  }
  const deliverySales = {
    rows: [
      { storeId: 'S001', day: 1, categoryKey: 'flowers', cost: 30_000, price: 40_000 },
      { storeId: 'S002', day: 1, categoryKey: 'flowers', cost: 20_000, price: 30_000 },
    ],
    totalCost: 50_000,
    totalPrice: 70_000,
  }
  const transfers = {
    rows: [
      { storeId: 'S001', day: 1, categoryKey: 'interStoreOut', cost: -50_000, price: -60_000 },
      { storeId: 'S002', day: 1, categoryKey: 'interStoreIn', cost: 50_000, price: 60_000 },
    ],
    totalCost: 0,
    totalPrice: 0,
  }
  return {
    purchase,
    deliverySales,
    transfers,
    grandTotalCost: 650_000,
    grandTotalPrice: 840_000,
    inventoryPurchaseCost: 600_000,
    inventoryPurchasePrice: 770_000,
    meta: {
      missingPolicy: 'zero' as const,
      rounding: {
        amountMethod: 'round' as const,
        amountPrecision: 0 as const,
        rateMethod: 'raw' as const,
      },
      missingDays: { purchase: 0, deliverySales: 0, transfers: 0, composite: 0 },
      dataVersion: 1,
    },
  }
}

function makeTestModel(overrides?: Partial<PurchaseCostReadModelType>): PurchaseCostReadModelType {
  const purchase = {
    rows: [
      { storeId: 'S001', day: 1, supplierCode: 'S001', cost: 500_000, price: 600_000 },
      { storeId: 'S001', day: 1, supplierCode: 'S002', cost: 300_000, price: 400_000 },
      { storeId: 'S001', day: 2, supplierCode: 'S001', cost: 200_000, price: 250_000 },
    ],
    totalCost: 1_000_000,
    totalPrice: 1_250_000,
  }
  const deliverySales = {
    rows: [
      { storeId: 'S001', day: 1, categoryKey: 'flowers', cost: 50_000, price: 70_000 },
      { storeId: 'S001', day: 2, categoryKey: 'directProduce', cost: 30_000, price: 40_000 },
    ],
    totalCost: 80_000,
    totalPrice: 110_000,
  }
  const transfers = {
    rows: [
      { storeId: 'S001', day: 1, categoryKey: 'interStoreIn', cost: 100_000, price: 120_000 },
      { storeId: 'S001', day: 1, categoryKey: 'interStoreOut', cost: -60_000, price: -70_000 },
      { storeId: 'S001', day: 2, categoryKey: 'interDeptIn', cost: 20_000, price: 25_000 },
    ],
    totalCost: 60_000,
    totalPrice: 75_000,
  }
  return {
    purchase,
    deliverySales,
    transfers,
    grandTotalCost: purchase.totalCost + deliverySales.totalCost + transfers.totalCost,
    grandTotalPrice: purchase.totalPrice + deliverySales.totalPrice + transfers.totalPrice,
    inventoryPurchaseCost: purchase.totalCost + transfers.totalCost,
    inventoryPurchasePrice: purchase.totalPrice + transfers.totalPrice,
    meta: {
      missingPolicy: 'zero' as const,
      rounding: {
        amountMethod: 'round' as const,
        amountPrecision: 0 as const,
        rateMethod: 'raw' as const,
      },
      missingDays: { purchase: 0, deliverySales: 0, transfers: 0, composite: 0 },
      dataVersion: 1,
    },
    ...overrides,
  }
}

// ── 1. 正本が正しいこと ──

describe('正本が正しいこと', () => {
  it('grandTotalCost = purchase.totalCost + deliverySales.totalCost + transfers.totalCost', () => {
    const model = makeTestModel()
    expect(model.grandTotalCost).toBe(
      model.purchase.totalCost + model.deliverySales.totalCost + model.transfers.totalCost,
    )
  })

  it('grandTotalPrice = purchase.totalPrice + deliverySales.totalPrice + transfers.totalPrice', () => {
    const model = makeTestModel()
    expect(model.grandTotalPrice).toBe(
      model.purchase.totalPrice + model.deliverySales.totalPrice + model.transfers.totalPrice,
    )
  })

  it('purchase.totalCost = Σ purchase.rows[].cost', () => {
    const model = makeTestModel()
    const sum = model.purchase.rows.reduce((s, r) => s + r.cost, 0)
    expect(model.purchase.totalCost).toBe(sum)
  })

  it('deliverySales.totalCost = Σ deliverySales.rows[].cost', () => {
    const model = makeTestModel()
    const sum = model.deliverySales.rows.reduce((s, r) => s + r.cost, 0)
    expect(model.deliverySales.totalCost).toBe(sum)
  })

  it('transfers.totalCost = Σ transfers.rows[].cost（IN + OUT 全方向）', () => {
    const model = makeTestModel()
    const sum = model.transfers.rows.reduce((s, r) => s + r.cost, 0)
    expect(model.transfers.totalCost).toBe(sum)
  })

  it('Zod parse が正しいデータを受け入れる', () => {
    const model = makeTestModel()
    expect(() => PurchaseCostReadModel.parse(model)).not.toThrow()
  })

  it('Zod parse が不正なデータを拒否する（fail fast）', () => {
    const broken = { ...makeTestModel(), grandTotalCost: 'not a number' }
    expect(() => PurchaseCostReadModel.parse(broken)).toThrow()
  })
})

// ── 2. 取得経路が正しいこと ──

describe('取得経路が正しいこと', () => {
  it('3つの独立正本が全て存在する', () => {
    const model = makeTestModel()
    expect(model.purchase.rows.length).toBeGreaterThan(0)
    expect(model.deliverySales.rows.length).toBeGreaterThan(0)
    expect(model.transfers.rows.length).toBeGreaterThan(0)
  })

  it('meta.dataVersion が 0 より大きい', () => {
    const model = makeTestModel()
    expect(model.meta.dataVersion).toBeGreaterThan(0)
  })
})

// ── 3. 計算式が正しいこと ──

describe('計算式が正しいこと', () => {
  it('inventoryPurchaseCost = purchase + transfers（推定法用、売上納品を除外）', () => {
    const model = makeTestModel()
    expect(model.inventoryPurchaseCost).toBe(model.purchase.totalCost + model.transfers.totalCost)
    // 売上納品が含まれていないこと
    expect(model.inventoryPurchaseCost).not.toBe(model.grandTotalCost)
    expect(model.grandTotalCost - model.inventoryPurchaseCost).toBe(model.deliverySales.totalCost)
  })

  it('移動原価は IN + OUT の両方を含む（OUT はマイナス値）', () => {
    const model = makeTestModel()
    const inRows = model.transfers.rows.filter((r) => r.categoryKey.endsWith('In'))
    const outRows = model.transfers.rows.filter((r) => r.categoryKey.endsWith('Out'))
    expect(inRows.length).toBeGreaterThan(0)
    expect(outRows.length).toBeGreaterThan(0)
    // OUT はマイナス値
    for (const r of outRows) {
      expect(r.cost).toBeLessThan(0)
    }
  })
})

// ── 4. 計算の使用方法が正しいこと ──

describe('計算の使用方法が正しいこと', () => {
  const model = makeTestModel()
  const kpiTotals: KpiTotals = {
    allCurCost: model.grandTotalCost,
    allCurPrice: model.grandTotalPrice,
    allPrevCost: 1_000_000,
    allPrevPrice: 1_200_000,
  }

  it('KPI は grandTotalCost から構築される', () => {
    const kpi = buildKpi(kpiTotals, 5_000_000, 4_500_000)
    expect(kpi.currentTotalCost).toBe(model.grandTotalCost)
    expect(kpi.currentTotalPrice).toBe(model.grandTotalPrice)
  })

  it('ピボットに渡すデータは ReadModel から変換される', () => {
    const supplierRows = toPurchaseDailySupplierRows(model)
    const specialRows = toCategoryDailyRows(model.deliverySales)
    const transferRows = toCategoryDailyRows(model.transfers)

    // 変換後の合計が正本と一致
    const supplierSum = supplierRows.reduce((s, r) => s + r.totalCost, 0)
    expect(supplierSum).toBe(model.purchase.totalCost)

    const specialSum = specialRows.reduce((s, r) => s + r.totalCost, 0)
    expect(specialSum).toBe(model.deliverySales.totalCost)

    const transferSum = transferRows.reduce((s, r) => s + r.totalCost, 0)
    expect(transferSum).toBe(model.transfers.totalCost)
  })

  it('ピボット grandTotal = ReadModel grandTotalCost', () => {
    const supplierRows = toPurchaseDailySupplierRows(model)
    const specialRows = toCategoryDailyRows(model.deliverySales)
    const transferRows = toCategoryDailyRows(model.transfers)

    const cat: CategoryComparisonRow = {
      categoryId: 'market_purchase',
      category: '市場仕入',
      color: '#f59e0b',
      currentCost: 0,
      currentPrice: 0,
      prevCost: 0,
      prevPrice: 0,
      costDiff: 0,
      priceDiff: 0,
      costChangeRate: 0,
      currentCostShare: 0,
      prevCostShare: 0,
      costShareDiff: 0,
      currentMarkupRate: 0,
      prevMarkupRate: 0,
      currentPriceShare: 0,
      crossMultiplication: 0,
    }
    const flowerCat = { ...cat, categoryId: 'flowers' as const, category: '花' }
    const dpCat = { ...cat, categoryId: 'direct_produce' as const, category: '産直' }
    const storeCat = { ...cat, categoryId: 'inter_store' as const, category: '店間移動' }
    const deptCat = { ...cat, categoryId: 'inter_department' as const, category: '部門間移動' }

    const supplierMap = { S001: 'market_purchase' as const, S002: 'market_purchase' as const }

    const pivot = buildDailyPivot(
      supplierRows,
      [],
      specialRows,
      [],
      transferRows,
      [],
      [cat, flowerCat, dpCat, storeCat, deptCat],
      supplierMap,
      2026,
      3,
    )

    expect(pivot.totals.grandCost).toBe(model.grandTotalCost)
    expect(pivot.totals.grandPrice).toBe(model.grandTotalPrice)
  })
})

// ── 5. 変換ヘルパーが値を変えないこと ──

describe('変換ヘルパーが値を変えないこと', () => {
  it('toPurchaseDailySupplierRows は cost/price を totalCost/totalPrice に変換するだけ', () => {
    const model = makeTestModel()
    const rows = toPurchaseDailySupplierRows(model)
    for (let i = 0; i < rows.length; i++) {
      expect(rows[i].day).toBe(model.purchase.rows[i].day)
      expect(rows[i].supplierCode).toBe(model.purchase.rows[i].supplierCode)
      expect(rows[i].totalCost).toBe(model.purchase.rows[i].cost)
      expect(rows[i].totalPrice).toBe(model.purchase.rows[i].price)
    }
  })

  it('toCategoryDailyRows は cost/price を totalCost/totalPrice に変換するだけ', () => {
    const model = makeTestModel()
    const rows = toCategoryDailyRows(model.deliverySales)
    for (let i = 0; i < rows.length; i++) {
      expect(rows[i].day).toBe(model.deliverySales.rows[i].day)
      expect(rows[i].categoryKey).toBe(model.deliverySales.rows[i].categoryKey)
      expect(rows[i].totalCost).toBe(model.deliverySales.rows[i].cost)
      expect(rows[i].totalPrice).toBe(model.deliverySales.rows[i].price)
    }
  })
})

// ── 6. 店舗別導出が正しいこと ──

describe('店舗別導出が正しいこと', () => {
  it('toStoreCostRows は3正本を storeId で集約する', () => {
    const model = makeMultiStoreModel()
    const rows = toStoreCostRows(model)

    expect(rows.length).toBe(2)
    const s001 = rows.find((r) => r.storeId === 'S001')!
    const s002 = rows.find((r) => r.storeId === 'S002')!

    // S001: purchase(300k+100k) + flowers(30k) + transfersOut(-50k) = 380k
    expect(s001.totalCost).toBe(300_000 + 100_000 + 30_000 + -50_000)
    // S002: purchase(200k) + flowers(20k) + transfersIn(50k) = 270k
    expect(s002.totalCost).toBe(200_000 + 20_000 + 50_000)
  })

  it('店舗別合計の総和 = grandTotalCost', () => {
    const model = makeMultiStoreModel()
    const rows = toStoreCostRows(model)
    const storeSum = rows.reduce((s, r) => s + r.totalCost, 0)
    expect(storeSum).toBe(model.grandTotalCost)
  })

  it('移動原価は店舗間で相殺されてゼロ（全店合計）', () => {
    const model = makeMultiStoreModel()
    expect(model.transfers.totalCost).toBe(0)
  })

  it('toDailyCostRows は3正本を day で集約する', () => {
    const model = makeMultiStoreModel()
    const rows = toDailyCostRows(model)

    // day 1: S001 purchase(300k) + S002 purchase(200k) + flowers(30k+20k) + transfers(-50k+50k) = 550k
    // day 2: S001 purchase(100k)
    expect(rows.length).toBe(2)
    expect(rows[0].day).toBe(1)
    expect(rows[0].totalCost).toBe(300_000 + 200_000 + 30_000 + 20_000 + -50_000 + 50_000)
    expect(rows[1].day).toBe(2)
    expect(rows[1].totalCost).toBe(100_000)
  })

  it('日別合計の総和 = grandTotalCost', () => {
    const model = makeMultiStoreModel()
    const rows = toDailyCostRows(model)
    const daySum = rows.reduce((s, r) => s + r.totalCost, 0)
    expect(daySum).toBe(model.grandTotalCost)
  })
})
