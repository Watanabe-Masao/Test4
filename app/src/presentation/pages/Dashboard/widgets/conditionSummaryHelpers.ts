/**
 * コンディションサマリー強化版 — 共有内部ヘルパー
 *
 * 複数のビルダーファイルから参照される非公開ヘルパー関数群。
 * このファイルの関数はバレル経由で外部公開しない。
 */

import { calculateAchievementRate, calculateYoYRatio } from '@/domain/calculations/utils'
import { calculateMarkupRates } from '@/domain/calculations/markupRate'
import { calculateDiscountRate } from '@/domain/calculations/estMethod'
import { computeGpAfterConsumableAmount, computeGpAfterConsumable } from './conditionSummaryUtils'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearData, PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import type { MetricKey, PeriodTab } from './conditionSummaryTypes'

// ─── Domain Calculation Wrappers ─────────────────────────

/**
 * 合算済み cost/price から値入率を算出する（domain/calculations 経由）。
 * DuckDB UNION query の結果は全カテゴリ合算済みなので purchasePrice/Cost に集約して渡す。
 */
export function markupRateFromAmounts(totalCost: number, totalPrice: number): number {
  if (totalPrice <= 0) return 0
  const { averageMarkupRate } = calculateMarkupRates({
    purchasePrice: totalPrice,
    purchaseCost: totalCost,
    deliveryPrice: 0,
    deliveryCost: 0,
    transferPrice: 0,
    transferCost: 0,
    defaultMarkupRate: 0,
  })
  return averageMarkupRate
}

// ─── Budget Calculation ─────────────────────────────────

/** 経過予算を日別予算の合算で計算する */
export function elapsedBudget(sr: StoreResult, elapsedDays: number): number {
  let sum = 0
  for (let d = 1; d <= elapsedDays; d++) sum += sr.budgetDaily.get(d) ?? 0
  return sum
}

/** 経過粗利予算 = 粗利予算 × (経過売上予算 / 月間売上予算) */
export function elapsedGpBudget(sr: StoreResult, elapsedDays: number): number {
  if (sr.budget <= 0) return 0
  const periodBudget = elapsedBudget(sr, elapsedDays)
  return sr.grossProfitBudget * (periodBudget / sr.budget)
}

// ─── Metric Extractors ──────────────────────────────────

export interface MetricValues {
  readonly budget: number
  readonly actual: number
}

export function extractMetric(
  sr: StoreResult,
  metric: MetricKey,
  tab: PeriodTab,
  elapsedDays: number | undefined,
  daysInMonth: number,
): MetricValues {
  const effectiveElapsed = elapsedDays ?? daysInMonth
  const isElapsed = tab === 'elapsed' && elapsedDays != null && elapsedDays < daysInMonth

  switch (metric) {
    case 'sales': {
      const budget = isElapsed ? elapsedBudget(sr, effectiveElapsed) : sr.budget
      return { budget, actual: sr.totalSales }
    }
    case 'gp': {
      const budget = isElapsed ? elapsedGpBudget(sr, effectiveElapsed) : sr.grossProfitBudget
      const actual = computeGpAfterConsumableAmount(sr)
      return { budget, actual }
    }
    case 'gpRate': {
      const budget = sr.grossProfitRateBudget * 100 // → %表示
      const actual = computeGpAfterConsumable(sr) * 100
      return { budget, actual }
    }
    case 'markupRate': {
      const budget = sr.grossProfitRateBudget * 100
      const actual = sr.averageMarkupRate * 100
      return { budget, actual }
    }
    case 'discountRate': {
      const budget = 0
      const actual = sr.discountRate * 100
      return { budget, actual }
    }
  }
}

// ─── YoY Extractors ─────────────────────────────────────

export function extractLySales(
  storeId: string,
  prevYear: PrevYearData,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  isElapsed: boolean,
  elapsedDays?: number,
): number | null {
  if (!prevYear.hasPrevYear) return null
  if (!prevYearMonthlyKpi.hasPrevYear) return null

  if (isElapsed && elapsedDays != null) {
    // 経過モード: storeContributions から mappedDay <= elapsedDays の分だけ合算
    const contributions = prevYearMonthlyKpi.sameDow.storeContributions.filter(
      (c) => c.storeId === storeId && c.mappedDay <= elapsedDays,
    )
    return contributions.length > 0 ? contributions.reduce((s, c) => s + c.sales, 0) : null
  }

  // 月間モード: storeContributions の全日合計
  const contributions = prevYearMonthlyKpi.sameDow.storeContributions.filter(
    (c) => c.storeId === storeId,
  )
  return contributions.length > 0 ? contributions.reduce((s, c) => s + c.sales, 0) : null
}

/**
 * 店舗の前年売変率を取得する（storeContributions から算出）
 *
 * discount / (sales + discount) × 100 で前年売変率（%表示済み）を返す。
 */
export function extractLyDiscountRate(
  storeId: string,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  isElapsed: boolean,
  elapsedDays?: number,
): number | null {
  if (!prevYearMonthlyKpi.hasPrevYear) return null

  const filter =
    isElapsed && elapsedDays != null
      ? (c: { storeId: string; mappedDay: number }) =>
          c.storeId === storeId && c.mappedDay <= elapsedDays
      : (c: { storeId: string }) => c.storeId === storeId

  const contributions = prevYearMonthlyKpi.sameDow.storeContributions.filter(filter)
  if (contributions.length === 0) return null

  const totalSales = contributions.reduce((s, c) => s + c.sales, 0)
  const totalDiscount = contributions.reduce((s, c) => s + c.discount, 0)
  return calculateDiscountRate(totalSales, totalDiscount) * 100
}

// ─── Achievement / YoY Calculation ──────────────────────

export function computeAchievement(actual: number, budget: number, isRate: boolean): number {
  if (isRate) return actual - budget // pp diff
  return calculateAchievementRate(actual, budget) * 100 // %
}

export function computeYoY(actual: number, ly: number | null, isRate: boolean): number | null {
  if (ly == null || ly === 0) return null
  if (isRate) return actual - ly // pp diff
  return calculateYoYRatio(actual, ly) * 100 // %
}
