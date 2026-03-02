import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { KpiCard } from '@/presentation/components/common'
import {
  DailySalesChart,
  BudgetVsActualChart,
  CategoryPieChart,
  GrossProfitAmountChart,
  CategoryHierarchyExplorer,
  SalesPurchaseComparisonChart,
  DiscountTrendChart,
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
  DuckDBFeatureChart,
  DuckDBCumulativeChart,
  DuckDBDeptTrendChart,
  DuckDBDowPatternChart,
  DuckDBHourlyProfileChart,
  DuckDBCategoryTrendChart,
  DuckDBCategoryHourlyChart,
  DuckDBCategoryMixChart,
  DuckDBStoreBenchmarkChart,
} from '@/presentation/components/charts'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import type { WidgetDef } from './types'
import { renderPlanActualForecast } from './PlanActualForecast'
import { MonthlyCalendarWidget } from './MonthlyCalendar'
import { ForecastToolsWidget } from './ForecastTools'
import { GrossProfitHeatmapWidget } from './GrossProfitHeatmap'
import { WaterfallChartWidget } from './WaterfallChart'
import { YoYWaterfallChartWidget } from './YoYWaterfallChart'
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
import {
  UnifiedTimeSlotWidget,
  UnifiedHeatmapWidget,
  UnifiedDeptHourlyWidget,
  UnifiedStoreHourlyWidget,
  UnifiedYoYWidget,
  isTimeSeriesVisible,
  isStoreComparisonVisible,
  isYoYVisible,
} from './UnifiedAnalyticsWidgets'

