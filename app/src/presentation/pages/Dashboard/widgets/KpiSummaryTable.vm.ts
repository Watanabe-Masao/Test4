/**
 * KPI統合テーブル — ViewModel
 *
 * 売上予算・粗利予算の2セクションに集約したテーブルデータを構築する純粋関数群。
 * メトリクス階層: 主1(売上)+Sub2(客数/客単価)、主2(粗利)+Sub1(値入率/売変率)
 */

import { safeDivide } from '@/domain/calculations/utils'
import { formatPercent, formatCurrency, formatPointDiff } from '@/domain/formatting'
import type { StoreResult, Store, ViewType } from '@/domain/models'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'

// ─── Types ──────────────────────────────────────────────

export type SectionKey = 'sales' | 'profit'

export interface SummaryRow {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly budget: string | null
  readonly achievement: string | null
  readonly achievementColor: string | null
  readonly isSub: boolean
  readonly metricId: string | null
  readonly drillPage: { readonly view: ViewType; readonly tab?: string } | null
}

export interface SectionData {
  readonly key: SectionKey
  readonly title: string
  readonly rows: readonly SummaryRow[]
  readonly defaultExpanded: boolean
}

export interface StoreBreakdownRow {
  readonly storeId: string
  readonly storeName: string
  readonly value: string
  readonly budget: string | null
  readonly achievement: string
  readonly achievementColor: string
}

// ─── Colors ─────────────────────────────────────────────

function achColor(rate: number): string {
  if (rate >= 100) return '#10b981'
  if (rate >= 97) return '#eab308'
  return '#ef4444'
}

function rateColor(diff: number): string {
  if (diff >= 0) return '#10b981'
  if (diff >= -0.005) return '#eab308'
  return '#ef4444'
}

// ─── Section Builders ───────────────────────────────────

export function buildSalesSectionRows(
  r: StoreResult,
  fmtCurrency: CurrencyFormatter,
  totalQuantity?: number | null,
): readonly SummaryRow[] {
  const hasBudget = r.budget > 0
  const achRate = hasBudget ? safeDivide(r.totalSales, r.budget, 0) * 100 : null

  const rows: SummaryRow[] = [
    {
      key: 'coreSales',
      label: 'コア売上',
      value: fmtCurrency(r.totalCoreSales),
      budget: hasBudget ? fmtCurrency(r.budget) : null,
      achievement: achRate != null ? `${achRate.toFixed(1)}%` : null,
      achievementColor: achRate != null ? achColor(achRate) : null,
      isSub: false,
      metricId: 'coreSales',
      drillPage: { view: 'daily' },
    },
    // Sub2: 客数
    {
      key: 'customers',
      label: '客数',
      value: `${r.totalCustomers.toLocaleString('ja-JP')}人`,
      budget: null,
      achievement: null,
      achievementColor: null,
      isSub: true,
      metricId: 'totalCustomers',
      drillPage: { view: 'daily' },
    },
    // Sub2: 販売点数（CTS totalQuantity から取得）
    {
      key: 'salesQuantity',
      label: '販売点数',
      value: totalQuantity != null ? `${totalQuantity.toLocaleString('ja-JP')}点` : '—',
      budget: null,
      achievement: null,
      achievementColor: null,
      isSub: true,
      metricId: null,
      drillPage: null,
    },
    // Sub2: 客単価
    {
      key: 'transactionValue',
      label: '客単価',
      value: fmtCurrency(r.transactionValue),
      budget: null,
      achievement: null,
      achievementColor: null,
      isSub: true,
      metricId: 'transactionValue',
      drillPage: { view: 'daily' },
    },
  ]

  return rows
}

