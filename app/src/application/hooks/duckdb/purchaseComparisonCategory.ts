/**
 * 仕入比較 — 取引先・カテゴリ別データ構築（純粋関数）
 *
 * purchaseComparisonBuilders.ts から分割。
 * 取引先別比較 → カテゴリ別集約のロジックを担う。
 */
import type {
  SupplierComparisonRow,
  CategoryComparisonRow,
} from '@/domain/models/PurchaseComparison'
import type { PurchaseSupplierRow } from '@/infrastructure/duckdb/queries/purchaseComparison'
import type { CustomCategoryId } from '@/domain/constants/customCategories'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import {
  UNCATEGORIZED_CATEGORY_ID,
  PRESET_CATEGORY_LABELS,
} from '@/domain/constants/customCategories'
import {
  categoryLabel,
  categoryColor,
  markupRate,
  SPECIAL_SALES_CATEGORY_MAP,
  type KpiTotals,
} from './purchaseComparisonKpi'

export function buildSupplierAndCategoryData(
  curSuppliers: readonly PurchaseSupplierRow[],
  prevSuppliers: readonly PurchaseSupplierRow[],
  curTotal: { totalCost: number; totalPrice: number },
  prevTotal: { totalCost: number; totalPrice: number },
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategoryId>>>,
  userCategories: ReadonlyMap<string, string>,
  curSpecialTotal: readonly { categoryKey: string; totalCost: number; totalPrice: number }[],
  prevSpecialTotal: readonly { categoryKey: string; totalCost: number; totalPrice: number }[],
  curTransfersTotal: readonly { categoryKey: string; totalCost: number; totalPrice: number }[],
  prevTransfersTotal: readonly { categoryKey: string; totalCost: number; totalPrice: number }[],
  kpiTotals: KpiTotals,
): {
  bySupplier: SupplierComparisonRow[]
  byCategory: CategoryComparisonRow[]
  categorySuppliers: Record<string, readonly SupplierComparisonRow[]>
} {
  const { allCurCost, allCurPrice, allPrevCost } = kpiTotals

  // ── 取引先別比較 ──
  const prevMap = new Map(prevSuppliers.map((r) => [r.supplierCode, r]))
  const allCodes = new Set([
    ...curSuppliers.map((r) => r.supplierCode),
    ...prevSuppliers.map((r) => r.supplierCode),
  ])

  const bySupplier: SupplierComparisonRow[] = []
  for (const code of allCodes) {
    const cur = curSuppliers.find((r) => r.supplierCode === code)
    const prev = prevMap.get(code)
    const cc = cur?.totalCost ?? 0
    const cp = cur?.totalPrice ?? 0
    const pc = prev?.totalCost ?? 0
    const pp = prev?.totalPrice ?? 0

    bySupplier.push({
      supplierCode: code,
      supplierName: cur?.supplierName ?? prev?.supplierName ?? '不明',
      currentCost: cc,
      currentPrice: cp,
      prevCost: pc,
      prevPrice: pp,
      costDiff: cc - pc,
      priceDiff: cp - pp,
      costChangeRate: pc > 0 ? (cc - pc) / pc : 0,
      currentCostShare: curTotal.totalCost > 0 ? cc / curTotal.totalCost : 0,
      prevCostShare: prevTotal.totalCost > 0 ? pc / prevTotal.totalCost : 0,
      costShareDiff:
        (curTotal.totalCost > 0 ? cc / curTotal.totalCost : 0) -
        (prevTotal.totalCost > 0 ? pc / prevTotal.totalCost : 0),
      currentMarkupRate: markupRate(cc, cp),
      prevMarkupRate: markupRate(pc, pp),
    })
  }
  bySupplier.sort((a, b) => b.currentCost - a.currentCost)

  // ── カテゴリ別集約 ──
  const catMap = new Map<
    string,
    {
      catId: CustomCategoryId
      curC: number
      curP: number
      prevC: number
      prevP: number
      suppliers: SupplierComparisonRow[]
    }
  >()

  for (const row of bySupplier) {
    const catId = supplierCategoryMap[row.supplierCode] ?? UNCATEGORIZED_CATEGORY_ID
    const label = categoryLabel(catId, userCategories)
    const existing = catMap.get(label) ?? {
      catId,
      curC: 0,
      curP: 0,
      prevC: 0,
      prevP: 0,
      suppliers: [],
    }
    catMap.set(label, {
      catId: existing.catId,
      curC: existing.curC + row.currentCost,
      curP: existing.curP + row.currentPrice,
      prevC: existing.prevC + row.prevCost,
      prevP: existing.prevP + row.prevPrice,
      suppliers: [...existing.suppliers, row],
    })
  }

  // ── special_sales / transfers をカテゴリに追加 ──
  const addExtraCategory = (
    key: string,
    catId: PresetCategoryId,
    curC: number,
    curP: number,
    prevC: number,
    prevP: number,
  ) => {
    if (curC === 0 && curP === 0 && prevC === 0 && prevP === 0) return
    const label = PRESET_CATEGORY_LABELS[catId]
    const existing = catMap.get(label)
    if (existing) {
      catMap.set(label, {
        ...existing,
        curC: existing.curC + curC,
        curP: existing.curP + curP,
        prevC: existing.prevC + prevC,
        prevP: existing.prevP + prevP,
      })
    } else {
      catMap.set(label, {
        catId,
        curC,
        curP,
        prevC,
        prevP,
        suppliers: [
          {
            supplierCode: `__${key}__`,
            supplierName: label,
            currentCost: curC,
            currentPrice: curP,
            prevCost: prevC,
            prevPrice: prevP,
            costDiff: curC - prevC,
            priceDiff: curP - prevP,
            costChangeRate: prevC > 0 ? (curC - prevC) / prevC : 0,
            currentCostShare: 0,
            prevCostShare: 0,
            costShareDiff: 0,
            currentMarkupRate: markupRate(curC, curP),
            prevMarkupRate: markupRate(prevC, prevP),
          },
        ],
      })
    }
  }

  const curSpecialMap = new Map(curSpecialTotal.map((r) => [r.categoryKey, r]))
  const prevSpecialMap = new Map(prevSpecialTotal.map((r) => [r.categoryKey, r]))
  for (const key of new Set([
    ...curSpecialTotal.map((r) => r.categoryKey),
    ...prevSpecialTotal.map((r) => r.categoryKey),
  ])) {
    const catId = SPECIAL_SALES_CATEGORY_MAP[key]
    if (!catId) continue
    const cur = curSpecialMap.get(key)
    const prev = prevSpecialMap.get(key)
    addExtraCategory(
      key,
      catId,
      cur?.totalCost ?? 0,
      cur?.totalPrice ?? 0,
      prev?.totalCost ?? 0,
      prev?.totalPrice ?? 0,
    )
  }

  // 移動原価は全方向（IN + OUT）を含め、同一カテゴリにネット集約する。
  // OUT はマイナスの仕入として加算される（purchase-cost-definition.md §4）。
  const curTransMap = new Map(curTransfersTotal.map((r) => [r.categoryKey, r]))
  const prevTransMap = new Map(prevTransfersTotal.map((r) => [r.categoryKey, r]))
  const transferPairs: ReadonlyArray<{
    inKey: string
    outKey: string
    catId: PresetCategoryId
  }> = [
    { inKey: 'interStoreIn', outKey: 'interStoreOut', catId: 'inter_store' },
    { inKey: 'interDeptIn', outKey: 'interDeptOut', catId: 'inter_department' },
  ]
  for (const { inKey, outKey, catId } of transferPairs) {
    const curIn = curTransMap.get(inKey)
    const curOut = curTransMap.get(outKey)
    const prevIn = prevTransMap.get(inKey)
    const prevOut = prevTransMap.get(outKey)
    const curC = (curIn?.totalCost ?? 0) + (curOut?.totalCost ?? 0)
    const curP = (curIn?.totalPrice ?? 0) + (curOut?.totalPrice ?? 0)
    const prevC = (prevIn?.totalCost ?? 0) + (prevOut?.totalCost ?? 0)
    const prevP = (prevIn?.totalPrice ?? 0) + (prevOut?.totalPrice ?? 0)
    if (curC !== 0 || curP !== 0 || prevC !== 0 || prevP !== 0) {
      addExtraCategory(inKey, catId, curC, curP, prevC, prevP)
    }
  }

  // ── CategoryComparisonRow 構築 ──
  const byCategory: CategoryComparisonRow[] = []
  const categorySuppliers: Record<string, readonly SupplierComparisonRow[]> = {}
  for (const [cat, v] of catMap) {
    byCategory.push({
      categoryId: v.catId,
      category: cat,
      color: categoryColor(v.catId),
      currentCost: v.curC,
      currentPrice: v.curP,
      prevCost: v.prevC,
      prevPrice: v.prevP,
      costDiff: v.curC - v.prevC,
      priceDiff: v.curP - v.prevP,
      costChangeRate: v.prevC > 0 ? (v.curC - v.prevC) / v.prevC : 0,
      currentCostShare: allCurCost > 0 ? v.curC / allCurCost : 0,
      prevCostShare: allPrevCost > 0 ? v.prevC / allPrevCost : 0,
      costShareDiff:
        (allCurCost > 0 ? v.curC / allCurCost : 0) - (allPrevCost > 0 ? v.prevC / allPrevCost : 0),
      currentMarkupRate: markupRate(v.curC, v.curP),
      prevMarkupRate: markupRate(v.prevC, v.prevP),
      currentPriceShare: allCurPrice > 0 ? Math.abs(v.curP) / allCurPrice : 0,
      crossMultiplication: allCurPrice > 0 ? (v.curP - v.curC) / allCurPrice : 0,
    })
    categorySuppliers[v.catId] = v.suppliers
  }
  byCategory.sort((a, b) => b.currentCost - a.currentCost)

  return { bySupplier, byCategory, categorySuppliers }
}
