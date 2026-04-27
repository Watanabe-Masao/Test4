/**
 * useTimeSlotWeatherPlan — TimeSlot 天気データ取得 + ETRN fallback
 *
 * useTimeSlotPlan から分離した天気関連のサブプラン。
 * DuckDB 天気クエリ + ETRN fallback retry を管理する。
 *
 * @guard H1 Screen Plan 経由のみ
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  weatherHourlyAvgHandler,
  type WeatherHourlyAvgInput,
  type WeatherPersister,
} from '@/application/queries/weather'
import type { HourlyWeatherAvgRow } from '@/application/queries/weather/WeatherHourlyHandler'
import type { Store } from '@/domain/models/Store'
import type { StoreLocation } from '@/domain/models/record'
import { useWeatherFallback } from '@/application/hooks/useWeatherFallback'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataStore } from '@/application/stores/dataStore'

const EMPTY_STORES: ReadonlyMap<string, Store> = new Map()

function toKeys(range: DateRange): { dateFrom: string; dateTo: string } {
  const { fromKey, toKey } = dateRangeToKeys(range)
  return { dateFrom: fromKey, dateTo: toKey }
}

export interface TimeSlotWeatherParams {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevDateRange: DateRange | undefined
  readonly weatherPersist?: WeatherPersister | null
}

export interface TimeSlotWeatherResult {
  readonly curWeatherAvg: readonly HourlyWeatherAvgRow[] | null
  readonly prevWeatherAvg: readonly HourlyWeatherAvgRow[] | null
}

export function useTimeSlotWeatherPlan(params: TimeSlotWeatherParams): TimeSlotWeatherResult {
  const { queryExecutor, currentDateRange, selectedStoreIds, prevDateRange, weatherPersist } =
    params

  // ── Weather store resolution ──
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const allStoreIds = useDataStore((s) => s.currentMonthData?.stores ?? EMPTY_STORES)
  const weatherStoreId = useMemo(() => {
    const ids = selectedStoreIds.size > 0 ? [...selectedStoreIds] : [...allStoreIds.keys()]
    return ids.find((id) => storeLocations[id]) ?? ids[0] ?? ''
  }, [selectedStoreIds, allStoreIds, storeLocations])

  // ── Current weather ──
  const weatherKeys = useMemo(() => toKeys(currentDateRange), [currentDateRange])
  const location: StoreLocation | undefined = storeLocations[weatherStoreId]

  const [weatherRetry, setWeatherRetry] = useState(0)
  const curWeatherInput = useMemo<WeatherHourlyAvgInput>(
    () => ({
      storeId: weatherStoreId,
      ...weatherKeys,
      ...(weatherRetry > 0 ? { _v: weatherRetry } : {}),
    }),
    [weatherStoreId, weatherKeys, weatherRetry],
  )

  // ── Prev weather ──
  const [prevWeatherRetry, setPrevWeatherRetry] = useState(0)
  const prevWeatherInput = useMemo<WeatherHourlyAvgInput | null>(() => {
    if (!prevDateRange) return null
    return {
      storeId: weatherStoreId,
      ...toKeys(prevDateRange),
      ...(prevWeatherRetry > 0 ? { _v: prevWeatherRetry } : {}),
    }
  }, [weatherStoreId, prevDateRange, prevWeatherRetry])

  // ── Query execution ──
  const { data: curWeatherOut } = useQueryWithHandler(
    queryExecutor,
    weatherHourlyAvgHandler,
    curWeatherInput,
  )
  const { data: prevWeatherOut } = useQueryWithHandler(
    queryExecutor,
    weatherHourlyAvgHandler,
    prevWeatherInput,
  )

  // ── ETRN Fallback ──
  const duckQueryEmpty = curWeatherOut === null ? null : (curWeatherOut.records ?? []).length === 0
  useWeatherFallback({
    duckQueryEmpty,
    storeId: weatherStoreId,
    location,
    dateRange: currentDateRange,
    dateFrom: weatherKeys.dateFrom,
    dateTo: weatherKeys.dateTo,
    persist: weatherPersist,
    onRetry: () => setWeatherRetry((v) => v + 1),
  })

  const prevDuckQueryEmpty =
    prevWeatherOut === null ? null : (prevWeatherOut.records ?? []).length === 0
  const prevWeatherKeys = useMemo(
    () => (prevDateRange ? toKeys(prevDateRange) : null),
    [prevDateRange],
  )
  useWeatherFallback({
    duckQueryEmpty: prevDuckQueryEmpty,
    storeId: weatherStoreId,
    location,
    dateRange: prevDateRange ?? currentDateRange,
    dateFrom: prevWeatherKeys?.dateFrom ?? '',
    dateTo: prevWeatherKeys?.dateTo ?? '',
    persist: weatherPersist,
    onRetry: () => setPrevWeatherRetry((v) => v + 1),
  })

  return {
    curWeatherAvg: curWeatherOut?.records ?? null,
    prevWeatherAvg: prevWeatherOut?.records ?? null,
  }
}
