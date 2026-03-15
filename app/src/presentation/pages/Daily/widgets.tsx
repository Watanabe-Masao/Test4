/**
 * DailyPage ウィジェットレジストリ
 *
 * 日別トレンドページの各セクションをウィジェットとして定義。
 * KPIカードと日別売上チャートは Dashboard 側に統合済み。
 * Daily 固有のチャート（粗利率トレンド・シャープリー時系列）のみ定義。
 */
import { GrossProfitRateChart, ShapleyTimeSeriesChart } from '@/presentation/components/charts'
import type { WidgetDef } from '@/presentation/components/widgets'

export const DAILY_WIDGETS: readonly WidgetDef[] = [
  {
    id: 'daily-chart-gp-rate',
    label: '粗利率トレンド',
    group: '日別トレンド',
    size: 'half',
    render: (ctx) => (
      <GrossProfitRateChart
        daily={ctx.result.daily}
        daysInMonth={ctx.daysInMonth}
        targetRate={ctx.targetRate}
        warningRate={ctx.warningRate}
      />
    ),
  },
  {
    id: 'daily-chart-shapley',
    label: 'シャープリー時系列',
    group: '日別トレンド',
    size: 'half',
    render: (ctx) => (
      <ShapleyTimeSeriesChart
        daily={ctx.result.daily}
        daysInMonth={ctx.daysInMonth}
        year={ctx.year}
        month={ctx.month}
        prevYearDaily={ctx.prevYear.hasPrevYear ? ctx.prevYear.daily : undefined}
      />
    ),
    isVisible: (ctx) => ctx.prevYear.hasPrevYear,
  },
]

export const DEFAULT_DAILY_WIDGET_IDS = [
  // 収益概況テーブル
  'kpi-summary-table',
  // チャート（日別売上はDashboard側に統合済み）
  'chart-daily-sales',
  'daily-chart-gp-rate',
  'daily-chart-shapley',
  // テーブル・詳細
  'exec-monthly-calendar',
  'exec-dow-average',
  'exec-weekly-summary',
  'exec-daily-store-sales',
  // 分析
  'analysis-customer-scatter',
]
