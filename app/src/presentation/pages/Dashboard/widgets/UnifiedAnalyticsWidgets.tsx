/**
 * 統合分析ウィジェット — DuckDB 専用ファサード
 *
 * 全ての時系列分析ウィジェットは DuckDB エンジンを使用する。
 * CTS フォールバックは廃止済み（エンジン責務分離方針）。
 *
 * 対象ウィジェット:
 * 1. 時間帯別売上     : TimeSlotChart
 * 2. 時間帯×曜日ヒートマップ : HeatmapChart
 * 3. 部門別時間帯パターン  : DeptHourlyChart
 * 4. 店舗×時間帯比較    : StoreHourlyChart
 * 5. 前年比較         : YoYChart
 */
import { memo } from 'react'
import {
  TimeSlotChart,
  HeatmapChart,
  DeptHourlyChart,
  StoreHourlyChart,
  YoYChart,
} from '@/presentation/components/charts'
import type { WidgetContext } from './types'

// ── 1. 時間帯別売上 ──

export const UnifiedTimeSlotWidget = memo(function UnifiedTimeSlotWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  return (
    <TimeSlotChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      currentDateRange={ctx.currentDateRange}
      selectedStoreIds={ctx.selectedStoreIds}
      prevYearScope={ctx.prevYearScope}
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
    <HeatmapChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      currentDateRange={ctx.currentDateRange}
      selectedStoreIds={ctx.selectedStoreIds}
      prevYearScope={ctx.prevYearScope}
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
    <DeptHourlyChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      currentDateRange={ctx.currentDateRange}
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
    <StoreHourlyChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      currentDateRange={ctx.currentDateRange}
      selectedStoreIds={ctx.selectedStoreIds}
      stores={ctx.stores}
    />
  )
})

// ── 5. 前年比較 ──

export const UnifiedYoYWidget = memo(function UnifiedYoYWidget({ ctx }: { ctx: WidgetContext }) {
  return (
    <YoYChart
      duckConn={ctx.duckConn}
      duckDataVersion={ctx.duckDataVersion}
      frame={ctx.prevYear.hasPrevYear ? ctx.comparisonFrame : undefined}
      selectedStoreIds={ctx.selectedStoreIds}
      prevYearScope={ctx.prevYearScope}
    />
  )
})
