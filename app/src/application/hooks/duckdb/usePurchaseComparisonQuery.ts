/**
 * 仕入比較クエリフック
 *
 * 当期・比較期の purchase テーブルを取引先別に集約し、
 * 前年比較データを構築する。date_key BETWEEN で同曜日にも対応。
 *
 * カテゴリ集約は supplierCategoryMap（settings）を使って JS 側で行う。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/CalendarDate'
import {
  queryPurchaseBySupplier,
  queryPurchaseTotal,
  queryPurchaseDaily,
  queryPurchaseByStore,
  querySalesDaily,
} from '@/infrastructure/duckdb/queries/purchaseComparison'
import { queryAggregatedRates } from '@/infrastructure/duckdb/queries/storeDaySummary'
import type {
  PurchaseComparisonResult,
  SupplierComparisonRow,
  CategoryComparisonRow,
  StoreComparisonRow,
  PurchaseComparisonKpi,
  PurchaseDailyData,
} from '@/domain/models/PurchaseComparison'
import type { CustomCategoryId } from '@/domain/constants/customCategories'
import type { PresetCategoryId } from '@/domain/constants/customCategories'
import {
  UNCATEGORIZED_CATEGORY_ID,
  PRESET_CATEGORY_LABELS,
  isPresetCategory,
  isUserCategory,
} from '@/domain/constants/customCategories'
import { useAsyncQuery, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'

// ── DateRange → date_key 変換 ──

function toDateKey(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

// ── カテゴリラベル解決 ──

function categoryLabel(
  catId: CustomCategoryId,
  userCategories: ReadonlyMap<string, string>,
): string {
  if (isPresetCategory(catId)) return PRESET_CATEGORY_LABELS[catId]
  return userCategories.get(catId) ?? catId.replace('user:', '')
}

// ── カテゴリ色解決 ──

const CUSTOM_CATEGORY_COLORS: Record<PresetCategoryId, string> = {
  market_purchase: '#f59e0b',
  lfc: '#3b82f6',
  salad: '#22c55e',
  processed: '#a855f7',
  consumables: '#ea580c',
  direct_delivery: '#06b6d4',
  other: '#64748b',
  uncategorized: '#94a3b8',
}

const USER_CATEGORY_DEFAULT_COLOR = '#14b8a6'

function categoryColor(catId: CustomCategoryId): string {
  if (isUserCategory(catId)) return USER_CATEGORY_DEFAULT_COLOR
  if (isPresetCategory(catId)) return CUSTOM_CATEGORY_COLORS[catId] ?? '#64748b'
  return '#64748b'
}

// ── 値入率算出 ──

function markupRate(cost: number, price: number): number {
  return price > 0 ? 1 - cost / price : 0
}

// ── フック ──

export function usePurchaseComparisonQuery(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  period1: DateRange,
  period2: DateRange,
  storeIds: ReadonlySet<string>,
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategoryId>>>,
  userCategories: ReadonlyMap<string, string>,
  storeNames: ReadonlyMap<string, string>,
): AsyncQueryResult<PurchaseComparisonResult> {
  const storeIdArr = useMemo(() => storeIdsToArray(storeIds), [storeIds])

  const curDateFrom = useMemo(() => toDateKey(period1.from), [period1.from])
  const curDateTo = useMemo(() => toDateKey(period1.to), [period1.to])
  const prevDateFrom = useMemo(() => toDateKey(period2.from), [period2.from])
  const prevDateTo = useMemo(() => toDateKey(period2.to), [period2.to])

  const queryFn = useMemo(() => {
    if (dataVersion === 0) return null

    return async (c: AsyncDuckDBConnection) => {
      // 並列: 当期/比較期の取引先別 + 合計 + 売上 + 日別
      const [
        curSuppliers,
        prevSuppliers,
        curTotal,
        prevTotal,
        curSales,
        prevSales,
        curDaily,
        prevDaily,
        curStores,
        prevStores,
        curSalesDaily,
        prevSalesDaily,
      ] = await Promise.all([
        queryPurchaseBySupplier(c, curDateFrom, curDateTo, storeIdArr),
        queryPurchaseBySupplier(c, prevDateFrom, prevDateTo, storeIdArr),
        queryPurchaseTotal(c, curDateFrom, curDateTo, storeIdArr),
        queryPurchaseTotal(c, prevDateFrom, prevDateTo, storeIdArr),
        queryAggregatedRates(c, {
          dateFrom: curDateFrom,
          dateTo: curDateTo,
          storeIds: storeIdArr,
          isPrevYear: false,
        }),
        queryAggregatedRates(c, {
          dateFrom: prevDateFrom,
          dateTo: prevDateTo,
          storeIds: storeIdArr,
          isPrevYear: true,
        }),
        queryPurchaseDaily(c, curDateFrom, curDateTo, storeIdArr),
        queryPurchaseDaily(c, prevDateFrom, prevDateTo, storeIdArr),
        queryPurchaseByStore(c, curDateFrom, curDateTo, storeIdArr),
        queryPurchaseByStore(c, prevDateFrom, prevDateTo, storeIdArr),
        querySalesDaily(c, curDateFrom, curDateTo, storeIdArr, false),
        querySalesDaily(c, prevDateFrom, prevDateTo, storeIdArr, true),
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
      const catMap = new Map<
        string,
        { catId: CustomCategoryId; curC: number; curP: number; prevC: number; prevP: number }
      >()

      for (const row of bySupplier) {
        const catId = supplierCategoryMap[row.supplierCode] ?? UNCATEGORIZED_CATEGORY_ID
        const label = categoryLabel(catId, userCategories)
        const existing = catMap.get(label) ?? { catId, curC: 0, curP: 0, prevC: 0, prevP: 0 }
        catMap.set(label, {
          catId: existing.catId,
          curC: existing.curC + row.currentCost,
          curP: existing.curP + row.currentPrice,
          prevC: existing.prevC + row.prevCost,
          prevP: existing.prevP + row.prevPrice,
        })
      }

      const byCategory: CategoryComparisonRow[] = []
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
          currentCostShare: curTotal.totalCost > 0 ? v.curC / curTotal.totalCost : 0,
          prevCostShare: prevTotal.totalCost > 0 ? v.prevC / prevTotal.totalCost : 0,
          costShareDiff:
            (curTotal.totalCost > 0 ? v.curC / curTotal.totalCost : 0) -
            (prevTotal.totalCost > 0 ? v.prevC / prevTotal.totalCost : 0),
          currentMarkupRate: markupRate(v.curC, v.curP),
          prevMarkupRate: markupRate(v.prevC, v.prevP),
          currentPriceShare: curTotal.totalPrice > 0 ? Math.abs(v.curP) / curTotal.totalPrice : 0,
          crossMultiplication:
            curTotal.totalPrice > 0 ? (v.curP - v.curC) / curTotal.totalPrice : 0,
        })
      }
      byCategory.sort((a, b) => b.currentCost - a.currentCost)

      // ── 日別データ（チャート用） ──
      const curSalesDayMap = new Map(curSalesDaily.map((r) => [r.day, r.totalSales]))
      const prevSalesDayMap = new Map(prevSalesDaily.map((r) => [r.day, r.totalSales]))

      const daily: PurchaseDailyData = {
        current: curDaily.map((r) => ({
          day: r.day,
          cost: r.totalCost,
          price: r.totalPrice,
          markup: r.totalPrice - r.totalCost,
          sales: curSalesDayMap.get(r.day) ?? 0,
        })),
        prev: prevDaily.map((r) => ({
          day: r.day,
          cost: r.totalCost,
          price: r.totalPrice,
          markup: r.totalPrice - r.totalCost,
          sales: prevSalesDayMap.get(r.day) ?? 0,
        })),
      }

      // ── 店舗別比較 ──
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
        currentCostToSalesRatio: curSalesTotal > 0 ? curTotal.totalCost / curSalesTotal : 0,
        prevCostToSalesRatio: prevSalesTotal > 0 ? prevTotal.totalCost / prevSalesTotal : 0,
        currentSales: curSalesTotal,
        prevSales: prevSalesTotal,
      }

      return {
        kpi,
        bySupplier,
        byCategory,
        byStore,
        daily,
        isReady: true,
      } satisfies PurchaseComparisonResult
    }
  }, [
    dataVersion,
    curDateFrom,
    curDateTo,
    prevDateFrom,
    prevDateTo,
    storeIdArr,
    supplierCategoryMap,
    userCategories,
    storeNames,
  ])

  return useAsyncQuery(conn, dataVersion, queryFn)
}