export function buildProfitSectionRows(
  r: StoreResult,
  fmtCurrency: CurrencyFormatter,
): readonly SummaryRow[] {
  const hasBudget = r.grossProfitBudget > 0
  const gpAmount = r.invMethodGrossProfit ?? r.estMethodMargin
  const gpAchRate = hasBudget ? safeDivide(gpAmount, r.grossProfitBudget, 0) * 100 : null
  const gpRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate
  const gpRateDiff = gpRate - r.grossProfitRateBudget

  const rows: SummaryRow[] = [
    {
      key: 'grossProfit',
      label: '粗利額',
      value: fmtCurrency(gpAmount),
      budget: hasBudget ? fmtCurrency(r.grossProfitBudget) : null,
      achievement: gpAchRate != null ? `${gpAchRate.toFixed(1)}%` : null,
      achievementColor: gpAchRate != null ? achColor(gpAchRate) : null,
      isSub: false,
      metricId: 'invMethodGrossProfit',
      drillPage: { view: 'insight', tab: 'grossProfit' },
    },
    {
      key: 'gpRate',
      label: '粗利率',
      value: formatPercent(gpRate),
      budget: r.grossProfitRateBudget > 0 ? formatPercent(r.grossProfitRateBudget) : null,
      achievement: r.grossProfitRateBudget > 0 ? formatPointDiff(gpRateDiff, 2) : null,
      achievementColor: r.grossProfitRateBudget > 0 ? rateColor(gpRateDiff) : null,
      isSub: false,
      metricId: 'invMethodGrossProfitRate',
      drillPage: { view: 'insight', tab: 'grossProfit' },
    },
    // Sub1: 値入率
    {
      key: 'markupRate',
      label: '値入率',
      value: formatPercent(r.averageMarkupRate),
      budget: r.grossProfitRateBudget > 0 ? formatPercent(r.grossProfitRateBudget) : null,
      achievement: null,
      achievementColor: null,
      isSub: true,
      metricId: 'averageMarkupRate',
      drillPage: { view: 'cost-detail' },
    },
    // Sub1: 売変率
    {
      key: 'discountRate',
      label: '売変率',
      value: formatPercent(r.discountRate),
      budget: null,
      achievement: null,
      achievementColor: null,
      isSub: true,
      metricId: 'discountRate',
      drillPage: { view: 'insight', tab: 'grossProfit' },
    },
  ]

  return rows
}

export function buildSections(
  r: StoreResult,
  fmtCurrency: CurrencyFormatter,
  totalQuantity?: number | null,
): readonly SectionData[] {
  return [
    {
      key: 'sales',
      title: '売上',
      rows: buildSalesSectionRows(r, fmtCurrency, totalQuantity),
      defaultExpanded: true,
    },
    {
      key: 'profit',
      title: '粗利',
      rows: buildProfitSectionRows(r, fmtCurrency),
      defaultExpanded: true,
    },
  ]
}

// ─── Store Breakdown ────────────────────────────────────

export function buildStoreBreakdown(
  metricKey: string,
  allStoreResults: ReadonlyMap<string, StoreResult>,
  stores: ReadonlyMap<string, Store>,
  fmtCurrency: CurrencyFormatter,
): readonly StoreBreakdownRow[] {
  const rows: StoreBreakdownRow[] = []

  for (const [storeId, sr] of allStoreResults) {
    const storeMaster = stores.get(storeId)
    const storeName = storeMaster?.name ?? storeId

    let value: string
    let budget: string | null = null
    let achNum: number

    switch (metricKey) {
      case 'coreSales': {
        value = fmtCurrency(sr.totalCoreSales)
        budget = sr.budget > 0 ? fmtCurrency(sr.budget) : null
        achNum = sr.budget > 0 ? safeDivide(sr.totalSales, sr.budget, 0) * 100 : 0
        break
      }
      case 'grossProfit': {
        const gp = sr.invMethodGrossProfit ?? sr.estMethodMargin
        value = fmtCurrency(gp)
        budget = sr.grossProfitBudget > 0 ? fmtCurrency(sr.grossProfitBudget) : null
        achNum = sr.grossProfitBudget > 0 ? safeDivide(gp, sr.grossProfitBudget, 0) * 100 : 0
        break
      }
      case 'gpRate': {
        const rate = sr.invMethodGrossProfitRate ?? sr.estMethodMarginRate
        value = formatPercent(rate)
        budget = sr.grossProfitRateBudget > 0 ? formatPercent(sr.grossProfitRateBudget) : null
        const diff = rate - sr.grossProfitRateBudget
        achNum = diff * 100
        break
      }
      case 'customers': {
        value = `${sr.totalCustomers.toLocaleString('ja-JP')}人`
        achNum = 0
        break
      }
      case 'transactionValue': {
        value = formatCurrency(sr.transactionValue)
        achNum = 0
        break
      }
      case 'markupRate': {
        value = formatPercent(sr.averageMarkupRate)
        achNum = 0
        break
      }
      case 'discountRate': {
        value = formatPercent(sr.discountRate)
        achNum = 0
        break
      }
      default: {
        value = '-'
        achNum = 0
      }
    }

    const isRateMetric = metricKey === 'gpRate'
    const achievement = isRateMetric
      ? `${achNum >= 0 ? '+' : ''}${achNum.toFixed(2)}pp`
      : achNum > 0
        ? `${achNum.toFixed(1)}%`
        : '-'
    const color = isRateMetric ? rateColor(achNum / 100) : achColor(achNum)

    rows.push({ storeId, storeName, value, budget, achievement, achievementColor: color })
  }

  return rows.sort((a, b) => {
    const sa = stores.get(a.storeId)
    const sb = stores.get(b.storeId)
    return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
  })
}
