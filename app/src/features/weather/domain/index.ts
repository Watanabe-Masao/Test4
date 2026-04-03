/**
 * features/weather/domain — 天気ドメイン層
 *
 * 天気データモデル・集計・予報マッピングを re-export する。
 */
export type {
  WeatherCategory,
  HourlyWeatherRecord,
  DailyWeatherSummary,
} from '@/domain/models/WeatherData'

export type { WeatherPort, EtrnStation, EtrnStationEntry } from '@/domain/ports/WeatherPort'

export {
  aggregateHourlyToDaily,
  toWeatherDisplay,
  weatherCategoryLabel,
  categorizeWeatherCode,
} from '@/domain/weather/weatherAggregation'

export {
  mapJmaWeatherCodeToWmo,
  mapJmaWeatherCodeToCategory,
} from '@/domain/weather/forecastWeatherMapping'
