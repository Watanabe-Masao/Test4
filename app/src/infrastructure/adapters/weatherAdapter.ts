/**
 * WeatherAdapter — WeatherPort の infrastructure 実装
 *
 * infrastructure/weather の低レベル API を WeatherPort の消費者向き抽象に変換する。
 * application 層で唯一 infrastructure/weather を直接 import するファイル。
 *
 * 変換責務:
 * - EtrnStation → precNo/blockNo/stationType の展開
 * - WeeklyForecastResult → DailyForecast[] の抽出
 *
 * @guard A1 application/adapters/ 経由で infrastructure にアクセス
 * @see guards/layerBoundaryGuard.test.ts
 */
import {
  searchLocation,
  resolveEtrnStationByLocation,
  fetchEtrnDailyWeather,
  fetchEtrnHourlyRange,
  resolveForecastOfficeByLocation,
  fetchWeeklyForecast,
  getStaticStationList,
  PREFECTURE_NAMES,
} from '@/infrastructure/weather'
import type { WeatherPort, EtrnStation, HourlyProgressCallback } from '@/domain/ports/WeatherPort'

export const weatherAdapter: WeatherPort = {
  searchLocation,
  resolveEtrnStationByLocation,
  getStaticStationList,
  PREFECTURE_NAMES,

  // EtrnStation → 低レベル引数に展開
  async fetchDailyWeather(station: EtrnStation, year: number, month: number) {
    return fetchEtrnDailyWeather(station.precNo!, station.blockNo, station.stationType, year, month)
  },

  async fetchHourlyRange(
    station: EtrnStation,
    year: number,
    month: number,
    days: readonly number[],
    onProgress?: HourlyProgressCallback,
  ) {
    return fetchEtrnHourlyRange(
      station.precNo!,
      station.blockNo,
      station.stationType,
      year,
      month,
      days,
      onProgress,
    )
  },

  resolveForecastOfficeByLocation,

  async fetchWeeklyForecast(officeCode: string, weekAreaCode?: string) {
    return fetchWeeklyForecast(officeCode, weekAreaCode)
  },
}
