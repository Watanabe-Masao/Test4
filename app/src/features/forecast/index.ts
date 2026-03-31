/**
 * features/forecast — 需要予測スライス
 */
export { ForecastTabContent, DecompositionTabContent } from './ui'
export {
  computeWeeklyActuals,
  computeDecompPct,
  computeDecompTotals,
  type DecompTotals,
} from './ui'
export {
  useForecast,
  useWeekRanges,
  type ForecastInput,
  type ForecastResult,
  type WeeklySummary,
  type DayOfWeekAverage,
} from './application'
