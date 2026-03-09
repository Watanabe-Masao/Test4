/**
 * JS 計算ベースクエリフック群
 *
 * DuckDB から生データ（store_day_summary SELECT *）を取得し、
 * rawAggregation.ts の純粋関数で集約・統計計算を行うフック群。
 *
 * DuckDB SQL 内の集約ロジック（GROUP BY, OVER, STDDEV_POP 等）を
 * JS 側に移行する Phase 3 の中核。
 *
 * ## 移行パターン
 *
 * Before: useDuckDBDailyCumulative → queryDailyCumulative (SQL: SUM OVER)
 * After:  useJsDailyCumulative → queryStoreDaySummary (SQL: SELECT *) → aggregateByDay + cumulativeSum (JS)
 *
 * チャートコンポーネントの API（返り値の型）は変更しない。
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, ComparisonFrame, PrevYearScope } from '@/domain/models'
import {
  queryStoreDaySummary,
  type StoreDaySummaryRow,
} from '@/infrastructure/duckdb/queries/storeDaySummary'
import type { DailyCumulativeRow } from '@/infrastructure/duckdb/queries/storeDaySummary'
import type {
  DowPatternRow,
  DailyFeatureRow,
  HourlyProfileRow,
} from '@/infrastructure/duckdb/queries/features'
import type { YoyDailyRow } from '@/infrastructure/duckdb/queries/yoyComparison'
import {
  queryStoreAggregation,
  type CtsFilterParams,
} from '@/infrastructure/duckdb/queries/categoryTimeSales'
import { toDateKey } from '@/domain/models/CalendarDate'
import { useAsyncQuery, toDateKeys, storeIdsToArray, type AsyncQueryResult } from './useAsyncQuery'
import {
  aggregateByDay,
  cumulativeSum,
  movingAverage,
  stddevPop,
  zScore as calcZScore,
  coefficientOfVariation,
} from '@/domain/calculations/rawAggregation'
import { safeDivide } from '@/domain/calculations/utils'

// ─── 生データ取得（共通） ────────────────────────────────

/**
 * store_day_summary の生レコードを取得するフック。
 *
 * SQL は SELECT * WHERE のみ。集約は JS 側で行う。
 */
function useRawSummaryRows(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<readonly StoreDaySummaryRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryStoreDaySummary(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
        isPrevYear,
      })
  }, [dateRange, storeIds, isPrevYear])

  return useAsyncQuery(conn, dataVersion, queryFn)
}

// ─── 日別累積売上（JS計算版） ──────────────────────────

/**
 * DuckDB 生データ → JS aggregateByDay + cumulativeSum
 *
 * SQL の SUM(sales) OVER (ORDER BY date_key) を置き換え。
 * 返り値は DailyCumulativeRow[] 互換。
 */
export function useJsDailyCumulative(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  isPrevYear?: boolean,
): AsyncQueryResult<readonly DailyCumulativeRow[]> {
  const {
    data: rawRows,
    isLoading,
    error,
  } = useRawSummaryRows(conn, dataVersion, dateRange, storeIds, isPrevYear)

  const data = useMemo(() => {
    if (!rawRows) return null
    const daily = aggregateByDay(rawRows)
    return cumulativeSum(daily)
  }, [rawRows])

  return { data, isLoading, error }
}

// ─── 曜日パターン（JS計算版） ──────────────────────────

/**
 * DuckDB 生データ → JS aggregateByDay + dowAggregate
 *
 * SQL の AVG/STDDEV_POP per dow を置き換え。
 * 返り値は DowPatternRow[] 互換（storeId は集約後 'ALL'）。
 */
