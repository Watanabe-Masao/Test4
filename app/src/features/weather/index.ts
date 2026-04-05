/**
 * features/weather — 天気データスライス
 *
 * 天気データ取得（ETRN）・永続化・フォールバック・相関分析を含む。
 * 外部からの参照はこの barrel 経由のみ許可。
 *
 * 原則:
 *   - 他の features/* への直接依存は禁止（shared/ 経由のみ）
 *   - 実体ファイルは段階的に移行（既存パスからの re-export で後方互換維持）
 */

// ─── Domain（モデル・集計・分類） ──────────────────────
export type {
  WeatherCategory,
  HourlyWeatherRecord,
  DailyWeatherSummary,
  WeatherPort,
  EtrnStation,
  EtrnStationEntry,
} from './domain'

export {
  aggregateHourlyToDaily,
  toWeatherDisplay,
  weatherCategoryLabel,
  categorizeWeatherCode,
  mapJmaWeatherCodeToWmo,
  mapJmaWeatherCodeToCategory,
} from './domain'

// ─── Application（hooks） ──────────────────────────────
export {
  useWeatherData,
  usePrevYearWeather,
  useWeatherCorrelation,
  useWeatherForecast,
  useWeatherFallback,
  useWeatherStoreId,
  useWeatherHourlyOnDemand,
  useWeatherAnalysisPlan,
  type StoreDaySummaryInput,
} from './application'
