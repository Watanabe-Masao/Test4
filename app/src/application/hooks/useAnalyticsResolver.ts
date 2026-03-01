/**
 * データアクセスファサード — データソース解決層
 *
 * UI コンポーネントが「どのデータソースを使うか」を意識せずにデータを取得できるよう、
 * Application 層でソース解決とキャッシュを一元管理する。
 *
 * ## ソース解決ルール
 *
 * | データ種別       | 優先ソース  | フォールバック | 理由                                                   |
 * |:---------------|:----------|:------------|:------------------------------------------------------|
 * | KPI/粗利/予算    | StoreResult | —           | 計算パイプラインの権威的出力。DuckDB は使わない               |
 * | 時間帯分析       | DuckDB    | CTS Index   | 月跨ぎ対応。DuckDB 未準備時は CTS フォールバック              |
 * | ヒートマップ     | DuckDB    | CTS Index   | 同上                                                   |
 * | 部門時間帯       | DuckDB    | CTS Index   | 同上                                                   |
 * | 店舗時間帯比較   | DuckDB    | CTS Index   | 同上（複数店舗必須）                                      |
 * | 前年比較         | DuckDB    | StoreResult | 月跨ぎ対応。フォールバックは daily ベースの前年差異             |
 * | 特徴量/累積等    | DuckDB    | —           | DuckDB 専用分析。フォールバックなし（非表示）                  |
 *
 * ## キャッシュ戦略
 *
 * 各フックが stale-while-revalidate パターンを内蔵:
 * - 新しいクエリ開始時、前回の有効結果を `stale` として保持
 * - クエリ完了後に `fresh` に昇格
 * - dataVersion 変更時のみキャッシュ無効化
 */
