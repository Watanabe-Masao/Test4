/**
 * 統合分析ウィジェット
 *
 * 全ての時系列分析ウィジェットは統合パイプライン経由でデータを取得する。
 * CTS フォールバックは廃止済み（ADR-003 統合パイプライン方針）。
 *
 * 対象ウィジェット:
 * 1. 時間帯別売上     : TimeSlotChart
 * 2. 時間帯×曜日ヒートマップ : HeatmapChart
 * 3. 部門別時間帯パターン  : DeptHourlyChart
 * 4. 店舗×時間帯比較    : StoreHourlyChart
 * 5. 前年比較         : YoYChart
 */
import { memo, useMemo } from 'react'
import { buildSalesAnalysisContext } from '@/application/models/SalesAnalysisContext'
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
  const context = useMemo(
    () => buildSalesAnalysisContext(ctx.currentDateRange, ctx.selectedStoreIds, ctx.prevYearScope),
    [ctx.currentDateRange, ctx.selectedStoreIds, ctx.prevYearScope],
  )
  return (
    <TimeSlotChart
      queryExecutor={ctx.queryExecutor}
      context={context}
      weatherPersist={ctx.weatherPersist}
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
      queryExecutor={ctx.queryExecutor}
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
      queryExecutor={ctx.queryExecutor}
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
      queryExecutor={ctx.queryExecutor}
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
      queryExecutor={ctx.queryExecutor}
      scope={ctx.prevYear.hasPrevYear ? ctx.comparisonScope : null}
      selectedStoreIds={ctx.selectedStoreIds}
      prevYearScope={ctx.prevYearScope}
    />
  )
})
