/**
 * 仕入比較クエリフック
 *
 * 当期・比較期の purchase + special_sales + transfers テーブルを
 * 取引先別・カテゴリ別に集約し、前年比較データを構築する。
 * date_key BETWEEN で同曜日にも対応。
 *
 * データ構築ロジックは purchaseComparisonBuilders.ts に分離。
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/CalendarDate'
import {
  queryPurchaseBySupplier,
  queryPurchaseTotal,
  queryPurchaseDaily,
  queryPurchaseDailyBySupplier,
  queryPurchaseByStore,
  querySalesDaily,
  querySpecialSalesDaily,
  querySpecialSalesTotal,
  queryTransfersDaily,
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
  const [error, setError] = useState<string | null>(null)
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
        // 当期の実データ最終日を取得し、前期の日付範囲を同日数にキャップ
        const effectiveMaxDay = await queryEffectiveMaxDay(c, curDateFrom, curDateTo, storeIdArr)
        let cappedPrevDateTo = prevDateTo
        if (effectiveMaxDay != null) {
          const prevDay = Number(prevDateTo.split('-')[2])
          if (prevDay > effectiveMaxDay) {
            const prevPrefix = prevDateTo.substring(0, 8) // 'YYYY-MM-'
            cappedPrevDateTo = `${prevPrefix}${String(effectiveMaxDay).padStart(2, '0')}`
          }
        }

        if (cancelled || seq !== seqRef.current) return

        // ── Phase 1: KPI用の合計クエリ（8件）を先行実行 ──
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

        // ── KPI を即座に計算・表示 ──
        const kpiTotals = computeKpiTotals(
          curTotal,
          prevTotal,
          curSpecialTotal,
          prevSpecialTotal,
          curTransfersTotal,
          prevTransfersTotal,
        )
        const kpi = buildKpi(kpiTotals, curSalesTotal, prevSalesTotal)

        // KPI だけ先に表示（詳細はプレースホルダ）
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

        // ── Phase 2: 詳細クエリ（14件）──
        const [
          curSuppliers,
          prevSuppliers,
          curDaily,
          prevDaily,
          curStores,
          prevStores,
          curSalesDaily,
          prevSalesDaily,
          curDailyBySupplier,
          curSpecialDaily,
          curTransfersDaily2,
          prevDailyBySupplier,
          prevSpecialDaily,
          prevTransfersDaily,
        ] = await Promise.all([
          queryPurchaseBySupplier(c, curDateFrom, curDateTo, storeIdArr),
          queryPurchaseBySupplier(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          queryPurchaseDaily(c, curDateFrom, curDateTo, storeIdArr),
          queryPurchaseDaily(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          queryPurchaseByStore(c, curDateFrom, curDateTo, storeIdArr),
          queryPurchaseByStore(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          querySalesDaily(c, curDateFrom, curDateTo, storeIdArr, false),
          querySalesDaily(c, prevDateFrom, cappedPrevDateTo, storeIdArr, false),
          queryPurchaseDailyBySupplier(c, curDateFrom, curDateTo, storeIdArr),
          querySpecialSalesDaily(c, curDateFrom, curDateTo, storeIdArr),
          queryTransfersDaily(c, curDateFrom, curDateTo, storeIdArr),
          queryPurchaseDailyBySupplier(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          querySpecialSalesDaily(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
          queryTransfersDaily(c, prevDateFrom, cappedPrevDateTo, storeIdArr),
        ])

        if (cancelled || seq !== seqRef.current) return

        // ── 詳細データ構築 ──
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
          kpiTotals,
        )

        const daily = buildDailyData(curDaily, prevDaily, curSalesDaily, prevSalesDaily)
        const byStore = buildStoreData(curStores, prevStores, storeNames)

        const dailyPivot = buildDailyPivot(
          curDailyBySupplier,
          prevDailyBySupplier,
          curSpecialDaily,
          prevSpecialDaily,
          curTransfersDaily2,
          prevTransfersDaily,
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
          setError(err instanceof Error ? err.message : String(err))
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
