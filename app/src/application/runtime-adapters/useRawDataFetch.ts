/**
 * 汎用データ取得フック — DuckDB からの生データ取得の統一エントリーポイント
 *
 * ## 設計意図
 *
 * DuckDB はデータ取得専用。計算・集約は JS で行う。
 * このフックが filterStore の条件を読み取り、DuckDB から生レコードを取得し、
 * バリデーション済みの結果を返す。
 *
 * UI → filterStore → useRawDataFetch → DuckDB(SELECT WHERE) → ValidatedFetchResult
 *                                                                    ↓
 *                                                            domain/calculations（JS計算）
 *
 * ## バリデーション
 *
 * - データが存在しない期間 → status: 'empty' + メッセージ
 * - 取得エラー → status: 'error' + エラー内容
 * - 取得成功 → status: 'valid' + data + 実データの日付範囲情報
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange } from '@/domain/models/CalendarDate'
import type { ValidatedFetchResult, DataValidation } from '@/domain/models/DataFetchResult'
import { validateRecords } from '@/domain/models/DataFetchResult'
import {
  useAsyncQuery,
  toDateKeys,
  storeIdsToArray,
} from '@/application/hooks/duckdb/useAsyncQuery'
import type { StoreDaySummaryRow } from '@/infrastructure/duckdb/queries/storeDaySummary'
import { queryStoreDaySummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import type { DailyRecordRow } from '@/infrastructure/duckdb/queries/dailyRecords'
import { queryDailyRecords } from '@/infrastructure/duckdb/queries/dailyRecords'
import {
  queryCategoryTimeRecords,
  type CtsFilterParams,
} from '@/infrastructure/duckdb/queries/categoryTimeSales'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

// ─── 内部ヘルパー ─────────────────────────────────────

/**
 * AsyncQueryResult → ValidatedFetchResult に変換する。
 * バリデーションを適用し、空データ時のメッセージを生成する。
 */
function toValidated<T>(
  data: readonly T[] | null,
  isLoading: boolean,
  error: Error | null,
  conn: AsyncDuckDBConnection | null,
  dateKeyField?: string,
): ValidatedFetchResult<readonly T[]> & { readonly validation: DataValidation | null } {
  if (!conn) {
    return { status: 'idle', data: null, error: null, validation: null }
  }
  if (isLoading) {
    return { status: 'loading', data: null, error: null, validation: null }
  }
  if (error) {
    return { status: 'error', data: null, error, validation: null }
  }
  if (!data) {
    return { status: 'idle', data: null, error: null, validation: null }
  }

  const validation = validateRecords(data as readonly Record<string, unknown>[], dateKeyField)
  if (!validation.isValid) {
    return {
      status: 'empty',
      data: null,
      error: null,
      message: validation.reason ?? '指定期間にデータがありません',
      validation,
    }
  }

  return { status: 'valid', data, error: null, validation }
}

// ─── 公開フック ───────────────────────────────────────

/**
 * 日別サマリー生レコードを取得する。
 *
 * store_day_summary VIEW から全カラムをそのまま返す。
 * 集約なし。SELECT * WHERE dateRange AND storeIds。
 */
export function useRawDailySummary(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): ValidatedFetchResult<readonly StoreDaySummaryRow[]> & {
  readonly validation: DataValidation | null
} {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    return (c: AsyncDuckDBConnection) =>
      queryStoreDaySummary(c, {
        dateFrom,
        dateTo,
        storeIds: storeIdsToArray(storeIds),
      })
  }, [dateRange, storeIds])

  const { data, isLoading, error } = useAsyncQuery(conn, dataVersion, queryFn)

  return useMemo(
    () => toValidated(data ?? null, isLoading, error, conn),
    [data, isLoading, error, conn],
  )
}

/**
 * 日別明細レコード（予算付き）を取得する。
 *
 * store_day_summary LEFT JOIN budget。集約なし。
 */
export function useRawDailyRecords(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): ValidatedFetchResult<readonly DailyRecordRow[]> & {
  readonly validation: DataValidation | null
} {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    return (c: AsyncDuckDBConnection) => queryDailyRecords(c, dateRange, storeIds)
  }, [dateRange, storeIds])

  const { data, isLoading, error } = useAsyncQuery(conn, dataVersion, queryFn)

  return useMemo(
    () => toValidated(data ?? null, isLoading, error, conn),
    [data, isLoading, error, conn],
  )
}

/**
 * カテゴリ×時間帯売上の生レコードを取得する。
 *
 * category_time_sales JOIN time_slots。集約なし。
 * 階層フィルタ（dept/line/klass）は filterStore から受け取る。
 */
export function useRawCategoryTimeRecords(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
  hierarchy?: {
    readonly deptCode?: string
    readonly lineCode?: string
    readonly klassCode?: string
  },
): ValidatedFetchResult<readonly CategoryTimeSalesRecord[]> & {
  readonly validation: DataValidation | null
} {
  const queryFn = useMemo(() => {
    if (!dateRange) return null
    const { dateFrom, dateTo } = toDateKeys(dateRange)
    const params: CtsFilterParams = {
      dateFrom,
      dateTo,
      storeIds: storeIdsToArray(storeIds),
      deptCode: hierarchy?.deptCode,
      lineCode: hierarchy?.lineCode,
      klassCode: hierarchy?.klassCode,
    }
    return (c: AsyncDuckDBConnection) => queryCategoryTimeRecords(c, params)
  }, [dateRange, storeIds, hierarchy?.deptCode, hierarchy?.lineCode, hierarchy?.klassCode])

  const { data, isLoading, error } = useAsyncQuery(conn, dataVersion, queryFn)

  // CategoryTimeSalesRecord は dateKey フィールドを持たないが
  // year/month/day フィールドを持つ。バリデーションは recordCount で判定。
  return useMemo(() => {
    if (!conn) return { status: 'idle' as const, data: null, error: null, validation: null }
    if (isLoading) return { status: 'loading' as const, data: null, error: null, validation: null }
    if (error) return { status: 'error' as const, data: null, error, validation: null }
    if (!data || data.length === 0) {
      return {
        status: 'empty' as const,
        data: null,
        error: null,
        message: '指定期間にカテゴリ時間帯データがありません',
        validation: {
          isValid: false,
          reason: 'データがありません',
          recordCount: 0,
          actualDateRange: null,
        },
      }
    }
    return {
      status: 'valid' as const,
      data,
      error: null,
      validation: {
        isValid: true,
        reason: null,
        recordCount: data.length,
        actualDateRange: null,
      },
    }
  }, [data, isLoading, error, conn])
}
