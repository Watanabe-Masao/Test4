import { KpiCard } from '@/presentation/components/common'
import {
  DailySalesChart, BudgetVsActualChart, GrossProfitRateChart, CategoryPieChart,
  PrevYearComparisonChart, GrossProfitAmountChart, DiscountTrendChart, BudgetDiffTrendChart,
} from '@/presentation/components/charts'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { calculateBudgetAnalysis } from '@/domain/calculations/budgetAnalysis'
import type { WidgetDef } from './types'
import { renderPlanActualForecast, MonthlyCalendarWidget, ForecastToolsWidget } from './ExecWidgets'
import { renderDowAverage, renderWeeklySummary } from './TableWidgets'
import {
  ExecSummaryBar, ExecSummaryItem, ExecSummaryLabel, ExecSummaryValue, ExecSummarySub,
  InventoryBar,
} from '../DashboardPage.styles'

export const WIDGET_REGISTRY: readonly WidgetDef[] = [
  // ── KPI: 売上・利益 ──
  {
    id: 'kpi-total-sales',
    label: '総売上高',
    group: '売上・利益',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="総売上高" value={formatCurrency(r.totalSales)} accent="#6366f1" />
    ),
  },
  {
    id: 'kpi-core-sales',
    label: 'コア売上',
    group: '売上・利益',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="コア売上"
        value={formatCurrency(r.totalCoreSales)}
        subText={`花: ${formatCurrency(r.flowerSalesPrice)} / 産直: ${formatCurrency(r.directProduceSalesPrice)}`}
        accent="#8b5cf6"
      />
    ),
  },
  {
    id: 'kpi-inv-gross-profit',
    label: '【在庫法】粗利益',
    group: '売上・利益',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="【在庫法】粗利益"
        value={r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}
        subText={r.invMethodGrossProfitRate != null ? `粗利率: ${formatPercent(r.invMethodGrossProfitRate)}` : '在庫設定なし'}
        accent="#22c55e"
      />
    ),
  },
  {
    id: 'kpi-est-margin',
    label: '【推定法】マージン',
    group: '売上・利益',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="【推定法】マージン"
        value={formatCurrency(r.estMethodMargin)}
        subText={`マージン率: ${formatPercent(r.estMethodMarginRate)}`}
        accent="#0ea5e9"
      />
    ),
  },
  // ── KPI: 仕入・原価 ──
  {
    id: 'kpi-total-cost',
    label: '総仕入原価',
    group: '仕入・原価',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="総仕入原価" value={formatCurrency(r.totalCost)} accent="#f59e0b" />
    ),
  },
  {
    id: 'kpi-inventory-cost',
    label: '在庫仕入原価',
    group: '仕入・原価',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="在庫仕入原価" value={formatCurrency(r.inventoryCost)} accent="#ea580c" />
    ),
  },
  {
    id: 'kpi-delivery-sales',
    label: '売上納品原価',
    group: '仕入・原価',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="売上納品原価"
        value={formatCurrency(r.deliverySalesCost)}
        subText={`売価: ${formatCurrency(r.deliverySalesPrice)}`}
        accent="#ec4899"
      />
    ),
  },
  {
    id: 'kpi-consumable',
    label: '消耗品費',
    group: '仕入・原価',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="消耗品費"
        value={formatCurrency(r.totalConsumable)}
        subText={`消耗品率: ${formatPercent(r.consumableRate)}`}
        accent="#f97316"
      />
    ),
  },
  // ── KPI: 売変・値入 ──
  {
    id: 'kpi-discount',
    label: '売変額合計',
    group: '売変・値入',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="売変額合計"
        value={formatCurrency(r.totalDiscount)}
        subText={`売変率: ${formatPercent(r.discountRate)}`}
        accent="#f43f5e"
      />
    ),
  },
  {
    id: 'kpi-discount-loss',
    label: '売変ロス原価',
    group: '売変・値入',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="売変ロス原価" value={formatCurrency(r.discountLossCost)} accent="#dc2626" />
    ),
  },
  {
    id: 'kpi-avg-markup',
    label: '平均値入率',
    group: '売変・値入',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="平均値入率" value={formatPercent(r.averageMarkupRate)} accent="#3b82f6" />
    ),
  },
  {
    id: 'kpi-core-markup',
    label: 'コア値入率',
    group: '売変・値入',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="コア値入率" value={formatPercent(r.coreMarkupRate)} accent="#06b6d4" />
    ),
  },
  // ── KPI: 予算・予測 ──
  {
    id: 'kpi-budget',
    label: '月間予算',
    group: '予算・予測',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="月間予算" value={formatCurrency(r.budget)} accent="#6366f1" />
    ),
  },
  {
    id: 'kpi-avg-daily-sales',
    label: '日平均売上',
    group: '予算・予測',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="日平均売上"
        value={formatCurrency(r.averageDailySales)}
        subText={`営業日: ${r.salesDays}日 / 経過: ${r.elapsedDays}日`}
        accent="#8b5cf6"
      />
    ),
  },
  {
    id: 'kpi-projected-sales',
    label: '月末予測売上',
    group: '予算・予測',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="月末予測売上" value={formatCurrency(r.projectedSales)} accent="#22c55e" />
    ),
  },
  {
    id: 'kpi-projected-achievement',
    label: '予算達成率予測',
    group: '予算・予測',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="予算達成率予測" value={formatPercent(r.projectedAchievement)} accent="#0ea5e9" />
    ),
  },
  // ── KPI: 予算分析 ──
  {
    id: 'kpi-budget-progress',
    label: '予算達成率',
    group: '予算分析',
    size: 'kpi',
    render: ({ result: r, daysInMonth }) => {
      const salesDaily = new Map<number, number>()
      for (const [d, rec] of r.daily) salesDaily.set(d, rec.sales)
      const analysis = calculateBudgetAnalysis({
        totalSales: r.totalSales, budget: r.budget, budgetDaily: r.budgetDaily,
        salesDaily, elapsedDays: r.elapsedDays, salesDays: r.salesDays, daysInMonth,
      })
      return (
        <KpiCard
          label="予算達成率"
          value={formatPercent(analysis.budgetProgressRate)}
          subText={`残余予算: ${formatCurrency(analysis.remainingBudget)}`}
          accent="#6366f1"
        />
      )
    },
  },
  {
    id: 'kpi-gross-profit-budget',
    label: '粗利額予算',
    group: '予算分析',
    size: 'kpi',
    render: ({ result: r }) => {
      const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
      return (
        <KpiCard
          label="粗利額予算"
          value={formatCurrency(r.grossProfitBudget)}
          subText={`実績: ${formatCurrency(actualGP)}`}
          accent="#8b5cf6"
        />
      )
    },
  },
  {
    id: 'kpi-gross-profit-rate',
    label: '粗利率（実績vs予算）',
    group: '予算分析',
    size: 'kpi',
    render: ({ result: r }) => {
      const actualRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate
      return (
        <KpiCard
          label="粗利率"
          value={formatPercent(actualRate)}
          subText={`予算: ${formatPercent(r.grossProfitRateBudget)}`}
          accent="#ec4899"
        />
      )
    },
  },
  // ── チャート ──
  {
    id: 'chart-daily-sales',
    label: '日別売上チャート',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, daysInMonth, prevYear }) => (
      <DailySalesChart daily={r.daily} daysInMonth={daysInMonth} prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined} />
    ),
  },
  {
    id: 'chart-budget-vs-actual',
    label: '予算vs実績チャート',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, budgetChartData, daysInMonth }) => (
      <BudgetVsActualChart data={budgetChartData} budget={r.budget} salesDays={r.salesDays} daysInMonth={daysInMonth} />
    ),
  },
  {
    id: 'chart-gross-profit-rate',
    label: '粗利率推移チャート',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, daysInMonth, targetRate, warningRate }) => (
      <GrossProfitRateChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        targetRate={targetRate}
        warningRate={warningRate}
      />
    ),
  },
  {
    id: 'chart-category-cost-pie',
    label: 'カテゴリ別原価構成',
    group: 'チャート',
    size: 'half',
    render: ({ result: r }) => (
      <CategoryPieChart categoryTotals={r.categoryTotals} mode="cost" />
    ),
  },
  {
    id: 'chart-category-price-pie',
    label: 'カテゴリ別売価構成',
    group: 'チャート',
    size: 'half',
    render: ({ result: r }) => (
      <CategoryPieChart categoryTotals={r.categoryTotals} mode="price" />
    ),
  },
  {
    id: 'chart-prev-year-comparison',
    label: '前年比推移',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, daysInMonth, prevYear }) => {
      if (!prevYear.hasPrevYear) return null
      const currentDaily = new Map<number, { sales: number }>()
      for (const [d, rec] of r.daily) currentDaily.set(d, { sales: rec.sales })
      return <PrevYearComparisonChart currentDaily={currentDaily} prevYearDaily={prevYear.daily} daysInMonth={daysInMonth} />
    },
  },
  {
    id: 'chart-gross-profit-amount',
    label: '粗利額累計推移',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, daysInMonth, targetRate }) => (
      <GrossProfitAmountChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        grossProfitBudget={r.grossProfitBudget}
        targetRate={targetRate}
      />
    ),
  },
  {
    id: 'chart-discount-trend',
    label: '売変インパクト分析',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, daysInMonth }) => (
      <DiscountTrendChart daily={r.daily} daysInMonth={daysInMonth} />
    ),
  },
  {
    id: 'chart-budget-diff-trend',
    label: '予算差・前年差推移',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, budgetChartData, daysInMonth, prevYear }) => (
      <BudgetDiffTrendChart
        data={budgetChartData}
        prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
        daysInMonth={daysInMonth}
      />
    ),
  },
  // ── 本部・経営者向け ──
  {
    id: 'exec-summary-bar',
    label: 'サマリーバー',
    group: '本部・経営者向け',
    size: 'full',
    render: ({ result: r, prevYear }) => {
      const pyRatio = prevYear.hasPrevYear && prevYear.totalSales > 0
        ? (r.totalSales / prevYear.totalSales) * 100
        : null
      return (
      <ExecSummaryBar>
        <ExecSummaryItem $accent="#6366f1">
          <ExecSummaryLabel>売上実績</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.totalSales)}</ExecSummaryValue>
          {pyRatio != null && (
            <ExecSummarySub $color={pyRatio >= 100 ? '#22c55e' : '#ef4444'}>
              前年同曜日比: {pyRatio.toFixed(1)}%
            </ExecSummarySub>
          )}
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#f59e0b">
          <ExecSummaryLabel>総仕入高</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.totalCost)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#3b82f6">
          <ExecSummaryLabel>値入率</ExecSummaryLabel>
          <ExecSummaryValue>{formatPercent(r.averageMarkupRate)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#22c55e">
          <ExecSummaryLabel>粗利率（在庫法）</ExecSummaryLabel>
          <ExecSummaryValue>{r.invMethodGrossProfitRate != null ? formatPercent(r.invMethodGrossProfitRate) : '-'}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#0ea5e9">
          <ExecSummaryLabel>粗利率（推定法）</ExecSummaryLabel>
          <ExecSummaryValue>{formatPercent(r.estMethodMarginRate)}</ExecSummaryValue>
        </ExecSummaryItem>
      </ExecSummaryBar>
      )
    },
  },
  {
    id: 'exec-plan-actual-forecast',
    label: 'PLAN / ACTUAL / FORECAST',
    group: '本部・経営者向け',
    size: 'full',
    render: (ctx) => renderPlanActualForecast(ctx),
  },
  {
    id: 'exec-inventory-metrics',
    label: '在庫・値入・売変',
    group: '本部・経営者向け',
    size: 'full',
    render: ({ result: r }) => (
      <InventoryBar>
        <ExecSummaryItem $accent="#8b5cf6">
          <ExecSummaryLabel>期首在庫</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.openingInventory)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#6366f1">
          <ExecSummaryLabel>期末在庫</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.closingInventory)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#0ea5e9">
          <ExecSummaryLabel>推定在庫</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.estMethodClosingInventory)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#3b82f6">
          <ExecSummaryLabel>値入率</ExecSummaryLabel>
          <ExecSummaryValue>{formatPercent(r.averageMarkupRate)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#f43f5e">
          <ExecSummaryLabel>売変額</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.totalDiscount)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#ef4444">
          <ExecSummaryLabel>売変率</ExecSummaryLabel>
          <ExecSummaryValue>{formatPercent(r.discountRate)}</ExecSummaryValue>
        </ExecSummaryItem>
      </InventoryBar>
    ),
  },
  {
    id: 'exec-monthly-calendar',
    label: '月間カレンダー',
    group: '本部・経営者向け',
    size: 'full',
    render: (ctx) => <MonthlyCalendarWidget key={ctx.storeKey} ctx={ctx} />,
  },
  {
    id: 'exec-dow-average',
    label: '曜日平均',
    group: '本部・経営者向け',
    size: 'full',
    render: (ctx) => renderDowAverage(ctx),
  },
  {
    id: 'exec-weekly-summary',
    label: '週別サマリー',
    group: '本部・経営者向け',
    size: 'full',
    render: (ctx) => renderWeeklySummary(ctx),
  },
  {
    id: 'exec-forecast-tools',
    label: '着地予測・ゴールシーク',
    group: '本部・経営者向け',
    size: 'full',
    render: (ctx) => <ForecastToolsWidget key={ctx.storeKey} ctx={ctx} />,
  },
]

export const WIDGET_MAP = new Map(WIDGET_REGISTRY.map((w) => [w.id, w]))

export const DEFAULT_WIDGET_IDS: string[] = [
  'exec-summary-bar',
  'exec-plan-actual-forecast',
  'exec-inventory-metrics',
  'exec-monthly-calendar',
  'exec-dow-average', 'exec-weekly-summary',
  'exec-forecast-tools',
  'chart-daily-sales',
  'chart-budget-vs-actual',
]

const STORAGE_KEY = 'dashboard_layout_v3'

export function loadLayout(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_WIDGET_IDS
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return DEFAULT_WIDGET_IDS
    const valid = parsed.filter((id) => WIDGET_MAP.has(id))
    return valid.length > 0 ? valid : DEFAULT_WIDGET_IDS
  } catch {
    return DEFAULT_WIDGET_IDS
  }
}

export function saveLayout(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}
