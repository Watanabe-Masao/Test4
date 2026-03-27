import {
  DowPatternChart,
  CategoryTrendChart,
  CategoryMixChart,
  CategoryBenchmarkChart,
  CategoryBoxPlotChart,
  CvTimeSeriesChart,
} from '@/presentation/components/charts'
import type { WidgetDef } from './types'

// ── 分析ウィジェット（DuckDB データ供給） ──
export const WIDGETS_DUCKDB: readonly WidgetDef[] = [
  {
    id: 'duckdb-dow-pattern',
    label: '曜日パターン分析',
    group: 'トレンド分析',
    size: 'half',
    isVisible: (ctx) => ctx.queryExecutor?.isReady === true,
    render: (ctx) => (
      <DowPatternChart
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-category-trend',
    label: 'カテゴリ別売上推移',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.queryExecutor?.isReady === true,
    render: (ctx) => (
      <CategoryTrendChart
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
        prevYearScope={ctx.prevYearScope}
      />
    ),
  },
  // 注: duckdb-category-hourly（カテゴリ×時間帯）→ TimeSlotChart 部門別モードに統合
  {
    id: 'duckdb-category-mix',
    label: 'カテゴリ構成比推移',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.queryExecutor?.isReady === true && ctx.loadedMonthCount >= 2,
    render: (ctx) => (
      <CategoryMixChart
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-category-benchmark',
    label: 'カテゴリベンチマーク',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.queryExecutor?.isReady === true,
    render: (ctx) => (
      <CategoryBenchmarkChart
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-category-boxplot',
    label: 'カテゴリ箱ひげ図',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.queryExecutor?.isReady === true,
    render: (ctx) => (
      <CategoryBoxPlotChart
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  // PI-CVマップ → Insight ページに移動（L3 分析向け）
  {
    id: 'duckdb-cv-timeseries',
    label: 'CV時系列分析',
    group: '構造分析',
    size: 'full',
    isVisible: (ctx) => ctx.queryExecutor?.isReady === true,
    render: (ctx) => (
      <CvTimeSeriesChart
        queryExecutor={ctx.queryExecutor}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
]
