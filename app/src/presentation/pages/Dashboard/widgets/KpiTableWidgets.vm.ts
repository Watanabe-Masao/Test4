/**
 * KPIテーブルウィジェット ViewModel
 *
 * データ変換・計算ロジックを抽出。React / styled-components に依存しない。
 *
 * @guard F7 View は ViewModel のみ受け取る
 *
 * @responsibility R:unclassified
 */
import { formatCurrency, formatPercent } from '@/domain/formatting'
import { calculateAchievementRate } from '@/domain/calculations/utils'
import { getEffectiveGrossProfitRate } from '@/application/readModels/grossProfit'
import type { Store, DepartmentKpiRecord } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import { fmtPct, fmtPtDiff } from './kpiTableUtils'

/* ── 定数 ──────────────────────────────────────────── */

export const GROUP_BORDER = '2px solid rgba(99,102,241,0.25)'

/* ── 型定義 ──────────────────────────────────────────── */

export interface StoreEntry {
  readonly id: string
  readonly label: string
  readonly name: string
  readonly result: StoreResult
}

export interface PeriodInfo {
  readonly effectiveEndDay: number
  readonly isPartialPeriod: boolean
}

export interface StoreRowData {
  readonly gpRateBudget: number
  readonly gpRateActual: number
  readonly gpRateVariance: number
  readonly periodBudget: number
  readonly periodGPBudget: number
  readonly salesVariance: number
  readonly periodAchRate: number
  readonly gpLanding: number
  readonly salesLanding: number
}

export interface StoreRowColorInputs {
  readonly gpVarianceNonNegative: boolean
  readonly salesVarianceNonNegative: boolean
  readonly periodAchRate: number
  readonly salesLandingNonNegative: boolean
}

export interface WarningState {
  readonly purchaseShort: boolean
  readonly missingDiscount: boolean
}

export interface DeptKpiRowColorInputs {
  readonly gpVarianceNonNegative: boolean
  readonly salesVarianceNonNegative: boolean
  readonly salesAchievement: number
}

/* ── 店舗ソート ──────────────────────────────────────── */

export function sortStoreEntries(
  allStoreResults: ReadonlyMap<string, StoreResult>,
  stores: ReadonlyMap<string, Store>,
): readonly StoreEntry[] {
  return [...allStoreResults.entries()]
    .sort(([, a], [, b]) => {
      const sa = stores.get(a.storeId)
      const sb = stores.get(b.storeId)
      return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
    })
    .map(([id, result]) => {
      const store = stores.get(id)
      return { id, label: store?.code ?? id, name: store?.name ?? id, result }
    })
}

/* ── 期間計算 ──────────────────────────────────────── */

export function computePeriodInfo(
  elapsedDays: number | undefined,
  dataMaxDay: number,
  daysInMonth: number,
): PeriodInfo {
  const effectiveEndDay = elapsedDays ?? (dataMaxDay > 0 ? dataMaxDay : daysInMonth)
  const isPartialPeriod = effectiveEndDay < daysInMonth
  return { effectiveEndDay, isPartialPeriod }
}

/* ── 店舗行データ ──────────────────────────────────── */

export function computeStoreRowData(
  r: StoreResult,
  effectiveEndDay: number,
  isPartialPeriod: boolean,
): StoreRowData {
  const gpRateBudget = r.grossProfitRateBudget
  const gpRateActual = getEffectiveGrossProfitRate(r)
  const gpRateVariance = gpRateActual - gpRateBudget
  let periodBudgetSum = 0
  for (let d = 1; d <= effectiveEndDay; d++) periodBudgetSum += r.budgetDaily.get(d) ?? 0
  const periodBudget = isPartialPeriod ? periodBudgetSum : r.budget
  const periodGPBudget = r.budget > 0 ? r.grossProfitBudget * (periodBudget / r.budget) : 0
  const salesVariance = r.totalSales - periodBudget
  const periodAchRate = calculateAchievementRate(r.totalSales, periodBudget)
  const gpLanding = r.estMethodMarginRate
  const salesLanding = r.projectedSales - r.budget

  return {
    gpRateBudget,
    gpRateActual,
    gpRateVariance,
    periodBudget,
    periodGPBudget,
    salesVariance,
    periodAchRate,
    gpLanding,
    salesLanding,
  }
}

