/**
 * CostDetailKpiSummaryWidget — 原価明細サマリーKPI ウィジェット
 *
 * SP-B ADR-B-004 PR2 で `CostDetail/widgets.tsx` 内 inline JSX (4 KpiCard +
 * 4 palette 色 + 2 onExplain hardcode) を本 component に抽出（WID-040 対応）。
 *
 * registry 行は `<CostDetailKpiSummaryWidget data={ctx.costDetailData} ... />` のみで、
 * design decision (色) と JSX 構造 (4 KpiCard) は本 component に閉じ込める。
 *
 * ## 参照
 *
 * - projects/widget-registry-simplification/plan.md §ADR-B-004
 * - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-B-004
 *
 * @responsibility R:widget
 */

import { memo } from 'react'
import { KpiCard, KpiGrid } from '@/presentation/components/common/tables'
import { formatPercent } from '@/domain/formatting'
import { palette } from '@/presentation/theme/tokens'
import type { CostDetailWidgetContext } from '@/presentation/pages/CostDetail/CostDetailWidgetContext'

/**
 * KpiCard accent 色 (semantic):
 * - typeIn  → blueDark   (income / 入)
 * - typeOut → dangerDark (outcome / 出)
 * - totalCostInclusion / costInclusionRate → orange / orangeDark (利益直接影響)
 *
 * これらは原価明細 KPI の意味上の彩色決定であり、registry 層ではなく本 component
 * に閉じ込める（design decision 漏れ防止、ADR-B-004 趣旨）。
 */
const ACCENT = {
  typeIn: palette.blueDark,
  typeOut: palette.dangerDark,
  costInclusionTotal: palette.orange,
  costInclusionRate: palette.orangeDark,
} as const

/**
 * onExplain で渡す MetricId. 原価明細では `totalCostInclusion` のみ explain 対象
 */
const COST_INCLUSION_METRIC_ID = 'totalCostInclusion' as const

export type CostDetailKpiSummaryProps = Pick<
  CostDetailWidgetContext,
  'costDetailData' | 'fmtCurrency' | 'onExplain'
>

export const CostDetailKpiSummaryWidget = memo(function CostDetailKpiSummaryWidget({
  costDetailData,
  fmtCurrency,
  onExplain,
}: CostDetailKpiSummaryProps) {
  const d = costDetailData
  if (!d.typeIn || !d.typeOut) return null
  return (
    <KpiGrid>
      <KpiCard
        label={`${d.typeLabel}入`}
        value={fmtCurrency(d.typeIn.cost)}
        subText={`売価: ${fmtCurrency(d.typeIn.price)}`}
        accent={ACCENT.typeIn}
      />
      <KpiCard
        label={`${d.typeLabel}出`}
        value={fmtCurrency(d.typeOut.cost)}
        subText={`売価: ${fmtCurrency(d.typeOut.price)}`}
        accent={ACCENT.typeOut}
      />
      <KpiCard
        label="原価算入費合計"
        value={fmtCurrency(d.totalCostInclusionAmount)}
        accent={ACCENT.costInclusionTotal}
        onClick={() => onExplain(COST_INCLUSION_METRIC_ID)}
      />
      <KpiCard
        label="原価算入率"
        value={formatPercent(d.costInclusionRate)}
        subText={`売上高: ${fmtCurrency(d.totalSales)}`}
        accent={ACCENT.costInclusionRate}
        onClick={() => onExplain(COST_INCLUSION_METRIC_ID)}
      />
    </KpiGrid>
  )
})
