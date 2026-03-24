/**
 * 前年比較（YoY）クエリフック群
 *
 * Phase 3 移行済み: 日別前年比較は JS 計算版に委譲。
 * DuckDB は生データ取得のみ。FULL OUTER JOIN 相当は JS で実行。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { PrevYearScope } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import {
  queryYoyCategoryComparison,
  type YoyDailyRow,
  type YoyCategoryRow,
} from '@/infrastructure/duckdb/queries/yoyComparison'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'
import { useJsYoyDaily } from './useJsAggregationQueries'

/** 日別前年比較（JS計算版に移行済み） */
export function useDuckDBYoyDaily(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  scope: ComparisonScope | null,
  storeIds: ReadonlySet<string>,
  prevYearScope?: PrevYearScope,
): AsyncQueryResult<readonly YoyDailyRow[]> {
  return useJsYoyDaily(conn, dataVersion, scope, storeIds, prevYearScope)
}

/** カテゴリ別前年比較 */
export function useDuckDBYoyCategory(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  scope: ComparisonScope | null,
  storeIds: ReadonlySet<string>,
  level: 'department' | 'line' | 'klass',
  prevYearScope?: PrevYearScope,
): AsyncQueryResult<readonly YoyCategoryRow[]> {
  const curKeys = scope ? toDateKeys(scope.effectivePeriod1) : null
  // prevYearScope が渡された場合はオフセット調整済み範囲を使用
  const prevRange = prevYearScope?.dateRange ?? scope?.effectivePeriod2
  const prevKeys = prevRange ? toDateKeys(prevRange) : null

  const queryFn = useMemo(() => {
    if (!curKeys || !prevKeys) return null
    const { dateFrom: cdf, dateTo: cdt } = curKeys
    const { dateFrom: pdf, dateTo: pdt } = prevKeys
    const storeArr = storeIdsToArray(storeIds)
    return (c: AsyncDuckDBConnection) =>
      queryYoyCategoryComparison(c, {
        curDateFrom: cdf,
        curDateTo: cdt,
        prevDateFrom: pdf,
        prevDateTo: pdt,
        storeIds: storeArr,
        level,
      })
  }, [curKeys, prevKeys, storeIds, level])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

export type { YoyDailyRow, YoyCategoryRow }
