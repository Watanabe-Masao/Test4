/**
 * features/weather/application — 天気アプリケーション層
 *
 * hook・adapter・service を re-export する。
 */
export { useWeatherData } from '@/application/hooks/useWeather'
export { usePrevYearWeather } from '@/application/hooks/usePrevYearWeather'
export { useWeatherCorrelation } from '@/application/hooks/useWeatherCorrelation'
export { useWeatherForecast } from '@/application/hooks/useWeatherForecast'
export { useWeatherFallback } from '@/application/hooks/useWeatherFallback'
export { useWeatherStoreId } from '@/application/hooks/useWeatherStoreId'
export { useWeatherHourlyOnDemand } from '@/application/hooks/useWeatherHourlyOnDemand'
export { useWeatherAnalysisPlan } from './plans/useWeatherAnalysisPlan'
export type { StoreDaySummaryInput } from './plans/useWeatherAnalysisPlan'
export { buildDailySalesProjection } from './projections/buildDailySalesProjection'
