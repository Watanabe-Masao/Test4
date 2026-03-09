/**
 * 仕入比較クエリフック
 *
 * 当年・前年の purchase テーブルを取引先別に集約し、
 * 前年比較データを構築する。
 *
 * カテゴリ集約は supplierCategoryMap（settings）を使って JS 側で行う。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import {
  queryPurchaseBySupplier,
  queryPurchaseTotal,
} from '@/infrastructure/duckdb/queries/purchaseComparison'
import { queryAggregatedRates } from '@/infrastructure/duckdb/queries/storeDaySummary'
import type {
  PurchaseComparisonResult,
  SupplierComparisonRow,
  CategoryComparisonRow,
  PurchaseComparisonKpi,
} from '@/domain/models/PurchaseComparison'
import type { CustomCategoryId } from '@/domain/constants/customCategories'
import {
  UNCATEGORIZED_CATEGORY_ID,
  PRESET_CATEGORY_LABELS,
  isPresetCategory,
} from '@/domain/constants/customCategories'
import { useAsyncQuery, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'

// ── カテゴリラベル解決 ──

function categoryLabel(catId: CustomCategoryId, userCategories: ReadonlyMap<string, string>): string {
  if (isPresetCategory(catId)) return PRESET_CATEGORY_LABELS[catId]
  return userCategories.get(catId) ?? catId.replace('user:', '')
}

// ── 値入率算出 ──

function markupRate(cost: number, price: number): number {
  return price > 0 ? 1 - cost / price : 0
}

// ── フック ──

export function usePurchaseComparisonQuery(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  targetYear: number,
  targetMonth: number,
  prevYear: number,
  prevMonth: number,
  storeIds: ReadonlySet<string>,
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategoryId>>>,
  userCategories: ReadonlyMap<string, string>,
): AsyncQueryResult<PurchaseComparisonResult> {
  const storeIdArr = useMemo(() => storeIdsToArray(storeIds), [storeIds])

  const queryFn = useMemo(() => {
    if (dataVersion === 0) return null

    return async (c: AsyncDuckDBConnection) => {
      // 並列: 当年/前年の取引先別 + 合計 + 売上
      const dateFrom = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
      const dateTo = `${targetYear}-${String(targetMonth).padStart(2, '0')}-31`
      const prevDateFrom = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
      const prevDateTo = `${prevYear}-${String(prevMonth).padStart(2, '0')}-31`

      const [curSuppliers, prevSuppliers, curTotal, prevTotal, curSales, prevSales] =
        await Promise.all([
          queryPurchaseBySupplier(c, targetYear, targetMonth, storeIdArr),
          queryPurchaseBySupplier(c, prevYear, prevMonth, storeIdArr),
          queryPurchaseTotal(c, targetYear, targetMonth, storeIdArr),
          queryPurchaseTotal(c, prevYear, prevMonth, storeIdArr),
          queryAggregatedRates(c, {
            dateFrom,
            dateTo,
            storeIds: storeIdArr,
            isPrevYear: false,
          }),
          queryAggregatedRates(c, {
            dateFrom: prevDateFrom,
            dateTo: prevDateTo,
            storeIds: storeIdArr,
            isPrevYear: true,
          }),
        ])

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
      const catMap = new Map<string, { curC: number; curP: number; prevC: number; prevP: number }>()

      for (const row of bySupplier) {
        const catId = supplierCategoryMap[row.supplierCode] ?? UNCATEGORIZED_CATEGORY_ID
        const label = categoryLabel(catId, userCategories)
        const existing = catMap.get(label) ?? { curC: 0, curP: 0, prevC: 0, prevP: 0 }
        catMap.set(label, {
          curC: existing.curC + row.currentCost,
          curP: existing.curP + row.currentPrice,
          prevC: existing.prevC + row.prevCost,
          prevP: existing.prevP + row.prevPrice,
        })
      }

      const byCategory: CategoryComparisonRow[] = []
      for (const [cat, v] of catMap) {
        byCategory.push({
          category: cat,
          currentCost: v.curC,
          currentPrice: v.curP,
          prevCost: v.prevC,
          prevPrice: v.prevP,
          costDiff: v.curC - v.prevC,
          priceDiff: v.curP - v.prevP,
          costChangeRate: v.prevC > 0 ? (v.curC - v.prevC) / v.prevC : 0,
          currentCostShare: curTotal.totalCost > 0 ? v.curC / curTotal.totalCost : 0,
          prevCostShare: prevTotal.totalCost > 0 ? v.prevC / prevTotal.totalCost : 0,
          costShareDiff:
            (curTotal.totalCost > 0 ? v.curC / curTotal.totalCost : 0) -
            (prevTotal.totalCost > 0 ? v.prevC / prevTotal.totalCost : 0),
          currentMarkupRate: markupRate(v.curC, v.curP),
          prevMarkupRate: markupRate(v.prevC, v.prevP),
        })
      }
      byCategory.sort((a, b) => b.currentCost - a.currentCost)

      // ── KPI ──
      const curSalesTotal = curSales?.totalSales ?? 0
      const prevSalesTotal = prevSales?.totalSales ?? 0

      const kpi: PurchaseComparisonKpi = {
        currentTotalCost: curTotal.totalCost,
        prevTotalCost: prevTotal.totalCost,
        totalCostDiff: curTotal.totalCost - prevTotal.totalCost,
        totalCostChangeRate:
          prevTotal.totalCost > 0
            ? (curTotal.totalCost - prevTotal.totalCost) / prevTotal.totalCost
            : 0,
        currentTotalPrice: curTotal.totalPrice,
        prevTotalPrice: prevTotal.totalPrice,
        totalPriceDiff: curTotal.totalPrice - prevTotal.totalPrice,
        currentMarkupRate: markupRate(curTotal.totalCost, curTotal.totalPrice),
        prevMarkupRate: markupRate(prevTotal.totalCost, prevTotal.totalPrice),
        markupRateDiff:
          markupRate(curTotal.totalCost, curTotal.totalPrice) -
          markupRate(prevTotal.totalCost, prevTotal.totalPrice),
        currentCostToSalesRatio:
          curSalesTotal > 0 ? curTotal.totalCost / curSalesTotal : 0,
        prevCostToSalesRatio:
          prevSalesTotal > 0 ? prevTotal.totalCost / prevSalesTotal : 0,
        currentSales: curSalesTotal,
        prevSales: prevSalesTotal,
      }

      return {
        kpi,
        bySupplier,
        byCategory,
        isReady: true,
      } satisfies PurchaseComparisonResult
    }
  }, [
    dataVersion,
    targetYear,
    targetMonth,
    prevYear,
    prevMonth,
    storeIdArr,
    supplierCategoryMap,
    userCategories,
  ])

  return useAsyncQuery(conn, dataVersion, queryFn)
}
