import {
  DowPatternChart,
  HourlyProfileChart,
  CategoryTrendChart,
  CategoryHourlyChart,
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
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DowPatternChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-hourly-profile',
    label: '時間帯プロファイル',
    group: 'トレンド分析',
    size: 'half',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <HourlyProfileChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
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
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <CategoryTrendChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-category-hourly',
    label: 'カテゴリ×時間帯',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <CategoryHourlyChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-category-mix',
    label: 'カテゴリ構成比推移',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0 && ctx.duckLoadedMonthCount >= 2,
    render: (ctx) => (
      <CategoryMixChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
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
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <CategoryBenchmarkChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
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
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <CategoryBoxPlotChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
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
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <CvTimeSeriesChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
]
