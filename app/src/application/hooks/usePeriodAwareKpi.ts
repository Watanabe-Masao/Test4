/**
 * usePeriodAwareKpi — 期間連動 KPI フック
 *
 * periodSelection の period1 / period2 に連動して KPI 値を再集計する。
 *
 * ## データフロー（period1 / period2 共通パイプライン）
 *
 * 1. DuckDB: store_day_summary から生データを取得（テーブルA: period1, テーブルB: period2）
 * 2. JS: periodMetricsCalculator で指標を算出（PeriodMetrics[]）
 * 3. 集約: 複数店舗の PeriodMetrics を単一の MergedPeriodMetrics にマージ
 *
 * ## 使い分け
 *
 * - isFullMonth=true: StoreResult（JS計算エンジンの権威値）を使うべき
 * - isFullMonth=false: PeriodMetrics（DuckDB探索エンジン）を使う
 *
 * ## 2テーブル設計
 *
 * period1 と period2 は独立したクエリで取得し、独立した PeriodMetrics を返す。
 * 同一パイプライン（DuckDB → JS計算）を通るため、計算ロジックの一貫性が保証される。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import {
  useDuckDBStorePeriodMetrics,
  type PeriodMetrics,
} from '@/application/hooks/duckdb/useMetricsQueries'
import { safeDivide, calculateGrossProfitRate } from '@/domain/calculations/utils'

// ── 型定義 ──

/**
 * 複数店舗をマージした期間メトリクス
 *
 * PeriodMetrics の上位集合。storeId が 'MERGED' で、
 * 率の指標は合計値から再算出する。
 */
export type MergedPeriodMetrics = PeriodMetrics

export interface PeriodAwareKpiResult {
  /** マージ済み期間メトリクス — period1（DuckDB 未ロードまたは全月時は null） */
  readonly periodMetrics: MergedPeriodMetrics | null
  /** 店舗別期間メトリクス — period1 */
  readonly storeMetrics: readonly PeriodMetrics[] | null
  /** マージ済み期間メトリクス — period2（比較期間。無効時は null） */
  readonly period2Metrics: MergedPeriodMetrics | null
  /** 店舗別期間メトリクス — period2 */
  readonly store2Metrics: readonly PeriodMetrics[] | null
  /** DuckDB クエリ実行中（period1 or period2） */
  readonly isLoading: boolean
  /** 選択期間が月全日かどうか */
  readonly isFullMonth: boolean
  /** エラー */
  readonly error: Error | null
}

// ── マージ関数 ──

/**
 * 複数店舗の PeriodMetrics を合算して1つにマージする。
 *
 * 合計可能な値は SUM、率の指標は合計値から再導出する。
 */
