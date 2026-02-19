import { sc } from '@/presentation/theme/semanticColors'
import { KpiCard } from '@/presentation/components/common'
import {
  DailySalesChart, BudgetVsActualChart, GrossProfitRateChart, CategoryPieChart,
  PrevYearComparisonChart, GrossProfitAmountChart, DiscountTrendChart, BudgetDiffTrendChart,
} from '@/presentation/components/charts'
import { formatCurrency, formatPercent, formatPointDiff, safeDivide } from '@/domain/calculations/utils'
import type { WidgetDef } from './types'
import { renderPlanActualForecast } from './PlanActualForecast'
import { MonthlyCalendarWidget } from './MonthlyCalendar'
import { ForecastToolsWidget } from './ForecastTools'
import { renderDowAverage, renderWeeklySummary } from './TableWidgets'
import {
  ExecSummaryBar, ExecSummaryItem, ExecSummaryLabel, ExecSummaryValue, ExecSummarySub,
} from '../DashboardPage.styles'

export const WIDGET_REGISTRY: readonly WidgetDef[] = [
  // ── KPI: 売上・粗利 ──
  {
    id: 'kpi-core-sales',
    label: 'コア売上',
    group: '売上・粗利',
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
    group: '売上・粗利',
    size: 'kpi',
    render: ({ result: r }) => {
      if (r.invMethodGrossProfitRate == null) {
        return <KpiCard label="【在庫法】粗利益" value="-" subText="在庫設定なし" accent={sc.positive} />
      }
      const afterRate = safeDivide(r.invMethodGrossProfit! - r.totalConsumable, r.totalSales, 0)
      return (
        <KpiCard
          label="【在庫法】粗利益"
          value={formatCurrency(r.invMethodGrossProfit)}
          subText={`粗利率: ${formatPercent(r.invMethodGrossProfitRate)} / ${formatPercent(afterRate)} (消耗品: ${formatCurrency(r.totalConsumable)})`}
          accent={sc.positive}
        />
      )
    },
  },
  {
    id: 'kpi-est-margin',
    label: '【推定法】マージン',
    group: '売上・粗利',
    size: 'kpi',
    render: ({ result: r }) => {
      const beforeRate = safeDivide(r.estMethodMargin + r.totalConsumable, r.totalCoreSales, 0)
      return (
        <KpiCard
          label="【推定法】マージン"
          value={formatCurrency(r.estMethodMargin)}
          subText={`マージン率: ${formatPercent(beforeRate)} / ${formatPercent(r.estMethodMarginRate)} (消耗品: ${formatCurrency(r.totalConsumable)})`}
          accent="#0ea5e9"
        />
      )
    },
  },
  {
    id: 'kpi-gross-profit-budget',
    label: '粗利額予算',
    group: '売上・粗利',
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
  // ── KPI: 仕入・原価 ──
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
  {
    id: 'kpi-discount-loss',
    label: '売変ロス原価',
    group: '仕入・原価',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="売変ロス原価" value={formatCurrency(r.discountLossCost)} accent="#dc2626" />
    ),
  },
  {
    id: 'kpi-core-markup',
    label: 'コア値入率',
    group: '仕入・原価',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="コア値入率" value={formatPercent(r.coreMarkupRate)} accent="#06b6d4" />
    ),
  },
  // ── KPI: 予測 ──
  {
    id: 'kpi-avg-daily-sales',
    label: '日平均売上',
    group: '予測',
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
    group: '予測',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="月末予測売上" value={formatCurrency(r.projectedSales)} accent={sc.positive} />
    ),
  },
  {
    id: 'kpi-projected-achievement',
    label: '予算達成率予測',
    group: '予測',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="予算達成率予測" value={formatPercent(r.projectedAchievement)} accent="#0ea5e9" />
    ),
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
    render: ({ budgetChartData, daysInMonth, prevYear }) => (
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
      const elapsedBudget = r.dailyCumulative.get(r.elapsedDays)?.budget ?? 0
      const elapsedDiff = r.totalSales - elapsedBudget
      return (
      <ExecSummaryBar>
        <ExecSummaryItem $accent="#8b5cf6">
          <ExecSummaryLabel>売上実績（営業日）</ExecSummaryLabel>
          <ExecSummarySub>売上予算 / 売上実績</ExecSummarySub>
          <ExecSummaryValue>{formatCurrency(elapsedBudget)} / {formatCurrency(r.totalSales)}</ExecSummaryValue>
          <ExecSummarySub $color={sc.cond(elapsedDiff >= 0)}>
            予算差異: {formatCurrency(elapsedDiff)}
          </ExecSummarySub>
          <ExecSummarySub $color={sc.cond(r.budgetProgressRate >= 1)}>
            売上予算達成率: {formatPercent(r.budgetProgressRate)}
          </ExecSummarySub>
          {pyRatio != null && (
            <ExecSummarySub $color={sc.cond(pyRatio >= 100)}>
              前年同曜日比: {pyRatio.toFixed(1)}%
            </ExecSummarySub>
          )}
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#6366f1">
          <ExecSummaryLabel>売上消化率（月間）</ExecSummaryLabel>
          <ExecSummarySub>売上予算 / 売上実績</ExecSummarySub>
          <ExecSummaryValue>{formatCurrency(r.budget)} / {formatCurrency(r.totalSales)}</ExecSummaryValue>
          <ExecSummarySub $color={sc.cond(r.budgetAchievementRate >= 1)}>
            予算消化率: {formatPercent(r.budgetAchievementRate)}
          </ExecSummarySub>
          <ExecSummarySub $color={r.remainingBudget <= 0 ? sc.positive : undefined}>
            残予算: {formatCurrency(r.remainingBudget)}
          </ExecSummarySub>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#f59e0b">
          <ExecSummaryLabel>在庫金額/総仕入高</ExecSummaryLabel>
          <ExecSummarySub>期首在庫: {r.openingInventory != null ? formatCurrency(r.openingInventory) : '未入力'}</ExecSummarySub>
          <ExecSummarySub>期中仕入高: {formatCurrency(r.totalCost)}</ExecSummarySub>
          <ExecSummarySub>期末在庫: {r.closingInventory != null ? formatCurrency(r.closingInventory) : '未入力'}</ExecSummarySub>
          {(() => {
            if (r.openingInventory == null || r.closingInventory == null) {
              return <ExecSummarySub>売上原価: -（在庫データ未入力）</ExecSummarySub>
            }
            const cogs = r.openingInventory + r.totalCost - r.closingInventory
            return (
              <ExecSummaryValue>{formatCurrency(cogs)}</ExecSummaryValue>
            )
          })()}
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#3b82f6">
          <ExecSummaryLabel>値入率 / 値入額</ExecSummaryLabel>
          {(() => {
            const markupAmount = r.grossSales - r.totalCost
            const estGpRate = r.averageMarkupRate - r.discountRate * (1 - r.discountRate)
            return (
              <>
                <ExecSummaryValue>{formatPercent(r.averageMarkupRate)} / {formatCurrency(markupAmount)}</ExecSummaryValue>
                <ExecSummarySub>売変率 / 売変額: {formatPercent(r.discountRate)} / {formatCurrency(r.totalDiscount)}</ExecSummarySub>
                <ExecSummarySub $color={sc.cond3(estGpRate >= 0.20, estGpRate >= 0.15)}>
                  推定粗利率（売変還元法）: {formatPercent(estGpRate)}
                </ExecSummarySub>
              </>
            )
          })()}
        </ExecSummaryItem>
        <ExecSummaryItem $accent={sc.positive}>
          <ExecSummaryLabel>原算前粗利率/原算後粗利率</ExecSummaryLabel>
          {r.invMethodGrossProfitRate != null ? (() => {
            const invAfterRate = safeDivide(r.invMethodGrossProfit! - r.totalConsumable, r.totalSales, 0)
            const invDiff = r.invMethodGrossProfitRate - invAfterRate
            const estBeforeRate = safeDivide(r.estMethodMargin + r.totalConsumable, r.totalCoreSales, 0)
            const estDiff = estBeforeRate - r.estMethodMarginRate
            return (
              <>
                <ExecSummaryValue>{formatPercent(r.invMethodGrossProfitRate)} / {formatPercent(invAfterRate)}</ExecSummaryValue>
                <ExecSummarySub>在庫法 減算比 {formatPointDiff(invDiff)} 消耗品費: {formatCurrency(r.totalConsumable)}円</ExecSummarySub>
                <ExecSummarySub $color="#64748b">
                  参考（推定法）: {formatPercent(estBeforeRate)} / {formatPercent(r.estMethodMarginRate)}（減算比 {formatPointDiff(estDiff)}）
                </ExecSummarySub>
              </>
            )
          })() : (() => {
            const estBeforeRate = safeDivide(r.estMethodMargin + r.totalConsumable, r.totalCoreSales, 0)
            const estDiff = estBeforeRate - r.estMethodMarginRate
            return (
              <>
                <ExecSummaryValue>{formatPercent(estBeforeRate)} / {formatPercent(r.estMethodMarginRate)}</ExecSummaryValue>
                <ExecSummarySub>推定法 減算比 {formatPointDiff(estDiff)} 消耗品費: {formatCurrency(r.totalConsumable)}円</ExecSummarySub>
              </>
            )
          })()}
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
  'exec-monthly-calendar',
  'exec-dow-average', 'exec-weekly-summary',
  'exec-forecast-tools',
  'chart-daily-sales',
  'chart-budget-vs-actual',
]

const STORAGE_KEY = 'dashboard_layout_v4'

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
