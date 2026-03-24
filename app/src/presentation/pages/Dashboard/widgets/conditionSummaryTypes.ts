/**
 * コンディションサマリー強化版 — 型定義 + メトリクス定義
 *
 * @guard F7 View は ViewModel のみ受け取る
 */

import type { DiscountEntry } from '@/domain/models/record'

// ─── Types ──────────────────────────────────────────────

export type MetricKey = 'sales' | 'gp' | 'gpRate' | 'markupRate' | 'discountRate'
export type PeriodTab = 'monthly' | 'elapsed'

/** Budget comparison が成立するメトリクス */
export type BudgetMetricKey = 'sales' | 'gp' | 'gpRate'
/** 比率のみ表示するメトリクス */
export type RateOnlyMetricKey = 'markupRate' | 'discountRate'

export function isBudgetMetric(key: MetricKey): key is BudgetMetricKey {
  return key === 'sales' || key === 'gp' || key === 'gpRate'
}

export interface MetricDef {
  readonly label: string
  readonly icon: string
  readonly color: string
  readonly isRate: boolean
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  sales: { label: '売上', icon: 'S', color: '#3b82f6', isRate: false },
  gp: { label: '粗利額', icon: 'GP', color: '#8b5cf6', isRate: false },
  gpRate: { label: '粗利率', icon: '%', color: '#06b6d4', isRate: true },
  markupRate: { label: '値入率', icon: 'M', color: '#f59e0b', isRate: true },
  discountRate: { label: '売変率', icon: 'D', color: '#ef4444', isRate: true },
}

export interface EnhancedRow {
  readonly storeId: string
  readonly storeName: string
  readonly budget: number
  readonly actual: number
  readonly ly: number | null
  readonly achievement: number
  readonly diff: number
  readonly yoy: number | null
  /** 粗利率メトリクス専用: 原算前粗利率 (×100済) */
  readonly gpBeforeConsumable: number | null
  /** 売変率メトリクス専用: 種別内訳 (71/72/73/74) */
  readonly discountEntries: readonly DiscountEntry[] | null
}

export interface EnhancedTotal {
  readonly budget: number
  readonly actual: number
  readonly ly: number | null
  readonly achievement: number
  readonly diff: number
  readonly yoy: number | null
  /** 粗利率メトリクス専用: 原算前粗利率 (×100済) */
  readonly gpBeforeConsumable: number | null
  /** 売変率メトリクス専用: 種別内訳 (71/72/73/74) */
  readonly discountEntries: readonly DiscountEntry[] | null
}