export function useJsDowPattern(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DowPatternRow[]> {
  const {
    data: rawRows,
    isLoading,
    error,
  } = useRawSummaryRows(conn, dataVersion, dateRange, storeIds)

  const data = useMemo(() => {
    if (!rawRows) return null
    return computeDowPattern(rawRows)
  }, [rawRows])

  return { data, isLoading, error }
}

/**
 * 店舗別曜日パターンを計算する純粋関数。
 *
 * DuckDB SQL の WITH daily AS (...) GROUP BY store_id, dow と同等。
 */
/** @internal テスト用に export */
export function computeDowPattern(rows: readonly StoreDaySummaryRow[]): DowPatternRow[] {
  // store_id ごとにグループ化
  const storeMap = new Map<string, Map<string, number>>()
  for (const r of rows) {
    let dateMap = storeMap.get(r.storeId)
    if (!dateMap) {
      dateMap = new Map()
      storeMap.set(r.storeId, dateMap)
    }
    dateMap.set(r.dateKey, (dateMap.get(r.dateKey) ?? 0) + r.sales)
  }

  const result: DowPatternRow[] = []

  for (const [storeId, dateMap] of storeMap) {
    // 曜日ごとに売上を収集
    const dowSales = new Map<number, number[]>()
    for (const [dateKey, sales] of dateMap) {
      const parts = dateKey.split('-')
      const dow = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay()
      const arr = dowSales.get(dow) ?? []
      arr.push(sales)
      dowSales.set(dow, arr)
    }

    for (const [dow, sales] of dowSales) {
      const count = sales.length
      const avg = sales.reduce((s, v) => s + v, 0) / count
      const variance = sales.reduce((s, v) => s + (v - avg) ** 2, 0) / count
      result.push({
        storeId,
        dow,
        avgSales: avg,
        dayCount: count,
        salesStddev: Math.sqrt(variance),
      })
    }
  }

  return result.sort((a, b) => {
    if (a.storeId < b.storeId) return -1
    if (a.storeId > b.storeId) return 1
    return a.dow - b.dow
  })
}

// ─── 日別特徴量ベクトル（JS計算版） ────────────────────

/** MA-28 のために必要な先行データ日数 */
const MA_LOOKBACK_DAYS = 27

/**
 * DateRange を lookbackDays 分だけ前に拡張する。
 * 移動平均の計算で月初のデータ欠落を防ぐ。
 */
function extendRangeBack(range: DateRange, lookbackDays: number): DateRange {
  const fromDate = new Date(range.from.year, range.from.month - 1, range.from.day - lookbackDays)
  return {
    from: {
      year: fromDate.getFullYear(),
      month: fromDate.getMonth() + 1,
      day: fromDate.getDate(),
    },
    to: range.to,
  }
}

/**
 * DuckDB 生データ → JS 移動平均 + Z-score + CV + スパイク比率
 *
 * SQL のウィンドウ関数 (AVG OVER w3/w7/w28, LAG, STDDEV_POP, cumulative SUM) を置き換え。
 *
 * MA-28 のために、dateRange.from の 27日前からデータを取得し、
 * 計算後に元の dateRange に含まれる行のみを返す。
 */
export function useJsDailyFeatures(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly DailyFeatureRow[]> {
  // MA-28 用に取得範囲を前方に拡張
  const extendedRange = useMemo(
    () => (dateRange ? extendRangeBack(dateRange, MA_LOOKBACK_DAYS) : undefined),
    [dateRange],
  )

  const {
    data: rawRows,
    isLoading,
    error,
  } = useRawSummaryRows(conn, dataVersion, extendedRange, storeIds)

  const trimFromKey = useMemo(
    () => (dateRange ? toDateKey(dateRange.from) : undefined),
    [dateRange],
  )

  const data = useMemo(() => {
    if (!rawRows) return null
    return computeDailyFeatures(rawRows, trimFromKey)
  }, [rawRows, trimFromKey])

  return { data, isLoading, error }
}

/**
 * 店舗別日次特徴量を計算する純粋関数。
 *
 * DuckDB SQL の WINDOW w3/w7/w28 と等価な計算を JS で行う。
 *
 * @param rows 生データ（拡張範囲を含む場合あり）
 * @param trimFromDateKey 指定時、この日付以降の行のみを返す（MA計算用の先行データは含めない）
 */
/** @internal テスト用に export */
export function computeDailyFeatures(
  rows: readonly StoreDaySummaryRow[],
  trimFromDateKey?: string,
): DailyFeatureRow[] {
  // store_id ごとにグループ化
  const storeMap = new Map<string, { dateKey: string; sales: number }[]>()
  for (const r of rows) {
    const arr = storeMap.get(r.storeId) ?? []
    arr.push({ dateKey: r.dateKey, sales: r.sales })
    storeMap.set(r.storeId, arr)
  }

  const result: DailyFeatureRow[] = []

  for (const [storeId, records] of storeMap) {
    // dateKey 順にソート
    const sorted = [...records].sort((a, b) =>
      a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0,
    )
    const values = sorted.map((r) => r.sales)

    // 移動平均
    const ma3 = movingAverage(
      sorted.map((r) => ({ dateKey: r.dateKey, value: r.sales })),
      3,
    )
    const ma7 = movingAverage(
      sorted.map((r) => ({ dateKey: r.dateKey, value: r.sales })),
      7,
    )
    const ma28 = movingAverage(
      sorted.map((r) => ({ dateKey: r.dateKey, value: r.sales })),
      28,
    )

    let cumulative = 0

    for (let i = 0; i < sorted.length; i++) {
      const sales = values[i]
      cumulative += sales

      // 前日比・前週同曜日比
      const diff1d = i >= 1 ? sales - values[i - 1] : null
      const diff7d = i >= 7 ? sales - values[i - 7] : null

      // 7日窓の CV
      let cv7day: number | null = null
      if (i >= 6) {
        const window7 = values.slice(i - 6, i + 1)
        cv7day = coefficientOfVariation(window7)
      }

      // 28日窓の CV
      let cv28day: number | null = null
      if (i >= 27) {
        const window28 = values.slice(i - 27, i + 1)
        cv28day = coefficientOfVariation(window28)
      }

      // Z-score (28日窓ベース)
      let zScoreVal: number | null = null
      if (i >= 27) {
        const window28 = values.slice(i - 27, i + 1)
        const mean = window28.reduce((s, v) => s + v, 0) / window28.length
        const sd = stddevPop(window28)
        zScoreVal = sd > 0 ? calcZScore(sales, mean, sd) : null
      }

      // スパイク比率 (7日窓ベース)
      let spikeRatio: number | null = null
      if (i >= 6) {
        const ma7val = ma7[i].ma
        spikeRatio = ma7val != null && ma7val > 0 ? safeDivide(sales, ma7val, 0) : null
      }

      result.push({
        storeId,
        dateKey: sorted[i].dateKey,
        sales,
        salesMa3: ma3[i].ma,
        salesMa7: ma7[i].ma,
        salesMa28: ma28[i].ma,
        salesDiff1d: diff1d,
        salesDiff7d: diff7d,
        cumulativeSales: cumulative,
        cv7day,
        cv28day,
        zScore: zScoreVal,
        spikeRatio,
      })
    }
  }

  // 先行データ（lookback 分）を除外して本来の期間のみ返す
  if (trimFromDateKey) {
    return result.filter((r) => r.dateKey >= trimFromDateKey)
  }
  return result
}

// ─── YoY 日別比較（JS計算版） ─────────────────────────

/**
 * DuckDB 生データ（当期 + 前期を別取得）→ JS FULL OUTER JOIN
 *
 * SQL の FULL OUTER JOIN ON month=month AND day=day を置き換え。
 * 返り値は YoyDailyRow[] 互換。
 */
export function useJsYoyDaily(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  frame: ComparisonFrame | undefined,
  storeIds: ReadonlySet<string>,
  prevYearScope?: PrevYearScope,
): AsyncQueryResult<readonly YoyDailyRow[]> {
  // prevYearScope が渡された場合はオフセット調整済み範囲を使用
  const prevDateRange = prevYearScope?.dateRange ?? frame?.previous

  // 当期データ取得
  const {
    data: curRows,
    isLoading: curLoading,
    error: curError,
  } = useRawSummaryRows(conn, dataVersion, frame?.current, storeIds, false)

  // 前期データ取得
  const {
    data: prevRows,
    isLoading: prevLoading,
    error: prevError,
  } = useRawSummaryRows(conn, dataVersion, prevDateRange, storeIds, true)

  const data = useMemo(() => {
    if (!curRows || !prevRows) return null
    return computeYoyDaily(curRows, prevRows)
  }, [curRows, prevRows])

  return {
    data,
    isLoading: curLoading || prevLoading,
    error: curError || prevError,
  }
}

/**
 * 当期と前期の生データから YoY 日別比較を計算する純粋関数。
 *
 * SQL の FULL OUTER JOIN ON store_id=store_id AND month=month AND day=day と同等。
 */
/** @internal テスト用に export */
export function computeYoyDaily(
  curRows: readonly StoreDaySummaryRow[],
  prevRows: readonly StoreDaySummaryRow[],
): YoyDailyRow[] {
  // store × (month, day) でグループ化して売上・客数を合算
  type DailyGroup = {
    dateKey: string
    sales: number
    customers: number
  }

  function groupByStoreMonthDay(rows: readonly StoreDaySummaryRow[]): Map<string, DailyGroup> {
    const map = new Map<string, DailyGroup>()
    for (const r of rows) {
      // キー: storeId + month + day（月と日で当期・前期をマッチング）
      const key = `${r.storeId}|${r.month}|${r.day}`
      const existing = map.get(key)
      if (existing) {
        existing.sales += r.sales
        existing.customers += r.customers
      } else {
        map.set(key, {
          dateKey: r.dateKey,
          sales: r.sales,
          customers: r.customers,
        })
      }
    }
    return map
  }

  const curMap = groupByStoreMonthDay(curRows)
  const prevMap = groupByStoreMonthDay(prevRows)

  // FULL OUTER JOIN
  const allKeys = new Set([...curMap.keys(), ...prevMap.keys()])
  const result: YoyDailyRow[] = []

  for (const key of allKeys) {
    const parts = key.split('|')
    const storeId = parts[0]
    const cur = curMap.get(key)
    const prev = prevMap.get(key)

    result.push({
      curDateKey: cur?.dateKey ?? null,
      prevDateKey: prev?.dateKey ?? null,
      storeId,
      curSales: cur?.sales ?? 0,
      prevSales: prev?.sales ?? null,
      salesDiff: (cur?.sales ?? 0) - (prev?.sales ?? 0),
      curCustomers: cur?.customers ?? 0,
      prevCustomers: prev?.customers ?? null,
    })
  }

  return result.sort((a, b) => {
    if (a.storeId < b.storeId) return -1
    if (a.storeId > b.storeId) return 1
    const aKey = a.curDateKey ?? a.prevDateKey ?? ''
    const bKey = b.curDateKey ?? b.prevDateKey ?? ''
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0
  })
}

// ─── 時間帯別売上構成比（JS計算版） ──────────────────

/**
 * DuckDB の GROUP BY (store_id, hour) 結果 → JS で share + rank 計算
 *
 * SQL の SUM(amount) OVER (PARTITION BY store_id) + RANK() OVER を置き換え。
 * queryStoreAggregation (GROUP BY store_id, hour) の結果を再利用し、
 * share と rank は JS で計算する。
 *
 * 返り値は HourlyProfileRow[] 互換。
 */
export function useJsHourlyProfile(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<readonly HourlyProfileRow[]> {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
    }
    return (c: AsyncDuckDBConnection) => queryStoreAggregation(c, params)
  }, [dateRange, storeIds])

  const { data: storeRows, isLoading, error } = useAsyncQuery(conn, dataVersion, queryFn)

  const data = useMemo(() => {
    if (!storeRows) return null
    return computeHourlyProfile(storeRows)
  }, [storeRows])

  return { data, isLoading, error }
}

