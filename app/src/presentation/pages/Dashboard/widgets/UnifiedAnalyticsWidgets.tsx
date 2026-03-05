/**
 * 統合分析ウィジェット — DuckDB 専用ファサード
 *
 * 全ての時系列分析ウィジェットは DuckDB エンジンを使用する。
 * CTS フォールバックは廃止済み（エンジン責務分離方針）。
 *
 * 対象ウィジェット:
 * 1. 時間帯別売上     : DuckDBTimeSlotChart
 * 2. 時間帯×曜日ヒートマップ : DuckDBHeatmapChart
 * 3. 部門別時間帯パターン  : DuckDBDeptHourlyChart
 * 4. 店舗×時間帯比較    : DuckDBStoreHourlyChart
 * 5. 前年比較         : DuckDBYoYChart
 */
import { memo } from 'react'
import {
  DuckDBTimeSlotChart,
  DuckDBHeatmapChart,
  DuckDBDeptHourlyChart,
  DuckDBStoreHourlyChart,
  DuckDBYoYChart,
} from '@/presentation/components/charts'
import type { WidgetContext } from './types'

// ── 1. 時間帯別売上 ──

export const UnifiedTimeSlotWidget = memo(function UnifiedTimeSlotWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  return (
    <DuckDBTimeSlotChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      currentDateRange={ctx.duckDateRange}
      selectedStoreIds={ctx.selectedStoreIds}
    />
  )
})

// ── 2. 時間帯×曜日ヒートマップ ──

export const UnifiedHeatmapWidget = memo(function UnifiedHeatmapWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  return (
    <DuckDBHeatmapChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      currentDateRange={ctx.duckDateRange}
      selectedStoreIds={ctx.selectedStoreIds}
    />
  )
})

// ── 3. 部門別時間帯パターン ──

export const UnifiedDeptHourlyWidget = memo(function UnifiedDeptHourlyWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  return (
    <DuckDBDeptHourlyChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      currentDateRange={ctx.duckDateRange}
      selectedStoreIds={ctx.selectedStoreIds}
    />
  )
})

// ── 4. 店舗×時間帯比較 ──

export const UnifiedStoreHourlyWidget = memo(function UnifiedStoreHourlyWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  return (
    <DuckDBStoreHourlyChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      currentDateRange={ctx.duckDateRange}
      selectedStoreIds={ctx.selectedStoreIds}
      stores={ctx.stores}
    />
  )
})

// ── 5. 前年比較 ──

export const UnifiedYoYWidget = memo(function UnifiedYoYWidget({ ctx }: { ctx: WidgetContext }) {
  return (
    <DuckDBYoYChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      frame={ctx.prevYear.hasPrevYear ? ctx.comparisonFrame : undefined}
      selectedStoreIds={ctx.selectedStoreIds}
    />
  )
})

// ── 可視性判定関数（registry の isVisible 用） ──

/** 時系列ウィジェットの表示判定: DuckDB にデータがあれば表示 */
export function isTimeSeriesVisible(ctx: WidgetContext): boolean {
  return ctx.duckDataVersion > 0
}

/** 店舗比較ウィジェットの表示判定: DuckDB + 複数店舗 */
export function isStoreComparisonVisible(ctx: WidgetContext): boolean {
  return ctx.duckDataVersion > 0 && ctx.stores.size > 1
}

/** 前年比較ウィジェットの表示判定: DuckDB + 前年データ or StoreResult + 前年データ */
export function isYoYVisible(ctx: WidgetContext): boolean {
  const duckReady = ctx.duckDataVersion > 0 && ctx.duckConn != null
  if (duckReady && ctx.prevYearDateRange != null) return true
  return ctx.prevYear.hasPrevYear && ctx.prevYear.totalSales > 0
}
