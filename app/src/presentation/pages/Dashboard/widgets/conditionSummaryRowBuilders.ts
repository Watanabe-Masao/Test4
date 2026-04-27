/**
 * コンディションサマリー強化版 — 月次行/合計ビルダー
 *
 * @guard F7 View は ViewModel のみ受け取る
 *
 * @responsibility R:unclassified
 */

import { calculateDiscountRate } from '@/domain/calculations/estMethod'
import { aggregateContributions } from '@/application/comparison/viewModels'
import { computeGpBeforeConsumable } from './conditionSummaryUtils'
import type { Store } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData, PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import type { MetricKey, PeriodTab, EnhancedRow, EnhancedTotal } from './conditionSummaryTypes'
import { METRIC_DEFS } from './conditionSummaryTypes'
import {
  markupRateFromAmounts,
  extractMetric,
  extractLySales,
  extractLyDiscountRate,
  computeAchievement,
  computeYoY,
} from './conditionSummaryHelpers'

// ─── Public: Build Rows ─────────────────────────────────

export interface BuildRowsInput {
  readonly allStoreResults: ReadonlyMap<string, StoreResult>
  readonly stores: ReadonlyMap<string, Store>
  readonly metric: MetricKey
  readonly tab: PeriodTab
  readonly elapsedDays: number | undefined
  readonly daysInMonth: number
  readonly prevYear: PrevYearData
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  /** 前年店舗別仕入額（DuckDB UNION query 結果、額で持つ — @guard B3） */
  readonly prevYearStoreCostPrice?: ReadonlyMap<string, { cost: number; price: number }>
}

export function buildRows(input: BuildRowsInput): readonly EnhancedRow[] {
  const { allStoreResults, stores, metric, tab, elapsedDays, daysInMonth } = input
  const isElapsed = tab === 'elapsed' && elapsedDays != null && elapsedDays < daysInMonth
  const def = METRIC_DEFS[metric]

  const rows: EnhancedRow[] = []

  for (const [storeId, sr] of allStoreResults) {
    const storeMaster = stores.get(storeId)
    const storeName = storeMaster?.name ?? storeId

    const { budget, actual } = extractMetric(sr, metric, tab, elapsedDays, daysInMonth)
    const achievement = computeAchievement(actual, budget, def.isRate)
    const diff = actual - budget

    // YoY: メトリクスに応じた前年比計算
    let ly: number | null = null
    let yoy: number | null = null
    if (metric === 'sales') {
      ly = extractLySales(storeId, input.prevYear, input.prevYearMonthlyKpi, isElapsed, elapsedDays)
      yoy = computeYoY(actual, ly, def.isRate)
    } else if (metric === 'discountRate') {
      ly = extractLyDiscountRate(storeId, input.prevYearMonthlyKpi, isElapsed, elapsedDays)
      yoy = computeYoY(actual, ly, true) // pp diff
    } else if (metric === 'markupRate' && input.prevYearStoreCostPrice) {
      const cp = input.prevYearStoreCostPrice.get(storeId)
      if (cp && cp.price > 0) {
        ly = markupRateFromAmounts(cp.cost, cp.price) * 100
        yoy = computeYoY(actual, ly, true) // pp diff
      }
    }

    // 粗利率メトリクス: 原算前粗利率
    const gpBeforeConsumable = metric === 'gpRate' ? computeGpBeforeConsumable(sr) * 100 : null

    // 売変率メトリクス: 種別内訳
    const discountEntries = metric === 'discountRate' ? sr.discountEntries : null

    rows.push({
      storeId,
      storeName,
      budget,
      actual,
      ly,
      achievement,
      diff,
      yoy,
      gpBeforeConsumable,
      discountEntries,
    })
  }

  // 店舗コード順にソート
  return rows.sort((a, b) => {
    const sa = stores.get(a.storeId)
    const sb = stores.get(b.storeId)
    return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
  })
}

// ─── Public: Build Total ────────────────────────────────

