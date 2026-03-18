import {
  DailySalesChart,
  CategoryRankingCard,
  GrossProfitAmountChart,
  DiscountTrendChart,
  CategoryHierarchyExplorer,
  SalesPurchaseComparisonChart,
} from '@/presentation/components/charts'
import { fromDateKey } from '@/domain/models/CalendarDate'
import type { WidgetDef } from './types'
import {
  UnifiedTimeSlotWidget,
  UnifiedHeatmapWidget,
  UnifiedDeptHourlyWidget,
  UnifiedStoreHourlyWidget,
} from './UnifiedAnalyticsWidgets'
import { isTimeSeriesVisible, isStoreComparisonVisible } from './widgetVisibility'
import { WeatherWidget } from './WeatherWidget'
import { EtrnTestWidget } from './EtrnTestWidget'

// ── トレンド分析: 日次 ──
export const WIDGETS_CHART: readonly WidgetDef[] = [
  {
    id: 'chart-daily-sales',
    label: '日別売上チャート',
    group: 'トレンド分析',
    size: 'full',
    linkTo: { view: 'daily' },
    render: ({ result: r, daysInMonth, prevYear, year, month }) => (
      <DailySalesChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        year={year}
        month={month}
        prevYearDaily={prevYear.hasPrevYear ? prevYear.daily : undefined}
        budgetDaily={r.budgetDaily}
      />
    ),
  },
  // 注: 予算vs実績チャート → DailySalesChart「累計推移」ビューに統合
  {
    id: 'chart-category-pie',
    label: 'カテゴリ偏り',
    group: '収益概況',
    size: 'half',
    linkTo: { view: 'category' },
    render: ({ result: r }) => <CategoryRankingCard categoryTotals={r.categoryTotals} />,
  },
  {
    id: 'chart-gross-profit-amount',
    label: '粗利推移チャート',
    group: '収益概況',
    size: 'full',
    linkTo: { view: 'insight', tab: 'grossProfit' },
    render: ({ result: r, daysInMonth, targetRate, warningRate, prevYear, year, month }) => {
      // 前年仕入コストマップの構築（前年粗利率ライン表示用）
      // 注: prevYear.daily は classifiedSales 由来。仕入コストは個別に持っていないため
      // 「前年売変データから近似」する。正確な前年粗利率は在庫データが必要。
      // ここでは前年売変率で近似的に原価を推定する
      let prevYearCostMap: ReadonlyMap<number, number> | undefined
      if (prevYear.hasPrevYear && prevYear.totalSales > 0) {
        const costMap = new Map<number, number>()
        for (const [dateKey, entry] of prevYear.daily) {
          // 前年は日別仕入原価を持たないため、売上-売変で近似
          // これは粗売上≈売上+売変として、原価≈売上×(1-値入率) の近似
          // 正確な値ではないが傾向比較には有用
          const day = fromDateKey(dateKey).day
          costMap.set(day, entry.sales > 0 ? entry.sales - entry.discount : 0)
        }
        prevYearCostMap = costMap
      }
      return (
        <GrossProfitAmountChart
          daily={r.daily}
          daysInMonth={daysInMonth}
          year={year}
          month={month}
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
    render: ({ result: r, daysInMonth, year, month, prevYear }) => (
      <DiscountTrendChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        year={year}
        month={month}
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
    linkTo: { view: 'category' },
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <CategoryHierarchyExplorer
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        prevYearScope={ctx.prevYearScope}
        selectedStoreIds={ctx.selectedStoreIds}
        totalCustomers={ctx.result.totalCustomers}
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
  // ── 天気 ──
  {
    id: 'chart-weather-correlation',
    label: '天気-売上 相関分析',
    group: '外部データ',
    size: 'full',
    render: (ctx) => <WeatherWidget ctx={ctx} />,
  },
  {
    id: 'chart-etrn-test',
    label: 'ETRN 取得テスト',
    group: '外部データ',
    size: 'full',
    render: (ctx) => <EtrnTestWidget ctx={ctx} />,
  },
]
