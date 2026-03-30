/**
 * useDashboardLayout — ダッシュボードのウィジェットレイアウト管理
 *
 * widgetIds の初期化・永続化・自動注入・active widget 解決を担う。
 * D&D や settings panel などの UI 操作は DashboardPage に残す。
 */
import { useState, useCallback, useEffect } from 'react'
import type { UnifiedWidgetContext, WidgetDef } from '@/presentation/components/widgets'
import { UNIFIED_WIDGET_MAP } from '@/presentation/components/widgets'
import { loadLayout, saveLayout, autoInjectDataWidgets } from './widgets/widgetLayout'

interface UseDashboardLayoutParams {
  ctx: UnifiedWidgetContext | null
  prevYearHasPrevYear: boolean
  storeCount: number
  hasDiscountData?: boolean
  isDuckDBReady: boolean
}

export function useDashboardLayout(params: UseDashboardLayoutParams) {
  const { ctx, prevYearHasPrevYear, storeCount, hasDiscountData, isDuckDBReady } = params

  const [widgetIds, setWidgetIds] = useState<string[]>(loadLayout)

  // データ駆動ウィジェットの自動注入（初回注入後は安定するため cascading は限定的）
  useEffect(() => {
    const injected = autoInjectDataWidgets(widgetIds, {
      prevYearHasPrevYear,
      storeCount,
      hasDiscountData,
      isDuckDBReady,
    })
    if (injected) {
      setWidgetIds(injected)
      saveLayout(injected)
    }
  }, [widgetIds, prevYearHasPrevYear, storeCount, hasDiscountData, isDuckDBReady])

  const handleApplyLayout = useCallback((ids: string[]) => {
    setWidgetIds(ids)
  }, [])

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgetIds((prev) => {
      const next = prev.filter((id) => id !== widgetId)
      saveLayout(next)
      return next
    })
  }, [])

  // Resolve active widgets (isVisible でデータ有無をフィルタ)
  const activeWidgets = ctx
    ? widgetIds
        .map((id) => UNIFIED_WIDGET_MAP.get(id))
        .filter((w): w is WidgetDef => w != null)
        .filter((w) => (w.isVisible ? w.isVisible(ctx) : true))
    : []

  const kpiWidgets = activeWidgets.filter((w) => w.size === 'kpi')
  const chartWidgets = activeWidgets.filter((w) => w.size !== 'kpi')

  return {
    widgetIds,
    setWidgetIds,
    activeWidgets,
    kpiWidgets,
    chartWidgets,
    handleApplyLayout,
    handleRemoveWidget,
  }
}
