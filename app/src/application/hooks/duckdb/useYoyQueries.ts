/**
 * 前年比較（YoY）クエリフック群
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models'
import {
  queryYoyDailyComparison,
  queryYoyCategoryComparison,
  type YoyDailyRow,
  type YoyCategoryRow,
} from '@/infrastructure/duckdb/queries/yoyComparison'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'

/** 日別前年比較 */
export function useDuckDBYoyDaily(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  curRange: DateRange | undefined,
  prevRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly YoyDailyRow[]> {
  const queryFn = useMemo(() => {
    if (!curRange || !prevRange) return null
    const cur = toDateKeys(curRange)
    const prev = toDateKeys(prevRange)
    return (c: AsyncDuckDBConnection) =>
      queryYoyDailyComparison(c, {
        curDateFrom: cur.dateFrom,
        curDateTo: cur.dateTo,
        prevDateFrom: prev.dateFrom,
        prevDateTo: prev.dateTo,
        storeIds: storeIdsToArray(storeIds),
      })
  }, [curRange, prevRange, storeIds])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** カテゴリ別前年比較 */
export function useDuckDBYoyCategory(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  curRange: DateRange | undefined,
  prevRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
): AsyncQueryResult<readonly YoyCategoryRow[]> {
  const queryFn = useMemo(() => {
    if (!curRange || !prevRange) return null
    const cur = toDateKeys(curRange)
    const prev = toDateKeys(prevRange)
    return (c: AsyncDuckDBConnection) =>
      queryYoyCategoryComparison(c, {
        curDateFrom: cur.dateFrom,
        curDateTo: cur.dateTo,
        prevDateFrom: prev.dateFrom,
        prevDateTo: prev.dateTo,
        storeIds: storeIdsToArray(storeIds),
        level,
      })
  }, [curRange, prevRange, storeIds, level])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { YoyDailyRow, YoyCategoryRow }
