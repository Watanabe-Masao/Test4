/**
 * 仕入比較クエリフック — Phase 1: KPI先行表示 → Phase 2: 複合正本で上書き
 * @see readPurchaseCost.ts, purchase-cost-definition.md
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/CalendarDate'
import {
  queryPurchaseBySupplier,
  queryPurchaseTotal,
  queryPurchaseDaily,
  queryPurchaseByStore,
  querySalesDaily,
  querySpecialSalesTotal,
  queryTransfersTotal,
  querySalesTotal,
  queryEffectiveMaxDay,
} from '@/infrastructure/duckdb/queries/purchaseComparison'
import type { PurchaseComparisonResult } from '@/domain/models/PurchaseComparison'
import type { CustomCategoryId } from '@/domain/constants/customCategories'
import { storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'
import {
  toDateKey,
  computeKpiTotals,
  buildKpi,
  buildSupplierAndCategoryData,
  buildDailyData,
  buildStoreData,
  buildDailyPivot,
} from './purchaseComparisonBuilders'
import {
  purchaseCostHandler,
  toPurchaseDailySupplierRows,
  toCategoryDailyRows,
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

        // ── Phase 0: 取り込み有効期間のキャップ ──
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

        // ── Phase 1: KPI 先行表示（高速） ──
        const [
          curTotal,
          prevTotal,
          curSalesTotal,
          prevSalesTotal,
          curSpecialTotal,
          prevSpecialTotal,
          curTransfersTotal,
          prevTransfersTotal,
        ] = await Promise.all([
          queryPurchaseTotal(c, curDateFrom, curDateTo, storeIdArr),
          queryPurchaseTotal(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          querySalesTotal(c, curDateFrom, curDateTo, storeIdArr, false),
          querySalesTotal(c, prevDateFrom, cappedPrevDateTo, storeIdArr, false),
          querySpecialSalesTotal(c, curDateFrom, curDateTo, storeIdArr),
          querySpecialSalesTotal(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          queryTransfersTotal(c, curDateFrom, curDateTo, storeIdArr),
          queryTransfersTotal(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
        ])

        if (cancelled || seq !== seqRef.current) return

        const kpiTotals = computeKpiTotals(
          curTotal,
          prevTotal,
          curSpecialTotal,
          prevSpecialTotal,
          curTransfersTotal,
          prevTransfersTotal,
        )
        const kpi = buildKpi(kpiTotals, curSalesTotal, prevSalesTotal)

        setData({
          kpi,
          bySupplier: [],
          byCategory: [],
          byStore: [],
          daily: { current: [], prev: [] },
          dailyPivot: {
            columns: [],
            rows: [],
            totals: {
              byColumn: {},
              grandCost: 0,
              grandPrice: 0,
              prevGrandCost: 0,
              prevGrandPrice: 0,
            },
          },
          categorySuppliers: {},
          isReady: true,
          isDetailReady: false,
        })

        // ── Phase 2: 詳細クエリ ──
        // 仕入原価は複合正本（purchaseCostHandler）から取得し、
        // 残存クエリ（取引先名・日別チャート・店舗比較・売上日別）と並列実行
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
          curSuppliers,
          prevSuppliers,
          curDaily,
          prevDaily,
          curStores,
          prevStores,
          curSalesDaily,
          prevSalesDaily,
        ] = await Promise.all([
          purchaseCostHandler.execute(c, costInput),
          purchaseCostHandler.execute(c, prevCostInput),
          queryPurchaseBySupplier(c, curDateFrom, curDateTo, storeIdArr),
          queryPurchaseBySupplier(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          queryPurchaseDaily(c, curDateFrom, curDateTo, storeIdArr),
          queryPurchaseDaily(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          queryPurchaseByStore(c, curDateFrom, curDateTo, storeIdArr),
          queryPurchaseByStore(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          querySalesDaily(c, curDateFrom, curDateTo, storeIdArr, false),
          querySalesDaily(c, prevDateFrom, cappedPrevDateTo, storeIdArr, false),
        ])

        if (cancelled || seq !== seqRef.current) return

        // ── 複合正本から既存ビルダー用のデータを抽出 ──
        const curModel = curCostOutput.model
        const prevModel = prevCostOutput.model

        const curDailyBySupplier = toPurchaseDailySupplierRows(curModel)
        const prevDailyBySupplier = toPurchaseDailySupplierRows(prevModel)
        const curSpecialDaily = toCategoryDailyRows(curModel.deliverySales)
        const prevSpecialDaily = toCategoryDailyRows(prevModel.deliverySales)
        const curTransfersDaily = toCategoryDailyRows(curModel.transfers)
        const prevTransfersDaily = toCategoryDailyRows(prevModel.transfers)

        // ── 詳細データ構築（既存ビルダーはそのまま使用） ──
        const { bySupplier, byCategory, categorySuppliers } = buildSupplierAndCategoryData(
          curSuppliers,
          prevSuppliers,
          curTotal,
          prevTotal,
          supplierCategoryMap,
          userCategories,
          curSpecialTotal,
          prevSpecialTotal,
          curTransfersTotal,
          prevTransfersTotal,
          // KPI totals は複合正本から導出
          {
            allCurCost: curModel.grandTotalCost,
            allCurPrice: curModel.grandTotalPrice,
            allPrevCost: prevModel.grandTotalCost,
            allPrevPrice: prevModel.grandTotalPrice,
          },
        )

        const daily = buildDailyData(curDaily, prevDaily, curSalesDaily, prevSalesDaily)
        const byStore = buildStoreData(curStores, prevStores, storeNames)

        const dailyPivot = buildDailyPivot(
          curDailyBySupplier,
          prevDailyBySupplier,
          curSpecialDaily,
          prevSpecialDaily,
          curTransfersDaily,
          prevTransfersDaily,
          byCategory,
          supplierCategoryMap,
          period1.from.year,
          period1.from.month,
          dowOffset,
        )

        // ── 一貫性保証: 複合正本の grandTotalCost を正とした KPI ──
        const reconciledKpi = buildKpi(
          {
            allCurCost: curModel.grandTotalCost,
            allCurPrice: curModel.grandTotalPrice,
            allPrevCost: prevModel.grandTotalCost,
            allPrevPrice: prevModel.grandTotalPrice,
          },
          curSalesTotal,
          prevSalesTotal,
        )

        setData({
          kpi: reconciledKpi,
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
