/**
 * ReportsPage ウィジェットレジストリ
 *
 * 月次レポートページのコンテンツをウィジェット化。
 * UnifiedWidgetContext を使い、全ページから利用可能。
 */
import type { UnifiedWidgetDef } from '@/presentation/components/widgets'
import { ReportSummaryGrid } from './ReportSummaryGrid'
import { ReportDeptTable } from './ReportDeptTable'

export const REPORTS_WIDGETS: readonly UnifiedWidgetDef[] = [
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
    render: (ctx) => <ReportDeptTable deptKpiIndex={ctx.departmentKpi} onExplain={ctx.onExplain} />,
  },
]

export const DEFAULT_REPORTS_WIDGET_IDS = [
  'reports-summary-grid',
  'reports-dept-table',
  // 店舗・部門KPI一覧
  'exec-store-kpi',
  'exec-department-kpi',
  // 前年比較
  'analysis-yoy-waterfall',
  'analysis-yoy-variance',
  // 予測・ベンチマーク
  'insight-forecast',
  'analysis-seasonal-benchmark',
]
