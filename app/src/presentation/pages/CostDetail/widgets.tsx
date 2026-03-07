/**
 * CostDetailPage ウィジェットレジストリ
 *
 * 原価明細ページの KPI とタブコンテンツをウィジェット化。
 */
import { KpiCard, KpiGrid } from '@/presentation/components/common'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { palette } from '@/presentation/theme/tokens'
import type { WidgetDef, PageWidgetConfig } from '@/presentation/components/widgets'
import type { MetricId } from '@/domain/models'
import type { CostDetailData } from './useCostDetailData'
import { PurchaseTab } from './PurchaseTab'
import { TransferTab } from './TransferTab'
import { CostInclusionTab } from './CostInclusionTab'

export interface CostDetailWidgetContext {
  readonly d: CostDetailData
  readonly onExplain: (metricId: MetricId) => void
}

const COST_DETAIL_WIDGETS: readonly WidgetDef<CostDetailWidgetContext>[] = [
  {
    id: 'costdetail-kpi-summary',
    label: 'サマリーKPI',
    group: 'KPI',
    size: 'full',
    render: (ctx) => {
      const { d, onExplain } = ctx
      if (!d.typeIn || !d.typeOut) return null
      return (
        <KpiGrid>
          <KpiCard
            label={`${d.typeLabel}入`}
            value={formatCurrency(d.typeIn.cost)}
            subText={`売価: ${formatCurrency(d.typeIn.price)}`}
            accent={palette.blueDark}
          />
          <KpiCard
            label={`${d.typeLabel}出`}
            value={formatCurrency(d.typeOut.cost)}
            subText={`売価: ${formatCurrency(d.typeOut.price)}`}
            accent={palette.dangerDark}
          />
          <KpiCard
            label="原価算入費合計"
            value={formatCurrency(d.totalCostInclusionAmount)}
            accent={palette.orange}
            onClick={() => onExplain('totalCostInclusion')}
          />
          <KpiCard
            label="原価算入率"
            value={formatPercent(d.costInclusionRate)}
            subText={`売上高: ${formatCurrency(d.totalSales)}`}
            accent={palette.orangeDark}
            onClick={() => onExplain('totalCostInclusion')}
          />
        </KpiGrid>
      )
    },
  },
  {
    id: 'costdetail-purchase',
    label: '仕入明細',
    group: '明細タブ',
    size: 'full',
    render: (ctx) => <PurchaseTab d={ctx.d} />,
  },
  {
    id: 'costdetail-transfer',
    label: '移動明細',
    group: '明細タブ',
    size: 'full',
    render: (ctx) => <TransferTab d={ctx.d} />,
  },
  {
    id: 'costdetail-cost-inclusion',
    label: '消耗品明細',
    group: '明細タブ',
    size: 'full',
    render: (ctx) => <CostInclusionTab d={ctx.d} onExplain={ctx.onExplain} />,
  },
]

const DEFAULT_COST_DETAIL_WIDGET_IDS = [
  'costdetail-kpi-summary',
  'costdetail-purchase',
  'costdetail-transfer',
  'costdetail-cost-inclusion',
]

export const COST_DETAIL_WIDGET_CONFIG: PageWidgetConfig<CostDetailWidgetContext> = {
  pageKey: 'costDetail',
  registry: COST_DETAIL_WIDGETS,
  defaultWidgetIds: DEFAULT_COST_DETAIL_WIDGET_IDS,
  settingsTitle: '原価明細のカスタマイズ',
}
