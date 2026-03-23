/**
 * DailyFeaturesHandler — 日別特徴量ベクトル（composite handler）
 *
 * DuckDB から生データ（StoreDaySummary）を取得し、
 * domain 層の computeDailyFeatures で移動平均・Zスコア・CV 等を計算する。
 *
 * MA-28 のために dateFrom を 27 日前に拡張して取得し、
 * 計算後に trimFromKey 以降の行のみを返す。
 *
 * @migration P5: single-source composite handler（DuckDB取得 + JS計算）
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import { queryStoreDaySummary } from '@/infrastructure/duckdb/queries/storeDaySummary'
import { computeDailyFeatures, type DailyFeatureRow } from '@/domain/calculations/rawAggregation'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

/** MA-28 のために必要な先行データ日数 */
const MA_LOOKBACK_DAYS = 27

export interface DailyFeaturesInput extends BaseQueryInput {
  /** 元の dateFrom（MA 計算後に trimFromKey として使用） */
  readonly originalDateFrom?: string
}

export interface DailyFeaturesOutput {
  readonly records: readonly DailyFeatureRow[]
}

/**
 * dateFrom を lookbackDays 分だけ前に拡張する。
 * 移動平均の計算で月初のデータ欠落を防ぐ。
 */
function extendDateBack(dateFrom: string, lookbackDays: number): string {
  const [y, m, d] = dateFrom.split('-').map(Number)
  const date = new Date(y, m - 1, d - lookbackDays)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export const dailyFeaturesHandler: QueryHandler<DailyFeaturesInput, DailyFeaturesOutput> = {
  name: 'DailyFeatures',
  async execute(
    conn: AsyncDuckDBConnection,
    input: DailyFeaturesInput,
  ): Promise<DailyFeaturesOutput> {
    // MA-28 用に取得範囲を前方に拡張
    const extendedDateFrom = extendDateBack(input.dateFrom, MA_LOOKBACK_DAYS)

    const rawRows = await queryStoreDaySummary(conn, {
      dateFrom: extendedDateFrom,
      dateTo: input.dateTo,
      storeIds: input.storeIds,
    })

    // 元の dateFrom 以降のみ返す（先行データはトリム）
    const trimFromKey = input.originalDateFrom ?? input.dateFrom
    const records = computeDailyFeatures(rawRows, trimFromKey)
    return { records }
  },
}

export type { DailyFeatureRow }
