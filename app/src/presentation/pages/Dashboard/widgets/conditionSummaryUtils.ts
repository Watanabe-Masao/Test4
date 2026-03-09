import { palette } from '@/presentation/theme/tokens'
import { safeDivide, getEffectiveGrossProfitRate } from '@/domain/calculations/utils'
import type { MetricId, StoreResult, CustomCategory } from '@/domain/models'
import type { ConditionMetricId } from '@/domain/models'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { resolveThresholds, evaluateSignal } from '@/domain/calculations/rules/conditionResolver'
import { CONDITION_METRIC_MAP } from '@/domain/constants/conditionMetrics'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import {
  UNCATEGORIZED_CATEGORY_ID,
  PRESET_CATEGORY_DEFS,
  isUserCategory,
} from '@/domain/constants/customCategories'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/domain/constants/categories'
import { useSettingsStore } from '@/application/stores/settingsStore'

// ─── Signal Types ───────────────────────────────────────

export type SignalLevel = 'blue' | 'yellow' | 'red' | 'warning'

export const SIGNAL_COLORS: Record<SignalLevel, string> = {
  blue: palette.positive,
  yellow: palette.caution,
  red: palette.negative,
  warning: palette.dangerDark,
}

export type DisplayMode = 'rate' | 'amount'

export interface ConditionItem {
  label: string
  value: string
  sub?: string
  signal: SignalLevel
  metricId?: MetricId
  storeValue?: (sr: StoreResult) => { value: string; signal: SignalLevel }
  detailBreakdown?:
    | 'gpRate'
    | 'discountRate'
    | 'markupRate'
    | 'costInclusion'
    | 'salesYoY'
    | 'customerYoY'
    | 'txValue'
    | 'dailySales'
}

// ─── Signal Logic ───────────────────────────────────────

/** レジストリベースのシグナル判定ヘルパー */
export function metricSignal(
  value: number,
  metricId: ConditionMetricId,
  config: ConditionSummaryConfig,
  storeId?: string,
): SignalLevel {
  const def = CONDITION_METRIC_MAP.get(metricId)
  if (!def) return 'blue'
  const thresholds = resolveThresholds(config, metricId, storeId)
  return evaluateSignal(value, thresholds, def.direction)
}

// ─── GP Helpers ─────────────────────────────────────────

export function computeGpAfterConsumable(sr: StoreResult): number {
  return sr.invMethodGrossProfitRate != null
    ? safeDivide(sr.invMethodGrossProfit! - sr.totalCostInclusion, sr.totalSales, 0)
    : sr.estMethodMarginRate
}

export function computeGpBeforeConsumable(sr: StoreResult): number {
  return getEffectiveGrossProfitRate(sr)
}

export function computeGpAmount(sr: StoreResult): number {
  return sr.invMethodGrossProfit ?? sr.estMethodMargin
}

export function computeGpAfterConsumableAmount(sr: StoreResult): number {
  return computeGpAmount(sr) - sr.totalCostInclusion
}

// ─── Store Breakdown Extractors ─────────────────────────

export function customersBreakdown(sr: StoreResult): { value: string; signal: SignalLevel } {
  return {
    value: `${sr.totalCustomers.toLocaleString()}人`,
    signal: 'blue',
  }
}

export function txValueBreakdown(sr: StoreResult): { value: string; signal: SignalLevel } {
  const tx = sr.transactionValue
  return {
    value: `${tx.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}円`,
    signal: 'blue',
  }
}

// ─── Cross-Multiplication (相乗積) ─────────────────────

export interface CategoryCrossRow {
  readonly label: string
  readonly cost: number
  readonly price: number
  readonly markupRate: number
  readonly priceShare: number
  readonly crossMultiplication: number
  readonly color: string
}

const CROSS_COLORS: Record<string, string> = {
  market: '#f59e0b',
  lfc: '#3b82f6',
  saladClub: '#22c55e',
  processed: '#a855f7',
  directDelivery: '#06b6d4',
  flowers: '#ec4899',
  directProduce: '#84cc16',
  consumables: '#ea580c',
  interStore: '#f43f5e',
  interDepartment: '#8b5cf6',
  other: '#64748b',
}

const CUSTOM_CROSS_COLORS: Record<PresetCategoryId, string> = {
  market_purchase: '#f59e0b',
  lfc: '#3b82f6',
  salad: '#22c55e',
  processed: '#a855f7',
  consumables: '#ea580c',
  direct_delivery: '#06b6d4',
  flowers: '#ec4899',
  direct_produce: '#84cc16',
  inter_store: '#8b5cf6',
  inter_department: '#f97316',
  other: '#64748b',
  uncategorized: '#94a3b8',
}

/**
 * 標準カテゴリ＋カスタムカテゴリの統合相乗積テーブルを構築する。
 * 相乗積は全カテゴリの総合集計として値入率の内訳を表す。
 */
export function buildCrossMult(
  sr: StoreResult,
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategory>>>,
): CategoryCrossRow[] {
  // 1. 標準カテゴリ
  const items: { label: string; cost: number; price: number; color: string }[] = []
  for (const cat of CATEGORY_ORDER) {
    const pair = sr.categoryTotals.get(cat)
    if (!pair || (pair.cost === 0 && pair.price === 0)) continue
    items.push({
      label: CATEGORY_LABELS[cat],
      cost: pair.cost,
      price: pair.price,
      color: CROSS_COLORS[cat] ?? '#64748b',
    })
  }

  // 2. カスタムカテゴリ（supplierTotals を集約）
  const customAgg = new Map<CustomCategory, { cost: number; price: number }>()
  for (const [, st] of sr.supplierTotals) {
    const customCat = supplierCategoryMap[st.supplierCode] ?? UNCATEGORIZED_CATEGORY_ID
    const existing = customAgg.get(customCat) ?? { cost: 0, price: 0 }
    customAgg.set(customCat, {
      cost: existing.cost + st.cost,
      price: existing.price + st.price,
    })
  }
  const userCategoryLabels = useSettingsStore.getState().settings.userCategoryLabels ?? {}
  for (const cc of PRESET_CATEGORY_DEFS) {
    const pair = customAgg.get(cc.id as CustomCategory)
    if (!pair || (pair.cost === 0 && pair.price === 0)) continue
    items.push({
      label: cc.label,
      cost: pair.cost,
      price: pair.price,
      color: CUSTOM_CROSS_COLORS[cc.id] ?? '#64748b',
    })
  }
  // ユーザーカテゴリ
  for (const [id, pair] of customAgg) {
    if (!isUserCategory(id) || (pair.cost === 0 && pair.price === 0)) continue
    items.push({
      label: userCategoryLabels[id] ?? id.replace('user:', ''),
      cost: pair.cost,
      price: pair.price,
      color: '#14b8a6',
    })
  }

  // 3. 全体で構成比・相乗積を計算
  const totalPrice = items.reduce((sum, d) => sum + d.price, 0)
  const totalAbsPrice = items.reduce((sum, d) => sum + Math.abs(d.price), 0)

  return items.map((d) => ({
    label: d.label,
    cost: d.cost,
    price: d.price,
    markupRate: safeDivide(d.price - d.cost, d.price, 0),
    priceShare: safeDivide(Math.abs(d.price), totalAbsPrice, 0),
    crossMultiplication: safeDivide(d.price - d.cost, totalPrice, 0),
    color: d.color,
  }))
}
