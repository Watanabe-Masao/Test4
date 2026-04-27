/**
 * CategoryPage ウィジェットレジストリ
 *
 * ADR-A-001 PR3c (2026-04-24): `CategoryWidgetContext` 経由へ切替。
 * render / isVisible は `CategoryWidgetContext`（selectedResults / storeNames /
 * onCustomCategoryChange が required）を受け取り、null check は
 * `categoryWidget` helper に集約。PR4 で UnifiedWidgetContext から 3 field を
 * 物理削除した後も widget 定義本体は変更不要。
 *
 * @responsibility R:unclassified
 */
import type { ReactNode } from 'react'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { UnifiedWidgetDef, WidgetSize } from '@/presentation/components/widgets'
import type { ViewType } from '@/domain/models/storeTypes'
import type { CategoryWidgetContext } from '@/presentation/pages/Category/CategoryWidgetContext'
import { CategoryTotalView } from './CategoryTotalView'
import { CategoryComparisonView } from './CategoryComparisonView'

/**
 * Category 専用 widget 定義 helper。
 * 3 page-local field (selectedResults / storeNames / onCustomCategoryChange) は
 * UnifiedWidgetContext では optional だが、CategoryPage では必ず populate される。
 * 欠損時は fail-safe で null / false を返す。
 */
function categoryWidget(def: {
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: CategoryWidgetContext) => ReactNode
  readonly isVisible?: (ctx: CategoryWidgetContext) => boolean
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}): UnifiedWidgetDef {
  const hasPageLocals = (ctx: CategoryWidgetContext): boolean =>
    ctx.selectedResults != null && ctx.storeNames != null && ctx.onCustomCategoryChange != null
  return {
    id: def.id,
    label: def.label,
    group: def.group,
    size: def.size,
    linkTo: def.linkTo,
    render: (ctx) => {
      const narrowed = ctx as unknown as CategoryWidgetContext
      if (!hasPageLocals(narrowed)) return null
      return def.render(narrowed)
    },
    isVisible: (ctx) => {
      const narrowed = ctx as unknown as CategoryWidgetContext
      if (!hasPageLocals(narrowed)) return false
      return def.isVisible ? def.isVisible(narrowed) : true
    },
  }
}

export const CATEGORY_WIDGETS: readonly UnifiedWidgetDef[] = [
  categoryWidget({
    id: 'category-total-view',
    label: 'カテゴリ合計分析',
    group: 'カテゴリ分析',
    size: 'full',
    render: (ctx) => (
      <CategoryTotalView
        r={ctx.result}
        selectedResults={ctx.selectedResults}
        stores={ctx.stores}
        settings={ctx.settings}
        onExplain={ctx.onExplain}
        onCustomCategoryChange={ctx.onCustomCategoryChange}
      />
    ),
  }),
  categoryWidget({
    id: 'category-comparison-view',
    label: '店舗間比較',
    group: 'カテゴリ分析',
    size: 'full',
    render: (ctx) => (
      <CategoryComparisonView
        selectedResults={ctx.selectedResults as StoreResult[]}
        storeNames={ctx.storeNames as Map<string, string>}
      />
    ),
    isVisible: (ctx) => ctx.selectedResults.length > 1,
  }),
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
