/**
 * useQuerySlice — query 実行・readModel アクセス slice
 *
 * queryExecutor と正本化 readModels を統合して返す。
 * useUnifiedWidgetContext の context slice としてクエリ関連の依存を局所化する。
 *
 * 天気データは useWeatherSlice に分離済み。
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { WeatherPersister } from '@/application/queries/weather'
import type { DateRange } from '@/domain/models/calendar'
import type { DataRepository } from '@/domain/repositories/DataRepository'
import { useWidgetQueryContext } from '@/application/hooks/useWidgetQueryContext'
import {
  useWidgetDataOrchestrator,
  type WidgetDataOrchestratorParams,
  type WidgetDataOrchestratorResult,
} from '@/application/hooks/useWidgetDataOrchestrator'

export interface QuerySlice {
  readonly queryExecutor: QueryExecutor | null
  readonly weatherPersist: WeatherPersister | null
  readonly duckDataVersion: number
  readonly loadedMonthCount: number
  readonly prevYearStoreCostPrice: ReadonlyMap<string, { cost: number; price: number }> | undefined
  readonly readModels: WidgetDataOrchestratorResult
}

export function useQuerySlice(
  targetYear: number,
  targetMonth: number,
  daysInMonth: number,
  selectedStoreIds: ReadonlySet<string>,
  repo: DataRepository | null,
  prevYearDateRange: DateRange | null | undefined,
): QuerySlice {
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
            storeIds: selectedStoreIds.size > 0 ? Array.from(selectedStoreIds).sort() : undefined,
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

  return useMemo(
    () => ({
      queryExecutor,
      weatherPersist,
      duckDataVersion: duckCtx.dataVersion,
      loadedMonthCount: duckCtx.loadedMonthCount,
      prevYearStoreCostPrice,
      readModels,
    }),
    [
      queryExecutor,
      weatherPersist,
      duckCtx.dataVersion,
      duckCtx.loadedMonthCount,
      prevYearStoreCostPrice,
      readModels,
    ],
  )
}
