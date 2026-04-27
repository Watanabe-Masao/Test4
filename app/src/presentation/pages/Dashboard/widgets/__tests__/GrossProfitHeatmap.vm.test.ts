/**
 * GrossProfitHeatmap.vm.ts — ViewModel builder test
 *
 * 検証対象:
 * - buildGpRatesFromReadModels:
 *   - 空入力 → 空配列
 *   - storeId × day の売上・原価集約
 *   - 累積粗利率 (cumSales-cumCost)/cumSales
 *   - cumSales=0 の日は dailyRates に設定されない
 *   - 複数仕入ソース (purchase, deliverySales, transfers) が合算される
 *   - store 名解決 / 未登録は storeId
 *
 * - buildHeatmapFromStoreResults:
 *   - 空 → 空配列
 *   - dailyRates 計算 (cumulative)
 *   - dailyBudgetDev 計算 (budget>0 && sales>0 のみ)
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildGpRatesFromReadModels, buildHeatmapFromStoreResults } from '../GrossProfitHeatmap.vm'
import type { Store } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { SalesFactReadModel } from '@/application/readModels/salesFact'
import type { PurchaseCostReadModel } from '@/application/readModels/purchaseCost/PurchaseCostTypes'

function makeSalesFact(
  daily: { storeId: string; day: number; totalAmount: number }[],
): SalesFactReadModel {
  return { daily } as unknown as SalesFactReadModel
}

function makePurchaseCost(
  purchase: { storeId: string; day: number; cost: number }[] = [],
  deliverySales: { storeId: string; day: number; cost: number }[] = [],
  transfers: { storeId: string; day: number; cost: number }[] = [],
): PurchaseCostReadModel {
  return {
    purchase: { rows: purchase },
    deliverySales: { rows: deliverySales },
    transfers: { rows: transfers },
  } as unknown as PurchaseCostReadModel
}

function makeStore(id: string, name: string): Store {
  return { id, code: id, name } as unknown as Store
}

// ─── buildGpRatesFromReadModels ───────────────

describe('buildGpRatesFromReadModels', () => {
  it('空入力 → 空配列', () => {
    const result = buildGpRatesFromReadModels(makeSalesFact([]), makePurchaseCost(), new Map(), 30)
    expect(result).toEqual([])
  })

  it('単一店舗: 累積粗利率を計算', () => {
    const salesFact = makeSalesFact([
      { storeId: 's1', day: 1, totalAmount: 1000 },
      { storeId: 's1', day: 2, totalAmount: 2000 },
    ])
    const purchase = makePurchaseCost([
      { storeId: 's1', day: 1, cost: 700 },
      { storeId: 's1', day: 2, cost: 1400 },
    ])
    const result = buildGpRatesFromReadModels(salesFact, purchase, new Map(), 3)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('s1')
    // day1: (1000 - 700) / 1000 = 0.3
    expect(result[0].dailyRates.get(1)).toBeCloseTo(0.3, 3)
    // day2 cumulative: (3000 - 2100) / 3000 = 0.3
    expect(result[0].dailyRates.get(2)).toBeCloseTo(0.3, 3)
  })

  it('cumSales=0 の日は dailyRates に設定されない', () => {
    const salesFact = makeSalesFact([])
    const purchase = makePurchaseCost([{ storeId: 's1', day: 1, cost: 100 }])
    const result = buildGpRatesFromReadModels(salesFact, purchase, new Map(), 3)
    expect(result[0].dailyRates.size).toBe(0)
  })

  it('store 名解決', () => {
    const salesFact = makeSalesFact([{ storeId: 's1', day: 1, totalAmount: 1000 }])
    const stores = new Map([['s1', makeStore('s1', 'Store A')]])
    const result = buildGpRatesFromReadModels(salesFact, makePurchaseCost(), stores, 1)
    expect(result[0].name).toBe('Store A')
  })

  it('未登録 store → storeId をそのまま', () => {
    const salesFact = makeSalesFact([{ storeId: 's1', day: 1, totalAmount: 1000 }])
    const result = buildGpRatesFromReadModels(salesFact, makePurchaseCost(), new Map(), 1)
    expect(result[0].name).toBe('s1')
  })

  it('複数仕入ソース (purchase + deliverySales + transfers) が合算される', () => {
    const salesFact = makeSalesFact([{ storeId: 's1', day: 1, totalAmount: 1000 }])
    const pc = makePurchaseCost(
      [{ storeId: 's1', day: 1, cost: 100 }],
      [{ storeId: 's1', day: 1, cost: 200 }],
      [{ storeId: 's1', day: 1, cost: 300 }],
    )
    const result = buildGpRatesFromReadModels(salesFact, pc, new Map(), 1)
    // cost = 600, rate = (1000 - 600) / 1000 = 0.4
    expect(result[0].dailyRates.get(1)).toBeCloseTo(0.4, 3)
  })

  it('dailyBudgetDev は常に 空 Map (readModels 版では予算乖離を計算しない)', () => {
    const salesFact = makeSalesFact([{ storeId: 's1', day: 1, totalAmount: 1000 }])
    const result = buildGpRatesFromReadModels(salesFact, makePurchaseCost(), new Map(), 1)
    expect(result[0].dailyBudgetDev.size).toBe(0)
  })
})

// ─── buildHeatmapFromStoreResults ─────────────

describe('buildHeatmapFromStoreResults', () => {
  function makeStoreResult(
    daily: { day: number; sales: number; totalCost: number }[],
    dailyCumulative: { day: number; sales: number; budget: number }[] = [],
  ): StoreResult {
    const dailyMap = new Map<number, { sales: number; totalCost: number }>()
    for (const r of daily) dailyMap.set(r.day, r)
    const cumMap = new Map<number, { sales: number; budget: number }>()
    for (const r of dailyCumulative) cumMap.set(r.day, r)
    return {
      storeId: 's1',
      daily: dailyMap,
      dailyCumulative: cumMap,
    } as unknown as StoreResult
  }

  it('空 → 空配列', () => {
    expect(buildHeatmapFromStoreResults(new Map(), new Map(), 30)).toEqual([])
  })

  it('dailyRates: 累積粗利率を計算', () => {
    const sr = makeStoreResult([
      { day: 1, sales: 1000, totalCost: 700 },
      { day: 2, sales: 2000, totalCost: 1400 },
    ])
    const results = new Map([['s1', sr]])
    const result = buildHeatmapFromStoreResults(results, new Map(), 3)
    expect(result[0].dailyRates.get(1)).toBeCloseTo(0.3, 3)
    expect(result[0].dailyRates.get(2)).toBeCloseTo(0.3, 3)
  })

  it('dailyBudgetDev: budget>0 && sales>0 のみ計算', () => {
    const sr = makeStoreResult(
      [{ day: 1, sales: 1000, totalCost: 700 }],
      [{ day: 1, sales: 1100, budget: 1000 }],
    )
    const results = new Map([['s1', sr]])
    const result = buildHeatmapFromStoreResults(results, new Map(), 1)
    // (1100 - 1000) / 1000 = 0.1
    expect(result[0].dailyBudgetDev.get(1)).toBeCloseTo(0.1, 3)
  })

  it('dailyBudgetDev: budget=0 の日はスキップ', () => {
    const sr = makeStoreResult(
      [{ day: 1, sales: 1000, totalCost: 700 }],
      [{ day: 1, sales: 1100, budget: 0 }],
    )
    const results = new Map([['s1', sr]])
    const result = buildHeatmapFromStoreResults(results, new Map(), 1)
    expect(result[0].dailyBudgetDev.size).toBe(0)
  })

  it('store 名解決 / 未登録は storeId', () => {
    const sr = makeStoreResult([{ day: 1, sales: 100, totalCost: 50 }])
    const results = new Map([['s1', sr]])
    const stores = new Map([['s1', makeStore('s1', 'Store X')]])
    const result = buildHeatmapFromStoreResults(results, stores, 1)
    expect(result[0].name).toBe('Store X')

    const result2 = buildHeatmapFromStoreResults(results, new Map(), 1)
    expect(result2[0].name).toBe('s1')
  })
})
