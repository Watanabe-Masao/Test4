import type { WidgetDef } from './types'
import { renderPlanActualForecast } from './PlanActualForecast'
import { MonthlyCalendarWidget } from './MonthlyCalendar'
import { ForecastToolsWidget } from './ForecastTools'
import { ConditionSummaryWidget } from './ConditionSummary'
import { AlertPanelWidget } from './AlertPanel'
import {
  renderDowAverage,
  renderWeeklySummary,
  renderDailyStoreSalesTable,
  renderDepartmentKpiTable,
  renderDailyInventoryTable,
  renderStoreKpiTable,
} from './TableWidgets'
import { ExecSummaryBarWidget } from './ExecSummaryBarWidget'

// ── 概要・ステータス ──
export const WIDGETS_EXEC: readonly WidgetDef[] = [
  {
    id: 'exec-summary-bar',
    label: 'サマリーバー',
    group: 'モニタリング',
    size: 'full',
    render: (ctx) => <ExecSummaryBarWidget key={ctx.storeKey} {...ctx} />,
  },
  {
    id: 'analysis-condition-summary',
    label: 'コンディションサマリー',
    group: 'モニタリング',
    size: 'full',
    render: (ctx) => <ConditionSummaryWidget key={ctx.storeKey} ctx={ctx} />,
  },
  {
    id: 'analysis-alert-panel',
    label: 'アラート',
    group: 'モニタリング',
    size: 'full',
    render: (ctx) => <AlertPanelWidget key={ctx.storeKey} ctx={ctx} />,
  },
  // ── 収益概況: 予実管理 ──
  {
    id: 'exec-plan-actual-forecast',
    label: 'PLAN / ACTUAL / FORECAST',
    group: '収益概況',
    size: 'full',
    linkTo: { view: 'insight', tab: 'budget' },
    render: (ctx) => renderPlanActualForecast(ctx),
  },
  {
    id: 'exec-monthly-calendar',
    label: '月間カレンダー',
    group: '収益概況',
    size: 'full',
    render: (ctx) => <MonthlyCalendarWidget key={ctx.storeKey} ctx={ctx} />,
  },
  // ── パターン分析 ──
  {
    id: 'exec-dow-average',
    label: '曜日平均',
    group: 'トレンド分析',
    size: 'full',
    render: (ctx) => renderDowAverage(ctx),
  },
  {
    id: 'exec-weekly-summary',
    label: '週別サマリー',
    group: 'トレンド分析',
    size: 'full',
    render: (ctx) => renderWeeklySummary(ctx),
  },
  {
    id: 'exec-daily-store-sales',
    label: '売上・売変・客数（日別×店舗）',
    group: 'トレンド分析',
    size: 'full',
    linkTo: { view: 'daily' },
    render: (ctx) => renderDailyStoreSalesTable(ctx),
  },
  {
    id: 'exec-daily-inventory',
    label: '日別推定在庫',
    group: 'トレンド分析',
    size: 'full',
    render: (ctx) => renderDailyInventoryTable(ctx),
  },
  // ── 店舗別 ──
  {
    id: 'exec-store-kpi',
    label: '店舗別KPI一覧',
    group: '構造分析',
    size: 'full',
    linkTo: { view: 'reports' },
    render: (ctx) => renderStoreKpiTable(ctx),
  },
  // ── 部門別 ──
  {
    id: 'exec-department-kpi',
    label: '部門別KPI一覧',
    group: '構造分析',
    size: 'full',
    render: (ctx) => renderDepartmentKpiTable(ctx),
  },
  // ── シミュレーション ──
  {
    id: 'exec-forecast-tools',
    label: '着地予測・ゴールシーク',
    group: '予測・シミュレーション',
    size: 'full',
    linkTo: { view: 'insight', tab: 'budget' },
    render: (ctx) => <ForecastToolsWidget key={ctx.storeKey} ctx={ctx} />,
  },
]
