/**
 * useStoreMetrics — DuckDB SQL 計算結果を StoreMetrics として提供するフック
 *
 * StorePeriodMetricsRow（SQL CTE 計算結果）を StoreMetrics（ドメイン型）に変換し、
 * StoreResult の代替として KPI カード・チャート等のウィジェットに提供する。
 *
 * @see StorePeriodMetricsRow — SQL CTE で算出される Infrastructure 層の型
 * @see StoreMetrics — ウィジェットが参照するドメイン層の型
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, StoreMetrics } from '@/domain/models'
import { useDuckDBStorePeriodMetrics, type StorePeriodMetricsRow } from './duckdb'

/** フック戻り値 */
export interface StoreMetricsResult {
  /** 選択店舗のメトリクス（未ロード時は null） */
  readonly data: StoreMetrics | null
  /** 全店舗メトリクスの Map（マルチストア用） */
  readonly allStoreMetrics: ReadonlyMap<string, StoreMetrics>
  /** ローディング中か */
  readonly isLoading: boolean
  /** エラーメッセージ */
  readonly error: string | null
}

/**
 * StorePeriodMetricsRow → StoreMetrics の変換（1:1 マッピング）
 *
 * StorePeriodMetricsRow は Infrastructure 層で定義されるが、
 * フィールド構造は StoreMetrics と同一。
 * ドメイン型への変換を明示的に行うことで層間の依存を断つ。
 */
function toStoreMetrics(row: StorePeriodMetricsRow): StoreMetrics {
  return {
    storeId: row.storeId,
    // 売上
    totalSales: row.totalSales,
    totalCoreSales: row.totalCoreSales,
    grossSales: row.grossSales,
    deliverySalesPrice: row.deliverySalesPrice,
    deliverySalesCost: row.deliverySalesCost,
    totalFlowersPrice: row.totalFlowersPrice,
    totalFlowersCost: row.totalFlowersCost,
    totalDirectProducePrice: row.totalDirectProducePrice,
    totalDirectProduceCost: row.totalDirectProduceCost,
    // 原価
    totalCost: row.totalCost,
    inventoryCost: row.inventoryCost,
    totalPurchaseCost: row.totalPurchaseCost,
    totalPurchasePrice: row.totalPurchasePrice,
    // 移動
    interStoreInCost: row.interStoreInCost,
    interStoreInPrice: row.interStoreInPrice,
    interStoreOutCost: row.interStoreOutCost,
    interStoreOutPrice: row.interStoreOutPrice,
    interDeptInCost: row.interDeptInCost,
    interDeptInPrice: row.interDeptInPrice,
    interDeptOutCost: row.interDeptOutCost,
    interDeptOutPrice: row.interDeptOutPrice,
    totalTransferCost: row.totalTransferCost,
    totalTransferPrice: row.totalTransferPrice,
    // 売変
    totalDiscount: row.totalDiscount,
    discountRate: row.discountRate,
    discountLossCost: row.discountLossCost,
    // 値入率
    averageMarkupRate: row.averageMarkupRate,
    coreMarkupRate: row.coreMarkupRate,
    // 消耗品
    totalConsumable: row.totalConsumable,
    consumableRate: row.consumableRate,
    // 客数
    totalCustomers: row.totalCustomers,
    averageCustomersPerDay: row.averageCustomersPerDay,
    // 在庫法
    openingInventory: row.openingInventory,
    closingInventory: row.closingInventory,
    invMethodCogs: row.invMethodCogs,
    invMethodGrossProfit: row.invMethodGrossProfit,
    invMethodGrossProfitRate: row.invMethodGrossProfitRate,
    // 推定法
    estMethodCogs: row.estMethodCogs,
    estMethodMargin: row.estMethodMargin,
    estMethodMarginRate: row.estMethodMarginRate,
    estMethodClosingInventory: row.estMethodClosingInventory,
    // 予算
    grossProfitBudget: row.grossProfitBudget,
    // 期間情報
    salesDays: row.salesDays,
    totalDays: row.totalDays,
    purchaseMaxDay: row.purchaseMaxDay,
    hasDiscountData: row.hasDiscountData,
  }
}

/**
 * DuckDB SQL 計算結果を StoreMetrics として提供する。
 *
 * @param conn - DuckDB 接続（null = 未初期化）
 * @param dataVersion - データロードバージョン（0 = 未ロード）
 * @param dateRange - 分析対象日付範囲
 * @param storeIds - 選択店舗 ID（空 = 全店）
 * @param selectedStoreId - 表示対象の店舗 ID（undefined = 先頭店舗）
 */
export function useStoreMetrics(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  selectedStoreId?: string,
): StoreMetricsResult {
  const { data: rows, isLoading, error } = useDuckDBStorePeriodMetrics(
    conn,
    dataVersion,
    dateRange,
    storeIds,
  )

  const result = useMemo(() => {
    if (!rows || rows.length === 0) {
      return {
        data: null,
        allStoreMetrics: new Map<string, StoreMetrics>(),
      }
    }

    const metricsMap = new Map<string, StoreMetrics>()
    for (const row of rows) {
      metricsMap.set(row.storeId, toStoreMetrics(row))
    }

    // 選択店舗のメトリクスを取得
    let selected: StoreMetrics | null = null
    if (selectedStoreId && metricsMap.has(selectedStoreId)) {
      selected = metricsMap.get(selectedStoreId)!
    } else if (metricsMap.size === 1) {
      // 単一店舗の場合はそのまま返す
      selected = metricsMap.values().next().value ?? null
    }

    return { data: selected, allStoreMetrics: metricsMap }
  }, [rows, selectedStoreId])

  return {
    data: result.data,
    allStoreMetrics: result.allStoreMetrics,
    isLoading,
    error,
  }
}
