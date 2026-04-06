/**
 * 比較コンテキスト DuckDB クエリフック
 *
 * 3期間（当年月間・前年同曜日・前年同日）のデータを SQL で取得し、
 * JS でメトリクス計算 + 曜日ギャップ分析を行う。
 *
 * application/hooks/duckdb/ 配下に配置することで
 * infrastructure 直接参照の許可リストに含まれる。
 * @responsibility R:query-exec
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/calendar'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import { queryStoreDaySummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import {
  calculateAllPeriodMetrics,
  type PeriodInventoryConfig,
} from '@/application/usecases/calculation/periodMetricsCalculator'
import { queryToObjects } from '@/infrastructure/duckdb/queryRunner'
import { analyzeDowGap } from '@/domain/calculations/dowGapAnalysis'
import type { ComparisonContext } from '@/application/comparison/ComparisonContext'
import { toSnapshot } from '@/application/comparison/comparisonContextFactory'
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

// ── ユーティリティ ──

function buildMonthRange(year: number, month: number): DateRange {
  return {
    from: { year, month, day: 1 },
    to: { year, month, day: getDaysInMonth(year, month) },
  }
}

// ── 内部結果型 ──

/** useComparisonContextQuery の生結果（ComparisonContext と同型） */
export type ComparisonContextData = ComparisonContext

// ── フック ──

/**
 * 3期間の比較データを DuckDB から取得し ComparisonContext を構築する
 *
 * @param conn DuckDB 接続
 * @param dataVersion データバージョン
 * @param targetYear 当年
 * @param targetMonth 当月
 * @param prevYear 前年
 * @param prevMonth 前年月
 * @param storeIds 対象店舗
 * @param defaultMarkupRate デフォルト値入率
 */
export function useComparisonContextQuery(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  targetYear: number,
  targetMonth: number,
  prevYear: number,
  prevMonth: number,
  storeIds: ReadonlySet<string>,
  defaultMarkupRate: number,
): AsyncQueryResult<ComparisonContextData> {
  const storeIdArr = useMemo(() => storeIdsToArray(storeIds), [storeIds])

  // 日付キーをプリミティブとして算出
  const curRange = buildMonthRange(targetYear, targetMonth)
  const prevRange = buildMonthRange(prevYear, prevMonth)
  const curFromKey = dateRangeToKeys(curRange).fromKey
  const curToKey = dateRangeToKeys(curRange).toKey
  const prevFromKey = dateRangeToKeys(prevRange).fromKey
  const prevToKey = dateRangeToKeys(prevRange).toKey

  const queryFn = useMemo(() => {
    if (dataVersion === 0) return null

    return async (c: AsyncDuckDBConnection) => {
      // SQL: 当年月間 + 前年月間のデータを並列取得
      const [curRows, prevRows, curInvConfigs] = await Promise.all([
        queryStoreDaySummary(c, {
          dateFrom: curFromKey,
          dateTo: curToKey,
          storeIds: storeIdArr,
          isPrevYear: false,
        }),
        queryStoreDaySummary(c, {
          dateFrom: prevFromKey,
          dateTo: prevToKey,
          storeIds: storeIdArr,
          isPrevYear: true,
        }),
        queryInventoryConfigs(c, targetYear, targetMonth, storeIdArr),
      ])

      // JS: ドメイン計算
      const curMetrics = calculateAllPeriodMetrics(curRows, curInvConfigs, defaultMarkupRate)
      const prevMetrics = calculateAllPeriodMetrics(prevRows, new Map(), defaultMarkupRate)

      // スナップショット構築
      const currentSnapshot = toSnapshot(curMetrics, targetYear, targetMonth)
      const sameDowSnapshot = toSnapshot(prevMetrics, prevYear, prevMonth)
      const sameDateSnapshot = toSnapshot(prevMetrics, prevYear, prevMonth)

      // 曜日ギャップ分析 — 前年の曜日別合計売上を集計して渡す
      const dailyAvgSales =
        currentSnapshot.metrics.salesDays > 0
          ? currentSnapshot.metrics.totalSales / currentSnapshot.metrics.salesDays
          : 0
      const prevDowSales = [0, 0, 0, 0, 0, 0, 0]
      for (const row of prevRows) {
        const dow = new Date(prevYear, prevMonth - 1, row.day).getDay()
        prevDowSales[dow] += row.sales
      }
      const dowGap = analyzeDowGap(
        targetYear,
        targetMonth,
        prevYear,
        prevMonth,
        dailyAvgSales,
        prevDowSales,
      )

      return {
        current: currentSnapshot,
        sameDow: sameDowSnapshot,
        sameDate: sameDateSnapshot,
        dowGap,
        isReady: true,
      } satisfies ComparisonContextData
    }
  }, [
    curFromKey,
    curToKey,
    prevFromKey,
    prevToKey,
    storeIdArr,
    defaultMarkupRate,
    targetYear,
    targetMonth,
    prevYear,
    prevMonth,
    dataVersion,
  ])

  return useAsyncQuery(conn, dataVersion, queryFn)
}
