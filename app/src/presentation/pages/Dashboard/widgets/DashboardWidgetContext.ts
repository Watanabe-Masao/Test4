/**
 * DashboardWidgetContext —
 * Dashboard ページ専用 widget context 型
 *
 * projects/architecture-debt-recovery SP-A ADR-A-002 PR1。
 *
 * UnifiedWidgetContext の Dashboard 向け具象化。Dashboard ページでは
 * useUnifiedWidgetContext が全 field を populate するため、optional だった
 * 20+ field を required に昇格させて型レベルで保証する。
 *
 * 移行計画:
 *  - PR1 (本 file): DashboardWidgetContext 新設。既存 WidgetContext は
 *    本型の alias として types.ts に残置（後方互換）
 *  - PR2: unifiedWidgetContextNoDashboardSpecificGuard baseline=20 で追加
 *  - PR3a-d: Dashboard registry 4 本（KPI / CHART / EXEC / ANALYSIS / DUCKDB）を
 *    DashboardWidgetContext 経由に接続
 *  - PR4: UnifiedWidgetContext から Dashboard 固有 20 field 削除、
 *    legacy WidgetContext alias 削除、guard baseline=0
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-A-002
 *  - projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-2
 *  - projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-004
 *  - projects/widget-context-boundary/checklist.md Phase 2
 */
import type { CurrentCtsQuantity } from '@/application/hooks/useCtsQuantity'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { WeatherPersister } from '@/application/queries/weather'
import type { StoreExplanations, MetricId } from '@/domain/models/analysis'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type { PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { DepartmentKpiIndex } from '@/domain/models/DepartmentKpiIndex'
import type { MonthlyDataPoint } from '@/application/hooks/useStatistics'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets/types'

export interface DashboardWidgetContext extends UnifiedWidgetContext {
  readonly storeKey: string
  readonly allStoreResults: ReadonlyMap<string, StoreResult>
  readonly currentDateRange: DateRange
  readonly prevYearScope: PrevYearScope | undefined
  readonly selectedStoreIds: ReadonlySet<string>
  readonly dataEndDay: number | null
  readonly dataMaxDay: number
  readonly elapsedDays: number | undefined
  readonly departmentKpi: DepartmentKpiIndex
  readonly explanations: StoreExplanations
  readonly onExplain: (metricId: MetricId) => void
  readonly monthlyHistory: readonly MonthlyDataPoint[]
  readonly queryExecutor: QueryExecutor
  readonly duckDataVersion: number
  readonly loadedMonthCount: number
  readonly weatherPersist: WeatherPersister | null
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly comparisonScope: ComparisonScope | null
  readonly dowGap: DowGapAnalysis
  readonly onPrevYearDetail: (type: 'sameDow' | 'sameDate') => void
  readonly fmtCurrency: CurrencyFormatter
  readonly prevYearStoreCostPrice?: ReadonlyMap<string, { cost: number; price: number }>
  readonly weatherDaily?: readonly DailyWeatherSummary[]
  readonly prevYearWeatherDaily?: readonly DailyWeatherSummary[]
  readonly currentCtsQuantity: CurrentCtsQuantity
}
