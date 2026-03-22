/**
 * TimeSlotChart のデータロジックフック（thin wrapper）
 *
 * R11準拠: 純粋計算は useDuckDBTimeSlotDataLogic.ts に分離。
 * 本ファイルは DuckDB クエリ発行 + 状態管理 + 計算結果の memo のみ。
 */
import { useState, useMemo } from 'react'
import type { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import {
  useDuckDBHourlyAggregation,
  useDuckDBDistinctDayCount,
  useDuckDBLevelAggregation,
  useDuckDBCategoryHourly,
} from '@/application/hooks/useDuckDBQuery'
import { useDuckDBWeatherHourlyAvg } from '@/application/hooks/duckdb/useWeatherHourlyQuery'
import type { HourlyWeatherAvgRow } from '@/application/hooks/duckdb'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useDataStore } from '@/application/stores/dataStore'
import {
  type ViewMode,
  type MetricMode,
  type HierarchyOption,
  buildWowRange,
  computeChartDataAndKpi,
  computeYoYData,
  computeInsights,
} from './useDuckDBTimeSlotDataLogic'

// Re-export types for consumers
export type {
  ViewMode,
  MetricMode,
  TimeSlotKpi,
  YoYRow,
  YoYData,
  HierarchyOption,
} from './useDuckDBTimeSlotDataLogic'

// ── Hook ──

interface Params {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDb?: AsyncDuckDB | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
  /** 日別天気データ（ctx 経由）— DuckDB 時間帯天気が空のときのフォールバック */
  readonly weatherDaily?: readonly DailyWeatherSummary[]
  /** 前年日別天気データ（ctx 経由） */
  readonly prevYearWeatherDaily?: readonly DailyWeatherSummary[]
}

