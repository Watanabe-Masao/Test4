import { useState, useCallback } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { KpiCard } from '@/presentation/components/common'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { WidgetDef, WidgetContext } from './types'

// ── KPI: 収益概況 ──
export const WIDGETS_KPI: readonly WidgetDef[] = [
  {
    id: 'kpi-core-sales',
    label: 'コア売上',
    group: '収益概況',
    size: 'kpi',
    linkTo: { view: 'reports' },
    render: ({ result: r, prevYear, onExplain }) => (
      <KpiCard
        label="コア売上"
        value={formatCurrency(r.totalCoreSales)}
        subText={`総売上: ${formatCurrency(r.totalSales)} / 花: ${formatCurrency(r.flowerSalesPrice)} / 産直: ${formatCurrency(r.directProduceSalesPrice)}`}
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
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="総仕入原価"
        value={formatCurrency(r.totalCost)}
        subText={`在庫仕入: ${formatCurrency(r.inventoryCost)} / 納品: ${formatCurrency(r.deliverySalesCost)}`}
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
    render: ({ result: r, onExplain }) => {
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
          value={formatCurrency(r.invMethodGrossProfit)}
          subText={`実績粗利率: ${formatPercent(r.invMethodGrossProfitRate)} / ${formatPercent(afterRate)} (消耗品: ${formatCurrency(r.totalCostInclusion)})`}
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
    render: ({ result: r, onExplain }) => {
      const beforeRate = safeDivide(r.estMethodMargin + r.totalCostInclusion, r.totalCoreSales, 0)
      return (
        <KpiCard
          label="【推定法】推定マージン"
          value={formatCurrency(r.estMethodMargin)}
          subText={`推定マージン率: ${formatPercent(beforeRate)} / ${formatPercent(r.estMethodMarginRate)} (消耗品: ${formatCurrency(r.totalCostInclusion)})`}
          accent={palette.warningDark}
          badge="estimated"
          formulaSummary="コア売上 − 推定原価（理論値）"
          onClick={() => onExplain('estMethodMargin')}
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
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="在庫仕入原価"
        value={formatCurrency(r.inventoryCost)}
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
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="売上納品原価"
        value={formatCurrency(r.deliverySalesCost)}
        subText={`売価: ${formatCurrency(r.deliverySalesPrice)}`}
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
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="原価算入費"
        value={formatCurrency(r.totalCostInclusion)}
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
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="売変ロス原価"
        value={formatCurrency(r.discountLossCost)}
        subText={`売変額: ${formatCurrency(r.totalDiscount)}`}
        accent={palette.dangerDeep}
        onClick={() => onExplain('discountLossCost')}
      />
    ),
  },
  {
    id: 'kpi-core-markup',
    label: 'コア値入率',
    group: '収益概況',
    size: 'kpi',
    render: ({ result: r, onExplain }) => (
      <KpiCard
        label="コア値入率"
        value={formatPercent(r.coreMarkupRate)}
        subText={`平均値入率: ${formatPercent(r.averageMarkupRate)}`}
        accent={palette.cyanDark}
        onClick={() => onExplain('coreMarkupRate')}
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

// ── 曜日ギャップ KPI カード（平均法 / 実日法 切り替え） ──

const DOW_SHORT = ['日', '月', '火', '水', '木', '金', '土'] as const

function DowGapKpiCard({
  dowGap,
  onExplain,
}: {
  dowGap: DowGapAnalysis
  onExplain: WidgetContext['onExplain']
}) {
  const [showActual, setShowActual] = useState(false)
  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowActual((v) => !v)
  }, [])

  const actualDay = dowGap.actualDayImpact
  const hasActualDay = actualDay != null && actualDay.isValid
  const isActualView = showActual && hasActualDay

  const totalDiff = dowGap.dowCounts.reduce((s, d) => s + d.diff, 0)
  const gapSummary = dowGap.dowCounts
    .filter((d) => d.diff !== 0)
    .map((d) => `${DOW_SHORT[d.dow]}${d.diff > 0 ? '+' : ''}${d.diff}`)
    .join(' ')

  if (isActualView) {
    const impact = actualDay.estimatedImpact
    const details = [
      ...actualDay.shiftedIn.map((d) => `${d.label}: +${formatCurrency(d.prevSales)}`),
      ...actualDay.shiftedOut.map((d) => `${d.label}: -${formatCurrency(d.prevSales)}`),
    ].join(' / ')
    const subText = details || `日数差: ${totalDiff >= 0 ? '+' : ''}${totalDiff}日 / ${gapSummary}`

    return (
      <KpiCard
        label="曜日ギャップ（実日）"
        value={`${impact >= 0 ? '+' : ''}${formatCurrency(impact)}`}
        subText={subText}
        accent={impact >= 0 ? palette.positive : palette.negative}
        onClick={() => onExplain('dowGapImpact')}
        formulaSummary={
          <>
            {'マッピング境界日の実売上 '}
            <ToggleLink onClick={toggle}>平均に切替</ToggleLink>
          </>
        }
      />
    )
  }

  // 平均法（デフォルト）
  const impact = dowGap.estimatedImpact
  const warnings = dowGap.missingDataWarnings ?? []
  const hasWarnings = warnings.length > 0
  const subParts: string[] = []
  if (dowGap.isSameStructure) {
    subParts.push('曜日構成同一（ギャップなし）')
  } else {
    subParts.push(`日数差: ${totalDiff >= 0 ? '+' : ''}${totalDiff}日`)
    if (gapSummary) subParts.push(gapSummary)
  }
  if (!dowGap.hasPrevDowSales) {
    subParts.push('⚠ 前年曜日別売上なし')
  }

  return (
    <KpiCard
      label="曜日ギャップ（平均）"
      value={`${impact >= 0 ? '+' : ''}${formatCurrency(impact)}`}
      subText={subParts.join(' / ')}
      accent={
        hasWarnings && impact === 0
          ? palette.slate
          : impact >= 0
            ? palette.positive
            : palette.negative
      }
      onClick={() => onExplain('dowGapImpact')}
      formulaSummary={
        hasActualDay ? (
          <>
            {'Σ(曜日別日平均 × 日数差) '}
            <ToggleLink onClick={toggle}>実日に切替</ToggleLink>
          </>
        ) : (
          'Σ(曜日別日平均 × 日数差)'
        )
      }
    />
  )
}

// ── 切り替えリンク（styled-components の外部定義は避け、インライン + span で実装） ──
function ToggleLink({
  onClick,
  children,
}: {
  onClick: (e: React.MouseEvent) => void
  children: React.ReactNode
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(e as unknown as React.MouseEvent)
        }
      }}
      style={{
        cursor: 'pointer',
        textDecoration: 'underline',
        opacity: 0.8,
      }}
    >
      {children}
    </span>
  )
}
