/**
 * 統一ウィジェットレジストリ
 *
 * 全ページの全ウィジェットを1つのレジストリに統合する。
 * どのページからでも任意のウィジェットを選択・配置可能。
 *
 * Dashboard ウィジェットは WidgetContext（UnifiedWidgetContext の required 具象化）を
 * 期待するため、型アサーションで橋渡しする。
 * useUnifiedWidgetContext が全フィールドを設定するため、ランタイムでは安全。
 * @responsibility R:utility
 */
import type { WidgetDef, UnifiedWidgetContext } from './types'
import type { WidgetContext as DashboardWidgetContext } from '@/presentation/pages/Dashboard/widgets/types'
import { WIDGET_REGISTRY as DASHBOARD_REGISTRY } from '@/presentation/pages/Dashboard/widgets/registry'
import { DAILY_WIDGETS } from '@/presentation/pages/Daily/widgets'
import { INSIGHT_WIDGETS } from '@/presentation/pages/Insight/widgets'
import { CATEGORY_WIDGETS } from '@/presentation/pages/Category/widgets'
import { COST_DETAIL_WIDGETS } from '@/presentation/pages/CostDetail/widgets'
import { REPORTS_WIDGETS } from '@/presentation/pages/Reports/widgets'

/**
 * Dashboard ウィジェットを UnifiedWidgetContext 対応に変換
 *
 * Dashboard の WidgetDef は WidgetContext（required フィールド付き）を期待するが、
 * 統一レジストリは UnifiedWidgetContext（optional フィールド）で呼び出す。
 * useUnifiedWidgetContext が全フィールドを設定するため、型アサーションで安全に変換。
 */
function adaptDashboardWidget(dashWidget: (typeof DASHBOARD_REGISTRY)[number]): WidgetDef {
  return {
    id: dashWidget.id,
    label: dashWidget.label,
    group: dashWidget.group,
    size: dashWidget.size,
    linkTo: dashWidget.linkTo,
    render: (ctx: UnifiedWidgetContext) => dashWidget.render(ctx as DashboardWidgetContext),
    isVisible: dashWidget.isVisible
      ? (ctx: UnifiedWidgetContext) => dashWidget.isVisible!(ctx as DashboardWidgetContext)
      : undefined,
  }
}

/**
 * 全ウィジェット統合レジストリ
 */
export const UNIFIED_WIDGET_REGISTRY: readonly WidgetDef[] = [
  ...DASHBOARD_REGISTRY.map(adaptDashboardWidget),
  ...DAILY_WIDGETS,
  ...INSIGHT_WIDGETS,
  ...CATEGORY_WIDGETS,
  ...COST_DETAIL_WIDGETS,
  ...REPORTS_WIDGETS,
]

/** 統一レジストリのウィジェットマップ */
export const UNIFIED_WIDGET_MAP: ReadonlyMap<string, WidgetDef> = new Map(
  UNIFIED_WIDGET_REGISTRY.map((w) => [w.id, w]),
)
