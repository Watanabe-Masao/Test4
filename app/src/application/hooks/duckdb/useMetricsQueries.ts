/**
 * 店舗期間メトリクス + 予算分析クエリフック群
 *
 * 期間メトリクス: SQL で生データ取得 → JS で計算（二重実装の解消）
 * 予算分析: budgetAnalysis.ts のクエリを useAsyncQuery ベースのフックとして提供
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import { queryStoreDaySummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import { queryToObjects } from '@/infrastructure/duckdb/queryRunner'
import {
  calculateAllPeriodMetrics,
  type PeriodMetrics,
  type PeriodInventoryConfig,
} from '@/application/usecases/calculation/periodMetricsCalculator'
import {
  queryDailyCumulativeBudget,
  queryBudgetAnalysisSummary,
  type DailyCumulativeBudgetRow,
  type BudgetAnalysisSummaryRow,
} from '@/infrastructure/duckdb/queries/budgetAnalysis'
import { useAsyncQuery, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'

// ── inventory_config クエリ（内部用）──

interface InventoryConfigRow {
  readonly storeId: string
  readonly openingInventory: number | null
  readonly closingInventory: number | null
  readonly grossProfitBudget: number
}

async function queryInventoryConfigs(
  conn: AsyncDuckDBConnection,
  year: number,
  month: number,
  storeIds?: readonly string[],
): Promise<ReadonlyMap<string, PeriodInventoryConfig>> {
  const conditions = [`year = ${year}`, `month = ${month}`]
  if (storeIds && storeIds.length > 0) {
    const list = storeIds.map((id) => `'${id}'`).join(', ')
    conditions.push(`store_id IN (${list})`)
  }
  const where = `WHERE ${conditions.join(' AND ')}`
  const sql = `
    SELECT
      store_id,
      opening_inventory,
      closing_inventory,
      COALESCE(gross_profit_budget, 0) AS gross_profit_budget
    FROM inventory_config
    ${where}`
  const rows = await queryToObjects<InventoryConfigRow>(conn, sql)
  const map = new Map<string, PeriodInventoryConfig>()
  for (const row of rows) {
    map.set(row.storeId, {
      openingInventory: row.openingInventory,
      closingInventory: row.closingInventory,
      grossProfitBudget: row.grossProfitBudget,
    })
  }
  return map
}

// ── 店舗期間メトリクスフック（SQL取得 + JS計算）──

/**
 * 店舗別期間メトリクスを取得する。
 *
 * SQL: store_day_summary から生データを取得（DuckDB の強み: JOIN, 期間フィルタ）
 * JS:  ドメイン計算関数で指標を算出（JS の強み: 型安全, テスト容易, 動的利用）
 *
 * 計算ロジックは domain/calculations/* に一本化されており、
 * SQL 側には計算ロジックを持たない（二重実装の解消）。
 */
export function useDuckDBStorePeriodMetrics(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  defaultMarkupRate: number,
  isPrevYear = false,
): AsyncQueryResult<readonly PeriodMetrics[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null

    const { fromKey, toKey } = dateRangeToKeys(dateRange)
    const storeIdArr = storeIdsToArray(storeIds)

    return async (c: AsyncDuckDBConnection) => {
      // 1. SQL: 生データ取得（DuckDB の強みを活用）
      const [summaryRows, invConfigs] = await Promise.all([
        queryStoreDaySummary(c, {
          dateFrom: fromKey,
          dateTo: toKey,
          storeIds: storeIdArr,
          isPrevYear,
        }),
        queryInventoryConfigs(c, dateRange.from.year, dateRange.from.month, storeIdArr),
      ])

      // 2. JS: ドメイン計算（計算ロジックの単一権威）
      return calculateAllPeriodMetrics(summaryRows, invConfigs, defaultMarkupRate)
    }
  }, [dateRange, storeIds, defaultMarkupRate, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

// ── 予算分析フック ──

/** 日別累積売上・予算を取得する */
export function useDuckDBDailyCumulativeBudget(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyCumulativeBudgetRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryDailyCumulativeBudget(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** 店舗別予算分析サマリーを取得する */
export function useDuckDBBudgetAnalysisSummary(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly BudgetAnalysisSummaryRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryBudgetAnalysisSummary(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { PeriodMetrics, DailyCumulativeBudgetRow, BudgetAnalysisSummaryRow }
