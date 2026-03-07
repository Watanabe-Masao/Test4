/**
 * ReportsPage ウィジェットレジストリ
 *
 * 月次レポートページのコンテンツをウィジェット化。
 */
import type { WidgetDef, PageWidgetConfig } from '@/presentation/components/widgets'
import type { StoreResult, MetricId, AppSettings } from '@/domain/models'
import type { DepartmentKpiIndex } from '@/application/usecases/departmentKpi/indexBuilder'
import { ReportSummaryGrid } from './ReportSummaryGrid'
import { ReportDeptTable } from './ReportDeptTable'

export interface ReportsWidgetContext {
  readonly result: StoreResult
  readonly settings: AppSettings
  readonly daysInMonth: number
  readonly deptKpiIndex: DepartmentKpiIndex
  readonly onExplain: (metricId: MetricId) => void
}

const REPORTS_WIDGETS: readonly WidgetDef<ReportsWidgetContext>[] = [
  {
    id: 'reports-summary-grid',
    label: 'レポートサマリー',
    group: 'レポート',
    size: 'full',
    render: (ctx) => (
      <ReportSummaryGrid
        result={ctx.result}
        settings={ctx.settings}
        daysInMonth={ctx.daysInMonth}
        onExplain={ctx.onExplain}
      />
    ),
  },
  {
    id: 'reports-dept-table',
    label: '部門別KPI',
    group: 'レポート',
    size: 'full',
    render: (ctx) => (
      <ReportDeptTable deptKpiIndex={ctx.deptKpiIndex} onExplain={ctx.onExplain} />
    ),
  },
]

const DEFAULT_REPORTS_WIDGET_IDS = ['reports-summary-grid', 'reports-dept-table']

export const REPORTS_WIDGET_CONFIG: PageWidgetConfig<ReportsWidgetContext> = {
  pageKey: 'reports',
  registry: REPORTS_WIDGETS,
  defaultWidgetIds: DEFAULT_REPORTS_WIDGET_IDS,
  settingsTitle: '月次レポートのカスタマイズ',
}
