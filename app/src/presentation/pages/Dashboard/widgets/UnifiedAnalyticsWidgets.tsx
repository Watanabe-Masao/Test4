/**
 * 統合分析ウィジェット — データソース解決ファサード
 *
 * DuckDB / CTS / StoreResult のうち最適なソースを自動選択し、
 * UI はデータの取得元を意識しない。
 *
 * 統合対象ペア:
 * 1. 時間帯別売上     : DuckDBTimeSlotChart ↔ TimeSlotSalesChart
 * 2. 時間帯×曜日ヒートマップ : DuckDBHeatmapChart ↔ TimeSlotHeatmapChart
 * 3. 部門別時間帯パターン  : DuckDBDeptHourlyChart ↔ DeptHourlyPatternChart
 * 4. 店舗×時間帯比較    : DuckDBStoreHourlyChart ↔ StoreTimeSlotComparisonChart
 * 5. 前年比較         : DuckDBYoYChart ↔ YoYVarianceChart
 */
import { memo } from 'react'
import {
  resolveTimeSeriesSource,
  resolveYoYSource,
  type SourceContext,
} from '@/application/hooks/useAnalyticsResolver'
import {
  TimeSlotSalesChart,
  TimeSlotHeatmapChart,
  DeptHourlyPatternChart,
  StoreTimeSlotComparisonChart,
  YoYVarianceChart,
  DuckDBTimeSlotChart,
  DuckDBHeatmapChart,
  DuckDBDeptHourlyChart,
  DuckDBStoreHourlyChart,
  DuckDBYoYChart,
} from '@/presentation/components/charts'
import type { WidgetContext } from './types'

// ── Helper: WidgetContext → SourceContext ──

function toSourceCtx(ctx: WidgetContext): SourceContext {
  return {
    duckConn: ctx.duckConn,
    duckDataVersion: ctx.duckDataVersion,
    duckLoadedMonthCount: ctx.duckLoadedMonthCount,
    ctsRecordCount: ctx.ctsIndex.recordCount,
    storeCount: ctx.stores.size,
    hasPrevYear: ctx.prevYearDateRange != null,
  }
}

// ── 1. 時間帯別売上 ──

export const UnifiedTimeSlotWidget = memo(function UnifiedTimeSlotWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const { source } = resolveTimeSeriesSource(toSourceCtx(ctx))

  if (source === 'duckdb') {
    return (
      <DuckDBTimeSlotChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    )
  }

  return (
    <TimeSlotSalesChart
      ctsIndex={ctx.ctsIndex}
      prevCtsIndex={ctx.prevCtsIndex}
      selectedStoreIds={ctx.selectedStoreIds}
      daysInMonth={ctx.daysInMonth}
      year={ctx.year}
      month={ctx.month}
      dataMaxDay={ctx.dataMaxDay}
    />
  )
})

// ── 2. 時間帯×曜日ヒートマップ ──

export const UnifiedHeatmapWidget = memo(function UnifiedHeatmapWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const { source } = resolveTimeSeriesSource(toSourceCtx(ctx))

  if (source === 'duckdb') {
    return (
      <DuckDBHeatmapChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    )
  }

  return (
    <TimeSlotHeatmapChart
      ctsIndex={ctx.ctsIndex}
      prevCtsIndex={ctx.prevCtsIndex}
      selectedStoreIds={ctx.selectedStoreIds}
      year={ctx.year}
      month={ctx.month}
      daysInMonth={ctx.daysInMonth}
      dataMaxDay={ctx.dataMaxDay}
    />
  )
})

// ── 3. 部門別時間帯パターン ──

export const UnifiedDeptHourlyWidget = memo(function UnifiedDeptHourlyWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const { source } = resolveTimeSeriesSource(toSourceCtx(ctx))

  if (source === 'duckdb') {
    return (
      <DuckDBDeptHourlyChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    )
  }

  return (
    <DeptHourlyPatternChart
      ctsIndex={ctx.ctsIndex}
      prevCtsIndex={ctx.prevCtsIndex}
      selectedStoreIds={ctx.selectedStoreIds}
      daysInMonth={ctx.daysInMonth}
      year={ctx.year}
      month={ctx.month}
      dataMaxDay={ctx.dataMaxDay}
    />
  )
})

// ── 4. 店舗×時間帯比較 ──

export const UnifiedStoreHourlyWidget = memo(function UnifiedStoreHourlyWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const { source } = resolveTimeSeriesSource(toSourceCtx(ctx))

  if (source === 'duckdb') {
    return (
      <DuckDBStoreHourlyChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
        stores={ctx.stores}
      />
    )
  }

  return (
    <StoreTimeSlotComparisonChart
      ctsIndex={ctx.ctsIndex}
      stores={ctx.stores}
      daysInMonth={ctx.daysInMonth}
      year={ctx.year}
      month={ctx.month}
      dataMaxDay={ctx.dataMaxDay}
    />
  )
})

// ── 5. 前年比較 ──

export const UnifiedYoYWidget = memo(function UnifiedYoYWidget({ ctx }: { ctx: WidgetContext }) {
  const { source } = resolveYoYSource(toSourceCtx(ctx))

  if (source === 'duckdb') {
    return (
      <DuckDBYoYChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        prevYearDateRange={
          ctx.prevYearDateRange
            ? {
                from: { ...ctx.duckDateRange.from, year: ctx.duckDateRange.from.year - 1 },
                to: { ...ctx.duckDateRange.to, year: ctx.duckDateRange.to.year - 1 },
              }
            : undefined
        }
        selectedStoreIds={ctx.selectedStoreIds}
      />
    )
  }

  // StoreResult fallback
  if (!ctx.prevYear.hasPrevYear || ctx.prevYear.totalSales <= 0) return null
  return (
    <YoYVarianceChart
      daily={ctx.result.daily}
      daysInMonth={ctx.daysInMonth}
      prevYearDaily={ctx.prevYear.daily}
    />
  )
})

// ── 可視性判定関数（registry の isVisible 用） ──

/** 時系列ウィジェットの表示判定: DuckDB or CTS どちらかにデータがあれば表示 */
export function isTimeSeriesVisible(ctx: WidgetContext): boolean {
  return ctx.duckDataVersion > 0 || ctx.ctsIndex.recordCount > 0
}

/** 店舗比較ウィジェットの表示判定: 上記 + 複数店舗 */
export function isStoreComparisonVisible(ctx: WidgetContext): boolean {
  return isTimeSeriesVisible(ctx) && ctx.stores.size > 1
}

/** 前年比較ウィジェットの表示判定: DuckDB + 前年 or StoreResult + 前年 */
export function isYoYVisible(ctx: WidgetContext): boolean {
  const duckReady = ctx.duckDataVersion > 0 && ctx.duckConn != null
  if (duckReady && ctx.prevYearDateRange != null) return true
  return ctx.prevYear.hasPrevYear && ctx.prevYear.totalSales > 0
}
