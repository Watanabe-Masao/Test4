/**
 * DailyRecordsHandler — 日別明細クエリ
 *
 * store_day_summary から日別の詳細レコードを取得する。
 * DailySalesChart, GrossProfitAmountChart 等で使用。
 */
import type { QueryHandler } from '../QueryContract'
import type { DateRange } from '@/domain/models'
import {
  queryDailyRecords,
  queryPrevYearDailyRecords,
  queryAggregatedDailyRecords,
  type DailyRecordRow,
} from '@/infrastructure/duckdb'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface DailyRecordsInput {
  readonly dateRange: DateRange
  readonly storeIds: ReadonlySet<string>
}

export interface DailyRecordsOutput {
  readonly records: readonly DailyRecordRow[]
}

/** 当年日別明細 */
export const dailyRecordsHandler: QueryHandler<DailyRecordsInput, DailyRecordsOutput> = {
  name: 'DailyRecords',
  async execute(
    conn: AsyncDuckDBConnection,
    input: DailyRecordsInput,
  ): Promise<DailyRecordsOutput> {
    const records = await queryDailyRecords(conn, input.dateRange, input.storeIds)
    return { records }
  },
}

/** 前年日別明細 */
export const prevYearDailyRecordsHandler: QueryHandler<DailyRecordsInput, DailyRecordsOutput> = {
  name: 'PrevYearDailyRecords',
  async execute(
    conn: AsyncDuckDBConnection,
    input: DailyRecordsInput,
  ): Promise<DailyRecordsOutput> {
    const records = await queryPrevYearDailyRecords(conn, input.dateRange, input.storeIds)
    return { records }
  },
}

/** 全店舗集約日別明細 */
export const aggregatedDailyRecordsHandler: QueryHandler<DailyRecordsInput, DailyRecordsOutput> = {
  name: 'AggregatedDailyRecords',
  async execute(
    conn: AsyncDuckDBConnection,
    input: DailyRecordsInput,
  ): Promise<DailyRecordsOutput> {
    const records = await queryAggregatedDailyRecords(conn, input.dateRange, input.storeIds)
    return { records }
  },
}

export type { DailyRecordRow }
