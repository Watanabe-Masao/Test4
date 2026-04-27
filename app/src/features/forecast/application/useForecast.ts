/**
 * 予測計算フック
 *
 * presentation 層が domain/calculations/forecast を直接呼ぶことを避け、
 * application 層で予測結果を提供する。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import { calculateForecast, getWeekRanges } from '@/application/services/forecastBridge'
import type {
  ForecastInput,
  ForecastResult,
  WeeklySummary,
  DayOfWeekAverage,
} from '@/application/services/forecastBridge'

// Re-export types for presentation layer
export type { ForecastInput, ForecastResult, WeeklySummary, DayOfWeekAverage }

/** 予測分析を実行し結果をメモ化する */
export function useForecast(input: ForecastInput | null): ForecastResult | null {
  return useMemo(() => (input ? calculateForecast(input) : null), [input])
}

/** 月の週範囲を取得 */
export function useWeekRanges(year: number, month: number) {
  return useMemo(() => getWeekRanges(year, month), [year, month])
}
