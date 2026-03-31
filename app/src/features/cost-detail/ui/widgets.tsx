/**
 * CostDetailPage ウィジェットレジストリ
 *
 * 原価明細ページの KPI とタブコンテンツをウィジェット化。
 * UnifiedWidgetContext を使い、全ページから利用可能。
 */
import { KpiCard, KpiGrid } from '@/presentation/components/common/tables'
import { formatPercent } from '@/domain/formatting'
import { palette } from '@/presentation/theme/tokens'
import type { WidgetDef } from '@/presentation/components/widgets'
import { PurchaseTab } from './PurchaseTab'
import { TransferTab } from './TransferTab'
import { CostInclusionTab } from './CostInclusionTab'

export const COST_DETAIL_WIDGETS: readonly WidgetDef[] = [
  {
    id: 'costdetail-kpi-summary',
    label: 'サマリーKPI',
    group: '原価明細',
    size: 'full',
    render: (ctx) => {
      const d = ctx.costDetailData
      const { fmtCurrency } = ctx
      if (!d?.typeIn || !d?.typeOut) return null
      return (
        <KpiGrid>
          <KpiCard
            label={`${d.typeLabel}入`}
            value={fmtCurrency(d.typeIn.cost)}
            subText={`売価: ${fmtCurrency(d.typeIn.price)}`}
            accent={palette.blueDark}
          />
          <KpiCard
            label={`${d.typeLabel}出`}
            value={fmtCurrency(d.typeOut.cost)}
            subText={`売価: ${fmtCurrency(d.typeOut.price)}`}
            accent={palette.dangerDark}
          />
          <KpiCard
            label="原価算入費合計"
            value={fmtCurrency(d.totalCostInclusionAmount)}
            accent={palette.orange}
            onClick={() => ctx.onExplain('totalCostInclusion')}
          />
          <KpiCard
            label="原価算入率"
            value={formatPercent(d.costInclusionRate)}
            subText={`売上高: ${fmtCurrency(d.totalSales)}`}
            accent={palette.orangeDark}
            onClick={() => ctx.onExplain('totalCostInclusion')}
          />
        </KpiGrid>
      )
    },
    isVisible: (ctx) => ctx.costDetailData != null,
  },
  {
    id: 'costdetail-purchase',
    label: '仕入明細',
    group: '原価明細',
    size: 'full',
    render: (ctx) => {
      if (!ctx.costDetailData) return null
      return <PurchaseTab d={ctx.costDetailData} />
    },
    isVisible: (ctx) => ctx.costDetailData != null,
  },
  {
    id: 'costdetail-transfer',
    label: '移動明細',
    group: '原価明細',
    size: 'full',
    render: (ctx) => {
      if (!ctx.costDetailData) return null
      return <TransferTab d={ctx.costDetailData} />
    },
    isVisible: (ctx) => ctx.costDetailData != null,
  },
  {
    id: 'costdetail-cost-inclusion',
    label: '消耗品明細',
    group: '原価明細',
    size: 'full',
    render: (ctx) => {
      if (!ctx.costDetailData) return null
      return <CostInclusionTab d={ctx.costDetailData} onExplain={ctx.onExplain} />
    },
    isVisible: (ctx) => ctx.costDetailData != null,
  },
]

export const DEFAULT_COST_DETAIL_WIDGET_IDS = [
  // 仕入明細
  'costdetail-purchase',
  'costdetail-transfer',
  'costdetail-cost-inclusion',
]
