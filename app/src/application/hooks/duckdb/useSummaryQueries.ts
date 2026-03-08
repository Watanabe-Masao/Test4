/**
 * StoreDaySummary クエリフック群
 *
 * Phase 3 移行済み: 日別累積売上は JS 計算版 (useJsAggregationQueries) に委譲。
 * DuckDB は生データ取得のみ。集約ロジックは rawAggregation.ts の純粋関数で実行。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  queryAggregatedRates,
  type DailyCumulativeRow,
  type AggregatedRatesRow,
} from '@/infrastructure/duckdb/queries/storeDaySummary'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'
import { useJsDailyCumulative } from './useJsAggregationQueries'

/** 日別累積売上（JS計算版に移行済み） */
export function useDuckDBDailyCumulative(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<readonly DailyCumulativeRow[]> {
  return useJsDailyCumulative(conn, dataVersion, dateRange, storeIds, isPrevYear)
}

/** 期間集約レート */
export function useDuckDBAggregatedRates(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<AggregatedRatesRow | null> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryAggregatedRates(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        isPrevYear,
      })
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { DailyCumulativeRow, AggregatedRatesRow }
