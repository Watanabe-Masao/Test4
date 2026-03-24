/**
 * 統一ウィジェットレジストリ
 *
 * 全ページの全ウィジェットを1つのレジストリに統合する。
 * どのページからでも任意のウィジェットを選択・配置可能。
 */
import type { WidgetDef, UnifiedWidgetContext } from './types'
import type { WidgetContext as DashboardWidgetContext } from '@/presentation/pages/Dashboard/widgets/types'
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

/**
 * Dashboard WidgetContext → UnifiedWidgetContext アダプタ
 *
 * Dashboard の既存ウィジェットは WidgetContext を期待するため、
 * UnifiedWidgetContext から WidgetContext を構築して橋渡しする。
 */
function toDashboardContext(ctx: UnifiedWidgetContext): DashboardWidgetContext {
  return {
    result: ctx.result,
    daysInMonth: ctx.daysInMonth,
    targetRate: ctx.targetRate,
    warningRate: ctx.warningRate,
    year: ctx.year,
    month: ctx.month,
    storeKey: ctx.storeKey ?? '',
    prevYear: ctx.prevYear,
    allStoreResults: ctx.allStoreResults ?? new Map(),
    stores: ctx.stores,
    currentDateRange: ctx.currentDateRange ?? {
      from: { year: ctx.year, month: ctx.month, day: 1 },
      to: { year: ctx.year, month: ctx.month, day: ctx.daysInMonth },
    },
    prevYearDateRange: ctx.prevYearDateRange,
    prevYearScope: ctx.prevYearScope,
    selectedStoreIds: ctx.selectedStoreIds,
    dataEndDay: ctx.dataEndDay ?? null,
    dataMaxDay: ctx.dataMaxDay ?? 0,
    elapsedDays: ctx.elapsedDays,
    departmentKpi: ctx.departmentKpi,
    explanations: ctx.explanations,
    onExplain: ctx.onExplain,
    monthlyHistory: ctx.monthlyHistory ?? [],
    queryExecutor: ctx.queryExecutor ?? (NULL_EXECUTOR as QueryExecutor),
    duckDataVersion: ctx.duckDataVersion ?? 0,
    loadedMonthCount: ctx.loadedMonthCount ?? 0,
    weatherPersist: ctx.weatherPersist ?? null,
    prevYearMonthlyKpi: ctx.prevYearMonthlyKpi ?? {
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
    },
    comparisonScope: ctx.comparisonScope ?? null,
    dowGap: ctx.dowGap ?? {
      dowCounts: [],
      estimatedImpact: 0,
      isValid: false,
      prevDowDailyAvg: [0, 0, 0, 0, 0, 0, 0],
      prevDowDailyAvgCustomers: [0, 0, 0, 0, 0, 0, 0],
      hasPrevDowSales: false,
      isSameStructure: true,
      missingDataWarnings: [],
    },
    onPrevYearDetail: ctx.onPrevYearDetail ?? (() => {}),
    fmtCurrency: ctx.fmtCurrency,
    observationStatus: ctx.result.observationPeriod.status,
    weatherDaily: ctx.weatherDaily,
    prevYearWeatherDaily: ctx.prevYearWeatherDaily,
    currentCtsQuantity: ctx.currentCtsQuantity ?? {
      total: 0,
      byStore: new Map(),
      byDay: new Map(),
    },
  }
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
