/**
 * InsightPage ウィジェットレジストリ
 *
 * インサイトページの各タブコンテンツをウィジェットとして定義。
 * UnifiedWidgetContext を使い、全ページから利用可能。
 */
import type { WidgetDef } from '@/presentation/components/widgets'
import { BudgetTabContent, GrossProfitTabContent } from './InsightTabBudget'
import { ForecastTabContent, DecompositionTabContent } from './InsightTabForecast'

export const INSIGHT_WIDGETS: readonly WidgetDef[] = [
  {
    id: 'insight-budget',
    label: '予算と実績',
    group: 'インサイト',
    size: 'full',
    render: (ctx) => {
      if (!ctx.insightData) return null
      return <BudgetTabContent d={ctx.insightData} r={ctx.result} onExplain={ctx.onExplain} />
    },
    isVisible: (ctx) => ctx.insightData != null,
  },
  {
    id: 'insight-gross-profit',
    label: '損益構造',
    group: 'インサイト',
    size: 'full',
    render: (ctx) => {
      if (!ctx.insightData) return null
      return <GrossProfitTabContent d={ctx.insightData} r={ctx.result} onExplain={ctx.onExplain} />
    },
    isVisible: (ctx) => ctx.insightData != null,
  },
  {
    id: 'insight-forecast',
    label: '予測・パターン',
    group: 'インサイト',
    size: 'full',
    render: (ctx) => {
      if (!ctx.insightData?.forecastData) return null
      return <ForecastTabContent d={ctx.insightData} r={ctx.result} onExplain={ctx.onExplain} />
    },
    isVisible: (ctx) => ctx.insightData?.forecastData != null,
  },
  {
    id: 'insight-decomposition',
    label: '売上要因分解',
    group: 'インサイト',
    size: 'full',
    render: (ctx) => {
      if (!ctx.insightData?.customerData || !ctx.insightData?.forecastData) return null
      return <DecompositionTabContent d={ctx.insightData} />
    },
    isVisible: (ctx) =>
      ctx.insightData?.customerData != null && ctx.insightData?.forecastData != null,
  },
]

export const DEFAULT_INSIGHT_WIDGET_IDS = [
  'insight-budget',
  'insight-gross-profit',
  'insight-forecast',
  'insight-decomposition',
]
