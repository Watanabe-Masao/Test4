import { sc } from '@/presentation/theme/semanticColors'
import { KpiCard } from '@/presentation/components/common'
import {
  DailySalesChart, BudgetVsActualChart, CategoryPieChart,
  GrossProfitAmountChart,
  TimeSlotSalesChart, CategorySalesBreakdownChart,
  TimeSlotHeatmapChart, DeptHourlyPatternChart, StoreTimeSlotComparisonChart,
  CategoryHierarchyExplorer,
} from '@/presentation/components/charts'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import type { WidgetDef } from './types'
import { renderPlanActualForecast } from './PlanActualForecast'
import { MonthlyCalendarWidget } from './MonthlyCalendar'
import { ForecastToolsWidget } from './ForecastTools'
import { GrossProfitHeatmapWidget } from './GrossProfitHeatmap'
import { WaterfallChartWidget } from './WaterfallChart'
import { ConditionSummaryWidget } from './ConditionSummary'
import { renderDowAverage, renderWeeklySummary, renderDailyStoreSalesTable, renderDepartmentKpiTable, renderDailyInventoryTable, renderStoreKpiTable } from './TableWidgets'
import { ExecSummaryBarWidget } from './ExecSummaryBarWidget'

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
  // 注: kpi-gross-profit-budget → ExecSummaryBar 粗利率カードに統合
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
  // 注: kpi-avg-daily-sales, kpi-projected-sales, kpi-projected-achievement → PLAN/ACTUAL/FORECASTに統合
  // 注: kpi-customers, kpi-transaction-value → ExecSummaryBar 客数・客単価カードに統合
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
    render: ({ result: r, budgetChartData, daysInMonth, prevYear }) => (
      <BudgetVsActualChart
        data={budgetChartData}
        budget={r.budget}
        salesDays={r.salesDays}
        daysInMonth={daysInMonth}
        prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
      />
    ),
  },
  {
    id: 'chart-category-pie',
    label: 'カテゴリ別構成',
    group: 'チャート',
    size: 'half',
    render: ({ result: r }) => (
      <CategoryPieChart categoryTotals={r.categoryTotals} />
    ),
  },
  {
    id: 'chart-gross-profit-amount',
    label: '粗利推移チャート',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, daysInMonth, targetRate, warningRate }) => (
      <GrossProfitAmountChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        grossProfitBudget={r.grossProfitBudget}
        targetRate={targetRate}
        warningRate={warningRate}
      />
    ),
  },
  // 注: 売変インパクト分析 → DailySalesChart「売変分析」ビューに統合
  // 注: 予算差・前年差推移 → BudgetVsActualChart「前年差」ビューに統合
  // 注: 日別客数推移 → DailySalesChart「客数」ビューに統合
  // 注: 日別客単価推移 → DailySalesChart「客単価」ビューに統合
  // ── チャート: 分類別時間帯売上 ──
  {
    id: 'chart-category-hierarchy-explorer',
    label: '階層ドリルダウン分析',
    group: '分類別時間帯',
    size: 'full',
    render: ({ categoryTimeSales, selectedStoreIds, daysInMonth, year, month }) => (
      <CategoryHierarchyExplorer categoryTimeSales={categoryTimeSales} selectedStoreIds={selectedStoreIds} daysInMonth={daysInMonth} year={year} month={month} />
    ),
  },
  {
    id: 'chart-timeslot-sales',
    label: '時間帯別売上',
    group: '分類別時間帯',
    size: 'full',
    render: ({ categoryTimeSales, selectedStoreIds, daysInMonth, year, month }) => (
      <TimeSlotSalesChart categoryTimeSales={categoryTimeSales} selectedStoreIds={selectedStoreIds} daysInMonth={daysInMonth} year={year} month={month} />
    ),
  },
  {
    id: 'chart-category-sales-breakdown',
    label: '部門・クラス別売上',
    group: '分類別時間帯',
    size: 'full',
    render: ({ categoryTimeSales, selectedStoreIds, daysInMonth, year, month }) => (
      <CategorySalesBreakdownChart categoryTimeSales={categoryTimeSales} selectedStoreIds={selectedStoreIds} daysInMonth={daysInMonth} year={year} month={month} />
    ),
  },
  // 注: 時間帯KPIサマリー → TimeSlotSalesChart「KPI」タブに統合
  {
    id: 'chart-timeslot-heatmap',
    label: '時間帯×曜日ヒートマップ',
    group: '分類別時間帯',
    size: 'full',
    render: ({ categoryTimeSales, selectedStoreIds, year, month, daysInMonth }) => (
      <TimeSlotHeatmapChart categoryTimeSales={categoryTimeSales} selectedStoreIds={selectedStoreIds} year={year} month={month} daysInMonth={daysInMonth} />
    ),
  },
  {
    id: 'chart-dept-hourly-pattern',
    label: '部門別時間帯パターン',
    group: '分類別時間帯',
    size: 'full',
    render: ({ categoryTimeSales, selectedStoreIds, daysInMonth, year, month }) => (
      <DeptHourlyPatternChart categoryTimeSales={categoryTimeSales} selectedStoreIds={selectedStoreIds} daysInMonth={daysInMonth} year={year} month={month} />
    ),
  },
  {
    id: 'chart-store-timeslot-comparison',
    label: '店舗別時間帯比較',
    group: '分類別時間帯',
    size: 'full',
    render: ({ categoryTimeSales, stores, daysInMonth, year, month }) => (
      <StoreTimeSlotComparisonChart categoryTimeSales={categoryTimeSales} stores={stores} daysInMonth={daysInMonth} year={year} month={month} />
    ),
  },
  // ── 概要・ステータス ──
  {
    id: 'exec-summary-bar',
    label: 'サマリーバー',
    group: '概要・ステータス',
    size: 'full',
    render: (ctx) => <ExecSummaryBarWidget key={ctx.storeKey} {...ctx} />,
  },
  {
    id: 'analysis-condition-summary',
    label: 'コンディションサマリー',
    group: '概要・ステータス',
    size: 'full',
    render: (ctx) => <ConditionSummaryWidget key={ctx.storeKey} ctx={ctx} />,
  },
  // ── 予実管理 ──
  {
    id: 'exec-plan-actual-forecast',
    label: 'PLAN / ACTUAL / FORECAST',
    group: '予実管理',
    size: 'full',
    render: (ctx) => renderPlanActualForecast(ctx),
  },
  {
    id: 'exec-monthly-calendar',
    label: '月間カレンダー',
    group: '予実管理',
    size: 'full',
    render: (ctx) => <MonthlyCalendarWidget key={ctx.storeKey} ctx={ctx} />,
  },
  // ── パターン分析 ──
  {
    id: 'exec-dow-average',
    label: '曜日平均',
    group: 'パターン分析',
    size: 'full',
    render: (ctx) => renderDowAverage(ctx),
  },
  {
    id: 'exec-weekly-summary',
    label: '週別サマリー',
    group: 'パターン分析',
    size: 'full',
    render: (ctx) => renderWeeklySummary(ctx),
  },
  {
    id: 'exec-daily-store-sales',
    label: '売上・売変・客数（日別×店舗）',
    group: 'パターン分析',
    size: 'full',
    render: (ctx) => renderDailyStoreSalesTable(ctx),
  },
  {
    id: 'exec-daily-inventory',
    label: '日別推定在庫',
    group: 'パターン分析',
    size: 'full',
    render: (ctx) => renderDailyInventoryTable(ctx),
  },
  // ── 店舗別 ──
  {
    id: 'exec-store-kpi',
    label: '店舗別KPI一覧',
    group: '店舗別',
    size: 'full',
    render: (ctx) => renderStoreKpiTable(ctx),
  },
  // ── 部門別 ──
  {
    id: 'exec-department-kpi',
    label: '部門別KPI一覧',
    group: '部門別',
    size: 'full',
    render: (ctx) => renderDepartmentKpiTable(ctx),
  },
  // ── シミュレーション ──
  {
    id: 'exec-forecast-tools',
    label: '着地予測・ゴールシーク',
    group: 'シミュレーション',
    size: 'full',
    render: (ctx) => <ForecastToolsWidget key={ctx.storeKey} ctx={ctx} />,
  },
  // ── 分析・可視化 ──
  {
    id: 'analysis-waterfall',
    label: '粗利ウォーターフォール',
    group: '分析・可視化',
    size: 'full',
    render: (ctx) => <WaterfallChartWidget key={ctx.storeKey} ctx={ctx} />,
  },
  {
    id: 'analysis-gp-heatmap',
    label: '粗利率ヒートマップ',
    group: '分析・可視化',
    size: 'full',
    render: (ctx) => <GrossProfitHeatmapWidget key={ctx.storeKey} ctx={ctx} />,
  },
]

export const WIDGET_MAP = new Map(WIDGET_REGISTRY.map((w) => [w.id, w]))

export const DEFAULT_WIDGET_IDS: string[] = [
  // 1. 今の状況は？
  'analysis-condition-summary',
  // 2. 何が起きた？（トレンド視覚化）
  'chart-daily-sales',
  // 3. 数値で確認
  'exec-summary-bar',
  // 4. 予算や前年との比較は？
  'chart-budget-vs-actual',
  // 5. 詳細分析
  'exec-plan-actual-forecast',
  // 6. これからどうなる？
  'exec-forecast-tools',
  // 補助: 分析ツール
  'analysis-waterfall',
  'analysis-gp-heatmap',
  // 補助: テーブル
  'exec-monthly-calendar',
  'exec-dow-average', 'exec-weekly-summary',
]

const STORAGE_KEY = 'dashboard_layout_v7'

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