function mergePeriodMetrics(metrics: readonly PeriodMetrics[]): MergedPeriodMetrics {
  if (metrics.length === 1) return { ...metrics[0], storeId: 'MERGED' }

  // 合算
  let totalSales = 0
  let totalCoreSales = 0
  let grossSales = 0
  let deliverySalesPrice = 0
  let deliverySalesCost = 0
  let totalFlowersPrice = 0
  let totalFlowersCost = 0
  let totalDirectProducePrice = 0
  let totalDirectProduceCost = 0
  let totalCost = 0
  let inventoryCost = 0
  let totalPurchaseCost = 0
  let totalPurchasePrice = 0
  let interStoreInCost = 0
  let interStoreInPrice = 0
  let interStoreOutCost = 0
  let interStoreOutPrice = 0
  let interDeptInCost = 0
  let interDeptInPrice = 0
  let interDeptOutCost = 0
  let interDeptOutPrice = 0
  let totalTransferCost = 0
  let totalTransferPrice = 0
  let totalDiscount = 0
  let totalCostInclusion = 0
  let totalCustomers = 0
  let grossProfitBudget = 0
  let hasDiscountData = false
  let purchaseMaxDay = 0

  // 在庫法は合算可能（各店舗の開始・終了在庫を合算）
  let openingInv = 0
  let closingInv = 0
  let hasInv = false

  // 推定法
  let estCogs = 0
  let estMargin = 0
  let estClosingInv = 0
  let hasEstClosing = false

  for (const m of metrics) {
    totalSales += m.totalSales
    totalCoreSales += m.totalCoreSales
    grossSales += m.grossSales
    deliverySalesPrice += m.deliverySalesPrice
    deliverySalesCost += m.deliverySalesCost
    totalFlowersPrice += m.totalFlowersPrice
    totalFlowersCost += m.totalFlowersCost
    totalDirectProducePrice += m.totalDirectProducePrice
    totalDirectProduceCost += m.totalDirectProduceCost
    totalCost += m.totalCost
    inventoryCost += m.inventoryCost
    totalPurchaseCost += m.totalPurchaseCost
    totalPurchasePrice += m.totalPurchasePrice
    interStoreInCost += m.interStoreInCost
    interStoreInPrice += m.interStoreInPrice
    interStoreOutCost += m.interStoreOutCost
    interStoreOutPrice += m.interStoreOutPrice
    interDeptInCost += m.interDeptInCost
    interDeptInPrice += m.interDeptInPrice
    interDeptOutCost += m.interDeptOutCost
    interDeptOutPrice += m.interDeptOutPrice
    totalTransferCost += m.totalTransferCost
    totalTransferPrice += m.totalTransferPrice
    totalDiscount += m.totalDiscount
    totalCostInclusion += m.totalCostInclusion
    totalCustomers += m.totalCustomers
    grossProfitBudget += m.grossProfitBudget
    if (m.hasDiscountData) hasDiscountData = true
    if (m.purchaseMaxDay > purchaseMaxDay) purchaseMaxDay = m.purchaseMaxDay

    if (m.openingInventory != null) {
      openingInv += m.openingInventory
      hasInv = true
    }
    if (m.closingInventory != null) {
      closingInv += m.closingInventory
    }

    estCogs += m.estMethodCogs
    estMargin += m.estMethodMargin
    if (m.estMethodClosingInventory != null) {
      estClosingInv += m.estMethodClosingInventory
      hasEstClosing = true
    }
  }

  // 率の再算出
  const discountRate = safeDivide(totalDiscount, grossSales, 0)
  const allPurchasePrice = totalPurchasePrice + deliverySalesPrice + totalTransferPrice
  const allPurchaseCost = totalPurchaseCost + deliverySalesCost + totalTransferCost
  const averageMarkupRate = safeDivide(allPurchasePrice - allPurchaseCost, allPurchasePrice, 0)

  const corePurchasePrice = totalPurchasePrice + totalTransferPrice
  const corePurchaseCost = totalPurchaseCost + totalTransferCost
  const coreMarkupRate = safeDivide(corePurchasePrice - corePurchaseCost, corePurchasePrice, 0)

  const salesDays = metrics.reduce((max, m) => Math.max(max, m.salesDays), 0)
  const totalDays = metrics.reduce((max, m) => Math.max(max, m.totalDays), 0)

  // 在庫法
  const invCogs = hasInv ? openingInv + totalCost - closingInv : null
  const invGrossProfit = invCogs != null ? totalSales - invCogs : null
  const invGrossProfitRate =
    invGrossProfit != null ? calculateGrossProfitRate(invGrossProfit, totalSales) : null

  return {
    storeId: 'MERGED',
    totalSales,
    totalCoreSales,
    grossSales,
    deliverySalesPrice,
    deliverySalesCost,
    totalFlowersPrice,
    totalFlowersCost,
    totalDirectProducePrice,
    totalDirectProduceCost,
    totalCost,
    inventoryCost,
    totalPurchaseCost,
    totalPurchasePrice,
    interStoreInCost,
    interStoreInPrice,
    interStoreOutCost,
    interStoreOutPrice,
    interDeptInCost,
    interDeptInPrice,
    interDeptOutCost,
    interDeptOutPrice,
    totalTransferCost,
    totalTransferPrice,
    totalDiscount,
    discountRate,
    discountLossCost:
      safeDivide(totalCoreSales * discountRate, 1 - coreMarkupRate, 0) * coreMarkupRate,
    averageMarkupRate,
    coreMarkupRate,
    totalCostInclusion,
    costInclusionRate: safeDivide(totalCostInclusion, totalSales, 0),
    totalCustomers,
    averageCustomersPerDay: safeDivide(totalCustomers, salesDays, 0),
    openingInventory: hasInv ? openingInv : null,
    closingInventory: hasInv ? closingInv : null,
    invMethodCogs: invCogs,
    invMethodGrossProfit: invGrossProfit,
    invMethodGrossProfitRate: invGrossProfitRate,
    estMethodCogs: estCogs,
    estMethodMargin: estMargin,
    estMethodMarginRate: calculateGrossProfitRate(estMargin, totalSales),
    estMethodClosingInventory: hasEstClosing ? estClosingInv : null,
    grossProfitBudget,
    salesDays,
    totalDays,
    purchaseMaxDay,
    hasDiscountData,
  }
}

