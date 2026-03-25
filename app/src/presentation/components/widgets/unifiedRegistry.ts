/**
 * 統一ウィジェットレジストリ
 *
 * 全ページの全ウィジェットを1つのレジストリに統合する。
 * どのページからでも任意のウィジェットを選択・配置可能。
 */
import type { WidgetDef, UnifiedWidgetContext } from './types'
import type { WidgetContext as DashboardWidgetContext } from '@/presentation/pages/Dashboard/widgets/types'
import type { PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { CurrentCtsQuantity } from '@/application/hooks/useCtsQuantity'
import { createQueryExecutor } from '@/application/queries/QueryPort'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { WIDGET_REGISTRY as DASHBOARD_REGISTRY } from '@/presentation/pages/Dashboard/widgets/registry'
import { DAILY_WIDGETS } from '@/presentation/pages/Daily/widgets'
import { INSIGHT_WIDGETS } from '@/presentation/pages/Insight/widgets'
import { CATEGORY_WIDGETS } from '@/presentation/pages/Category/widgets'
import { COST_DETAIL_WIDGETS } from '@/presentation/pages/CostDetail/widgets'
import { REPORTS_WIDGETS } from '@/presentation/pages/Reports/widgets'

/** queryExecutor が未提供のときのフォールバック（isReady = false） */
const NULL_EXECUTOR = createQueryExecutor(null)

const EMPTY_KPI: PrevYearMonthlyKpi = {
  hasPrevYear: false,
  sourceYear: 0,
  sourceMonth: 0,
  dowOffset: 0,
  sameDow: {
    sales: 0,
    customers: 0,
    transactionValue: 0,
    ctsQuantity: 0,
    dailyMapping: [],
    storeContributions: [],
  },
  sameDate: {
    sales: 0,
    customers: 0,
    transactionValue: 0,
    ctsQuantity: 0,
    dailyMapping: [],
    storeContributions: [],
  },
  monthlyTotal: { sales: 0, customers: 0, transactionValue: 0, ctsQuantity: 0 },
}

const EMPTY_DOW_GAP: DowGapAnalysis = {
  dowCounts: [],
  estimatedImpact: 0,
  isValid: false,
  prevDowDailyAvg: [0, 0, 0, 0, 0, 0, 0],
  prevDowDailyAvgCustomers: [0, 0, 0, 0, 0, 0, 0],
  hasPrevDowSales: false,
  isSameStructure: true,
  missingDataWarnings: [],
}

const EMPTY_CTS: CurrentCtsQuantity = { total: 0, byStore: new Map(), byDay: new Map() }

/**
 * UnifiedWidgetContext → DashboardWidgetContext
 *
 * Dashboard が保証するフィールドにデフォルト値を補完する。
 * WidgetContext は UnifiedWidgetContext を extends するため、
 * スプレッドでフィールドを引き継ぎ、required フィールドのみ上書きする。
 */
function toDashboardContext(ctx: UnifiedWidgetContext): DashboardWidgetContext {
  return {
    ...ctx,
    storeKey: ctx.storeKey ?? '',
    allStoreResults: ctx.allStoreResults ?? new Map(),
    currentDateRange: ctx.currentDateRange ?? {
      from: { year: ctx.year, month: ctx.month, day: 1 },
      to: { year: ctx.year, month: ctx.month, day: ctx.daysInMonth },
    },
    dataEndDay: ctx.dataEndDay ?? null,
    dataMaxDay: ctx.dataMaxDay ?? 0,
    monthlyHistory: ctx.monthlyHistory ?? [],
    queryExecutor: (ctx.queryExecutor ?? NULL_EXECUTOR) as QueryExecutor,
    duckDataVersion: ctx.duckDataVersion ?? 0,
    loadedMonthCount: ctx.loadedMonthCount ?? 0,
    weatherPersist: ctx.weatherPersist ?? null,
    prevYearMonthlyKpi: ctx.prevYearMonthlyKpi ?? EMPTY_KPI,
    comparisonScope: ctx.comparisonScope ?? null,
    dowGap: ctx.dowGap ?? EMPTY_DOW_GAP,
    onPrevYearDetail: ctx.onPrevYearDetail ?? (() => {}),
    currentCtsQuantity: ctx.currentCtsQuantity ?? EMPTY_CTS,
  } as DashboardWidgetContext
}

/**
 * Dashboard ウィジェットを UnifiedWidgetContext 対応に変換
 */
function adaptDashboardWidget(dashWidget: (typeof DASHBOARD_REGISTRY)[number]): WidgetDef {
  return {
    id: dashWidget.id,
    label: dashWidget.label,
    group: dashWidget.group,
    size: dashWidget.size,
    linkTo: dashWidget.linkTo,
    render: (ctx: UnifiedWidgetContext) => dashWidget.render(toDashboardContext(ctx)),
    isVisible: dashWidget.isVisible
      ? (ctx: UnifiedWidgetContext) => dashWidget.isVisible!(toDashboardContext(ctx))
      : undefined,
  }
}

/** Dashboard ウィジェットを統一型に変換 */
const ADAPTED_DASHBOARD_WIDGETS: readonly WidgetDef[] = DASHBOARD_REGISTRY.map(adaptDashboardWidget)

/**
 * 全ウィジェット統合レジストリ
 *
 * Dashboard 62+ ウィジェット + Daily 9 + Insight 4 + Category 2 + CostDetail 4 + Reports 2
 */
export const UNIFIED_WIDGET_REGISTRY: readonly WidgetDef[] = [
  ...ADAPTED_DASHBOARD_WIDGETS,
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
