/**
 * @responsibility R:unclassified
 */

import type { DashboardWidgetDef } from './types'
import { ForecastToolsWidget } from './ForecastTools'
import { AlertPanelWidget } from './AlertPanel'
import {
  renderDowAverage,
  renderWeeklySummary,
  renderDailyStoreSalesTable,
  renderDailyInventoryTable,
  renderStoreKpiTable,
} from './TableWidgets'

// ── 概要・ステータス ──
// exec-summary-bar は KpiSummaryTable + ConditionSummaryEnhanced ヘッダに吸収済み
// analysis-condition-summary は widget-budget-achievement (registryKpiWidgets) に統合済み
// exec-plan-actual-forecast は ForecastToolsWidget + insight/budget ページに統合済み
// exec-monthly-calendar (MonthlyCalendar / MonthlyCalendarFC widget) は
// Budget Simulator (①②③④ + 期間詳細モーダル) に統合済みのため撤去。
export const WIDGETS_EXEC: readonly DashboardWidgetDef[] = [
  {
    /** @widget-id WID-008 */
    id: 'analysis-alert-panel',
    label: 'アラート',
    group: 'モニタリング',
    size: 'full',
    render: (ctx) => (
      <AlertPanelWidget
        key={ctx.storeKey}
        result={ctx.result}
        targetRate={ctx.targetRate}
        prevYear={ctx.prevYear}
        year={ctx.year}
        month={ctx.month}
        storeKey={ctx.storeKey}
        onExplain={ctx.onExplain}
        fmtCurrency={ctx.fmtCurrency}
      />
    ),
  },
  // ── パターン分析 ──
  {
    /** @widget-id WID-009 */
    id: 'exec-dow-average',
    label: '曜日平均',
    group: 'トレンド分析',
    size: 'full',
    render: (ctx) => renderDowAverage(ctx),
  },
  {
    /** @widget-id WID-010 */
    id: 'exec-weekly-summary',
    label: '週別サマリー',
    group: 'トレンド分析',
    size: 'full',
    render: (ctx) => renderWeeklySummary(ctx),
  },
  {
    /** @widget-id WID-011 */
    id: 'exec-daily-store-sales',
    label: '売上・売変・客数（日別×店舗）',
    group: 'トレンド分析',
    size: 'full',
    linkTo: { view: 'daily' },
    render: (ctx) => renderDailyStoreSalesTable(ctx),
  },
  {
    /** @widget-id WID-012 */
    id: 'exec-daily-inventory',
    label: '日別推定在庫',
    group: 'トレンド分析',
    size: 'full',
    render: (ctx) => renderDailyInventoryTable(ctx),
  },
  // ── 店舗別 ──
  {
    /** @widget-id WID-013 */
    id: 'exec-store-kpi',
    label: '店舗別KPI一覧',
    group: '構造分析',
    size: 'full',
    linkTo: { view: 'reports' },
    render: (ctx) => renderStoreKpiTable(ctx),
  },
  // 注: exec-department-kpi → 部門別データ未対応のため削除
  // ── シミュレーション ──
  {
    /** @widget-id WID-014 */
    id: 'exec-forecast-tools',
    label: '着地予測・ゴールシーク',
    group: '予測・シミュレーション',
    size: 'full',
    linkTo: { view: 'insight', tab: 'budget' },
    render: (ctx) => (
      <ForecastToolsWidget
        key={ctx.storeKey}
        fmtCurrency={ctx.fmtCurrency}
        result={ctx.result}
        prevYear={ctx.prevYear}
        targetRate={ctx.targetRate}
        observationStatus={ctx.observationStatus}
      />
    ),
  },
]
