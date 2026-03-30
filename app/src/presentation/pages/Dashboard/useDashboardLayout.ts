/**
 * useDashboardLayout — ダッシュボードのウィジェットレイアウト管理
 *
 * widgetIds の初期化・永続化・自動注入・active widget 解決を担う。
 * D&D や settings panel などの UI 操作は DashboardPage に残す。
 */
import { useState, useCallback, useMemo } from 'react'
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

/**
 * autoInjectDataWidgets の結果を widgetIds の初期値に反映する。
 * inject 判定は autoInjectDataWidgets 内部の localStorage ベースの冪等性保証に依存するため、
 * 毎回呼んでも二重注入にはならない。
 */
function loadLayoutWithAutoInject(ctx: {
  prevYearHasPrevYear: boolean
  storeCount: number
  hasDiscountData?: boolean
  isDuckDBReady: boolean
}): string[] {
  const base = loadLayout()
  const injected = autoInjectDataWidgets(base, ctx)
  if (injected) {
    saveLayout(injected)
    return injected
  }
  return base
}

export function useDashboardLayout(params: UseDashboardLayoutParams) {
  const { ctx, prevYearHasPrevYear, storeCount, hasDiscountData, isDuckDBReady } = params

  // inject context を安定化（useMemo で同一参照を維持）
  const injectCtx = useMemo(
    () => ({ prevYearHasPrevYear, storeCount, hasDiscountData, isDuckDBReady }),
    [prevYearHasPrevYear, storeCount, hasDiscountData, isDuckDBReady],
  )

  const [widgetIds, setWidgetIds] = useState(() => loadLayoutWithAutoInject(injectCtx))

  // inject context が変化したら再注入を試みる
  // autoInjectDataWidgets は localStorage で冪等性を保証するため、条件変化時のみ実際に注入される
  const injectedForCtx = useMemo(
    () => autoInjectDataWidgets(widgetIds, injectCtx),
    [widgetIds, injectCtx],
  )
  const effectiveIds = injectedForCtx ?? widgetIds
  if (injectedForCtx) {
    saveLayout(injectedForCtx)
  }

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
    ? effectiveIds
        .map((id) => UNIFIED_WIDGET_MAP.get(id))
        .filter((w): w is WidgetDef => w != null)
        .filter((w) => (w.isVisible ? w.isVisible(ctx) : true))
    : []

  const kpiWidgets = activeWidgets.filter((w) => w.size === 'kpi')
  const chartWidgets = activeWidgets.filter((w) => w.size !== 'kpi')

  return {
    widgetIds: effectiveIds,
    setWidgetIds,
    activeWidgets,
    kpiWidgets,
    chartWidgets,
    handleApplyLayout,
    handleRemoveWidget,
  }
}
