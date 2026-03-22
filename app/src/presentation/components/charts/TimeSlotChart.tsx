/**
 * TimeSlotChart — 時間帯別売上チャート Controller
 *
 * データ取得（useDuckDBTimeSlotData）と状態管理を担い、
 * 描画は TimeSlotChartView に委譲する。
 *
 * DailySalesChart → DailySalesChartBody と同じ Controller / View パターン。
 * chartOption 構築は TimeSlotChartOptionBuilder.ts の純粋関数で行う。
 *
 * context 渡し（親コンテナ経由）と従来 props 渡し（暫定互換）の両方に対応。
 * 新規利用箇所では context を使用すること。従来 props は縮退予定。
 */
import { memo, useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import type { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { SalesAnalysisContext } from '@/application/models/SalesAnalysisContext'
import type { AnalysisViewEvents } from '@/application/models/AnalysisViewEvents'
import type { AppTheme } from '@/presentation/theme/theme'
import { useI18n } from '@/application/hooks/useI18n'
import { ChartCard } from './ChartCard'
import { ErrorMsg } from './TimeSlotChart.styles'
import { useDuckDBTimeSlotData } from './useDuckDBTimeSlotData'
import { toWeatherHourlyDisplayList } from './TimeSlotWeatherLogic'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import { EmptyState } from '@/presentation/components/common/layout'
import { TimeSlotChartView, type LineMode } from './TimeSlotChartView'
import { buildTimeSlotChartOption, buildWeatherMap } from './TimeSlotChartOptionBuilder'

// ── Props ──

interface Props {
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDb?: AsyncDuckDB | null
  readonly duckDataVersion: number
  /** 分析文脈（親コンテナから渡される場合 — 推奨） */
  readonly context?: SalesAnalysisContext
  /**
   * @deprecated context.dateRange を使用してください。
   * UnifiedTimeSlotWidget 互換のみ。縮退後に削除予定。
   */
  readonly currentDateRange?: DateRange
  /**
   * @deprecated context.selectedStoreIds を使用してください。
   * UnifiedTimeSlotWidget 互換のみ。縮退後に削除予定。
   */
  readonly selectedStoreIds?: ReadonlySet<string>
  /**
   * @deprecated context.comparisonScope を使用してください。
   * UnifiedTimeSlotWidget 互換のみ。縮退後に削除予定。
   */
  readonly prevYearScope?: PrevYearScope
  /** 子→親イベント（親コンテナがハンドラを提供） */
  readonly events?: AnalysisViewEvents
}

// ── Component ──

export const TimeSlotChart = memo(function TimeSlotChart({
  duckConn,
  duckDb,
  duckDataVersion,
  context,
  currentDateRange: legacyDateRange,
  selectedStoreIds: legacyStoreIds,
  prevYearScope: legacyPrevYearScope,
}: Props) {
  // context がある場合はそこから解決、なければ従来 props を使用
  const dateRange = context?.dateRange ?? legacyDateRange
  const storeIds = context?.selectedStoreIds ?? legacyStoreIds
  const prevYearScope = context?.comparisonScope ?? legacyPrevYearScope

  const theme = useTheme() as AppTheme
  const { messages } = useI18n()
  const [detailView, setDetailView] = useState<'table' | 'heatmap'>('table')
  const [heatmapMetric, setHeatmapMetric] = useState<'amount' | 'quantity'>('amount')
  const [lineMode, setLineMode] = useState<LineMode>('quantity')

  // dateRange / storeIds がない場合は空のダミーで hook を呼ぶ（hooks の呼び出し順序を維持）
  const emptyStoreIds = useMemo(() => new Set<string>(), [])
  const dummyDateRange = useMemo<DateRange>(
    () => ({ from: { year: 2000, month: 1, day: 1 }, to: { year: 2000, month: 1, day: 1 } }),
    [],
  )
  const hasRequiredProps = dateRange != null && storeIds != null

  const d = useDuckDBTimeSlotData({
    duckConn: hasRequiredProps ? duckConn : null,
    duckDb,
    duckDataVersion,
    currentDateRange: dateRange ?? dummyDateRange,
    selectedStoreIds: storeIds ?? emptyStoreIds,
    prevYearScope,
  })

  const showPrev = d.hasPrev && d.showPrev

  // 天気データを表示モデルに変換（weatherCode の解釈は domain 層で完結）
  const curWeatherForTable = useMemo(
    () => toWeatherHourlyDisplayList(d.curWeatherAvg),
    [d.curWeatherAvg],
  )
  const prevWeatherForTable = useMemo(
    () => toWeatherHourlyDisplayList(d.prevWeatherAvg),
    [d.prevWeatherAvg],
  )

  const hours = useMemo(() => d.chartData.map((r) => String(r.hour)), [d.chartData])
  const curWeatherMap = useMemo(() => buildWeatherMap(d.curWeatherAvg), [d.curWeatherAvg])
  const prevWeatherMap = useMemo(() => buildWeatherMap(d.prevWeatherAvg), [d.prevWeatherAvg])
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
    ],
  )

  // ── Early returns（hooks の後） ──

  if (!hasRequiredProps) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  if (d.error) {
    return (
      <ChartCard title="時間帯別売上" ariaLabel="時間帯別売上">
        <ErrorMsg>
          {messages.errors.dataFetchFailed}: {d.error}
        </ErrorMsg>
      </ChartCard>
    )
  }

  if (d.isLoading && !d.chartData.length) {
    return <ChartSkeleton />
  }

  if (!duckConn || duckDataVersion === 0 || d.chartData.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <ChartCard title={`時間帯別 ${d.compLabel}比較`} ariaLabel="時間帯別売上">
      <TimeSlotChartView
        chartOption={chartOption}
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
