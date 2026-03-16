import type { StoreResult, CustomCategory } from '@/domain/models'
import { CUSTOM_CATEGORIES } from '@/domain/models'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import {
  UNCATEGORIZED_CATEGORY_ID,
  PRESET_CATEGORY_DEFS,
  isUserCategory,
} from '@/domain/constants/customCategories'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '@/domain/constants/categories'
import type { CategoryType } from '@/domain/models'
import { calculateMarkupRate, calculateShare } from '@/domain/calculations/utils'

// ─── Types ───────────────────────────────────────────────

export type ComparisonMode = 'total' | 'comparison'
export type PieMode = 'cost' | 'price' | 'crossMult'
export type ChartView = 'pie' | 'pareto'

/** チャート共通データ型 */
export interface CategoryChartItem {
  label: string
  cost: number
  price: number
  markup: number
  color: string
}

// ─── Constants ───────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, string> = {
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

export const CUSTOM_CATEGORY_COLORS: Record<PresetCategoryId, string> = {
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

// ─── Data builders ───────────────────────────────────────

/** カテゴリ別データ生成ヘルパー */
export function buildCategoryData(result: StoreResult) {
  // 相乗積の合計が全体値入率と一致するよう、実際の売価合計を使用
  const totalPrice = CATEGORY_ORDER.reduce((sum, cat) => {
    const pair = result.categoryTotals.get(cat)
    return sum + (pair ? pair.price : 0)
  }, 0)
  const totalAbsPrice = CATEGORY_ORDER.reduce((sum, cat) => {
    const pair = result.categoryTotals.get(cat)
    return sum + (pair ? Math.abs(pair.price) : 0)
  }, 0)

  return CATEGORY_ORDER.flatMap((cat) => {
    const pair = result.categoryTotals.get(cat)
    if (!pair) return []
    const markupRate = calculateMarkupRate(pair.price - pair.cost, pair.price)
    const priceShare = calculateShare(Math.abs(pair.price), totalAbsPrice)
    // 相乗積 = (売価 - 原価) / 総売価 で直接計算（price=0の消耗品でも正確）
    const crossMultiplication = calculateShare(pair.price - pair.cost, totalPrice)
    return [
      {
        category: cat,
        label: CATEGORY_LABELS[cat],
        cost: pair.cost,
        price: pair.price,
        markup: markupRate,
        priceShare,
        crossMultiplication,
        color: CATEGORY_COLORS[cat] ?? '#64748b',
      },
    ]
  })
}

/** ユーザーカテゴリ用のデフォルトカラー */
const USER_CATEGORY_DEFAULT_COLOR = '#14b8a6'

/** カスタムカテゴリ集計データ生成 */
export function buildCustomCategoryData(
  result: StoreResult,
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategory>>>,
  userCategoryLabels: Readonly<Record<string, string>> = {},
) {
  const aggregated = new Map<CustomCategory, { cost: number; price: number }>()

  for (const [, st] of result.supplierTotals) {
    const customCat = supplierCategoryMap[st.supplierCode] ?? UNCATEGORIZED_CATEGORY_ID
    const existing = aggregated.get(customCat) ?? { cost: 0, price: 0 }
    aggregated.set(customCat, {
      cost: existing.cost + st.cost,
      price: existing.price + st.price,
    })
  }

  const totalPrice = Array.from(aggregated.values()).reduce((sum, v) => sum + v.price, 0)
  const totalAbsPrice = Array.from(aggregated.values()).reduce(
    (sum, v) => sum + Math.abs(v.price),
    0,
  )

  const rows: {
    category: string
    label: string
    cost: number
    price: number
    markup: number
    priceShare: number
    crossMultiplication: number
    color: string
  }[] = []

  // プリセットカテゴリ
  for (const cc of PRESET_CATEGORY_DEFS) {
    const pair = aggregated.get(cc.id as CustomCategory)
    if (!pair) continue
    rows.push({
      category: cc.id,
      label: cc.label,
      cost: pair.cost,
      price: pair.price,
      markup: calculateMarkupRate(pair.price - pair.cost, pair.price),
      priceShare: calculateShare(Math.abs(pair.price), totalAbsPrice),
      crossMultiplication: calculateShare(pair.price - pair.cost, totalPrice),
      color: CUSTOM_CATEGORY_COLORS[cc.id] ?? '#64748b',
    })
  }

  // ユーザーカテゴリ
  for (const [id, pair] of aggregated) {
    if (!isUserCategory(id)) continue
    rows.push({
      category: id,
      label: userCategoryLabels[id] ?? id.replace('user:', ''),
      cost: pair.cost,
      price: pair.price,
      markup: calculateMarkupRate(pair.price - pair.cost, pair.price),
      priceShare: calculateShare(Math.abs(pair.price), totalAbsPrice),
      crossMultiplication: calculateShare(pair.price - pair.cost, totalPrice),
      color: USER_CATEGORY_DEFAULT_COLOR,
    })
  }

  return rows
}

/** 統合カテゴリデータ型（標準 + カスタムカテゴリ） */
export interface UnifiedCategoryItem {
  category: string
  label: string
  cost: number
  price: number
  markup: number
  priceShare: number
  crossMultiplication: number
  color: string
  isCustom: boolean
}

/**
 * 標準カテゴリとカスタムカテゴリを統合し、構成比・相乗積を全体で再計算する。
 * これらの合計が「仕入全体」を表す。
 */
export function buildUnifiedCategoryData(
  result: StoreResult,
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategory>>>,
  userCategoryLabels: Readonly<Record<string, string>> = {},
): UnifiedCategoryItem[] {
  // 1. 標準カテゴリ（categoryTotals から）
  const items: {
    category: string
    label: string
    cost: number
    price: number
    color: string
    isCustom: boolean
  }[] = []

  for (const cat of CATEGORY_ORDER) {
    const pair = result.categoryTotals.get(cat)
    if (!pair) continue
    items.push({
      category: cat,
      label: CATEGORY_LABELS[cat as CategoryType],
      cost: pair.cost,
      price: pair.price,
      color: CATEGORY_COLORS[cat] ?? '#64748b',
      isCustom: false,
    })
  }

  // 2. カスタムカテゴリ（supplierTotals + supplierCategoryMap から）
  const aggregated = new Map<CustomCategory, { cost: number; price: number }>()
  for (const [, st] of result.supplierTotals) {
    const customCat = supplierCategoryMap[st.supplierCode] ?? UNCATEGORIZED_CATEGORY_ID
    const existing = aggregated.get(customCat) ?? { cost: 0, price: 0 }
    aggregated.set(customCat, {
      cost: existing.cost + st.cost,
      price: existing.price + st.price,
    })
  }

  // 2a. プリセットカテゴリ
  for (const cc of CUSTOM_CATEGORIES) {
    const pair = aggregated.get(cc.id as CustomCategory)
    if (!pair) continue
    items.push({
      category: cc.id,
      label: cc.label,
      cost: pair.cost,
      price: pair.price,
      color: CUSTOM_CATEGORY_COLORS[cc.id] ?? '#64748b',
      isCustom: true,
    })
  }

  // 2b. ユーザーカテゴリ
  for (const [id, pair] of aggregated) {
    if (!isUserCategory(id)) continue
    items.push({
      category: id,
      label: userCategoryLabels[id] ?? id.replace('user:', ''),
      cost: pair.cost,
      price: pair.price,
      color: USER_CATEGORY_DEFAULT_COLOR,
      isCustom: true,
    })
  }

  // 3. 全体で構成比・相乗積を再計算
  const totalPrice = items.reduce((sum, d) => sum + d.price, 0)
  const totalAbsPrice = items.reduce((sum, d) => sum + Math.abs(d.price), 0)

  return items.map((d) => ({
    category: d.category,
    label: d.label,
    cost: d.cost,
    price: d.price,
    markup: calculateMarkupRate(d.price - d.cost, d.price),
    priceShare: calculateShare(Math.abs(d.price), totalAbsPrice),
    crossMultiplication: calculateShare(d.price - d.cost, totalPrice),
    color: d.color,
    isCustom: d.isCustom,
  }))
}

/** パレート図ヘルパー: 降順ソート + 累計%を計算 */
export function buildParetoData(items: { name: string; value: number; color: string }[]) {
  const sorted = [...items].sort((a, b) => b.value - a.value)
  const total = sorted.reduce((s, d) => s + d.value, 0)
  let cumulative = 0
  return sorted.map((d) => {
    cumulative += d.value
    return {
      ...d,
      cumPct: calculateShare(cumulative, total),
    }
  })
}
