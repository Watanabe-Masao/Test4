/**
 * CostDetailPage ウィジェットレジストリ
 *
 * ADR-A-001 PR3b (2026-04-24): `CostDetailWidgetContext` 経由へ切替。
 * render / isVisible は `CostDetailWidgetContext`（costDetailData required）を受け取り、
 * `costDetailData` の null check は `costDetailWidget` helper に集約。
 * PR4 で `UnifiedWidgetContext.costDetailData?` が物理削除される際、helper のみ
 * 修正すれば widget 定義本体は影響を受けない。
 *
 * @responsibility R:unclassified
 */
import type { ReactNode } from 'react'
import type { UnifiedWidgetDef, WidgetSize } from '@/presentation/components/widgets'
import type { ViewType } from '@/domain/models/storeTypes'
import type { CostDetailWidgetContext } from '@/presentation/pages/CostDetail/CostDetailWidgetContext'
import { CostDetailKpiSummaryWidget } from './CostDetailKpiSummaryWidget'
import { PurchaseTab } from './PurchaseTab'
import { TransferTab } from './TransferTab'
import { CostInclusionTab } from './CostInclusionTab'

/**
 * CostDetail 専用 widget 定義 helper。
 * UnifiedWidgetContext.costDetailData は optional（PR4 で削除）だが、
 * CostDetailPage では useUnifiedWidgetContext が必ず populate するため
 * render / isVisible には CostDetailWidgetContext (costDetailData required) を渡す。
 */
function costDetailWidget(def: {
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: CostDetailWidgetContext) => ReactNode
  readonly isVisible?: (ctx: CostDetailWidgetContext) => boolean
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}): UnifiedWidgetDef {
  return {
    id: def.id,
    label: def.label,
    group: def.group,
    size: def.size,
    linkTo: def.linkTo,
    render: (ctx) => {
      const narrowed = ctx as unknown as CostDetailWidgetContext
      if (!narrowed.costDetailData) return null
      return def.render(narrowed)
    },
    isVisible: (ctx) => {
      const narrowed = ctx as unknown as CostDetailWidgetContext
      if (!narrowed.costDetailData) return false
      return def.isVisible ? def.isVisible(narrowed) : true
    },
  }
}

export const COST_DETAIL_WIDGETS: readonly UnifiedWidgetDef[] = [
  costDetailWidget({
    /** @widget-id WID-040 */
    id: 'costdetail-kpi-summary',
    label: 'サマリーKPI',
    group: '原価明細',
    size: 'full',
    render: (ctx) => (
      <CostDetailKpiSummaryWidget
        costDetailData={ctx.costDetailData}
        fmtCurrency={ctx.fmtCurrency}
        onExplain={ctx.onExplain}
      />
    ),
  }),
  costDetailWidget({
    /** @widget-id WID-041 */
    id: 'costdetail-purchase',
    label: '仕入明細',
    group: '原価明細',
    size: 'full',
    render: (ctx) => <PurchaseTab d={ctx.costDetailData} />,
  }),
  costDetailWidget({
    /** @widget-id WID-042 */
    id: 'costdetail-transfer',
    label: '移動明細',
    group: '原価明細',
    size: 'full',
    render: (ctx) => <TransferTab d={ctx.costDetailData} />,
  }),
  costDetailWidget({
    /** @widget-id WID-043 */
    id: 'costdetail-cost-inclusion',
    label: '消耗品明細',
    group: '原価明細',
    size: 'full',
    render: (ctx) => <CostInclusionTab d={ctx.costDetailData} onExplain={ctx.onExplain} />,
  }),
]

export const DEFAULT_COST_DETAIL_WIDGET_IDS = [
  // 仕入明細
  'costdetail-purchase',
  'costdetail-transfer',
  'costdetail-cost-inclusion',
]