import { useMemo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { CategoryTimeSalesIndex, DateRange, Store } from '@/domain/models'

// ── Data Source Resolution ──

/** 分析データのソース種別 */
export type AnalyticsSource = 'duckdb' | 'cts' | 'storeResult'

/** ソース解決に必要なコンテキスト（WidgetContext から最小限を抽出） */
export interface SourceContext {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly duckLoadedMonthCount: number
  readonly ctsRecordCount: number
  readonly storeCount: number
  readonly hasPrevYear: boolean
}

/** 解決結果 */
export interface ResolvedSource {
  /** 選択されたソース */
  readonly source: AnalyticsSource
  /** DuckDB が利用可能か */
  readonly duckReady: boolean
  /** CTS インデックスが利用可能か */
  readonly ctsAvailable: boolean
  /** 複数月データが利用可能か（DuckDB 2+月） */
  readonly multiMonthAvailable: boolean
  /** 複数店舗が利用可能か */
  readonly multiStoreAvailable: boolean
}

/**
 * ソースコンテキストを構築する純粋関数。
 * WidgetContext → SourceContext の変換（テスト容易）。
 */
export function buildSourceContext(ctx: {
  duckConn: AsyncDuckDBConnection | null
  duckDataVersion: number
  duckLoadedMonthCount: number
  ctsIndex: CategoryTimeSalesIndex
  stores: ReadonlyMap<string, Store>
  prevYearDateRange?: DateRange
}): SourceContext {
  return {
    duckConn: ctx.duckConn,
    duckDataVersion: ctx.duckDataVersion,
    duckLoadedMonthCount: ctx.duckLoadedMonthCount,
    ctsRecordCount: ctx.ctsIndex.recordCount,
    storeCount: ctx.stores.size,
    hasPrevYear: ctx.prevYearDateRange != null,
  }
}

/**
 * 時系列分析（時間帯・ヒートマップ・部門・店舗比較）のソースを解決する。
 * DuckDB 優先、CTS フォールバック。
 */
export function resolveTimeSeriesSource(ctx: SourceContext): ResolvedSource {
  const duckReady = ctx.duckDataVersion > 0 && ctx.duckConn != null
  const ctsAvailable = ctx.ctsRecordCount > 0
  const source: AnalyticsSource = duckReady ? 'duckdb' : ctsAvailable ? 'cts' : 'cts'
  return {
    source,
    duckReady,
    ctsAvailable,
    multiMonthAvailable: ctx.duckLoadedMonthCount >= 2,
    multiStoreAvailable: ctx.storeCount > 1,
  }
}

/**
 * 前年比較分析のソースを解決する。
 * DuckDB 優先、StoreResult フォールバック。
 */
export function resolveYoYSource(ctx: SourceContext): ResolvedSource {
  const duckReady = ctx.duckDataVersion > 0 && ctx.duckConn != null
  const source: AnalyticsSource = duckReady ? 'duckdb' : 'storeResult'
  return {
    source,
    duckReady,
    ctsAvailable: ctx.ctsRecordCount > 0,
    multiMonthAvailable: ctx.duckLoadedMonthCount >= 2,
    multiStoreAvailable: ctx.storeCount > 1,
  }
}

/**
 * DuckDB 専用分析のソースを解決する。
 * DuckDB のみ。未準備時は null（ウィジェット非表示）。
 */
export function resolveDuckDBOnlySource(ctx: SourceContext): ResolvedSource | null {
  const duckReady = ctx.duckDataVersion > 0 && ctx.duckConn != null
  if (!duckReady) return null
  return {
    source: 'duckdb',
    duckReady: true,
    ctsAvailable: ctx.ctsRecordCount > 0,
    multiMonthAvailable: ctx.duckLoadedMonthCount >= 2,
    multiStoreAvailable: ctx.storeCount > 1,
  }
}

// ── React Hook: Memoized Resolution ──

/**
 * WidgetContext から SourceContext を構築し、解決をメモ化する React フック。
 */
export function useSourceContext(ctx: {
  duckConn: AsyncDuckDBConnection | null
  duckDataVersion: number
  duckLoadedMonthCount: number
  ctsIndex: CategoryTimeSalesIndex
  stores: ReadonlyMap<string, Store>
  prevYearDateRange?: DateRange
}): SourceContext {
  const { duckConn, duckDataVersion, duckLoadedMonthCount, ctsIndex, stores, prevYearDateRange } =
    ctx
  const ctsRecordCount = ctsIndex.recordCount
  const storeCount = stores.size
  return useMemo(
    () => ({
      duckConn,
      duckDataVersion,
      duckLoadedMonthCount,
      ctsRecordCount,
      storeCount,
      hasPrevYear: prevYearDateRange != null,
    }),
    [duckConn, duckDataVersion, duckLoadedMonthCount, ctsRecordCount, storeCount, prevYearDateRange],
  )
}

// ── Stale-While-Revalidate Cache ──

export interface CachedResult<T> {
  /** 現在のデータ（ロード中は前回の stale データ、完了後は最新データ） */
  readonly data: T | null
  /** データが最新か（false = stale） */
  readonly isFresh: boolean
  /** ロード中か */
  readonly isLoading: boolean
  /** エラー */
  readonly error: string | null
  /** データソース */
  readonly source: AnalyticsSource
}

/**
 * データソース結果をキャッシュ可能な形式でラップするフック。
 *
 * 現在のデータ、ローディング状態、エラーをまとめて CachedResult<T> を返す。
 * ソース切替時に不要な再レンダーを抑制するため useMemo でメモ化する。
 *
 * 注: stale-while-revalidate（ロード中に前回データを表示）は、
 * 各 DuckDB フック（useAsyncQuery）が内部で seqRef ベースのキャンセル制御を
 * 行っており、古い結果が新しい結果を上書きしない設計のため、ファサード層では
 * 追加の stale キャッシュは不要。ロード中は isLoading=true + data=null で表示制御する。
 */
export function useStaleFreshCache<T>(
  current: T | null,
  isLoading: boolean,
  error: string | null,
  source: AnalyticsSource,
): CachedResult<T> {
  return useMemo((): CachedResult<T> => {
    if (current != null && !isLoading) {
      return { data: current, isFresh: true, isLoading: false, error, source }
    }
    return { data: current, isFresh: !isLoading, isLoading, error, source }
  }, [current, isLoading, error, source])
}
