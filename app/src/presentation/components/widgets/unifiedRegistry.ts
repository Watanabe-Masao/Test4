/**
 * 統一ウィジェットレジストリ
 *
 * 全ページの全ウィジェットを1つのレジストリに統合する。
 * どのページからでも任意のウィジェットを選択・配置可能。
 *
 * Dashboard ウィジェットは DashboardWidgetContext（UnifiedWidgetContext の required 具象化）を
 * 期待するため、型アサーションで橋渡しする。
 * useUnifiedWidgetContext が全フィールドを設定するため、ランタイムでは安全。
 * @responsibility R:unclassified
 */
import type { UnifiedWidgetDef, RenderUnifiedWidgetContext } from './types'
import type { DashboardWidgetContext } from '@/presentation/pages/Dashboard/widgets/DashboardWidgetContext'
import { WIDGET_REGISTRY as DASHBOARD_REGISTRY } from '@/presentation/pages/Dashboard/widgets/registry'
import { DAILY_WIDGETS } from '@/presentation/pages/Daily/widgets'
import { INSIGHT_WIDGETS } from '@/presentation/pages/Insight/widgets'
import { CATEGORY_WIDGETS } from '@/presentation/pages/Category/widgets'
import { COST_DETAIL_WIDGETS } from '@/presentation/pages/CostDetail/widgets'
import { REPORTS_WIDGETS } from '@/presentation/pages/Reports/widgets'

/**
 * Dashboard ウィジェットを UnifiedWidgetDef 対応に変換
 *
 * ADR-A-004 PR3: 統一レジストリの `render` / `isVisible` は dispatch chokepoint で
 * narrow 済の `RenderUnifiedWidgetContext` を受け取る。Dashboard widget は
 * Dashboard 固有 required field 付きの `DashboardWidgetContext` を期待するため、
 * 型アサーションで橋渡しする (useUnifiedWidgetContext が runtime で必須 field を
 * 必ず populate するため安全)。
 */
function adaptDashboardWidget(dashWidget: (typeof DASHBOARD_REGISTRY)[number]): UnifiedWidgetDef {
  return {
    id: dashWidget.id,
    label: dashWidget.label,
    group: dashWidget.group,
    size: dashWidget.size,
    linkTo: dashWidget.linkTo,
    render: (ctx: RenderUnifiedWidgetContext) => dashWidget.render(ctx as DashboardWidgetContext),
    isVisible: dashWidget.isVisible
      ? (ctx: RenderUnifiedWidgetContext) => dashWidget.isVisible!(ctx as DashboardWidgetContext)
      : undefined,
  }
}

/**
 * 全ウィジェット統合レジストリ
 */
export const UNIFIED_WIDGET_REGISTRY: readonly UnifiedWidgetDef[] = [
  ...DASHBOARD_REGISTRY.map(adaptDashboardWidget),
  ...DAILY_WIDGETS,
  ...INSIGHT_WIDGETS,
  ...CATEGORY_WIDGETS,
  ...COST_DETAIL_WIDGETS,
  ...REPORTS_WIDGETS,
]

/** 統一レジストリのウィジェットマップ */
export const UNIFIED_WIDGET_MAP: ReadonlyMap<string, UnifiedWidgetDef> = new Map(
  UNIFIED_WIDGET_REGISTRY.map((w) => [w.id, w]),
)
