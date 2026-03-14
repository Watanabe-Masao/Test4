import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { KpiCard } from '@/presentation/components/common'
import type { KpiWarningInfo } from '@/presentation/components/common/KpiCard'
import { formatPercent } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import { getMaxSeverity, getWarningLabel, getWarningMessage } from '@/domain/constants'
import type { MetricId } from '@/domain/models'
import type { WidgetDef, WidgetContext } from './types'
import { DowGapKpiCard } from './DowGapKpiCard'

/** Build KpiWarningInfo from explanation warnings for a given metric */
function buildKpiWarning(ctx: WidgetContext, metricId: MetricId): KpiWarningInfo | undefined {
  const warnings = ctx.explanations.get(metricId)?.warnings
  if (!warnings || warnings.length === 0) return undefined
  const severity = getMaxSeverity(warnings)
  if (!severity) return undefined
  return {
    severity,
    label: getWarningLabel(warnings[0]),
    message: warnings.map(getWarningMessage).join('\n'),
  }
}

// ── KPI: 収益概況 ──
export const WIDGETS_KPI: readonly WidgetDef[] = [
  {
    id: 'kpi-core-sales',
    label: 'コア売上',
    group: '収益概況',
    size: 'kpi',
    linkTo: { view: 'reports' },
    render: ({ result: r, prevYear, onExplain, fmtCurrency }) => (
      <KpiCard
        label="コア売上"
        value={fmtCurrency(r.totalCoreSales)}
        subText={`総売上: ${fmtCurrency(r.totalSales)} / 花: ${fmtCurrency(r.flowerSalesPrice)} / 産直: ${fmtCurrency(r.directProduceSalesPrice)}`}
        accent={palette.purpleDark}
        onClick={() => onExplain('coreSales')}
        trend={
          prevYear.hasPrevYear && prevYear.totalSales > 0
            ? {
                direction:
                  r.totalSales > prevYear.totalSales
                    ? 'up'
                    : r.totalSales < prevYear.totalSales
                      ? 'down'
                      : 'flat',
                label: `前年比 ${formatPercent(r.totalSales / prevYear.totalSales)}`,
              }
            : undefined
        }
      />
    ),
  },
  {
    id: 'kpi-total-cost',
    label: '総仕入原価',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain, fmtCurrency }) => (
      <KpiCard
        label="総仕入原価"
        value={fmtCurrency(r.totalCost)}
        subText={`在庫仕入: ${fmtCurrency(r.inventoryCost)} / 納品: ${fmtCurrency(r.deliverySalesCost)}`}
        accent={palette.orangeDark}
        onClick={() => onExplain('inventoryCost')}
      />
    ),
  },
  {
    id: 'kpi-inv-gross-profit',
    label: '【在庫法】粗利益',
    group: '収益概況',
    size: 'kpi',
    linkTo: { view: 'insight', tab: 'grossProfit' },
    render: ({ result: r, onExplain, fmtCurrency }) => {
      if (r.invMethodGrossProfitRate == null) {
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
      const afterRate = safeDivide(r.invMethodGrossProfit! - r.totalCostInclusion, r.totalSales, 0)
      return (
        <KpiCard
          label="【在庫法】実績粗利益"
          value={fmtCurrency(r.invMethodGrossProfit)}
          subText={`実績粗利率: ${formatPercent(r.invMethodGrossProfitRate)} / ${formatPercent(afterRate)} (消耗品: ${fmtCurrency(r.totalCostInclusion)})`}
          accent={sc.positive}
          badge="actual"
          formulaSummary="売上 − 売上原価（期首+仕入−期末）"
          onClick={() => onExplain('invMethodGrossProfit')}
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
      const { result: r, onExplain, fmtCurrency } = ctx
      const beforeRate = safeDivide(r.estMethodMargin + r.totalCostInclusion, r.totalCoreSales, 0)
      return (
        <KpiCard
          label="【推定法】推定マージン"
          value={fmtCurrency(r.estMethodMargin)}
          subText={`推定マージン率: ${formatPercent(beforeRate)} / ${formatPercent(r.estMethodMarginRate)} (消耗品: ${fmtCurrency(r.totalCostInclusion)})`}
          accent={palette.warningDark}
          badge="estimated"
          formulaSummary="コア売上 − 推定原価（理論値）"
          onClick={() => onExplain('estMethodMargin')}
          warning={buildKpiWarning(ctx, 'estMethodMargin')}
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
    render: ({ result: r, onExplain, fmtCurrency }) => (
      <KpiCard
        label="在庫仕入原価"
        value={fmtCurrency(r.inventoryCost)}
        accent={palette.orangeDark}
        onClick={() => onExplain('inventoryCost')}
      />
    ),
  },
  {
    id: 'kpi-delivery-sales',
    label: '売上納品原価',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain, fmtCurrency }) => (
      <KpiCard
        label="売上納品原価"
        value={fmtCurrency(r.deliverySalesCost)}
        subText={`売価: ${fmtCurrency(r.deliverySalesPrice)}`}
        accent={palette.pinkDark}
        onClick={() => onExplain('deliverySalesCost')}
      />
    ),
  },
  {
    id: 'kpi-cost-inclusion',
    label: '原価算入費',
    group: '収益概況',
    size: 'kpi',
    linkTo: { view: 'cost-detail' },
    render: ({ result: r, onExplain, fmtCurrency }) => (
      <KpiCard
        label="原価算入費"
        value={fmtCurrency(r.totalCostInclusion)}
        subText={`原価算入率: ${formatPercent(r.costInclusionRate)}`}
        accent={palette.orange}
        onClick={() => onExplain('totalCostInclusion')}
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
        value={ctx.fmtCurrency(ctx.result.discountLossCost)}
        subText={`売変額: ${ctx.fmtCurrency(ctx.result.totalDiscount)}`}
        accent={palette.dangerDeep}
        onClick={() => ctx.onExplain('discountLossCost')}
        warning={buildKpiWarning(ctx, 'discountLossCost')}
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
        value={formatPercent(ctx.result.coreMarkupRate)}
        subText={`平均値入率: ${formatPercent(ctx.result.averageMarkupRate)}`}
        accent={palette.cyanDark}
        onClick={() => ctx.onExplain('coreMarkupRate')}
        warning={buildKpiWarning(ctx, 'coreMarkupRate')}
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
    render: ({ result: r, prevYearMonthlyKpi: pk, onExplain, fmtCurrency }) => {
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
        `前年: ${fmtCurrency(py.sales)}`,
        hasBudget ? `予算: ${fmtCurrency(r.budget)}` : null,
        hasBudget
          ? `差額: ${r.budget - py.sales >= 0 ? '+' : ''}${fmtCurrency(r.budget - py.sales)}`
          : null,
        py.customers > 0
          ? `客数: ${py.customers.toLocaleString('ja-JP')}人 / 客単価: ${fmtCurrency(prevCustUnit)}`
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
    render: ({ result: r, prevYearMonthlyKpi: pk, onExplain, fmtCurrency }) => {
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
        `前年: ${fmtCurrency(py.sales)}`,
        hasBudget ? `予算: ${fmtCurrency(r.budget)}` : null,
        hasBudget
          ? `差額: ${r.budget - py.sales >= 0 ? '+' : ''}${fmtCurrency(r.budget - py.sales)}`
          : null,
        py.customers > 0
          ? `客数: ${py.customers.toLocaleString('ja-JP')}人 / 客単価: ${fmtCurrency(prevCustUnit)}`
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
