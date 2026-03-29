/**
 * 仕入比較 — ユーティリティ・KPI・店舗構築（純粋関数）
 *
 * purchaseComparisonBuilders.ts から分割。
 * 共有定数・ユーティリティ関数・KPI 計算・店舗比較を担う。
 */
import type { StoreComparisonRow, PurchaseComparisonKpi } from '@/domain/models/PurchaseComparison'
import type { PurchaseStoreRow } from '@/infrastructure/duckdb/queries/purchaseComparison'
import type { CustomCategoryId } from '@/domain/constants/customCategories'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import {
  PRESET_CATEGORY_LABELS,
  isPresetCategory,
  isUserCategory,
} from '@/domain/constants/customCategories'

// ── DateRange → date_key 変換 ──

export function toDateKey(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

// ── カテゴリラベル解決 ──

export function categoryLabel(
  catId: CustomCategoryId,
  userCategories: ReadonlyMap<string, string>,
): string {
  if (isPresetCategory(catId)) return PRESET_CATEGORY_LABELS[catId]
  return userCategories.get(catId) ?? catId.replace('user:', '')
}

// ── カテゴリ色解決 ──

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

const USER_CATEGORY_DEFAULT_COLOR = '#14b8a6'

export function categoryColor(catId: CustomCategoryId): string {
  if (isUserCategory(catId)) return USER_CATEGORY_DEFAULT_COLOR
  if (isPresetCategory(catId)) return CUSTOM_CATEGORY_COLORS[catId] ?? '#64748b'
  return '#64748b'
}

// ── 値入率算出 ──

export function markupRate(cost: number, price: number): number {
  return price > 0 ? 1 - cost / price : 0
}

// ── special_sales / transfers のキー → PresetCategoryId 変換 ──

export const SPECIAL_SALES_CATEGORY_MAP: Record<string, PresetCategoryId> = {
  flowers: 'flowers',
  directProduce: 'direct_produce',
}

export const TRANSFERS_CATEGORY_MAP: Record<string, PresetCategoryId> = {
  interStoreIn: 'inter_store',
  interStoreOut: 'inter_store',
  interDeptIn: 'inter_department',
  interDeptOut: 'inter_department',
}

// ── KPI 合計値の中間構造 ──

export interface KpiTotals {
  readonly allCurCost: number
  readonly allCurPrice: number
  readonly allPrevCost: number
  readonly allPrevPrice: number
}

export function computeKpiTotals(
  curTotal: { totalCost: number; totalPrice: number },
  prevTotal: { totalCost: number; totalPrice: number },
  curSpecialTotal: readonly { categoryKey: string; totalCost: number; totalPrice: number }[],
  prevSpecialTotal: readonly { categoryKey: string; totalCost: number; totalPrice: number }[],
  curTransfersTotal: readonly { categoryKey: string; totalCost: number; totalPrice: number }[],
  prevTransfersTotal: readonly { categoryKey: string; totalCost: number; totalPrice: number }[],
): KpiTotals {
  let allCurCost = curTotal.totalCost
  let allCurPrice = curTotal.totalPrice
  let allPrevCost = prevTotal.totalCost
  let allPrevPrice = prevTotal.totalPrice
  for (const r of curSpecialTotal) {
    allCurCost += r.totalCost
    allCurPrice += r.totalPrice
  }
  for (const r of prevSpecialTotal) {
    allPrevCost += r.totalCost
    allPrevPrice += r.totalPrice
  }
  // 移動原価は全方向（IN + OUT）を含める。
  // IN のみだと二重計上が発生する（purchase-cost-definition.md §4）。
  // OUT はマイナスの仕入として商品+原価の移動を表す。
  for (const r of curTransfersTotal) {
    allCurCost += r.totalCost
    allCurPrice += r.totalPrice
  }
  for (const r of prevTransfersTotal) {
    allPrevCost += r.totalCost
    allPrevPrice += r.totalPrice
  }
  return { allCurCost, allCurPrice, allPrevCost, allPrevPrice }
}

export function buildKpi(
  totals: KpiTotals,
  curSalesTotal: number,
  prevSalesTotal: number,
): PurchaseComparisonKpi {
  const { allCurCost, allCurPrice, allPrevCost, allPrevPrice } = totals
  return {
    currentTotalCost: allCurCost,
    prevTotalCost: allPrevCost,
    totalCostDiff: allCurCost - allPrevCost,
    totalCostChangeRate: allPrevCost > 0 ? (allCurCost - allPrevCost) / allPrevCost : 0,
    currentTotalPrice: allCurPrice,
    prevTotalPrice: allPrevPrice,
    totalPriceDiff: allCurPrice - allPrevPrice,
    currentMarkupRate: markupRate(allCurCost, allCurPrice),
    prevMarkupRate: markupRate(allPrevCost, allPrevPrice),
    markupRateDiff: markupRate(allCurCost, allCurPrice) - markupRate(allPrevCost, allPrevPrice),
    currentCostToSalesRatio: curSalesTotal > 0 ? allCurCost / curSalesTotal : 0,
    prevCostToSalesRatio: prevSalesTotal > 0 ? allPrevCost / prevSalesTotal : 0,
    currentSales: curSalesTotal,
    prevSales: prevSalesTotal,
  }
}

// ── 店舗別データ構築 ──

export function buildStoreData(
  curStores: readonly PurchaseStoreRow[],
  prevStores: readonly PurchaseStoreRow[],
  storeNames: ReadonlyMap<string, string>,
): StoreComparisonRow[] {
  const prevStoreMap = new Map(prevStores.map((r) => [r.storeId, r]))
  const allStoreIds = new Set([
    ...curStores.map((r) => r.storeId),
    ...prevStores.map((r) => r.storeId),
  ])
  const byStore: StoreComparisonRow[] = []
  for (const sid of allStoreIds) {
    const cur = curStores.find((r) => r.storeId === sid)
    const prev = prevStoreMap.get(sid)
    const cc = cur?.totalCost ?? 0
    const cp = cur?.totalPrice ?? 0
    const pc = prev?.totalCost ?? 0
    const pp = prev?.totalPrice ?? 0
    byStore.push({
      storeId: sid,
      storeName: storeNames.get(sid) ?? sid,
      currentCost: cc,
      currentPrice: cp,
      prevCost: pc,
      prevPrice: pp,
      costDiff: cc - pc,
      currentMarkupRate: markupRate(cc, cp),
      prevMarkupRate: markupRate(pc, pp),
    })
  }
  byStore.sort((a, b) => b.currentCost - a.currentCost)
  return byStore
}
