/**
 * 仕入比較クエリフック — 複合正本（purchaseCostHandler）を唯一の仕入原価ソースとする
 * @see readPurchaseCost.ts, purchase-cost-definition.md
 * @responsibility R:unclassified
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/CalendarDate'
import {
  querySupplierNames,
  querySalesDaily,
  querySalesTotal,
  queryEffectiveMaxDay,
} from '@/infrastructure/duckdb/queries/purchaseComparison'
import type { PurchaseComparisonResult } from '@/domain/models/PurchaseComparison'
import type { CustomCategoryId } from '@/domain/constants/customCategories'
import { storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'
import {
  toDateKey,
  buildKpi,
  buildDailyData,
  buildStoreData,
  buildDailyPivot,
} from './purchaseComparisonBuilders'
import type { KpiTotals } from './purchaseComparisonKpi'
import { buildSupplierAndCategoryData } from './purchaseComparisonCategory'
import {
  purchaseCostHandler,
  toPurchaseDailySupplierRows,
  toCategoryDailyRows,
  toDailyCostRows,
  toStoreCostRows,
} from '@/application/readModels/purchaseCost'

export function usePurchaseComparisonQuery(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  period1: DateRange,
  period2: DateRange,
  storeIds: ReadonlySet<string>,
  supplierCategoryMap: Readonly<Partial<Record<string, CustomCategoryId>>>,
  userCategories: ReadonlyMap<string, string>,
  storeNames: ReadonlyMap<string, string>,
  dowOffset = 0,
): AsyncQueryResult<PurchaseComparisonResult> {
  const storeIdArr = useMemo(() => storeIdsToArray(storeIds), [storeIds])
  const curDateFrom = useMemo(() => toDateKey(period1.from), [period1.from])
  const curDateTo = useMemo(() => toDateKey(period1.to), [period1.to])
  const prevDateFrom = useMemo(() => toDateKey(period2.from), [period2.from])
  const prevDateTo = useMemo(() => toDateKey(period2.to), [period2.to])

  const [data, setData] = useState<PurchaseComparisonResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const seqRef = useRef(0)

  useEffect(() => {
    if (!conn || dataVersion === 0) {
      ++seqRef.current
      return
    }
    const seq = ++seqRef.current
    let cancelled = false
    setIsLoading(true)
    setError(null)

    const run = async () => {
      try {
        const c = conn

        // ── 取り込み有効期間のキャップ ──
        const effectiveMaxDay = await queryEffectiveMaxDay(c, curDateFrom, curDateTo, storeIdArr)
        let cappedPrevDateTo = prevDateTo
        if (effectiveMaxDay != null) {
          const curFromDate = new Date(curDateFrom)
          const effectiveDays = effectiveMaxDay - curFromDate.getDate() + 1
          const prevFromDate = new Date(prevDateFrom)
          const prevToDate = new Date(prevDateTo)
          const prevDays =
            Math.round((prevToDate.getTime() - prevFromDate.getTime()) / 86_400_000) + 1
          if (prevDays > effectiveDays) {
            const cappedDate = new Date(prevFromDate)
            cappedDate.setDate(cappedDate.getDate() + effectiveDays - 1)
            const y = cappedDate.getFullYear()
            const m = String(cappedDate.getMonth() + 1).padStart(2, '0')
            const d = String(cappedDate.getDate()).padStart(2, '0')
            cappedPrevDateTo = `${y}-${m}-${d}`
          }
        }
        if (cancelled || seq !== seqRef.current) return

        // ── 全クエリを単一フェーズで並列実行 ──
        // 仕入原価は purchaseCostHandler が唯一の正本。旧 Total クエリは使用しない。
        const costInput = {
          dateFrom: curDateFrom,
          dateTo: curDateTo,
          storeIds: storeIdArr,
          dataVersion,
        }
        const prevCostInput = {
          dateFrom: prevDateFrom,
          dateTo: cappedPrevDateTo,
          storeIds: storeIdArr,
          dataVersion,
        }

        const [
          curCostOutput,
          prevCostOutput,
          curSalesTotal,
          prevSalesTotal,
          curSupplierNames,
          prevSupplierNames,
          curSalesDaily,
          prevSalesDaily,
        ] = await Promise.all([
          purchaseCostHandler.execute(c, costInput),
          purchaseCostHandler.execute(c, prevCostInput),
          querySalesTotal(c, curDateFrom, curDateTo, storeIdArr, false),
          querySalesTotal(c, prevDateFrom, cappedPrevDateTo, storeIdArr, false),
          querySupplierNames(c, curDateFrom, curDateTo, storeIdArr),
          querySupplierNames(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          querySalesDaily(c, curDateFrom, curDateTo, storeIdArr, false),
          querySalesDaily(c, prevDateFrom, cappedPrevDateTo, storeIdArr, false),
        ])
        if (cancelled || seq !== seqRef.current) return

        const curModel = curCostOutput.model
        const prevModel = prevCostOutput.model

        // ── 正本から全ビューを導出 ──
        const kpiTotals: KpiTotals = {
          allCurCost: curModel.grandTotalCost,
          allCurPrice: curModel.grandTotalPrice,
          allPrevCost: prevModel.grandTotalCost,
          allPrevPrice: prevModel.grandTotalPrice,
        }
        const kpi = buildKpi(kpiTotals, curSalesTotal, prevSalesTotal)

        const { bySupplier, byCategory, categorySuppliers } = buildSupplierAndCategoryData(
          curModel,
          prevModel,
          curSupplierNames,
          prevSupplierNames,
          supplierCategoryMap,
          userCategories,
          kpiTotals,
        )

        // 日別データは ReadModel から導出（全正本の日別合計）
        const daily = buildDailyData(
          toDailyCostRows(curModel),
          toDailyCostRows(prevModel),
          curSalesDaily,
          prevSalesDaily,
        )
        // 店舗別は ReadModel から導出（全正本の合計を storeId で集約）
        const byStore = buildStoreData(
          toStoreCostRows(curModel),
          toStoreCostRows(prevModel),
          storeNames,
        )

        const dailyPivot = buildDailyPivot(
          toPurchaseDailySupplierRows(curModel),
          toPurchaseDailySupplierRows(prevModel),
          toCategoryDailyRows(curModel.deliverySales),
          toCategoryDailyRows(prevModel.deliverySales),
          toCategoryDailyRows(curModel.transfers),
          toCategoryDailyRows(prevModel.transfers),
          byCategory,
          supplierCategoryMap,
          period1.from.year,
          period1.from.month,
          dowOffset,
        )

        setData({
          kpi,
          bySupplier,
          byCategory,
          byStore,
          daily,
          dailyPivot,
          categorySuppliers,
          isReady: true,
          isDetailReady: true,
        })
      } catch (err: unknown) {
        if (!cancelled && seq === seqRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)))
        }
      } finally {
        if (!cancelled && seq === seqRef.current) {
          setIsLoading(false)
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [
    conn,
    dataVersion,
    curDateFrom,
    curDateTo,
    prevDateFrom,
    prevDateTo,
    storeIdArr,
    supplierCategoryMap,
    userCategories,
    storeNames,
    period1.from.year,
    period1.from.month,
    dowOffset,
  ])

  return { data, isLoading, error }
}
