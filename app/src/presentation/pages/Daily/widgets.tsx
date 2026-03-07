/**
 * DailyPage ウィジェットレジストリ
 *
 * 日別トレンドページの各セクションをウィジェットとして定義。
 * ダッシュボードなど他ページからも配置可能にする。
 */
import { KpiCard } from '@/presentation/components/common'
import {
  DailySalesChart,
  GrossProfitRateChart,
  ShapleyTimeSeriesChart,
} from '@/presentation/components/charts'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import type { WidgetDef, PageWidgetConfig } from '@/presentation/components/widgets'
import type { StoreResult } from '@/domain/models'
import type { PrevYearData } from '@/application/hooks'

export interface DailyWidgetContext {
  readonly result: StoreResult
  readonly daysInMonth: number
  readonly year: number
  readonly month: number
  readonly targetRate: number
  readonly warningRate: number
  readonly prevYear: PrevYearData
}

const DAILY_WIDGETS: readonly WidgetDef<DailyWidgetContext>[] = [
  {
    id: 'daily-chart-sales',
    label: '日別売上チャート',
    group: 'チャート',
    size: 'full',
    render: (ctx) => (
      <DailySalesChart
        daily={ctx.result.daily}
        daysInMonth={ctx.daysInMonth}
        year={ctx.year}
        month={ctx.month}
        prevYearDaily={ctx.prevYear.hasPrevYear ? ctx.prevYear.daily : undefined}
        budgetDaily={ctx.result.budgetDaily}
      />
    ),
  },
  {
    id: 'daily-chart-gp-rate',
    label: '粗利率トレンド',
    group: 'チャート',
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
    group: 'チャート',
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
  {
    id: 'daily-kpi-sales',
    label: '総売上高',
    group: 'KPI',
    size: 'kpi',
    render: (ctx) => (
      <KpiCard
        label="総売上高"
        value={formatCurrency(ctx.result.totalSales)}
        trend={
          ctx.prevYear.hasPrevYear && ctx.prevYear.totalSales > 0
            ? {
                direction:
                  ctx.result.totalSales > ctx.prevYear.totalSales
                    ? 'up'
                    : ctx.result.totalSales < ctx.prevYear.totalSales
                      ? 'down'
                      : 'flat',
                label: `前年比 ${formatPercent(ctx.result.totalSales / ctx.prevYear.totalSales)}`,
              }
            : undefined
        }
      />
    ),
  },
  {
    id: 'daily-kpi-cost',
    label: '総仕入原価',
    group: 'KPI',
    size: 'kpi',
    render: (ctx) => <KpiCard label="総仕入原価" value={formatCurrency(ctx.result.totalCost)} />,
  },
  {
    id: 'daily-kpi-discount',
    label: '売変額',
    group: 'KPI',
    size: 'kpi',
    render: (ctx) => <KpiCard label="売変額" value={formatCurrency(ctx.result.totalDiscount)} />,
  },
  {
    id: 'daily-kpi-gp-rate',
    label: '粗利率/推定マージン率',
    group: 'KPI',
    size: 'kpi',
    render: (ctx) => {
      const r = ctx.result
      return (
        <KpiCard
          label={r.invMethodGrossProfitRate != null ? '実績粗利率' : '推定マージン率'}
          value={
            r.invMethodGrossProfitRate != null
              ? formatPercent(r.invMethodGrossProfitRate)
              : formatPercent(r.estMethodMarginRate)
          }
          subText={
            r.invMethodGrossProfit != null
              ? `実績粗利: ${formatCurrency(r.invMethodGrossProfit)}`
              : undefined
          }
          badge={r.invMethodGrossProfitRate != null ? 'actual' : 'estimated'}
        />
      )
    },
  },
  {
    id: 'daily-kpi-markup',
    label: '値入率',
    group: 'KPI',
    size: 'kpi',
    render: (ctx) => (
      <KpiCard
        label="値入率"
        value={formatPercent(ctx.result.averageMarkupRate)}
        subText={`コア値入率: ${formatPercent(ctx.result.coreMarkupRate)}`}
      />
    ),
  },
  {
    id: 'daily-kpi-cost-inclusion',
    label: '原価算入費',
    group: 'KPI',
    size: 'kpi',
    render: (ctx) => (
      <KpiCard label="原価算入費" value={formatCurrency(ctx.result.totalCostInclusion)} />
    ),
  },
]

const DEFAULT_DAILY_WIDGET_IDS = [
  'daily-chart-sales',
  'daily-chart-gp-rate',
  'daily-chart-shapley',
  'daily-kpi-sales',
  'daily-kpi-cost',
  'daily-kpi-discount',
  'daily-kpi-gp-rate',
  'daily-kpi-markup',
  'daily-kpi-cost-inclusion',
]

export const DAILY_WIDGET_CONFIG: PageWidgetConfig<DailyWidgetContext> = {
  pageKey: 'daily',
  registry: DAILY_WIDGETS,
  defaultWidgetIds: DEFAULT_DAILY_WIDGET_IDS,
  settingsTitle: '日別トレンドのカスタマイズ',
}