export function computeStoreRowColorInputs(data: StoreRowData): StoreRowColorInputs {
  return {
    gpVarianceNonNegative: data.gpRateVariance >= 0,
    salesVarianceNonNegative: data.salesVariance >= 0,
    periodAchRate: data.periodAchRate,
    salesLandingNonNegative: data.salesLanding >= 0,
  }
}

/* ── 部門KPI行カラー入力 ──────────────────────────── */

export function computeDeptKpiRowColorInputs(rec: DepartmentKpiRecord): DeptKpiRowColorInputs {
  return {
    gpVarianceNonNegative: rec.gpRateVariance >= 0,
    salesVarianceNonNegative: rec.salesVariance >= 0,
    salesAchievement:
      Math.abs(rec.salesAchievement) <= 1 ? rec.salesAchievement : rec.salesAchievement / 100,
  }
}

/* ── 警告状態 ──────────────────────────────────────── */

export function computeWarnings(agg: StoreResult): WarningState {
  return {
    purchaseShort: agg.purchaseMaxDay > 0 && agg.purchaseMaxDay < agg.elapsedDays,
    missingDiscount: !agg.hasDiscountData && agg.totalSales > 0,
  }
}

/* ── CSV エクスポート ──────────────────────────────── */

export function buildCsvHeaders(isPartialPeriod: boolean): readonly string[] {
  return [
    '店舗',
    '粗利予算額',
    '粗利率実績',
    '予算差異',
    '値入',
    '売変',
    isPartialPeriod ? '経過予算' : '予算',
    '売上実績',
    '売上差異',
    '達成率',
    '期首在庫',
    '期末在庫',
    '最終粗利着地',
    '最終売上着地',
  ]
}

export function buildCsvRow(
  r: StoreResult,
  label: string,
  effectiveEndDay: number,
  isPartialPeriod: boolean,
): readonly string[] {
  const gpRateBudget = r.grossProfitRateBudget
  const gpRateActual = getEffectiveGrossProfitRate(r)
  const gpRateVariance = gpRateActual - gpRateBudget
  let periodBudgetSum = 0
  for (let d = 1; d <= effectiveEndDay; d++) periodBudgetSum += r.budgetDaily.get(d) ?? 0
  const periodBudget = isPartialPeriod ? periodBudgetSum : r.budget
  const salesVariance = r.totalSales - periodBudget
  const periodAchRate = calculateAchievementRate(r.totalSales, periodBudget)
  const gpLanding = r.estMethodMarginRate
  const salesLanding = r.projectedSales - r.budget

  return [
    label,
    fmtPct(gpRateBudget),
    fmtPct(gpRateActual),
    fmtPtDiff(gpRateVariance * 100),
    fmtPct(r.coreMarkupRate),
    formatPercent(-r.discountRate, 2),
    formatCurrency(periodBudget),
    formatCurrency(r.totalSales),
    formatCurrency(salesVariance),
    formatPercent(periodAchRate),
    r.openingInventory != null ? formatCurrency(r.openingInventory) : '-',
    r.closingInventory != null ? formatCurrency(r.closingInventory) : '-',
    fmtPct(gpLanding),
    formatCurrency(salesLanding),
  ]
}

export function buildCsvContent(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const bom = '\uFEFF'
  return (
    bom +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
  )
}

export function buildCsvBlob(csvContent: string): Blob {
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
}

export function buildCsvFilename(year: number, month: number): string {
  return `店舗別KPI一覧_${year}年${month}月.csv`
}
