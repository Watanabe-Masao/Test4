/**
 * useWeatherSlice — 天気データ slice
 *
 * 当月・前年の天気データを統合して返す。
 * useUnifiedWidgetContext の context slice として天気関連の依存を局所化する。
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import type { Store } from '@/domain/models/record'
import type { DailyWeatherSummary } from '@/domain/models/WeatherData'
import { useWeatherData } from '@/application/hooks/useWeather'
import { useWeatherStoreId } from '@/application/hooks/useWeatherStoreId'
import { usePrevYearWeather } from '@/application/hooks/usePrevYearWeather'

export interface WeatherSlice {
  readonly weatherDaily: readonly DailyWeatherSummary[]
  readonly prevYearWeatherDaily: readonly DailyWeatherSummary[]
}

export function useWeatherSlice(
  targetYear: number,
  targetMonth: number,
  selectedStoreIds: ReadonlySet<string>,
  stores: ReadonlyMap<string, Store>,
  prevYearDateRange: DateRange | null | undefined,
): WeatherSlice {
  const weatherStoreId = useWeatherStoreId(selectedStoreIds, stores)
  const { daily: weatherDaily } = useWeatherData(targetYear, targetMonth, weatherStoreId)
  const prevYearWeatherDaily = usePrevYearWeather({
    prevYearDateRange: prevYearDateRange ?? undefined,
    targetYear,
    targetMonth,
    weatherStoreId,
  })

  return useMemo(
    () => ({
      weatherDaily: weatherDaily ?? [],
      prevYearWeatherDaily: prevYearWeatherDaily ?? [],
    }),
    [weatherDaily, prevYearWeatherDaily],
  )
}
