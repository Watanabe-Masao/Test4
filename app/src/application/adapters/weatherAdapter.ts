/**
 * WeatherAdapter — WeatherPort の infrastructure 実装
 *
 * infrastructure/weather の各クライアントを WeatherPort インターフェースで公開する。
 * application 層で唯一 infrastructure/weather を直接 import するファイル。
 */
import {
  searchLocation,
  resolveEtrnStationByLocation,
  searchStationsByPrefecture,
  fetchEtrnDailyWeather,
  fetchEtrnHourlyRange,
  resolveForecastOfficeByLocation,
  fetchWeeklyForecast,
  PREFECTURE_NAMES,
} from '@/infrastructure/weather'
import type { WeatherPort } from '@/application/ports/WeatherPort'

export const weatherAdapter: WeatherPort = {
  searchLocation,
  resolveEtrnStationByLocation,
  searchStationsByPrefecture,
  fetchEtrnDailyWeather,
  fetchEtrnHourlyRange,
  resolveForecastOfficeByLocation,
  fetchWeeklyForecast,
  PREFECTURE_NAMES,
}
