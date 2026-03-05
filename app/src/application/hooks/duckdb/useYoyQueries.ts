/**
 * 前年比較（YoY）クエリフック群
 *
 * ComparisonFrame を受け取り、frame.current / frame.previous から日付範囲を取得する。
 * 期間解釈は resolveComparisonFrame で一元管理されるため、
 * このフックは ComparisonFrame をそのまま使う。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { ComparisonFrame } from '@/domain/models'
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
  frame: ComparisonFrame | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly YoyDailyRow[]> {
  const curKeys = frame ? toDateKeys(frame.current) : null
  const prevKeys = frame ? toDateKeys(frame.previous) : null
  const storeArr = storeIdsToArray(storeIds)

  const queryFn = useMemo(() => {
    if (!curKeys || !prevKeys) return null
    const { dateFrom: cdf, dateTo: cdt } = curKeys
    const { dateFrom: pdf, dateTo: pdt } = prevKeys
    return (c: AsyncDuckDBConnection) =>
      queryYoyDailyComparison(c, {
        curDateFrom: cdf,
        curDateTo: cdt,
        prevDateFrom: pdf,
        prevDateTo: pdt,
        storeIds: storeArr,
      })
  }, [curKeys, prevKeys, storeArr])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

/** カテゴリ別前年比較 */
export function useDuckDBYoyCategory(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  frame: ComparisonFrame | undefined,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
): AsyncQueryResult<readonly YoyCategoryRow[]> {
  const curKeys = frame ? toDateKeys(frame.current) : null
  const prevKeys = frame ? toDateKeys(frame.previous) : null
  const storeArr = storeIdsToArray(storeIds)

  const queryFn = useMemo(() => {
    if (!curKeys || !prevKeys) return null
    const { dateFrom: cdf, dateTo: cdt } = curKeys
    const { dateFrom: pdf, dateTo: pdt } = prevKeys
    return (c: AsyncDuckDBConnection) =>
      queryYoyCategoryComparison(c, {
        curDateFrom: cdf,
        curDateTo: cdt,
        prevDateFrom: pdf,
        prevDateTo: pdt,
        storeIds: storeArr,
        level,
      })
  }, [curKeys, prevKeys, storeArr, level])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { YoyDailyRow, YoyCategoryRow }
