/**
 * HourDowMatrixHandler — 時間帯×曜日マトリクスクエリ
 *
 * HeatmapChart で使用。
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryHourDowMatrix,
  type HourDowMatrixRow,
} from '@/infrastructure/duckdb/queries/ctsHourlyQueries'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface HourDowMatrixInput extends BaseQueryInput {
  readonly deptCode?: string
  readonly lineCode?: string
  readonly klassCode?: string
}

export interface HourDowMatrixOutput {
  readonly records: readonly HourDowMatrixRow[]
}

export const hourDowMatrixHandler: QueryHandler<HourDowMatrixInput, HourDowMatrixOutput> = {
  name: 'HourDowMatrix',
  async execute(
    conn: AsyncDuckDBConnection,
    input: HourDowMatrixInput,
  ): Promise<HourDowMatrixOutput> {
    const records = await queryHourDowMatrix(conn, input)
    return { records }
  },
}

export type { HourDowMatrixRow }
