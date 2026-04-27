/**
 * TimeSlotChart — 時間帯別売上チャート Controller
 *
 * データ取得（useTimeSlotData）と状態管理を担い、
 * 描画は TimeSlotChartView に委譲する。
 *
 * DailySalesChart → DailySalesChartBody と同じ Controller / View パターン。
 * chartOption 構築は TimeSlotChartOptionBuilder.ts の純粋関数で行う。
 *
 * context 渡し（親コンテナ経由）と従来 props 渡し（暫定互換）の両方に対応。
 * 新規利用箇所では context を使用すること。従来 props は縮退予定。
 * @responsibility R:unclassified
 */
import { memo, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import type { DateRange } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { WeatherPersister } from '@/application/queries/weather'
import type { SalesAnalysisContext } from '@/application/models/SalesAnalysisContext'
import type { AnalysisViewEvents } from '@/application/models/AnalysisViewEvents'
import type { AppTheme } from '@/presentation/theme/theme'
import { useI18n } from '@/application/hooks/useI18n'
import { ChartCard } from './ChartCard'
import { ErrorMsg } from './TimeSlotChart.styles'
import { useTimeSlotData } from '@/application/hooks/useTimeSlotData'
import { toWeatherHourlyDisplayList } from './TimeSlotWeatherLogic'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import { EmptyState } from '@/presentation/components/common/layout'
import { TimeSlotChartView, type LineMode, type DeptViewMode } from './TimeSlotChartView'
import { buildTimeSlotChartOption, buildWeatherMap } from './TimeSlotChartOptionBuilder'
import { buildDeptStackedAreaOption } from './TimeSlotDeptAreaBuilder'

// ── Props ──

interface Props {
  readonly queryExecutor: QueryExecutor | null
  /** 分析文脈（親コンテナから渡す） */
  readonly context?: SalesAnalysisContext
  /** 子→親イベント（親コンテナがハンドラを提供） */
  readonly events?: AnalysisViewEvents
  /** 天気データ永続化コールバック（ETRN フォールバック用） */
  readonly weatherPersist?: WeatherPersister | null
}

// ── Module-level constants（useMemo 削減） ──
const EMPTY_STORE_IDS = new Set<string>()
const DUMMY_DATE_RANGE: DateRange = {
  from: { year: 2000, month: 1, day: 1 },
  to: { year: 2000, month: 1, day: 1 },
}

// ── Component ──

export const TimeSlotChart = memo(function TimeSlotChart({
  queryExecutor,
  context,
  weatherPersist,
}: Props) {
  const dateRange = context?.dateRange
  const storeIds = context?.selectedStoreIds
  const prevYearScope = context?.comparisonScope

  const theme = useTheme() as AppTheme
  const { messages } = useI18n()
  const [detailView, setDetailView] = useState<'table' | 'heatmap'>('table')
  const [heatmapMetric, setHeatmapMetric] = useState<'amount' | 'quantity'>('amount')
  const [lineMode, setLineMode] = useState<LineMode>('quantity')
  const [chartMode, setChartMode] = useState<'overview' | 'department'>('overview')
  const [deptViewMode, setDeptViewMode] = useState<DeptViewMode>('stacked')

  const hasRequiredProps = dateRange != null && storeIds != null

  const d = useTimeSlotData({
    queryExecutor: hasRequiredProps ? queryExecutor : null,
    currentDateRange: dateRange ?? DUMMY_DATE_RANGE,
    selectedStoreIds: storeIds ?? EMPTY_STORE_IDS,
    prevYearScope,
    weatherPersist,
  })

  const showPrev = d.hasPrev && d.showPrev

  // 2 useMemo → 1: 天気表示モデル一括構築
  const { curWeatherForTable, prevWeatherForTable } = useMemo(
    () => ({
      curWeatherForTable: toWeatherHourlyDisplayList(d.curWeatherAvg),
      prevWeatherForTable: toWeatherHourlyDisplayList(d.prevWeatherAvg),
    }),
    [d.curWeatherAvg, d.prevWeatherAvg],
  )

  // 3 useMemo → 1: hours + weatherMaps 一括構築
  const { hours, curWeatherMap, prevWeatherMap } = useMemo(
    () => ({
      hours: d.chartData.map((r) => String(r.hour)),
      curWeatherMap: buildWeatherMap(d.curWeatherAvg),
      prevWeatherMap: buildWeatherMap(d.prevWeatherAvg),
    }),
    [d.chartData, d.curWeatherAvg, d.prevWeatherAvg],
  )
  const hasWeatherData = curWeatherMap.size > 0

  // ECharts option — 純粋関数で構築
  const chartOption = useMemo(
    () =>
      buildTimeSlotChartOption({
        chartData: d.chartData,
        hours,
        curLabel: d.curLabel,
        compLabel: d.compLabel,
        showPrev,
        theme,
        lineMode,
        curWeatherMap,
        prevWeatherMap,
        coreTimeRange: d.kpi?.coreTimeAmt ?? null,
        peakHour: d.kpi?.peakHour ?? null,
        prevCoreTimeRange: d.kpi?.prevCoreTimeAmt ?? null,
        prevPeakHour: d.kpi?.prevPeakHour ?? null,
      }),
    [
      hours,
      d.chartData,
      d.curLabel,
      d.compLabel,
      showPrev,
      theme,
      lineMode,
      curWeatherMap,
      prevWeatherMap,
      d.kpi,
    ],
  )

  // 部門別積み上げ面グラフ option（chartMode === 'department' 時のみ — useMemo 上限のため通常変数）
  const deptAreaOption =
    chartMode === 'department' && (d.categoryHourlyData?.length ?? 0) > 0
      ? buildDeptStackedAreaOption({
          data: d.categoryHourlyData ?? [],
          theme,
          lineMode,
          viewMode: deptViewMode,
          chartData: d.chartData,
          showPrev,
          curWeatherMap,
          prevWeatherMap,
        })
      : null
  const effectiveChartOption = deptAreaOption ?? chartOption

  // ── Early returns（hooks の後） ──

  if (!hasRequiredProps) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  if (d.error) {
    return (
      <ChartCard title="時間帯別売上" ariaLabel="時間帯別売上">
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {d.error?.message}
        </ErrorMsg>
      </ChartCard>
    )
  }

  if (d.isLoading && !d.chartData.length) {
    return <ChartSkeleton />
  }

  if (!queryExecutor?.isReady || d.chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <ChartCard title={`時間帯別 ${d.compLabel}比較`} ariaLabel="時間帯別売上">
      <TimeSlotChartView
        chartOption={effectiveChartOption}
        chartMode={chartMode}
        onChartModeChange={setChartMode}
        deptViewMode={deptViewMode}
        onDeptViewModeChange={setDeptViewMode}
        hours={hours}
        chartData={d.chartData}
        kpi={d.kpi}
        insights={d.insights}
        curLabel={d.curLabel}
        compLabel={d.compLabel}
        hasPrev={d.hasPrev}
        showPrev={showPrev}
        curWeather={curWeatherForTable ?? []}
        prevWeather={prevWeatherForTable ?? []}
        hasWeatherData={hasWeatherData}
        categoryHourlyData={d.categoryHourlyData ?? []}
        prevCategoryHourlyData={d.prevCategoryHourlyData ?? []}
        deptOptions={d.deptOptions}
        lineOptions={d.lineOptions}
        klassOptions={d.klassOptions}
        deptCode={d.deptCode}
        lineCode={d.lineCode}
        klassCode={d.klassCode}
        onDeptCodeChange={d.setDeptCode}
        onLineCodeChange={d.setLineCode}
        onKlassCodeChange={d.setKlassCode}
        lineMode={lineMode}
        onLineModeChange={setLineMode}
        detailView={detailView}
        onDetailViewChange={setDetailView}
        heatmapMetric={heatmapMetric}
        onHeatmapMetricChange={setHeatmapMetric}
        hasPrevWeather={prevWeatherMap.size > 0}
      />
    </ChartCard>
  )
})
