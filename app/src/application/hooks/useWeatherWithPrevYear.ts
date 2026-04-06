/**
 * useWeatherWithPrevYear — 当年+前年の天気データを一括取得
 *
 * presentation 層で year - 1 を直接計算することを避けるための
 * application 層フック。前年の年を内部で導出する。
 *
 * comparisonScopeGuard 対応 — presentation での prevYear 独自計算を回避
 */
import type { DailyWeatherSummary } from '@/domain/models/record'
import { useWeatherData, type UseWeatherResult } from './useWeather'

export interface UseWeatherWithPrevYearResult {
  readonly current: UseWeatherResult
  readonly prevYearDaily: readonly DailyWeatherSummary[]
}

export function useWeatherWithPrevYear(
  year: number,
  month: number,
  storeId: string,
): UseWeatherWithPrevYearResult {
  const current = useWeatherData(year, month, storeId)
  const prevYear = year - 1
  const { daily: prevYearDaily } = useWeatherData(prevYear, month, storeId)

  return { current, prevYearDaily }
}