export function buildTotal(input: BuildRowsInput): EnhancedTotal {
  const { metric, tab, elapsedDays, daysInMonth, prevYear } = input
  const def = METRIC_DEFS[metric]

  // result は WidgetContext.result（全店合計の StoreResult）を使う
  // ただし buildTotal は allStoreResults の集約でも計算可能
  // ここでは rows から集約する（一貫性のため）
  const rows = buildRows(input)

  if (def.isRate) {
    // 粗利率: 加重平均（売上額ベース）が必要 → 全店 StoreResult から直接取る方が正確
    // rows の budget/actual はすでに % なので単純平均は不適切
    // → 呼び出し元で result を使う別パスが必要
    // ここでは rows の値をそのまま返す（全店1行のケース or 加重平均を別途実装）
    const budget = rows.length > 0 ? rows.reduce((s, r) => s + r.budget, 0) / rows.length : 0
    const actual = rows.length > 0 ? rows.reduce((s, r) => s + r.actual, 0) / rows.length : 0
    const achievement = actual - budget
    const diff = actual - budget
    return {
      budget,
      actual,
      ly: null,
      achievement,
      diff,
      yoy: null,
      gpBeforeConsumable: null,
      discountEntries: null,
    }
  }

  const budget = rows.reduce((s, r) => s + r.budget, 0)
  const actual = rows.reduce((s, r) => s + r.actual, 0)
  const achievement = computeAchievement(actual, budget, false)
  const diff = actual - budget

  let ly: number | null = null
  let yoy: number | null = null
  if (metric === 'sales' && prevYear.hasPrevYear) {
    const isElapsed = tab === 'elapsed' && elapsedDays != null && elapsedDays < daysInMonth
    if (isElapsed) {
      ly = prevYear.totalSales
    } else {
      // YoY: alignment経由が正しい（曜日調整済み前年比。monthlyTotal ではない）
      ly = input.prevYearMonthlyKpi.hasPrevYear ? input.prevYearMonthlyKpi.sameDow.sales : null
    }
    yoy = computeYoY(actual, ly, false)
  }

  return {
    budget,
    actual,
    ly,
    achievement,
    diff,
    yoy,
    gpBeforeConsumable: null,
    discountEntries: null,
  }
}

// ─── Public: Build Total from main result ───────────────

/** 全店合計の StoreResult を使って正確な合計を計算する（粗利率の加重平均問題を回避） */
export function buildTotalFromResult(
  result: StoreResult,
  input: Omit<BuildRowsInput, 'allStoreResults' | 'stores'>,
): EnhancedTotal {
  const { metric, tab, elapsedDays, daysInMonth, prevYear, prevYearMonthlyKpi } = input
  const def = METRIC_DEFS[metric]

  const { budget, actual } = extractMetric(result, metric, tab, elapsedDays, daysInMonth)
  const achievement = computeAchievement(actual, budget, def.isRate)
  const diff = actual - budget

  let ly: number | null = null
  let yoy: number | null = null
  const isElapsed = tab === 'elapsed' && elapsedDays != null && elapsedDays < daysInMonth
  if (metric === 'sales' && prevYear.hasPrevYear) {
    if (isElapsed) {
      ly = prevYear.totalSales
    } else {
      // YoY: alignment経由が正しい（曜日調整済み前年比。monthlyTotal ではない）
      ly = prevYearMonthlyKpi.hasPrevYear ? prevYearMonthlyKpi.sameDow.sales : null
    }
    yoy = computeYoY(actual, ly, false)
  } else if (metric === 'discountRate' && prevYearMonthlyKpi.hasPrevYear) {
    // 共通 VM 経由で全店の前年売変率を算出
    const maxDay = isElapsed && elapsedDays != null ? elapsedDays : undefined
    const agg = aggregateContributions(prevYearMonthlyKpi.sameDow.storeContributions, { maxDay })
    if (agg.count > 0) {
      ly = calculateDiscountRate(agg.sales, agg.discount) * 100
      if (ly > 0) {
        yoy = computeYoY(actual, ly, true) // pp diff
      }
    }
  } else if (
    metric === 'markupRate' &&
    input.prevYearStoreCostPrice &&
    input.prevYearStoreCostPrice.size > 0
  ) {
    // 全店合計: 額を合算してから率を1回計算（加重平均が自然に得られる）
    let allCost = 0
    let allPrice = 0
    for (const cp of input.prevYearStoreCostPrice.values()) {
      allCost += cp.cost
      allPrice += cp.price
    }
    if (allPrice > 0) {
      ly = markupRateFromAmounts(allCost, allPrice) * 100
      yoy = computeYoY(actual, ly, true) // pp diff
    }
  }

  const gpBeforeConsumable = metric === 'gpRate' ? computeGpBeforeConsumable(result) * 100 : null
  const discountEntries = metric === 'discountRate' ? result.discountEntries : null

  return { budget, actual, ly, achievement, diff, yoy, gpBeforeConsumable, discountEntries }
}
