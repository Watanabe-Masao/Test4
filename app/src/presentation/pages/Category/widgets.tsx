/**
 * CategoryPage ウィジェットレジストリ
 *
 * カテゴリ分析ページのビューをウィジェットとして定義。
 */
import type { WidgetDef, PageWidgetConfig } from '@/presentation/components/widgets'
import type { StoreResult, Store, MetricId, AppSettings } from '@/domain/models'
import { CategoryTotalView } from './CategoryTotalView'
import { CategoryComparisonView } from './CategoryComparisonView'

export interface CategoryWidgetContext {
  readonly r: StoreResult
  readonly selectedResults: readonly StoreResult[]
  readonly stores: ReadonlyMap<string, Store>
  readonly storeNames: ReadonlyMap<string, string>
  readonly settings: AppSettings
  readonly onExplain: (metricId: MetricId) => void
  readonly onCustomCategoryChange: (supplierCode: string, value: string) => void
  readonly hasMultipleStores: boolean
}

const CATEGORY_WIDGETS: readonly WidgetDef<CategoryWidgetContext>[] = [
  {
    id: 'category-total-view',
    label: 'カテゴリ合計分析',
    group: 'カテゴリ分析',
    size: 'full',
    render: (ctx) => (
      <CategoryTotalView
        r={ctx.r}
        selectedResults={ctx.selectedResults}
        stores={ctx.stores}
        settings={ctx.settings}
        onExplain={ctx.onExplain}
        onCustomCategoryChange={ctx.onCustomCategoryChange}
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
        selectedResults={ctx.selectedResults as StoreResult[]}
        storeNames={ctx.storeNames as Map<string, string>}
      />
    ),
    isVisible: (ctx) => ctx.hasMultipleStores,
  },
]

const DEFAULT_CATEGORY_WIDGET_IDS = ['category-total-view', 'category-comparison-view']

export const CATEGORY_WIDGET_CONFIG: PageWidgetConfig<CategoryWidgetContext> = {
  pageKey: 'category',
  registry: CATEGORY_WIDGETS,
  defaultWidgetIds: DEFAULT_CATEGORY_WIDGET_IDS,
  settingsTitle: 'カテゴリ分析のカスタマイズ',
}