/**
 * 店舗×時間帯データから HourlyProfileRow[] を生成する純粋関数。
 *
 * SQL の SUM(amount) OVER (PARTITION BY store_id) → hourShare
 * RANK() OVER (PARTITION BY store_id ORDER BY SUM(amount) DESC) → hourRank
 */
/** @internal テスト用に export */
export function computeHourlyProfile(
  rows: readonly { readonly storeId: string; readonly hour: number; readonly amount: number }[],
): HourlyProfileRow[] {
  // store_id ごとに集約
  const storeMap = new Map<string, Map<number, number>>()
  for (const r of rows) {
    let hourMap = storeMap.get(r.storeId)
    if (!hourMap) {
      hourMap = new Map()
      storeMap.set(r.storeId, hourMap)
    }
    hourMap.set(r.hour, (hourMap.get(r.hour) ?? 0) + r.amount)
  }

  const result: HourlyProfileRow[] = []

  for (const [storeId, hourMap] of storeMap) {
    // 店舗ごとの合計
    let storeTotal = 0
    for (const amount of hourMap.values()) storeTotal += amount

    // 時間帯エントリをソートしてランキング
    const entries = [...hourMap.entries()].map(([hour, amount]) => ({
      hour,
      amount,
      share: safeDivide(amount, storeTotal, 0),
    }))

    // amount 降順でランク付け (RANK: 同値同順位)
    const sorted = [...entries].sort((a, b) => b.amount - a.amount)
    let currentRank = 1
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].amount < sorted[i - 1].amount) {
        currentRank = i + 1
      }
      const e = sorted[i]
      result.push({
        storeId,
        hour: e.hour,
        totalAmount: e.amount,
        hourShare: e.share,
        hourRank: currentRank,
      })
    }
  }

  return result.sort((a, b) => {
    if (a.storeId < b.storeId) return -1
    if (a.storeId > b.storeId) return 1
    return a.hour - b.hour
  })
}
