/**
 * InsightPage ウィジェットレジストリ
 *
 * インサイトページの各タブコンテンツをウィジェットとして定義。
 */
import type { WidgetDef, PageWidgetConfig } from '@/presentation/components/widgets'
import type { InsightData } from './useInsightData'
import type { StoreResult, MetricId } from '@/domain/models'
import { BudgetTabContent, GrossProfitTabContent } from './InsightTabBudget'
import { ForecastTabContent, DecompositionTabContent } from './InsightTabForecast'

export interface InsightWidgetContext {
  readonly d: InsightData
  readonly r: StoreResult
  readonly onExplain: (metricId: MetricId) => void
}

const INSIGHT_WIDGETS: readonly WidgetDef<InsightWidgetContext>[] = [
  {
    id: 'insight-budget',
    label: '予算と実績',
    group: '分析タブ',
    size: 'full',
    render: (ctx) => <BudgetTabContent d={ctx.d} r={ctx.r} onExplain={ctx.onExplain} />,
  },
  {
    id: 'insight-gross-profit',
    label: '損益構造',
    group: '分析タブ',
    size: 'full',
    render: (ctx) => <GrossProfitTabContent d={ctx.d} r={ctx.r} onExplain={ctx.onExplain} />,
  },
  {
    id: 'insight-forecast',
    label: '予測・パターン',
    group: '分析タブ',
    size: 'full',
    render: (ctx) =>
      ctx.d.forecastData ? (
        <ForecastTabContent d={ctx.d} r={ctx.r} onExplain={ctx.onExplain} />
      ) : null,
    isVisible: (ctx) => ctx.d.forecastData != null,
  },
  {
    id: 'insight-decomposition',
    label: '売上要因分解',
    group: '分析タブ',
    size: 'full',
    render: (ctx) =>
      ctx.d.customerData && ctx.d.forecastData ? <DecompositionTabContent d={ctx.d} /> : null,
    isVisible: (ctx) => ctx.d.customerData != null && ctx.d.forecastData != null,
  },
]

const DEFAULT_INSIGHT_WIDGET_IDS = [
  'insight-budget',
  'insight-gross-profit',
  'insight-forecast',
  'insight-decomposition',
]

export const INSIGHT_WIDGET_CONFIG: PageWidgetConfig<InsightWidgetContext> = {
  pageKey: 'insight',
  registry: INSIGHT_WIDGETS,
  defaultWidgetIds: DEFAULT_INSIGHT_WIDGET_IDS,
  settingsTitle: 'インサイトのカスタマイズ',
}
