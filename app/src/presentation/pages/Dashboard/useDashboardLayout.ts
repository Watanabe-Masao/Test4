/**
 * useDashboardLayout — ダッシュボードのウィジェットレイアウト管理
 *
 * widgetIds の初期化・永続化・自動注入・active widget 解決を担う。
 * D&D や settings panel などの UI 操作は DashboardPage に残す。
 *
 * @responsibility R:unclassified
 */
import { useState, useCallback, useMemo, useEffect } from 'react'
import type { UnifiedWidgetContext, UnifiedWidgetDef } from '@/presentation/components/widgets'
import { UNIFIED_WIDGET_MAP, narrowRenderCtx } from '@/presentation/components/widgets'
import { loadLayout, saveLayout, autoInjectDataWidgets } from './widgets/widgetLayout'
import { resolveAutoInjectCandidates, commitAutoInjectedIds } from './widgets/widgetAutoInject'

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

  // inject context が変化したら再注入候補を pure に判定する（副作用なし）
  const candidateIds = useMemo(
    () => resolveAutoInjectCandidates(widgetIds, injectCtx),
    [widgetIds, injectCtx],
  )
  const effectiveIds = candidateIds.length > 0 ? [...widgetIds, ...candidateIds] : widgetIds

  // 副作用（localStorage 書き込み + layout 保存）は effect で行う
  useEffect(() => {
    if (candidateIds.length > 0) {
      commitAutoInjectedIds(candidateIds)
      saveLayout([...widgetIds, ...candidateIds])
    }
  }, [candidateIds, widgetIds])

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

  // ADR-A-004 PR3: dispatch chokepoint — slice を render-time に narrow して
  // isVisible に渡す。ctx が null または narrow に失敗したら active widget は空。
  const renderCtx = ctx ? narrowRenderCtx(ctx) : null
  const activeWidgets = renderCtx
    ? effectiveIds
        .map((id) => UNIFIED_WIDGET_MAP.get(id))
        .filter((w): w is UnifiedWidgetDef => w != null)
        .filter((w) => (w.isVisible ? w.isVisible(renderCtx) : true))
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
