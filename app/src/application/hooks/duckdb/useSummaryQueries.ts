/**
 * StoreDaySummary クエリフック群
 *
 * 日別累積売上は SQL 集約版 (useJsAggregationQueries) に委譲。
 * 集約は DuckDB SQL、意味づけは TS 側が担当。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import {
  queryAggregatedRates,
  type StoreDaySummaryRow,
  type AggregatedRatesRow,
} from '@/infrastructure/duckdb/queries/storeDaySummary'
import type { DailyCumulativeRow } from '@/infrastructure/duckdb/queries/aggregates/dailyAggregation'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'
import { useJsDailyCumulative } from './useJsAggregationQueries'

/** 日別累積売上（SQL 集約版に委譲） */
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

export type { DailyCumulativeRow, AggregatedRatesRow, StoreDaySummaryRow }
