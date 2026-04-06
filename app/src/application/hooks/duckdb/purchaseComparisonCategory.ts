/**
 * 仕入比較 — 取引先・カテゴリ別データ構築（純粋関数）
 *
 * ReadModel（PurchaseCostReadModel）の purchase.rows を正本として使用し、
 * 取引先別・カテゴリ別の比較データを構築する。
 * 取引先名は supplierNames マップから解決する。
 *
 * @see readPurchaseCost.ts — 正本 read
 * @see purchase-cost-definition.md — 正本定義
 * @responsibility R:calculation
 */
import type {
  SupplierComparisonRow,
  CategoryComparisonRow,
} from '@/domain/models/PurchaseComparison'
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
import type { PurchaseCostReadModel } from '@/application/readModels/purchaseCost/PurchaseCostTypes'

/** 取引先別の集計中間構造  *
 * @responsibility R:calculation
 */
interface SupplierAccum {
  curCost: number
  curPrice: number
  prevCost: number
  prevPrice: number
}

/**
 * ReadModel + 名前マップ + special/transfers から取引先別・カテゴリ別データを構築する。
 *
 * 仕入原価の正本は ReadModel の purchase.rows。queryPurchaseBySupplier は廃止済み。
 *
 * @responsibility R:calculation
 */
export function buildSupplierAndCategoryData(
  curModel: PurchaseCostReadModel,
  prevModel: PurchaseCostReadModel,
  curSupplierNames: ReadonlyMap<string, string>,
  prevSupplierNames: ReadonlyMap<string, string>,
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategoryId>>>,
  userCategories: ReadonlyMap<string, string>,
  kpiTotals: KpiTotals,
): {
  bySupplier: SupplierComparisonRow[]
  byCategory: CategoryComparisonRow[]
  categorySuppliers: Record<string, readonly SupplierComparisonRow[]>
} {
  const { allCurCost, allCurPrice, allPrevCost } = kpiTotals

  // ── ReadModel の purchase.rows を supplierCode で集約 ──
  const curAccum = new Map<string, SupplierAccum>()
  for (const r of curModel.purchase.rows) {
    const existing = curAccum.get(r.supplierCode)
    if (existing) {
      existing.curCost += r.cost
      existing.curPrice += r.price
    } else {
      curAccum.set(r.supplierCode, {
        curCost: r.cost,
        curPrice: r.price,
        prevCost: 0,
        prevPrice: 0,
      })
    }
  }

  const prevAccum = new Map<string, SupplierAccum>()
  for (const r of prevModel.purchase.rows) {
    const existing = prevAccum.get(r.supplierCode)
    if (existing) {
      existing.prevCost += r.cost
      existing.prevPrice += r.price
    } else {
      prevAccum.set(r.supplierCode, {
        curCost: 0,
        curPrice: 0,
        prevCost: r.cost,
        prevPrice: r.price,
      })
    }
  }

  // 当期・前期を統合
  const allCodes = new Set([...curAccum.keys(), ...prevAccum.keys()])
  const supplierTotals = new Map<string, SupplierAccum>()
  for (const code of allCodes) {
    const cur = curAccum.get(code)
    const prev = prevAccum.get(code)
    supplierTotals.set(code, {
      curCost: cur?.curCost ?? 0,
      curPrice: cur?.curPrice ?? 0,
      prevCost: prev?.prevCost ?? 0,
      prevPrice: prev?.prevPrice ?? 0,
    })
  }

  // ── 取引先名を解決して SupplierComparisonRow 構築 ──
  const purchaseTotal = { cur: curModel.purchase.totalCost, prev: prevModel.purchase.totalCost }
  const bySupplier: SupplierComparisonRow[] = []
  for (const [code, totals] of supplierTotals) {
    const name = curSupplierNames.get(code) ?? prevSupplierNames.get(code) ?? '不明'
    const { curCost: cc, curPrice: cp, prevCost: pc, prevPrice: pp } = totals
    bySupplier.push({
      supplierCode: code,
      supplierName: name,
      currentCost: cc,
      currentPrice: cp,
      prevCost: pc,
      prevPrice: pp,
      costDiff: cc - pc,
      priceDiff: cp - pp,
      costChangeRate: pc > 0 ? (cc - pc) / pc : 0,
      currentCostShare: purchaseTotal.cur > 0 ? cc / purchaseTotal.cur : 0,
      prevCostShare: purchaseTotal.prev > 0 ? pc / purchaseTotal.prev : 0,
      costShareDiff:
        (purchaseTotal.cur > 0 ? cc / purchaseTotal.cur : 0) -
        (purchaseTotal.prev > 0 ? pc / purchaseTotal.prev : 0),
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

  // ── 売上納品を ReadModel からカテゴリに追加 ──
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

  // 売上納品（ReadModel の deliverySales から）
  const curDeliveryByKey = groupCategoryRows(curModel.deliverySales.rows)
  const prevDeliveryByKey = groupCategoryRows(prevModel.deliverySales.rows)
  for (const key of new Set([...curDeliveryByKey.keys(), ...prevDeliveryByKey.keys()])) {
    const catId = SPECIAL_SALES_CATEGORY_MAP[key]
    if (!catId) continue
    const cur = curDeliveryByKey.get(key)
    const prev = prevDeliveryByKey.get(key)
    addExtraCategory(key, catId, cur?.cost ?? 0, cur?.price ?? 0, prev?.cost ?? 0, prev?.price ?? 0)
  }

  // 移動原価（ReadModel の transfers から、IN+OUT ネット集約）
  const transferPairs: ReadonlyArray<{
    inKey: string
    outKey: string
    catId: PresetCategoryId
  }> = [
    { inKey: 'interStoreIn', outKey: 'interStoreOut', catId: 'inter_store' },
    { inKey: 'interDeptIn', outKey: 'interDeptOut', catId: 'inter_department' },
  ]
  const curTransferByKey = groupCategoryRows(curModel.transfers.rows)
  const prevTransferByKey = groupCategoryRows(prevModel.transfers.rows)
  for (const { inKey, outKey, catId } of transferPairs) {
    const curC =
      (curTransferByKey.get(inKey)?.cost ?? 0) + (curTransferByKey.get(outKey)?.cost ?? 0)
    const curP =
      (curTransferByKey.get(inKey)?.price ?? 0) + (curTransferByKey.get(outKey)?.price ?? 0)
    const prevC =
      (prevTransferByKey.get(inKey)?.cost ?? 0) + (prevTransferByKey.get(outKey)?.cost ?? 0)
    const prevP =
      (prevTransferByKey.get(inKey)?.price ?? 0) + (prevTransferByKey.get(outKey)?.price ?? 0)
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

// ── ヘルパー ──

function groupCategoryRows(
  rows: readonly { categoryKey: string; cost: number; price: number }[],
): Map<string, { cost: number; price: number }> {
  const map = new Map<string, { cost: number; price: number }>()
  for (const r of rows) {
    const existing = map.get(r.categoryKey)
    if (existing) {
      map.set(r.categoryKey, { cost: existing.cost + r.cost, price: existing.price + r.price })
    } else {
      map.set(r.categoryKey, { cost: r.cost, price: r.price })
    }
  }
  return map
}