export const WIDGET_REGISTRY: readonly WidgetDef[] = [
  // ── KPI: 収益概況 ──
  {
    id: 'kpi-core-sales',
    label: 'コア売上',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="コア売上"
        value={formatCurrency(r.totalCoreSales)}
        subText={`花: ${formatCurrency(r.flowerSalesPrice)} / 産直: ${formatCurrency(r.directProduceSalesPrice)}`}
        accent={palette.purpleDark}
        onClick={() => onExplain('coreSales')}
      />
    ),
  },
  {
    id: 'kpi-inv-gross-profit',
    label: '【在庫法】粗利益',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain }) => {
      if (r.invMethodGrossProfitRate == null) {
        return (
          <KpiCard label="【在庫法】粗利益" value="-" subText="在庫設定なし" accent={sc.positive} />
        )
      }
      const afterRate = safeDivide(r.invMethodGrossProfit! - r.totalConsumable, r.totalSales, 0)
      return (
        <KpiCard
          label="【在庫法】粗利益"
          value={formatCurrency(r.invMethodGrossProfit)}
          subText={`粗利率: ${formatPercent(r.invMethodGrossProfitRate)} / ${formatPercent(afterRate)} (消耗品: ${formatCurrency(r.totalConsumable)})`}
          accent={sc.positive}
          onClick={() => onExplain('invMethodGrossProfit')}
        />
      )
    },
  },
  {
    id: 'kpi-est-margin',
    label: '【推定法】在庫差分',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain }) => {
      const beforeRate = safeDivide(r.estMethodMargin + r.totalConsumable, r.totalCoreSales, 0)
      return (
        <KpiCard
          label="【推定法】在庫差分"
          value={formatCurrency(r.estMethodMargin)}
          subText={`在庫差分率: ${formatPercent(beforeRate)} / ${formatPercent(r.estMethodMarginRate)} (消耗品: ${formatCurrency(r.totalConsumable)})`}
          accent={palette.infoDark}
          onClick={() => onExplain('estMethodMargin')}
        />
      )
    },
  },
  // 注: kpi-gross-profit-budget → ExecSummaryBar 粗利率カードに統合
  // ── KPI: 収益概況（仕入・売変） ──
  {
    id: 'kpi-inventory-cost',
    label: '在庫仕入原価',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="在庫仕入原価"
        value={formatCurrency(r.inventoryCost)}
        accent={palette.orangeDark}
        onClick={() => onExplain('inventoryCost')}
      />
    ),
  },
  {
    id: 'kpi-delivery-sales',
    label: '売上納品原価',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="売上納品原価"
        value={formatCurrency(r.deliverySalesCost)}
        subText={`売価: ${formatCurrency(r.deliverySalesPrice)}`}
        accent={palette.pinkDark}
        onClick={() => onExplain('deliverySalesCost')}
      />
    ),
  },
  {
    id: 'kpi-consumable',
    label: '消耗品費',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="消耗品費"
        value={formatCurrency(r.totalConsumable)}
        subText={`消耗品率: ${formatPercent(r.consumableRate)}`}
        accent={palette.orange}
        onClick={() => onExplain('totalConsumable')}
      />
    ),
  },
  {
    id: 'kpi-discount-loss',
    label: '売変ロス原価',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="売変ロス原価"
        value={formatCurrency(r.discountLossCost)}
        accent={palette.dangerDeep}
        onClick={() => onExplain('discountLossCost')}
      />
    ),
  },
  {
    id: 'kpi-core-markup',
    label: 'コア値入率',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="コア値入率"
        value={formatPercent(r.coreMarkupRate)}
        accent={palette.cyanDark}
        onClick={() => onExplain('coreMarkupRate')}
      />
    ),
  },
  // 注: kpi-avg-daily-sales, kpi-projected-sales, kpi-projected-achievement → PLAN/ACTUAL/FORECASTに統合
  // 注: kpi-customers, kpi-transaction-value → ExecSummaryBar 客数・客単価カードに統合
  // ── トレンド分析: 日次 ──
  {
    id: 'chart-daily-sales',
    label: '日別売上チャート',
    group: 'トレンド分析',
    size: 'full',
    render: ({ result: r, daysInMonth, prevYear, year, month }) => (
      <DailySalesChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        year={year}
        month={month}
        prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
      />
    ),
  },
  {
    id: 'chart-budget-vs-actual',
    label: '予算vs実績チャート',
    group: '収益概況',
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
    group: '収益概況',
    size: 'half',
    render: ({ result: r }) => <CategoryPieChart categoryTotals={r.categoryTotals} />,
  },
  {
    id: 'chart-gross-profit-amount',
    label: '粗利推移チャート',
    group: '収益概況',
    size: 'full',
    render: ({ result: r, daysInMonth, targetRate, warningRate, prevYear }) => {
      // 前年仕入コストマップの構築（前年粗利率ライン表示用）
      // 注: prevYear.daily は classifiedSales 由来。仕入コストは個別に持っていないため
      // 「前年売変データから近似」する。正確な前年粗利率は在庫データが必要。
      // ここでは前年売変率で近似的に原価を推定する
      let prevYearCostMap: ReadonlyMap<number, number> | undefined
      if (prevYear.hasPrevYear && prevYear.totalSales > 0) {
        const costMap = new Map<number, number>()
        for (const [day, entry] of prevYear.daily) {
          // 前年は日別仕入原価を持たないため、売上-売変で近似
          // これは粗売上≈売上+売変として、原価≈売上×(1-値入率) の近似
          // 正確な値ではないが傾向比較には有用
          costMap.set(day, entry.sales > 0 ? entry.sales - entry.discount : 0)
        }
        prevYearCostMap = costMap
      }
      return (
        <GrossProfitAmountChart
          daily={r.daily}
          daysInMonth={daysInMonth}
          grossProfitBudget={r.grossProfitBudget}
          targetRate={targetRate}
          warningRate={warningRate}
          prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
          prevYearCostMap={prevYearCostMap}
        />
      )
    },
  },
  {
    id: 'chart-discount-breakdown',
    label: '売変内訳分析（71-74）',
    group: '収益概況',
    size: 'full',
    isVisible: (ctx) => ctx.result.hasDiscountData,
    render: ({ result: r, daysInMonth, prevYear }) => (
      <DiscountTrendChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        discountEntries={r.discountEntries}
        totalGrossSales={r.grossSales}
        prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
      />
    ),
  },
  // 注: 予算差・前年差推移 → BudgetVsActualChart「前年差」ビューに統合
  // 注: 日別客数推移 → DailySalesChart「客数」ビューに統合
  // 注: 日別客単価推移 → DailySalesChart「客単価」ビューに統合
  // ── チャート: 分類別時間帯売上 ──
  {
    id: 'chart-category-hierarchy-explorer',
    label: '階層ドリルダウン分析',
    group: '構造分析',
    size: 'full',
    isVisible: (ctx) => ctx.ctsIndex.recordCount > 0,
    render: ({
      ctsIndex,
      prevCtsIndex,
      selectedStoreIds,
      daysInMonth,
      year,
      month,
      dataMaxDay,
      result,
    }) => (
      <CategoryHierarchyExplorer
        ctsIndex={ctsIndex}
        prevCtsIndex={prevCtsIndex}
        selectedStoreIds={selectedStoreIds}
        daysInMonth={daysInMonth}
        year={year}
        month={month}
        dataMaxDay={dataMaxDay}
        totalCustomers={result.totalCustomers}
      />
    ),
  },
  {
    id: 'chart-timeslot-sales',
    label: '時間帯別売上',
    group: '構造分析',
    size: 'full',
    isVisible: isTimeSeriesVisible,
    render: (ctx) => <UnifiedTimeSlotWidget ctx={ctx} />,
  },
  // 注: 部門・クラス別売上 → CategoryHierarchyExplorer に統合
  // 注: 時間帯KPIサマリー → TimeSlotSalesChart「KPI」タブに統合
  {
    id: 'chart-timeslot-heatmap',
    label: '時間帯×曜日ヒートマップ',
    group: '構造分析',
    size: 'full',
    isVisible: isTimeSeriesVisible,
    render: (ctx) => <UnifiedHeatmapWidget ctx={ctx} />,
  },
  {
    id: 'chart-dept-hourly-pattern',
    label: '部門別時間帯パターン',
    group: '構造分析',
    size: 'full',
    isVisible: isTimeSeriesVisible,
    render: (ctx) => <UnifiedDeptHourlyWidget ctx={ctx} />,
  },
  {
    id: 'chart-store-timeslot-comparison',
    label: '店舗別時間帯比較',
    group: '構造分析',
    size: 'full',
    isVisible: isStoreComparisonVisible,
    render: (ctx) => <UnifiedStoreHourlyWidget ctx={ctx} />,
  },
  // 注: 時間帯別前年同曜日比較 → TimeSlotSalesChart「前年比較」タブに統合
  // ── 概要・ステータス ──
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
    id: 'chart-sales-purchase-comparison',
    label: '売上・仕入 店舗比較',
    group: '構造分析',
    size: 'full',
    render: ({ allStoreResults, stores, daysInMonth }) => {
      const results = Array.from(allStoreResults.values())
      if (results.length < 2) return null
      return (
        <SalesPurchaseComparisonChart
          comparisonResults={results}
          stores={stores}
          daysInMonth={daysInMonth}
        />
      )
    },
  },
  {
    id: 'exec-store-kpi',
    label: '店舗別KPI一覧',
    group: '構造分析',
    size: 'full',
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
    render: (ctx) => <ForecastToolsWidget key={ctx.storeKey} ctx={ctx} />,
  },
  // ── 分析・可視化 ──
  {
    id: 'analysis-waterfall',
    label: '粗利ウォーターフォール',
    group: '要因分析',
    size: 'full',
    render: (ctx) => <WaterfallChartWidget key={ctx.storeKey} ctx={ctx} />,
  },
  {
    id: 'analysis-yoy-waterfall',
    label: '前年比較ウォーターフォール',
    group: '要因分析',
    size: 'full',
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
    render: ({ result: r, daysInMonth, prevYear }) => (
      <MultiKpiSparklines
        daily={r.daily}
        daysInMonth={daysInMonth}
        prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
      />
    ),
  },
  {
    id: 'analysis-performance-index',
    label: 'PI値・偏差値・Zスコア',
    group: 'トレンド分析',
    size: 'full',
    render: ({ result: r, daysInMonth, prevYear }) => (
      <PerformanceIndexChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
      />
    ),
  },
  {
    id: 'analysis-category-pi',
    label: 'カテゴリPI値・偏差値',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.ctsIndex.recordCount > 0,
    render: ({
      ctsIndex,
      prevCtsIndex,
      selectedStoreIds,
      currentDateRange,
      prevYearDateRange,
      result,
      prevYear,
    }) => (
      <CategoryPerformanceChart
        ctsIndex={ctsIndex}
        prevCtsIndex={prevCtsIndex}
        selectedStoreIds={selectedStoreIds}
        currentDateRange={currentDateRange}
        prevYearDateRange={prevYearDateRange}
        totalCustomers={result.totalCustomers}
        prevTotalCustomers={prevYear.hasPrevYear ? prevYear.totalCustomers : 0}
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
    render: ({ result: r, prevYear }) => (
      <CausalChainExplorer
        result={r}
        prevYearData={
          prevYear.hasPrevYear
            ? {
                grossProfitRate: null,
                costRate: null,
                discountRate: prevYear.discountRate,
                consumableRate: null,
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
    label: '売上トレンド分析（DuckDB）',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DuckDBFeatureChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'analysis-duckdb-cumulative',
    label: '累積売上推移（DuckDB）',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DuckDBCumulativeChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  // 注: analysis-duckdb-yoy → analysis-yoy-variance に統合（データソース自動解決）
  {
    id: 'analysis-duckdb-dept-trend',
    label: '部門別KPIトレンド（DuckDB）',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0 && ctx.duckLoadedMonthCount >= 2,
    render: (ctx) => (
      <DuckDBDeptTrendChart
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
  // ── DuckDB Phase 2: グループB — 新規分析ウィジェット ──
  {
    id: 'duckdb-dow-pattern',
    label: '曜日パターン分析（DuckDB）',
    group: 'トレンド分析',
    size: 'half',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DuckDBDowPatternChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-hourly-profile',
    label: '時間帯プロファイル（DuckDB）',
    group: 'トレンド分析',
    size: 'half',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DuckDBHourlyProfileChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-category-trend',
    label: 'カテゴリ別売上推移（DuckDB）',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DuckDBCategoryTrendChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  // ── DuckDB Phase 2: グループC — 高度分析ウィジェット ──
  {
    id: 'duckdb-category-hourly',
    label: 'カテゴリ×時間帯（DuckDB）',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DuckDBCategoryHourlyChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-category-mix',
    label: 'カテゴリ構成比推移（DuckDB）',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0 && ctx.duckLoadedMonthCount >= 2,
    render: (ctx) => (
      <DuckDBCategoryMixChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-store-benchmark',
    label: '店舗ベンチマーク（DuckDB）',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0 && ctx.stores.size > 1,
    render: (ctx) => (
      <DuckDBStoreBenchmarkChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.duckDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
        stores={ctx.stores}
      />
    ),
  },
]
