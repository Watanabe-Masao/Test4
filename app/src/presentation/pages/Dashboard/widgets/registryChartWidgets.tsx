import {
  IntegratedSalesChart,
  GrossProfitAmountChart,
  SalesPurchaseComparisonChart,
} from '@/presentation/components/charts'
import { fromDateKey } from '@/domain/models/CalendarDate'
import type { DashboardWidgetDef } from './types'
import type { DashboardWidgetContext } from './DashboardWidgetContext'
import { UnifiedHeatmapWidget, UnifiedStoreHourlyWidget } from './UnifiedAnalyticsWidgets'
import { isTimeSeriesVisible, isStoreComparisonVisible } from './widgetVisibility'
import { WeatherWidget } from './WeatherWidget'
// EtrnTestWidget: Sprint 3 で retirement（ctx 非経由のデバッグ用途。廃止）

/**
 * 前年の日別近似原価マップを構築する。
 * 前年は日別仕入原価を持たないため、売上-売変で近似する。
 * 正確な値ではないが傾向比較には有用。
 */
function buildPrevYearCostMap(
  ctx: DashboardWidgetContext,
): ReadonlyMap<number, number> | undefined {
  const { prevYear } = ctx
  if (!prevYear.hasPrevYear || prevYear.totalSales <= 0) return undefined
  const costMap = new Map<number, number>()
  for (const [dateKey, entry] of prevYear.daily) {
    const day = fromDateKey(dateKey).day
    costMap.set(day, entry.sales > 0 ? entry.sales - entry.discount : 0)
  }
  return costMap
}

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
        widgetCtx={ctx}
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
        prevYearCostMap={buildPrevYearCostMap(ctx)}
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
    render: (ctx) => <UnifiedHeatmapWidget ctx={ctx} />,
  },
  // 注: 部門別時間帯パターン → IntegratedSalesChart の孫に統合（ドリル時に包含表示）
  {
    id: 'chart-store-timeslot-comparison',
    label: '店舗別時間帯比較',
    group: '構造分析',
    size: 'full',
    isVisible: isStoreComparisonVisible,
    render: (ctx) => <UnifiedStoreHourlyWidget ctx={ctx} />,
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
    render: (ctx) => <WeatherWidget ctx={ctx} />,
  },
  // chart-etrn-test: Sprint 3 で retirement（デバッグ用途のため廃止）
]
