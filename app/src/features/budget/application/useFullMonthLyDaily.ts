/**
 * useFullMonthLyDaily — 前年同月 full-month 日別売上を独立クエリで取得
 *
 * ページレベルの `freePeriodLane.bundle.fact.comparisonRows` は
 * `effectivePeriod2`（alignment + elapsedDays cap）で範囲が絞られるため、
 * 未経過日（17日以降など）の前年データが欠落する。
 *
 * 本 hook は当年 (year, month) を指定し、前年同月 1 日〜末日の full-month
 * 範囲を `freePeriodHandler` の comparison 側として直接クエリして、
 * day (当年 day と一致) → sales の Map を返す。
 *
 * - 当期側 (currentRows) は当年 full-month を投げる (ページ側のキャッシュと
 *   重なるため追加負荷は小さい)
 * - 比較側 (comparisonRows) を前年 full-month にして day 単位で集計する
 *
 * 取得不可 (prev 年データなし / executor 未 ready) の場合は null を返し、
 * 呼び出し側は `fullMonthLyDaily` 未指定として fallback する。
 *
 * @responsibility R:data-fetch
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { freePeriodHandler } from '@/application/queries/freePeriodHandler'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import type { FreePeriodQueryInput } from '@/application/readModels/freePeriod'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export interface UseFullMonthLyDailyResult {
  readonly daily: ReadonlyMap<number, number> | null
  readonly isLoading: boolean
}

/**
 * 前年同月 full-month 日別売上を取得する。
 *
 * @param executor QueryExecutor (DuckDB 経路が準備できていなければ null)
 * @param year 当年
 * @param month 当月 (1-12)
 * @param storeIds 対象店舗 ID (空/undefined で全店)
 */
export function useFullMonthLyDaily(
  executor: QueryExecutor | null | undefined,
  year: number,
  month: number,
  storeIds: ReadonlySet<string> | readonly string[] | undefined,
): UseFullMonthLyDailyResult {
  const input = useMemo<FreePeriodQueryInput | null>(() => {
    if (!executor) return null
    const daysInMonth = new Date(year, month, 0).getDate()
    const curFrom = `${year}-${pad2(month)}-01`
    const curTo = `${year}-${pad2(month)}-${pad2(daysInMonth)}`
    const prevYear = year - 1
    const prevDaysInMonth = new Date(prevYear, month, 0).getDate()
    const prevFrom = `${prevYear}-${pad2(month)}-01`
    const prevTo = `${prevYear}-${pad2(month)}-${pad2(prevDaysInMonth)}`
    const ids = storeIds
      ? [...(storeIds instanceof Set ? Array.from(storeIds) : storeIds)].sort()
      : undefined
    return {
      dateFrom: curFrom,
      dateTo: curTo,
      storeIds: ids,
      comparisonDateFrom: prevFrom,
      comparisonDateTo: prevTo,
    }
  }, [executor, year, month, storeIds])

  const { data, isLoading } = useQueryWithHandler(executor ?? null, freePeriodHandler, input)

  const daily = useMemo<ReadonlyMap<number, number> | null>(() => {
    const rows = data?.comparisonRows ?? null
    if (!rows || rows.length === 0) return null
    const map = new Map<number, number>()
    for (const row of rows) {
      map.set(row.day, (map.get(row.day) ?? 0) + row.sales)
    }
    return map
  }, [data])

  return { daily, isLoading }
}
