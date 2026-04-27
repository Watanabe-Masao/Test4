/**
 * DashboardWidgetContext —
 * Dashboard ページ専用 widget context 型（render-time）
 *
 * projects/architecture-debt-recovery SP-A ADR-A-002 PR1。
 *
 * UnifiedWidgetContext の Dashboard 向け具象化。Dashboard ページでは
 * useUnifiedWidgetContext が全 field を populate するため、optional だった
 * 20+ field を required に昇格させて型レベルで保証する。
 *
 * ADR-A-004 PR3 (2026-04-25): base を `RenderUnifiedWidgetContext`
 * （`result: StoreResult` / `prevYear: PrevYearData` の render-time 型）に変更。
 * Dashboard widget 本体は dispatch chokepoint で narrow 済みの値を受け取り、
 * 旧 shape どおり `ctx.result.X` / `ctx.prevYear.X` を直接参照する。
 *
 * 移行計画:
 *  - PR1: DashboardWidgetContext 新設
 *  - PR2: unifiedWidgetContextNoDashboardSpecificGuard baseline=20 で追加
 *  - PR3a-d: Dashboard registry 4 本を DashboardWidgetContext 経由に接続
 *  - PR4 (ADR-A-002): UnifiedWidgetContext から Dashboard 固有 11 field 削除済
 *  - PR3 (ADR-A-004): base を RenderUnifiedWidgetContext に切替
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-A-002
 *  - projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-2
 *  - projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-004
 *  - projects/widget-context-boundary/HANDOFF.md §2.1 PR3 設計案
 *
 * @responsibility R:unclassified
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
import type { RenderUnifiedWidgetContext } from '@/presentation/components/widgets/types'

export interface DashboardWidgetContext extends RenderUnifiedWidgetContext {
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