// ── フック ──

/**
 * 期間連動 KPI を提供するフック。
 *
 * period1（当期）と period2（比較期）を独立したテーブルとして
 * 同一パイプライン（DuckDB → JS計算）で処理する。
 *
 * @param conn DuckDB 接続
 * @param dataVersion DuckDB データバージョン
 * @param currentDateRange periodSelection.period1 から導出された日付範囲
 * @param comparisonDateRange periodSelection.period2 から導出された比較日付範囲
 * @param comparisonEnabled 比較が有効か
 * @param storeIds 選択中の店舗 ID
 * @param daysInMonth 対象月の日数
 * @param defaultMarkupRate デフォルト値入率
 */
export function usePeriodAwareKpi(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  currentDateRange: DateRange | undefined,
  comparisonDateRange: DateRange | undefined,
  comparisonEnabled: boolean,
  storeIds: ReadonlySet<string>,
  daysInMonth: number,
  defaultMarkupRate: number,
): PeriodAwareKpiResult {
  // 月全日判定: from.day === 1 && to.day === daysInMonth
  const isFullMonth = useMemo(() => {
    if (!currentDateRange) return true
    return currentDateRange.from.day === 1 && currentDateRange.to.day >= daysInMonth
  }, [currentDateRange, daysInMonth])

  // ── テーブルA: period1（当期） ──
  // 全月時はクエリ不要（StoreResult を使う）
  const queryRange1 = isFullMonth ? undefined : currentDateRange

  const {
    data: storeMetrics,
    isLoading: isLoading1,
    error: error1,
  } = useDuckDBStorePeriodMetrics(conn, dataVersion, queryRange1, storeIds, defaultMarkupRate)

  const periodMetrics = useMemo(() => {
    if (!storeMetrics || storeMetrics.length === 0) return null
    return mergePeriodMetrics(storeMetrics)
  }, [storeMetrics])

  // ── テーブルB: period2（比較期） ──
  // 比較が無効の場合はクエリしない
  const queryRange2 = comparisonEnabled ? comparisonDateRange : undefined

  const {
    data: store2Metrics,
    isLoading: isLoading2,
    error: error2,
  } = useDuckDBStorePeriodMetrics(conn, dataVersion, queryRange2, storeIds, defaultMarkupRate)

  const period2Metrics = useMemo(() => {
    if (!store2Metrics || store2Metrics.length === 0) return null
    return mergePeriodMetrics(store2Metrics)
  }, [store2Metrics])

  return {
    periodMetrics,
    storeMetrics,
    period2Metrics,
    store2Metrics,
    isLoading: isLoading1 || isLoading2,
    isFullMonth,
    error: error1 ?? error2,
  }
}
