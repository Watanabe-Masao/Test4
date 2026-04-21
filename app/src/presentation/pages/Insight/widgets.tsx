/**
 * InsightPage ウィジェットレジストリ
 *
 * インサイトページの各タブコンテンツをウィジェットとして定義。
 * UnifiedWidgetContext を使い、全ページから利用可能。
 */
import type { WidgetDef } from '@/presentation/components/widgets'
import { PiCvBubbleChart } from '@/presentation/components/charts'
import { BudgetTabContent, GrossProfitTabContent } from './InsightTabBudget'
import { ForecastTabContent, DecompositionTabContent } from './InsightTabForecast'
import { BudgetSimulatorWidget } from '@/features/budget'

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
    id: 'insight-budget-simulator',
    label: '予算達成シミュレーター',
    group: 'インサイト',
    size: 'full',
    // UnifiedWidgetContext の必須フィールド (result / year / month / prevYear /
    // fmtCurrency / onExplain) のみで動作するため、InsightPage 以外
    // (Dashboard 等) でも利用可能。
    render: (ctx) => {
      if (!ctx.result) return null
      return <BudgetSimulatorWidget ctx={ctx} />
    },
    isVisible: (ctx) => ctx.result != null,
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
  {
    id: 'insight-pi-cv-map',
    label: 'カテゴリベンチマーク',
    group: '構造分析',
    size: 'full',
    isVisible: (ctx) => ctx.queryExecutor?.isReady === true,
    render: (ctx) => {
      if (!ctx.queryExecutor || !ctx.currentDateRange) return null
      return (
        <PiCvBubbleChart
          queryExecutor={ctx.queryExecutor}
          currentDateRange={ctx.currentDateRange}
          selectedStoreIds={ctx.selectedStoreIds}
        />
      )
    },
  },
]

export const DEFAULT_INSIGHT_WIDGET_IDS = [
  // 損益構造・粗利分析
  'insight-gross-profit',
  'analysis-waterfall',
  'analysis-gp-heatmap',
  // 売変分析
  'chart-discount-breakdown',
  // 要因分解
  'insight-decomposition',
  'analysis-causal-chain',
  // 構造分析（L3）
  'insight-pi-cv-map',
]
