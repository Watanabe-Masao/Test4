import {
  IntegratedSalesChart,
  GrossProfitAmountChart,
  SalesPurchaseComparisonChart,
} from '@/presentation/components/charts'
import { buildPrevYearCostApprox } from '@/domain/calculations/prevYearCostApprox'
import type { DashboardWidgetDef } from './types'
import { UnifiedHeatmapWidget, UnifiedStoreHourlyWidget } from './UnifiedAnalyticsWidgets'
import { isTimeSeriesVisible, isStoreComparisonVisible } from './widgetVisibility'
import { WeatherWidget } from './WeatherWidget'
// EtrnTestWidget: Sprint 3 で retirement（ctx 非経由のデバッグ用途。廃止）

// ── トレンド分析: 日次 ──
export const WIDGETS_CHART: readonly DashboardWidgetDef[] = [
  {
    id: 'chart-daily-sales',
    label: '日別売上チャート',
    group: 'トレンド分析',
    size: 'full',
    linkTo: { view: 'daily' },
    render: (ctx) => (
      <IntegratedSalesChart
        daily={ctx.result.daily}
        daysInMonth={ctx.daysInMonth}
        year={ctx.year}
        month={ctx.month}
        prevYearDaily={ctx.prevYear.hasPrevYear ? ctx.prevYear.daily : undefined}
        budgetDaily={ctx.result.budgetDaily}
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
        prevYearScope={ctx.prevYearScope}
        weatherDaily={ctx.weatherDaily}
        prevYearWeatherDaily={ctx.prevYearWeatherDaily}
        dowOffset={ctx.comparisonScope?.dowOffset ?? 0}
        discountEntries={ctx.result.discountEntries}
        totalGrossSales={ctx.result.grossSales}
        weatherPersist={ctx.weatherPersist}
        widgetContext={ctx}
      />
    ),
  },
  // 注: 予算vs実績チャート → DailySalesChart「累計推移」ビューに統合
  // 注: カテゴリ偏り → CategoryHierarchyExplorer に統合
  {
    id: 'chart-gross-profit-amount',
    label: '粗利推移チャート',
    group: '収益概況',
    size: 'full',
    linkTo: { view: 'insight', tab: 'grossProfit' },
    render: (ctx) => (
      <GrossProfitAmountChart
        daily={ctx.result.daily}
        daysInMonth={ctx.daysInMonth}
        year={ctx.year}
        month={ctx.month}
        grossProfitBudget={ctx.result.grossProfitBudget}
        targetRate={ctx.targetRate}
        warningRate={ctx.warningRate}
        prevYearDaily={ctx.prevYear.hasPrevYear ? ctx.prevYear.daily : undefined}
        prevYearCostMap={buildPrevYearCostApprox(ctx.prevYear)}
        rangeStart={ctx.chartPeriodProps?.rangeStart}
        rangeEnd={ctx.chartPeriodProps?.rangeEnd}
      />
    ),
  },
  // 注: chart-discount-breakdown → IntegratedSalesChart「売変」モードの子パネルに統合
  // 注: chart-category-analysis → IntegratedSalesChart「カテゴリ分析」タブに統合
  // 注: 予算差・前年差推移 → BudgetVsActualChart「前年差」ビューに統合
  // 注: 日別客数推移 → DailySalesChart「客数」ビューに統合
  // 注: 日別客単価推移 → DailySalesChart「客単価」ビューに統合
  // 注: chart-timeslot-sales → IntegratedSalesChart ドリルダウン（全体比較/部門別）に統合
  // 注: 部門・クラス別売上 → CategoryHierarchyExplorer に統合
  // 注: 時間帯KPIサマリー → TimeSlotSalesChart「KPI」タブに統合
  {
    id: 'chart-timeslot-heatmap',
    label: '時間帯×曜日ヒートマップ',
    group: '構造分析',
    size: 'full',
    isVisible: isTimeSeriesVisible,
    render: (ctx) => (
      <UnifiedHeatmapWidget
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
        prevYearScope={ctx.prevYearScope}
      />
    ),
  },
  // 注: 部門別時間帯パターン → IntegratedSalesChart の孫に統合（ドリル時に包含表示）
  {
    id: 'chart-store-timeslot-comparison',
    label: '店舗別時間帯比較',
    group: '構造分析',
    size: 'full',
    isVisible: isStoreComparisonVisible,
    render: (ctx) => (
      <UnifiedStoreHourlyWidget
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
        stores={ctx.stores}
      />
    ),
  },
  // 注: 時間帯別前年同曜日比較 → TimeSlotSalesChart「前年比較」タブに統合
  // ── 店舗別 ──
  {
    id: 'chart-sales-purchase-comparison',
    label: '売上・仕入 店舗比較',
    group: '構造分析',
    size: 'full',
    render: (ctx) => {
      const { allStoreResults, stores, daysInMonth } = ctx
      const results = Array.from(allStoreResults.values())
      if (results.length < 2) return null
      return (
        <SalesPurchaseComparisonChart
          comparisonResults={results}
          stores={stores}
          daysInMonth={daysInMonth}
          storeDailySeries={ctx.storeDailyLane?.bundle.currentSeries ?? null}
          rangeStart={ctx.chartPeriodProps?.rangeStart}
          rangeEnd={ctx.chartPeriodProps?.rangeEnd}
        />
      )
    },
  },
  // ── 天気 ──
  {
    id: 'chart-weather-correlation',
    label: '天気-売上 相関分析',
    group: '外部データ',
    size: 'full',
    render: (ctx) => (
      <WeatherWidget
        weatherDaily={ctx.weatherDaily}
        selectedStoreIds={ctx.selectedStoreIds}
        stores={ctx.stores}
        comparisonScope={ctx.comparisonScope}
        year={ctx.year}
        month={ctx.month}
        result={ctx.result}
      />
    ),
  },
  // chart-etrn-test: Sprint 3 で retirement（デバッグ用途のため廃止）
]