export function useDuckDBTimeSlotData({
  duckConn,
  duckDb,
  weatherDaily: weatherDailyProp,
  prevYearWeatherDaily: prevYearWeatherDailyProp,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
}: Params) {
  const [viewMode, setViewMode] = useState<ViewMode>('chart')
  const [metricMode, setMetricMode] = useState<MetricMode>('amount')
  const [compMode, setCompMode] = useState<'yoy' | 'wow'>('yoy')
  const [showPrev, setShowPrev] = useState(true)
  const [mode, setMode] = useState<'total' | 'daily'>('total')
  const [deptCode, setDeptCode] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [klassCode, setKlassCode] = useState('')

  const hierarchy = useMemo(
    () => ({
      deptCode: deptCode || undefined,
      lineCode: lineCode || undefined,
      klassCode: klassCode || undefined,
    }),
    [deptCode, lineCode, klassCode],
  )

  const wowRange = useMemo(() => buildWowRange(currentDateRange), [currentDateRange])
  const compRange = compMode === 'wow' ? wowRange : prevYearScope?.dateRange
  const compIsPrevYear = compMode === 'yoy'

  // ── DuckDB queries ──

  const {
    data: currentHourly,
    isLoading,
    error,
  } = useDuckDBHourlyAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    hierarchy,
    false,
  )
  const { data: compHourly } = useDuckDBHourlyAggregation(
    duckConn,
    duckDataVersion,
    compRange,
    selectedStoreIds,
    hierarchy,
    compIsPrevYear,
  )
  const { data: currentDayCount } = useDuckDBDistinctDayCount(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    false,
  )
  const { data: compDayCount } = useDuckDBDistinctDayCount(
    duckConn,
    duckDataVersion,
    compRange,
    selectedStoreIds,
    compIsPrevYear,
  )

  // Hierarchy dropdowns
  const { data: departments } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'department',
    undefined,
    false,
  )
  const { data: lines } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'line',
    deptCode ? { deptCode } : undefined,
    false,
  )
  const { data: klasses } = useDuckDBLevelAggregation(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    'klass',
    deptCode || lineCode
      ? { deptCode: deptCode || undefined, lineCode: lineCode || undefined }
      : undefined,
    false,
  )

  // ── カテゴリ×時間帯集約 ──
  const heatmapLevel = deptCode ? (lineCode ? 'klass' : 'line') : 'department'
  const { data: categoryHourlyData } = useDuckDBCategoryHourly(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
    heatmapLevel as 'department' | 'line' | 'klass',
    hierarchy,
    false,
  )

  // ── 天気時間帯平均 ──
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const allStoreIds = useDataStore((s) => s.data.stores)
  const weatherStoreId = useMemo(() => {
    const ids = selectedStoreIds.size > 0 ? [...selectedStoreIds] : [...allStoreIds.keys()]
    return ids.find((id) => storeLocations[id]) ?? ids[0] ?? ''
  }, [selectedStoreIds, allStoreIds, storeLocations])

  const prevDateRange = compMode === 'yoy' ? prevYearScope?.dateRange : undefined
  const { data: curWeatherDuck } = useDuckDBWeatherHourlyAvg(
    duckConn,
    duckDataVersion,
    weatherStoreId,
    currentDateRange,
    duckDb,
  )
  const { data: prevWeatherDuck } = useDuckDBWeatherHourlyAvg(
    duckConn,
    duckDataVersion,
    weatherStoreId,
    prevDateRange,
    duckDb,
  )

  // DuckDB に時間帯天気がない場合、親から渡された日別天気をフォールバックに使う
  const curWeatherAvg = useMemo(() => {
    if ((curWeatherDuck ?? []).length > 0) return curWeatherDuck
    if (!weatherDailyProp || weatherDailyProp.length === 0) return curWeatherDuck
    return buildWeatherFallback(weatherDailyProp)
  }, [curWeatherDuck, weatherDailyProp])

  const prevWeatherAvg = useMemo(() => {
    if ((prevWeatherDuck ?? []).length > 0) return prevWeatherDuck
    if (!prevDateRange || !prevYearWeatherDailyProp || prevYearWeatherDailyProp.length === 0)
      return prevWeatherDuck
    return buildWeatherFallback(prevYearWeatherDailyProp)
  }, [prevWeatherDuck, prevYearWeatherDailyProp, prevDateRange])

  const hasPrev = (compHourly?.length ?? 0) > 0
  const compLabel = compMode === 'wow' ? '前週' : '前年'
  const curLabel = compMode === 'wow' ? '当週' : '当年'

  // ── Computed values (delegated to Logic) ──

  const { chartData, kpi } = useMemo(
    () =>
      computeChartDataAndKpi({
        currentHourly,
        compHourly,
        mode,
        currentDayCount,
        compDayCount,
        hasPrev,
      }),
    [currentHourly, compHourly, mode, currentDayCount, compDayCount, hasPrev],
  )

  const yoyData = useMemo(
    () => computeYoYData(currentHourly, compHourly),
    [currentHourly, compHourly],
  )

  const insights = useMemo(
    () => computeInsights(kpi, compHourly, yoyData, compLabel),
    [kpi, compHourly, yoyData, compLabel],
  )

  // ── Hierarchy helpers ──

  const deptOptions: HierarchyOption[] = useMemo(
    () => departments?.map((d) => ({ code: d.code, name: d.name, amount: d.amount })) ?? [],
    [departments],
  )
  const lineOptions: HierarchyOption[] = useMemo(
    () => lines?.map((l) => ({ code: l.code, name: l.name, amount: l.amount })) ?? [],
    [lines],
  )
  const klassOptions: HierarchyOption[] = useMemo(
    () => klasses?.map((k) => ({ code: k.code, name: k.name, amount: k.amount })) ?? [],
    [klasses],
  )

  const wrappedSetDept = (code: string) => {
    setDeptCode(code)
    setLineCode('')
    setKlassCode('')
  }
  const wrappedSetLine = (code: string) => {
    setLineCode(code)
    setKlassCode('')
  }

  return {
    chartData,
    kpi,
    yoyData,
    insights,
    isLoading,
    error,
    viewMode,
    setViewMode,
    metricMode,
    setMetricMode,
    compMode,
    setCompMode,
    showPrev,
    setShowPrev,
    mode,
    setMode,
    hasPrev,
    compLabel,
    curLabel,
    deptCode,
    lineCode,
    klassCode,
    setDeptCode: wrappedSetDept,
    setLineCode: wrappedSetLine,
    setKlassCode: setKlassCode,
    deptOptions,
    lineOptions,
    klassOptions,
    categoryHourlyData,
    curWeatherAvg,
    prevWeatherAvg,
  }
}

// ─── Helper: 日別天気サマリーから時間帯フォールバックを生成 ───

/**
 * 日別天気サマリー（ETRN 月1リクエスト）から、全時間帯に同じ値を設定した
 * HourlyWeatherAvgRow[] を生成する。DuckDB に時間帯天気データがない場合のフォールバック。
 *
 * 天気アイコン行の表示には十分だが、時間帯別の気温折れ線には不正確（日平均値で一律）。
 */
function buildWeatherFallback(
  daily: readonly {
    temperatureAvg: number
    precipitationTotal: number
    dominantWeatherCode: number
  }[],
): readonly HourlyWeatherAvgRow[] {
  if (daily.length === 0) return []
  const avgTemp = daily.reduce((s, d) => s + d.temperatureAvg, 0) / daily.length
  const totalPrecip = daily.reduce((s, d) => s + d.precipitationTotal, 0)
  // 最頻天気コード
  const codeCounts = new Map<number, number>()
  for (const d of daily)
    codeCounts.set(d.dominantWeatherCode, (codeCounts.get(d.dominantWeatherCode) ?? 0) + 1)
  let modeCode = 0
  let modeCount = 0
  for (const [code, count] of codeCounts) {
    if (count > modeCount) {
      modeCode = code
      modeCount = count
    }
  }

  const rows: HourlyWeatherAvgRow[] = []
  for (let h = 9; h <= 21; h++) {
    rows.push({
      hour: h,
      avgTemperature: avgTemp,
      avgHumidity: 0,
      totalPrecipitation: totalPrecip / daily.length,
      avgSunshineDuration: 0,
      dayCount: daily.length,
      weatherCode: modeCode,
    })
  }
  return rows
}
