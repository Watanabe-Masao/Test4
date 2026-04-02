/**
 * DuckDB クエリ / readModels / 天気データ bundle
 *
 * queryExecutor、正本化 readModels、天気データを統合して返す。
 * useUnifiedWidgetContext から分離し、クエリ関連の依存を局所化する。
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { WeatherPersister } from '@/application/queries/weather'
import type { DateRange } from '@/domain/models/calendar'
import type { Store } from '@/domain/models/record'
import type { DataRepository } from '@/domain/repositories/DataRepository'
import { useWidgetQueryContext } from '@/application/hooks/useWidgetQueryContext'
import {
  useWidgetDataOrchestrator,
  type WidgetDataOrchestratorParams,
  type WidgetDataOrchestratorResult,
} from '@/application/hooks/useWidgetDataOrchestrator'
import { useWeatherData } from '@/application/hooks/useWeather'
import { useWeatherStoreId } from '@/application/hooks/useWeatherStoreId'
import { usePrevYearWeather } from '@/application/hooks/usePrevYearWeather'
import type { DailyWeatherSummary } from '@/domain/models/WeatherData'

export interface QueryBundle {
  readonly queryExecutor: QueryExecutor | null
  readonly weatherPersist: WeatherPersister | null
  readonly duckDataVersion: number
  readonly loadedMonthCount: number
  readonly prevYearStoreCostPrice: ReadonlyMap<string, { cost: number; price: number }> | undefined
  readonly readModels: WidgetDataOrchestratorResult
  readonly weatherDaily: readonly DailyWeatherSummary[]
  readonly prevYearWeatherDaily: readonly DailyWeatherSummary[]
}

export function useQueryBundle(
  targetYear: number,
  targetMonth: number,
  daysInMonth: number,
  selectedStoreIds: ReadonlySet<string>,
  stores: ReadonlyMap<string, Store>,
  repo: DataRepository | null,
  prevYearDateRange: DateRange | null | undefined,
): QueryBundle {
  // DuckDB クエリコンテキスト
  const duckCtx = useWidgetQueryContext(targetYear, targetMonth, repo, prevYearDateRange ?? null)
  const { queryExecutor, weatherPersist, prevYearStoreCostPrice } = duckCtx

  // 正本化 readModels（orchestrator 経由）
  const orchestratorParams = useMemo<WidgetDataOrchestratorParams | null>(
    () =>
      duckCtx.dataVersion > 0
        ? {
            executor: queryExecutor,
            dateFrom: `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`,
            dateTo: `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`,
            storeIds: selectedStoreIds.size > 0 ? Array.from(selectedStoreIds) : undefined,
            dataVersion: duckCtx.dataVersion,
          }
        : null,
    [queryExecutor, targetYear, targetMonth, daysInMonth, selectedStoreIds, duckCtx.dataVersion],
  )
  const readModels = useWidgetDataOrchestrator(
    orchestratorParams ?? {
      executor: null,
      dateFrom: '',
      dateTo: '',
      dataVersion: 0,
    },
  )

  // 天気データ
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
      queryExecutor,
      weatherPersist,
      duckDataVersion: duckCtx.dataVersion,
      loadedMonthCount: duckCtx.loadedMonthCount,
      prevYearStoreCostPrice,
      readModels,
      weatherDaily: weatherDaily ?? [],
      prevYearWeatherDaily: prevYearWeatherDaily ?? [],
    }),
    [
      queryExecutor,
      weatherPersist,
      duckCtx.dataVersion,
      duckCtx.loadedMonthCount,
      prevYearStoreCostPrice,
      readModels,
      weatherDaily,
      prevYearWeatherDaily,
    ],
  )
}
