/**
 * GrossProfitHeatmap — ViewModel（純粋関数）
 *
 * 描画に必要なデータ構造を構築する。React 非依存。
 *
 * 2つのデータソース:
 *   1. readModels（salesFact + purchaseCost）→ 粗利率の正本経路
 *   2. StoreResult（allStoreResults）→ 粗利率 + 予算乖離のフォールバック
 *
 * @guard F7 View は ViewModel のみ受け取る
 *
 * @responsibility R:unclassified
 */
import type { StoreResult } from '@/domain/models/storeTypes'
import type { Store } from '@/domain/models/record'
import type { SalesFactReadModel as SalesFactReadModelType } from '@/application/readModels/salesFact'
import type { PurchaseCostReadModel } from '@/application/readModels/purchaseCost/PurchaseCostTypes'

// ── 出力型 ──

export interface StoreHeatRow {
  readonly id: string
  readonly name: string
  readonly dailyRates: ReadonlyMap<number, number>
  readonly dailyBudgetDev: ReadonlyMap<number, number>
}

// ── readModels からの構築（粗利率のみ。予算乖離は StoreResult が必要） ──

export function buildGpRatesFromReadModels(
  salesFact: SalesFactReadModelType,
  purchaseCost: PurchaseCostReadModel,
  stores: ReadonlyMap<string, Store>,
  daysInMonth: number,
): readonly StoreHeatRow[] {
  // salesFact と purchaseCost から storeId × day の売上・原価を集約
  const salesByStoreDay = new Map<string, Map<number, number>>()
  for (const row of salesFact.daily) {
    let storeMap = salesByStoreDay.get(row.storeId)
    if (!storeMap) {
      storeMap = new Map()
      salesByStoreDay.set(row.storeId, storeMap)
    }
    storeMap.set(row.day, (storeMap.get(row.day) ?? 0) + row.totalAmount)
  }

  const costByStoreDay = new Map<string, Map<number, number>>()
  for (const canonical of [
    purchaseCost.purchase.rows,
    purchaseCost.deliverySales.rows,
    purchaseCost.transfers.rows,
  ]) {
    for (const row of canonical) {
      let storeMap = costByStoreDay.get(row.storeId)
      if (!storeMap) {
        storeMap = new Map()
        costByStoreDay.set(row.storeId, storeMap)
      }
      storeMap.set(row.day, (storeMap.get(row.day) ?? 0) + row.cost)
    }
  }

  const rows: StoreHeatRow[] = []
  const allStoreIds = new Set([...salesByStoreDay.keys(), ...costByStoreDay.keys()])

  for (const storeId of allStoreIds) {
    const store = stores.get(storeId)
    const name = store?.name ?? storeId
    const dailyRates = new Map<number, number>()
    const salesMap = salesByStoreDay.get(storeId)
    const costMap = costByStoreDay.get(storeId)

    let cumSales = 0
    let cumCost = 0
    for (let d = 1; d <= daysInMonth; d++) {
      cumSales += salesMap?.get(d) ?? 0
      cumCost += costMap?.get(d) ?? 0
      if (cumSales > 0) {
        dailyRates.set(d, (cumSales - cumCost) / cumSales)
      }
    }

    rows.push({ id: storeId, name, dailyRates, dailyBudgetDev: new Map() })
  }

  return rows
}

// ── StoreResult からの構築（フォールバック、粗利率 + 予算乖離） ──

export function buildHeatmapFromStoreResults(
  allStoreResults: ReadonlyMap<string, StoreResult>,
  stores: ReadonlyMap<string, Store>,
  daysInMonth: number,
): readonly StoreHeatRow[] {
  const rows: StoreHeatRow[] = []

  for (const [storeId, result] of allStoreResults) {
    const store = stores.get(storeId)
    const name = store?.name ?? storeId
    const dailyRates = new Map<number, number>()
    const dailyBudgetDev = new Map<number, number>()

    let cumSales = 0
    let cumCost = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = result.daily.get(d)
      if (rec) {
        cumSales += rec.sales
        cumCost += rec.totalCost
        if (cumSales > 0) {
          dailyRates.set(d, (cumSales - cumCost) / cumSales)
        }
      }

      const cumEntry = result.dailyCumulative.get(d)
      if (cumEntry && cumEntry.budget > 0 && cumEntry.sales > 0) {
        dailyBudgetDev.set(d, (cumEntry.sales - cumEntry.budget) / cumEntry.budget)
      }
    }
    rows.push({ id: storeId, name, dailyRates, dailyBudgetDev })
  }

  return rows
}
