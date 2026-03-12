import {
  RevenueStructureChart,
  CustomerScatterChart,
  MultiKpiSparklines,
  PerformanceIndexChart,
  CategoryPerformanceChart,
  StructuralOverviewChart,
  IntegratedTimeline,
  CausalChainExplorer,
  SensitivityDashboard,
  RegressionInsightChart,
  SeasonalBenchmarkChart,
  FeatureChart,
  CumulativeChart,
  DeptTrendChart,
} from '@/presentation/components/charts'
import type { WidgetDef } from './types'
import { WaterfallChartWidget } from './WaterfallChart'
import { YoYWaterfallChartWidget } from './YoYWaterfallChart'
import { GrossProfitHeatmapWidget } from './GrossProfitHeatmap'
import { UnifiedYoYWidget } from './UnifiedAnalyticsWidgets'
import { isYoYVisible } from './widgetVisibility'

// ── 分析・可視化 ──
export const WIDGETS_ANALYSIS: readonly WidgetDef[] = [
  {
    id: 'analysis-waterfall',
    label: '粗利ウォーターフォール',
    group: '要因分析',
    size: 'full',
    linkTo: { view: 'insight', tab: 'decomposition' },
    render: (ctx) => <WaterfallChartWidget key={ctx.storeKey} ctx={ctx} />,
  },
  {
    id: 'analysis-yoy-waterfall',
    label: '前年比較ウォーターフォール',
    group: '要因分析',
    size: 'full',
    linkTo: { view: 'insight', tab: 'decomposition' },
    isVisible: (ctx) => ctx.prevYear.hasPrevYear && ctx.prevYear.totalSales > 0,
    render: (ctx) => <YoYWaterfallChartWidget key={ctx.storeKey} ctx={ctx} />,
  },
  {
    id: 'analysis-gp-heatmap',
    label: '粗利率ヒートマップ',
    group: '要因分析',
    size: 'full',
    render: (ctx) => <GrossProfitHeatmapWidget key={ctx.storeKey} ctx={ctx} />,
  },
  // ── 多角的分析 ──
  {
    id: 'analysis-revenue-structure',
    label: '収益構造分析',
    group: 'トレンド分析',
    size: 'full',
    render: ({ result: r, daysInMonth }) => (
      <RevenueStructureChart daily={r.daily} daysInMonth={daysInMonth} />
    ),
  },
  {
    id: 'analysis-yoy-variance',
    label: '前年差異分析',
    group: 'トレンド分析',
    size: 'full',
    isVisible: isYoYVisible,
    render: (ctx) => <UnifiedYoYWidget ctx={ctx} />,
  },
  {
    id: 'analysis-customer-scatter',
    label: '客数×客単価 効率分析',
    group: 'トレンド分析',
    size: 'full',
    render: ({ result: r, daysInMonth, year, month, prevYear }) => (
      <CustomerScatterChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        year={year}
        month={month}
        prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
      />
    ),
  },
  {
    id: 'analysis-multi-kpi',
    label: 'マルチKPIダッシュボード',
    group: 'トレンド分析',
    size: 'full',
    render: ({ result: r, daysInMonth, year, month, prevYear }) => (
      <MultiKpiSparklines
        daily={r.daily}
        daysInMonth={daysInMonth}
        year={year}
        month={month}
        prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
      />
    ),
  },
  {
    id: 'analysis-performance-index',
    label: 'PI値・偏差値・Zスコア',
    group: 'トレンド分析',
    size: 'full',
    render: ({ result: r, daysInMonth, year, month, prevYear }) => (
      <PerformanceIndexChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        year={year}
        month={month}
        prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
      />
    ),
  },
  {
    id: 'analysis-category-pi',
    label: 'カテゴリPI値・偏差値',
    group: 'トレンド分析',
    size: 'full',
    linkTo: { view: 'category' },
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <CategoryPerformanceChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        prevYearScope={ctx.prevYearScope}
        selectedStoreIds={ctx.selectedStoreIds}
        totalCustomers={ctx.result.totalCustomers}
      />
    ),
  },
  // ── Phase 4: 統合ビュー + 研究者向け分析 ──
  {
    id: 'analysis-structural-overview',
    label: '収益構造俯瞰図',
    group: '収益概況',
    size: 'full',
    render: ({ result: r }) => <StructuralOverviewChart result={r} />,
  },
  {
    id: 'analysis-integrated-timeline',
    label: '統合タイムライン',
    group: 'トレンド分析',
    size: 'full',
    render: ({ result: r, daysInMonth }) => (
      <IntegratedTimeline result={r} daysInMonth={daysInMonth} />
    ),
  },
  {
    id: 'analysis-causal-chain',
    label: '因果チェーン分析',
    group: '要因分析',
    size: 'full',
    linkTo: { view: 'insight', tab: 'decomposition' },
    render: ({ result: r, prevYear }) => (
      <CausalChainExplorer
        result={r}
        prevYearData={
          prevYear.hasPrevYear
            ? {
                grossProfitRate: null,
                costRate: null,
                discountRate: prevYear.discountRate,
                costInclusionRate: null,
                discountEntries: prevYear.totalDiscountEntries,
                totalSales: prevYear.totalSales,
                totalCustomers: prevYear.totalCustomers,
              }
            : undefined
        }
      />
    ),
  },
  {
    id: 'analysis-sensitivity',
    label: '感度分析ダッシュボード',
    group: '予測・シミュレーション',
    size: 'full',
    render: ({ result: r }) => <SensitivityDashboard result={r} />,
  },
  {
    id: 'analysis-regression-insight',
    label: '回帰分析インサイト',
    group: 'トレンド分析',
    size: 'full',
    render: ({ result: r, year, month }) => (
      <RegressionInsightChart result={r} year={year} month={month} />
    ),
  },
  {
    id: 'analysis-seasonal-benchmark',
    label: '季節性ベンチマーク',
    group: 'トレンド分析',
    size: 'full',
    render: ({ month, monthlyHistory }) => (
      <SeasonalBenchmarkChart monthlyData={monthlyHistory} currentMonth={month} />
    ),
  },
  {
    id: 'analysis-duckdb-features',
    label: '売上トレンド分析',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <FeatureChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'analysis-duckdb-cumulative',
    label: '累積売上推移',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <CumulativeChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  // 注: analysis-duckdb-yoy → analysis-yoy-variance に統合（データソース自動解決）
  {
    id: 'analysis-duckdb-dept-trend',
    label: '部門別KPIトレンド',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0 && ctx.duckLoadedMonthCount >= 2,
    render: (ctx) => (
      <DeptTrendChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        loadedMonthCount={ctx.duckLoadedMonthCount}
        year={ctx.year}
        month={ctx.month}
      />
    ),
  },
  // 注: duckdb-timeslot → chart-timeslot-sales に統合（データソース自動解決）
  // 注: duckdb-heatmap → chart-timeslot-heatmap に統合
  // 注: duckdb-dept-hourly → chart-dept-hourly-pattern に統合
  // 注: duckdb-store-hourly → chart-store-timeslot-comparison に統合
]
