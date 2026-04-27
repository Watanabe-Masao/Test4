/**
 * WeatherHourlyHandler — 天気時間帯クエリ
 *
 * weather_hourly テーブルから時間別天気データを取得する QueryHandler。
 * 単日取得と日付範囲平均の 2 ハンドラーを提供。
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler } from '../QueryContract'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { HourlyWeatherRecord } from '@/domain/models/record'
import {
  queryWeatherHourly,
  queryWeatherHourlyAvg,
  type HourlyWeatherAvgRow,
} from '@/infrastructure/duckdb/queries/weatherQueries'

// ── 単日時間別天気 ──

export interface WeatherHourlyInput {
  readonly storeId: string
  readonly dateFrom: string
  readonly dateTo: string
}

export interface WeatherHourlyOutput {
  readonly records: readonly HourlyWeatherRecord[]
}

/** 指定店舗・日付範囲の時間別天気データ */
export const weatherHourlyHandler: QueryHandler<WeatherHourlyInput, WeatherHourlyOutput> = {
  name: 'WeatherHourly',
  async execute(
    conn: AsyncDuckDBConnection,
    input: WeatherHourlyInput,
  ): Promise<WeatherHourlyOutput> {
    const records = await queryWeatherHourly(conn, input.storeId, input.dateFrom, input.dateTo)
    return { records }
  },
}

// ── 時間帯別天気平均 ──

export interface WeatherHourlyAvgInput {
  readonly storeId: string
  readonly dateFrom: string
  readonly dateTo: string
}

export interface WeatherHourlyAvgOutput {
  readonly records: readonly HourlyWeatherAvgRow[]
}

/** 指定店舗・日付範囲の時間帯別天気平均（月間プロファイル用） */
export const weatherHourlyAvgHandler: QueryHandler<WeatherHourlyAvgInput, WeatherHourlyAvgOutput> =
  {
    name: 'WeatherHourlyAvg',
    async execute(
      conn: AsyncDuckDBConnection,
      input: WeatherHourlyAvgInput,
    ): Promise<WeatherHourlyAvgOutput> {
      const records = await queryWeatherHourlyAvg(conn, input.storeId, input.dateFrom, input.dateTo)
      return { records }
    },
  }

export type { HourlyWeatherAvgRow }
