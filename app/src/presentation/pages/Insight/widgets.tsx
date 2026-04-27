/**
 * InsightPage ウィジェットレジストリ
 *
 * ADR-A-001 PR3a (2026-04-24): `InsightWidgetContext` 経由へ切替。
 * render / isVisible は `InsightWidgetContext`（insightData required）を受け取り、
 * `insightData` の null check は `insightWidget` helper に集約。
 * PR4 で `UnifiedWidgetContext.insightData?` が物理削除される際、helper のみ
 * 修正すれば widget 定義本体は影響を受けない。
 *
 * @responsibility R:unclassified
 */
import type { ReactNode } from 'react'
import type { UnifiedWidgetDef, WidgetSize } from '@/presentation/components/widgets'
import type { ViewType } from '@/domain/models/storeTypes'
import { PiCvBubbleChart } from '@/presentation/components/charts'
import type { InsightWidgetContext } from '@/presentation/pages/Insight/InsightWidgetContext'
import { BudgetTabContent, GrossProfitTabContent } from './InsightTabBudget'
import { ForecastTabContent, DecompositionTabContent } from './InsightTabForecast'
import { BudgetSimulatorWidget } from '@/features/budget'

/**
 * Insight 専用 widget 定義 helper。
 * UnifiedWidgetContext.insightData は optional（PR4 で削除）だが、
 * InsightPage では useUnifiedWidgetContext が必ず populate するため
 * render / isVisible には InsightWidgetContext (insightData required) を渡す。
 * insightData 未設定時は fail-safe で null / false を返す。
 */
function insightWidget(def: {
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: InsightWidgetContext) => ReactNode
  readonly isVisible?: (ctx: InsightWidgetContext) => boolean
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}): UnifiedWidgetDef {
  return {
    id: def.id,
    label: def.label,
    group: def.group,
    size: def.size,
    linkTo: def.linkTo,
    render: (ctx) => {
      const narrowed = ctx as unknown as InsightWidgetContext
      if (!narrowed.insightData) return null
      return def.render(narrowed)
    },
    isVisible: (ctx) => {
      const narrowed = ctx as unknown as InsightWidgetContext
      if (!narrowed.insightData) return false
      return def.isVisible ? def.isVisible(narrowed) : true
    },
  }
}

export const INSIGHT_WIDGETS: readonly UnifiedWidgetDef[] = [
  insightWidget({
    id: 'insight-budget',
    label: '予算と実績',
    group: 'インサイト',
    size: 'full',
    render: (ctx) => (
      <BudgetTabContent d={ctx.insightData} r={ctx.result} onExplain={ctx.onExplain} />
    ),
  }),
  {
    /** @widget-id WID-033 */
    id: 'insight-budget-simulator',
    label: '予算達成シミュレーター',
    group: 'インサイト',
    size: 'full',
    // RenderUnifiedWidgetContext の必須フィールド (result / year / month / prevYear /
    // fmtCurrency / onExplain) のみで動作するため、InsightPage 以外
    // (Dashboard 等) でも利用可能。insightData 不要 → 直接 UnifiedWidgetDef として定義。
    //
    // ADR-A-004 PR3 (2026-04-25): dispatch chokepoint で narrow 済のため
    // `ctx.result` の null check は不要（型レベルで required）。LEG-007 sunset。
    render: (ctx) => <BudgetSimulatorWidget ctx={ctx} />,
  },
  insightWidget({
    id: 'insight-gross-profit',
    label: '損益構造',
    group: 'インサイト',
    size: 'full',
    render: (ctx) => (
      <GrossProfitTabContent d={ctx.insightData} r={ctx.result} onExplain={ctx.onExplain} />
    ),
  }),
  insightWidget({
    id: 'insight-forecast',
    label: '予測・パターン',
    group: 'インサイト',
    size: 'full',
    render: (ctx) => (
      <ForecastTabContent d={ctx.insightData} r={ctx.result} onExplain={ctx.onExplain} />
    ),
    isVisible: (ctx) => ctx.insightData.forecastData != null,
  }),
  insightWidget({
    id: 'insight-decomposition',
    label: '売上要因分解',
    group: 'インサイト',
    size: 'full',
    render: (ctx) => <DecompositionTabContent d={ctx.insightData} />,
    isVisible: (ctx) =>
      ctx.insightData.customerData != null && ctx.insightData.forecastData != null,
  }),
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
