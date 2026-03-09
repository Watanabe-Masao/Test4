import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { KpiCard } from '@/presentation/components/common'
import { formatCurrency, formatPercent } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import type { WidgetDef, WidgetContext } from './types'
import { DowGapKpiCard } from './DowGapKpiCard'

/**
 * 期間連動値の取得ヘルパー。
 * periodMetrics がある（部分月）場合はそちらの値、なければ StoreResult の値を返す。
 */
function pv(ctx: WidgetContext, pmField: string, srField: string): number {
  const pm = ctx.periodMetrics
  if (pm && !ctx.isPeriodFullMonth) {
    return (pm as unknown as Record<string, number>)[pmField] ?? 0
  }
  return (ctx.result as unknown as Record<string, number>)[srField] ?? 0
}

// ── KPI: 収益概況 ──
export const WIDGETS_KPI: readonly WidgetDef[] = [
  {
    id: 'kpi-core-sales',
    label: 'コア売上',
    group: '収益概況',
    size: 'kpi',
    linkTo: { view: 'reports' },
    render: (ctx) => {
      const { prevYear, onExplain } = ctx
      const totalCoreSales = pv(ctx, 'totalCoreSales', 'totalCoreSales')
      const totalSales = pv(ctx, 'totalSales', 'totalSales')
      const flowersPrice = pv(ctx, 'totalFlowersPrice', 'flowerSalesPrice')
      const directProducePrice = pv(ctx, 'totalDirectProducePrice', 'directProduceSalesPrice')
      return (
        <KpiCard
          label="コア売上"
          value={formatCurrency(totalCoreSales)}
          subText={`総売上: ${formatCurrency(totalSales)} / 花: ${formatCurrency(flowersPrice)} / 産直: ${formatCurrency(directProducePrice)}`}
          accent={palette.purpleDark}
          onClick={() => onExplain('coreSales')}
          trend={
            prevYear.hasPrevYear && prevYear.totalSales > 0
              ? {
                  direction:
                    totalSales > prevYear.totalSales
                      ? 'up'
                      : totalSales < prevYear.totalSales
                        ? 'down'
                        : 'flat',
                  label: `前年比 ${formatPercent(totalSales / prevYear.totalSales)}`,
                }
              : undefined
          }
        />
      )
    },
  },
  {
    id: 'kpi-total-cost',
    label: '総仕入原価',
    group: '収益概況',
    size: 'kpi',
    render: (ctx) => {
      const totalCost = pv(ctx, 'totalCost', 'totalCost')
      const inventoryCost = pv(ctx, 'inventoryCost', 'inventoryCost')
      const deliverySalesCost = pv(ctx, 'deliverySalesCost', 'deliverySalesCost')
      return (
        <KpiCard
          label="総仕入原価"
          value={formatCurrency(totalCost)}
          subText={`在庫仕入: ${formatCurrency(inventoryCost)} / 納品: ${formatCurrency(deliverySalesCost)}`}
          accent={palette.orangeDark}
          onClick={() => ctx.onExplain('inventoryCost')}
        />
      )
    },
  },
  {
    id: 'kpi-inv-gross-profit',
    label: '【在庫法】粗利益',
    group: '収益概況',
    size: 'kpi',
    linkTo: { view: 'insight', tab: 'grossProfit' },
    render: (ctx) => {
      const pm = ctx.periodMetrics
      const usepm = pm && !ctx.isPeriodFullMonth
      const grossProfitRate = usepm
        ? pm.invMethodGrossProfitRate
        : ctx.result.invMethodGrossProfitRate
      if (grossProfitRate == null) {
        return (
          <KpiCard
            label="【在庫法】実績粗利益"
            value="-"
            subText="在庫設定なし"
            accent={sc.positive}
            badge="actual"
          />
        )
      }
      const grossProfit = usepm ? pm.invMethodGrossProfit! : ctx.result.invMethodGrossProfit!
      const totalCostInclusion = pv(ctx, 'totalCostInclusion', 'totalCostInclusion')
      const totalSales = pv(ctx, 'totalSales', 'totalSales')
      const afterRate = safeDivide(grossProfit - totalCostInclusion, totalSales, 0)
      return (
        <KpiCard
          label="【在庫法】実績粗利益"
          value={formatCurrency(grossProfit)}
          subText={`実績粗利率: ${formatPercent(grossProfitRate)} / ${formatPercent(afterRate)} (消耗品: ${formatCurrency(totalCostInclusion)})`}
          accent={sc.positive}
          badge="actual"
          formulaSummary="売上 − 売上原価（期首+仕入−期末）"
          onClick={() => ctx.onExplain('invMethodGrossProfit')}
        />
      )
    },
  },
  {
    id: 'kpi-est-margin',
    label: '【推定法】推定マージン',
    group: '収益概況',
    size: 'kpi',
    linkTo: { view: 'insight', tab: 'grossProfit' },
    render: (ctx) => {
      const estMethodMargin = pv(ctx, 'estMethodMargin', 'estMethodMargin')
      const totalCostInclusion = pv(ctx, 'totalCostInclusion', 'totalCostInclusion')
      const totalCoreSales = pv(ctx, 'totalCoreSales', 'totalCoreSales')
      const estMethodMarginRate = pv(ctx, 'estMethodMarginRate', 'estMethodMarginRate')
      const beforeRate = safeDivide(estMethodMargin + totalCostInclusion, totalCoreSales, 0)
      return (
        <KpiCard
          label="【推定法】推定マージン"
          value={formatCurrency(estMethodMargin)}
          subText={`推定マージン率: ${formatPercent(beforeRate)} / ${formatPercent(estMethodMarginRate)} (消耗品: ${formatCurrency(totalCostInclusion)})`}
          accent={palette.warningDark}
          badge="estimated"
          formulaSummary="コア売上 − 推定原価（理論値）"
          onClick={() => ctx.onExplain('estMethodMargin')}
        />
      )
    },
  },
  // 注: kpi-gross-profit-budget → ExecSummaryBar 粗利率カードに統合
  // ── KPI: 収益概況（仕入・売変） ──
  {
    id: 'kpi-inventory-cost',
    label: '在庫仕入原価',
    group: '収益概況',
    size: 'kpi',
    render: (ctx) => (
      <KpiCard
        label="在庫仕入原価"
        value={formatCurrency(pv(ctx, 'inventoryCost', 'inventoryCost'))}
        accent={palette.orangeDark}
        onClick={() => ctx.onExplain('inventoryCost')}
      />
    ),
  },
  {
    id: 'kpi-delivery-sales',
    label: '売上納品原価',
    group: '収益概況',
    size: 'kpi',
    render: (ctx) => (
      <KpiCard
        label="売上納品原価"
        value={formatCurrency(pv(ctx, 'deliverySalesCost', 'deliverySalesCost'))}
        subText={`売価: ${formatCurrency(pv(ctx, 'deliverySalesPrice', 'deliverySalesPrice'))}`}
        accent={palette.pinkDark}
        onClick={() => ctx.onExplain('deliverySalesCost')}
      />
    ),
  },
  {
    id: 'kpi-cost-inclusion',
    label: '原価算入費',
    group: '収益概況',
    size: 'kpi',
    linkTo: { view: 'cost-detail' },
    render: (ctx) => (
      <KpiCard
        label="原価算入費"
        value={formatCurrency(pv(ctx, 'totalCostInclusion', 'totalCostInclusion'))}
        subText={`原価算入率: ${formatPercent(pv(ctx, 'costInclusionRate', 'costInclusionRate'))}`}
        accent={palette.orange}
        onClick={() => ctx.onExplain('totalCostInclusion')}
      />
    ),
  },
  {
    id: 'kpi-discount-loss',
    label: '売変ロス原価',
    group: '収益概況',
    size: 'kpi',
    linkTo: { view: 'insight', tab: 'grossProfit' },
    render: (ctx) => (
      <KpiCard
        label="売変ロス原価"
        value={formatCurrency(pv(ctx, 'discountLossCost', 'discountLossCost'))}
        subText={`売変額: ${formatCurrency(pv(ctx, 'totalDiscount', 'totalDiscount'))}`}
        accent={palette.dangerDeep}
        onClick={() => ctx.onExplain('discountLossCost')}
      />
    ),
  },
  {
    id: 'kpi-core-markup',
    label: 'コア値入率',
    group: '収益概況',
    size: 'kpi',
    render: (ctx) => (
      <KpiCard
        label="コア値入率"
        value={formatPercent(pv(ctx, 'coreMarkupRate', 'coreMarkupRate'))}
        subText={`平均値入率: ${formatPercent(pv(ctx, 'averageMarkupRate', 'averageMarkupRate'))}`}
        accent={palette.cyanDark}
        onClick={() => ctx.onExplain('coreMarkupRate')}
      />
    ),
  },
  // 注: kpi-avg-daily-sales, kpi-projected-sales, kpi-projected-achievement → PLAN/ACTUAL/FORECASTに統合
  // 注: kpi-customers, kpi-transaction-value → ExecSummaryBar 客数・客単価カードに統合
  // ── KPI: 前年比較（月間フル集計、dataEndDay非依存） ──
  {
    id: 'kpi-py-same-dow',
    label: '予算成長率（同曜日）',
    group: '前年比較',
    size: 'kpi',
    render: ({ result: r, prevYearMonthlyKpi: pk, onExplain }) => {
      if (!pk.hasPrevYear) {
        return (
          <KpiCard
            label="予算成長率（同曜日）"
            value="-"
            subText="前年データ未読込"
            accent={palette.blueDark}
          />
        )
      }
      const py = pk.sameDow
      const hasBudget = r.budget > 0
      const budgetVsPrev = hasBudget ? safeDivide(r.budget, py.sales, 0) : null
      const prevVsBudget = hasBudget ? safeDivide(py.sales, r.budget, 0) : null
      const prevCustUnit = safeDivide(py.sales, py.customers, 0)
      const sub = [
        `前年: ${formatCurrency(py.sales)}`,
        hasBudget ? `予算: ${formatCurrency(r.budget)}` : null,
        hasBudget
          ? `差額: ${r.budget - py.sales >= 0 ? '+' : ''}${formatCurrency(r.budget - py.sales)}`
          : null,
        py.customers > 0
          ? `客数: ${py.customers.toLocaleString('ja-JP')}人 / 客単価: ${formatCurrency(prevCustUnit)}`
          : null,
      ]
        .filter(Boolean)
        .join(' / ')
      return (
        <KpiCard
          label="予算成長率（同曜日）"
          value={budgetVsPrev != null ? formatPercent(budgetVsPrev) : '-'}
          subText={sub}
          accent={palette.blueDark}
          onClick={() => onExplain('prevYearSameDowBudgetRatio')}
          trend={
            prevVsBudget != null
              ? {
                  direction: prevVsBudget >= 1 ? 'up' : 'down',
                  label: `前年水準: 予算の${formatPercent(prevVsBudget)}`,
                }
              : undefined
          }
          formulaSummary="当年月間予算 ÷ 前年同曜日売上"
        />
      )
    },
  },
  {
    id: 'kpi-py-same-date',
    label: '予算成長率（同日）',
    group: '前年比較',
    size: 'kpi',
    render: ({ result: r, prevYearMonthlyKpi: pk, onExplain }) => {
      if (!pk.hasPrevYear) {
        return (
          <KpiCard
            label="予算成長率（同日）"
            value="-"
            subText="前年データ未読込"
            accent={palette.cyanDark}
          />
        )
      }
      const py = pk.sameDate
      const hasBudget = r.budget > 0
      const budgetVsPrev = hasBudget ? safeDivide(r.budget, py.sales, 0) : null
      const prevVsBudget = hasBudget ? safeDivide(py.sales, r.budget, 0) : null
      const prevCustUnit = safeDivide(py.sales, py.customers, 0)
      const sub = [
        `前年: ${formatCurrency(py.sales)}`,
        hasBudget ? `予算: ${formatCurrency(r.budget)}` : null,
        hasBudget
          ? `差額: ${r.budget - py.sales >= 0 ? '+' : ''}${formatCurrency(r.budget - py.sales)}`
          : null,
        py.customers > 0
          ? `客数: ${py.customers.toLocaleString('ja-JP')}人 / 客単価: ${formatCurrency(prevCustUnit)}`
          : null,
      ]
        .filter(Boolean)
        .join(' / ')
      return (
        <KpiCard
          label="予算成長率（同日）"
          value={budgetVsPrev != null ? formatPercent(budgetVsPrev) : '-'}
          subText={sub}
          accent={palette.cyanDark}
          onClick={() => onExplain('prevYearSameDateBudgetRatio')}
          trend={
            prevVsBudget != null
              ? {
                  direction: prevVsBudget >= 1 ? 'up' : 'down',
                  label: `前年水準: 予算の${formatPercent(prevVsBudget)}`,
                }
              : undefined
          }
          formulaSummary="当年月間予算 ÷ 前年同日売上"
        />
      )
    },
  },
  // ── KPI: 曜日ギャップ ──
  {
    id: 'kpi-dow-gap',
    label: '曜日ギャップ',
    group: '前年比較',
    size: 'kpi',
    isVisible: ({ dowGap }) => dowGap.isValid,
    render: (ctx) => <DowGapKpiCard dowGap={ctx.dowGap} onExplain={ctx.onExplain} />,
  },
]
