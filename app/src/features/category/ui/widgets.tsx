/**
 * CategoryPage ウィジェットレジストリ
 *
 * カテゴリ分析ページのビューをウィジェットとして定義。
 * UnifiedWidgetContext を使い、全ページから利用可能。
 */
import type { StoreResult } from '@/domain/models/storeTypes'
import type { WidgetDef } from '@/presentation/components/widgets'
import { CategoryTotalView } from './CategoryTotalView'
import { CategoryComparisonView } from './CategoryComparisonView'

export const CATEGORY_WIDGETS: readonly WidgetDef[] = [
  {
    id: 'category-total-view',
    label: 'カテゴリ合計分析',
    group: 'カテゴリ分析',
    size: 'full',
    render: (ctx) => (
      <CategoryTotalView
        r={ctx.result}
        selectedResults={ctx.selectedResults ?? []}
        stores={ctx.stores}
        settings={ctx.settings}
        onExplain={ctx.onExplain}
        onCustomCategoryChange={ctx.onCustomCategoryChange ?? (() => {})}
      />
    ),
  },
  {
    id: 'category-comparison-view',
    label: '店舗間比較',
    group: 'カテゴリ分析',
    size: 'full',
    render: (ctx) => (
      <CategoryComparisonView
        selectedResults={(ctx.selectedResults ?? []) as StoreResult[]}
        storeNames={(ctx.storeNames ?? new Map()) as Map<string, string>}
      />
    ),
    isVisible: (ctx) => (ctx.selectedResults?.length ?? 0) > 1,
  },
]

export const DEFAULT_CATEGORY_WIDGET_IDS = [
  'category-total-view',
  'category-comparison-view',
  // カテゴリ構造分析
  'chart-category-pie',
  'chart-category-hierarchy-explorer',
  'analysis-category-pi',
  // DuckDB カテゴリ分析
  'duckdb-category-trend',
  'duckdb-category-hourly',
  'duckdb-category-mix',
  'duckdb-category-benchmark',
  'duckdb-category-boxplot',
]
