import {
  CustomerScatterChart,
  PerformanceIndexChart,
  CategoryPerformanceChart,
  CausalChainExplorer,
  SensitivityDashboard,
  RegressionInsightChart,
  SeasonalBenchmarkChart,
  FeatureChart,
} from '@/presentation/components/charts'
import type { WidgetDef } from './types'
import { WaterfallChartWidget } from './WaterfallChart'
import { GrossProfitHeatmapWidget } from './GrossProfitHeatmap'
import { toStoreCustomerRows } from '@/application/readModels/customerFact'
import { extractPrevYearCustomerCount } from '@/features/comparison'

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
  // 注: analysis-yoy-waterfall → IntegratedSalesChart の「要因分析」タブに統合
  {
    id: 'analysis-gp-heatmap',
    label: '粗利率ヒートマップ',
    group: '要因分析',
    size: 'full',
    render: (ctx) => <GrossProfitHeatmapWidget key={ctx.storeKey} ctx={ctx} />,
  },
  // ── 多角的分析 ──
  // 注: analysis-yoy-variance（前年比較）→ DailySalesChart「差分」ビューに統合
  // 注: analysis-integrated-timeline（統合タイムライン）→ 削除（PerformanceIndexChart で代替）
  // 注: analysis-duckdb-cumulative（売上進捗）→ DailySalesChart「累計」ビューに統合
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
    id: 'analysis-performance-index',
    label: 'PI値・偏差値・Zスコア',
    group: 'トレンド分析',
    size: 'full',
    render: (ctx) => (
      <PerformanceIndexChart
        daily={ctx.result.daily}
        daysInMonth={ctx.daysInMonth}
        year={ctx.year}
        month={ctx.month}
        prevYearDaily={ctx.prevYear.hasPrevYear ? ctx.prevYear.daily : undefined}
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        prevYearScope={ctx.prevYearScope}
        selectedStoreIds={ctx.selectedStoreIds}
        totalCustomers={
          ctx.readModels?.customerFact?.grandTotalCustomers || ctx.result.totalCustomers
        }
        allStoreResults={ctx.allStoreResults}
        stores={ctx.stores}
        dailyQuantity={ctx.currentCtsQuantity?.byDay}
        ctsQuantityByStore={ctx.currentCtsQuantity?.byStore}
        storeCustomerMap={
          ctx.readModels?.customerFact
            ? toStoreCustomerRows(ctx.readModels.customerFact)
            : undefined
        }
      />
    ),
  },
  // 注: analysis-category-pi → PerformanceIndexChart の子チャートに統合
  {
    id: 'analysis-category-pi',
    label: 'カテゴリPI値・偏差値',
    group: 'トレンド分析',
    size: 'full',
    linkTo: { view: 'category' },
    isVisible: () => false, // PerformanceIndexChart に統合済み — 非表示
    render: (ctx) => (
      <CategoryPerformanceChart
        categoryData={null}
        isLoading={false}
        prevYearScope={ctx.prevYearScope}
        totalCustomers={
          ctx.readModels?.customerFact?.grandTotalCustomers || ctx.result.totalCustomers
        }
        level="department"
        onLevelChange={() => {}}
      />
    ),
  },
  // ── Phase 4: 統合ビュー + 研究者向け分析 ──
  {
    id: 'analysis-causal-chain',
    label: '因果チェーン分析',
    group: '要因分析',
    size: 'full',
    linkTo: { view: 'insight', tab: 'decomposition' },
    render: (ctx) => (
      <CausalChainExplorer
        result={ctx.result}
        prevYearData={
          ctx.prevYear.hasPrevYear
            ? {
                grossProfitRate: null,
                costRate: null,
                discountRate: ctx.prevYear.discountRate,
                costInclusionRate: null,
                discountEntries: ctx.prevYear.totalDiscountEntries,
                totalSales: ctx.prevYear.totalSales,
                totalCustomers: extractPrevYearCustomerCount(ctx.prevYear),
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
    render: (ctx) => (
      <SensitivityDashboard
        result={ctx.result}
        customerCount={ctx.readModels?.customerFact?.grandTotalCustomers}
      />
    ),
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
    isVisible: (ctx) => ctx.queryExecutor?.isReady === true,
    render: (ctx) => (
      <FeatureChart
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  // 注: analysis-duckdb-yoy → analysis-yoy-variance に統合（データソース自動解決）
  // 注: analysis-duckdb-dept-trend → exec-department-kpi テーブルに統合
  // 注: duckdb-timeslot → chart-timeslot-sales に統合（データソース自動解決）
  // 注: duckdb-heatmap → chart-timeslot-heatmap に統合
  // 注: duckdb-dept-hourly → chart-dept-hourly-pattern に統合
  // 注: duckdb-store-hourly → chart-store-timeslot-comparison に統合
]
