import {
  DuckDBDowPatternChart,
  DuckDBHourlyProfileChart,
  DuckDBCategoryTrendChart,
  DuckDBCategoryHourlyChart,
  DuckDBCategoryMixChart,
  DuckDBCategoryBenchmarkChart,
  DuckDBCategoryBoxPlotChart,
  DuckDBPiCvBubbleChart,
  DuckDBCvTimeSeriesChart,
} from '@/presentation/components/charts'
import type { WidgetDef } from './types'

// ── DuckDB Phase 2: グループB — 新規分析ウィジェット ──
export const WIDGETS_DUCKDB: readonly WidgetDef[] = [
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
        currentDateRange={ctx.currentDateRange}
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
        currentDateRange={ctx.currentDateRange}
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
        currentDateRange={ctx.currentDateRange}
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
        currentDateRange={ctx.currentDateRange}
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
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-category-benchmark',
    label: 'カテゴリベンチマーク（DuckDB）',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DuckDBCategoryBenchmarkChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-category-boxplot',
    label: 'カテゴリ箱ひげ図（DuckDB）',
    group: 'トレンド分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DuckDBCategoryBoxPlotChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-pi-cv-map',
    label: 'PI-CVマップ（DuckDB）',
    group: '構造分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DuckDBPiCvBubbleChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
  {
    id: 'duckdb-cv-timeseries',
    label: 'CV時系列分析（DuckDB）',
    group: '構造分析',
    size: 'full',
    isVisible: (ctx) => ctx.duckDataVersion > 0,
    render: (ctx) => (
      <DuckDBCvTimeSeriesChart
        duckConn={ctx.duckConn}
        duckDataVersion={ctx.duckDataVersion}
        currentDateRange={ctx.currentDateRange}
        selectedStoreIds={ctx.selectedStoreIds}
      />
    ),
  },
]
