/**
 * コンディションサマリー強化版 — ViewModel
 *
 * WidgetContext + StoreResult から店別予算達成メトリクスを導出する純粋関数群。
 * Presentation 層の描画ロジックからデータ変換を分離する（原則#9: 描画は純粋）。
 */

import { safeDivide } from '@/domain/calculations/utils'
import { computeGpAfterConsumable, computeGpAfterConsumableAmount } from './conditionSummaryUtils'
import type { StoreResult, Store, AlignmentPolicy } from '@/domain/models'
import type { PrevYearData, PrevYearMonthlyKpi } from '@/application/hooks'

// ─── Types ──────────────────────────────────────────────

export type MetricKey = 'sales' | 'gp' | 'gpRate' | 'markupRate' | 'discountRate'
export type PeriodTab = 'monthly' | 'elapsed'

/** Budget comparison が成立するメトリクス */
export type BudgetMetricKey = 'sales' | 'gp' | 'gpRate'
/** 比率のみ表示するメトリクス */
export type RateOnlyMetricKey = 'markupRate' | 'discountRate'

export function isBudgetMetric(key: MetricKey): key is BudgetMetricKey {
  return key === 'sales' || key === 'gp' || key === 'gpRate'
}

export interface MetricDef {
  readonly label: string
  readonly icon: string
  readonly color: string
  readonly isRate: boolean
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  sales: { label: '売上', icon: 'S', color: '#3b82f6', isRate: false },
  gp: { label: '粗利額', icon: 'GP', color: '#8b5cf6', isRate: false },
  gpRate: { label: '粗利率', icon: '%', color: '#06b6d4', isRate: true },
  markupRate: { label: '値入率', icon: 'M', color: '#f59e0b', isRate: true },
  discountRate: { label: '値引率', icon: 'D', color: '#ef4444', isRate: true },
}

export interface EnhancedRow {
  readonly storeId: string
  readonly storeName: string
  readonly budget: number
  readonly actual: number
  readonly ly: number | null
  readonly achievement: number
  readonly diff: number
  readonly yoy: number | null
}

export interface EnhancedTotal {
  readonly budget: number
  readonly actual: number
  readonly ly: number | null
  readonly achievement: number
  readonly diff: number
  readonly yoy: number | null
}

// ─── Budget Calculation ─────────────────────────────────

/** 経過予算を日別予算の合算で計算する */
function elapsedBudget(sr: StoreResult, elapsedDays: number): number {
  let sum = 0
  for (let d = 1; d <= elapsedDays; d++) sum += sr.budgetDaily.get(d) ?? 0
  return sum
}

/** 経過粗利予算 = 粗利予算 × (経過売上予算 / 月間売上予算) */
function elapsedGpBudget(sr: StoreResult, elapsedDays: number): number {
  if (sr.budget <= 0) return 0
  const periodBudget = elapsedBudget(sr, elapsedDays)
  return sr.grossProfitBudget * (periodBudget / sr.budget)
}

// ─── Metric Extractors ──────────────────────────────────

interface MetricValues {
  readonly budget: number
  readonly actual: number
}

function extractMetric(
  sr: StoreResult,
  metric: MetricKey,
  tab: PeriodTab,
  elapsedDays: number | undefined,
  daysInMonth: number,
): MetricValues {
  const effectiveElapsed = elapsedDays ?? daysInMonth
  const isElapsed = tab === 'elapsed' && elapsedDays != null && elapsedDays < daysInMonth

  switch (metric) {
    case 'sales': {
      const budget = isElapsed ? elapsedBudget(sr, effectiveElapsed) : sr.budget
      return { budget, actual: sr.totalSales }
    }
    case 'gp': {
      const budget = isElapsed ? elapsedGpBudget(sr, effectiveElapsed) : sr.grossProfitBudget
      const actual = computeGpAfterConsumableAmount(sr)
      return { budget, actual }
    }
    case 'gpRate': {
      const budget = sr.grossProfitRateBudget * 100 // → %表示
      const actual = computeGpAfterConsumable(sr) * 100
      return { budget, actual }
    }
    case 'markupRate': {
      const budget = sr.grossProfitRateBudget * 100
      const actual = sr.averageMarkupRate * 100
      return { budget, actual }
    }
    case 'discountRate': {
      const budget = 0
      const actual = sr.discountRate * 100
      return { budget, actual }
    }
  }
}

// ─── YoY Extractors ─────────────────────────────────────

function extractLySales(
  storeId: string,
  prevYear: PrevYearData,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  isElapsed: boolean,
): number | null {
  if (!prevYear.hasPrevYear) return null

  if (isElapsed) {
    // 経過モード: 全店合計の prevYear.totalSales は使えるが、店別は storeContributions
    // storeContributions は月間ベース → 経過用は未提供のため null
    // 全店用は aggregate 側で処理するので、ここでは store 別は null
    return null
  }

  // 月間モード: storeContributions から取得
  if (!prevYearMonthlyKpi.hasPrevYear) return null
  const contrib = prevYearMonthlyKpi.sameDow.storeContributions.find((c) => c.storeId === storeId)
  return contrib?.sales ?? null
}

// ─── Achievement / YoY Calculation ──────────────────────

function computeAchievement(actual: number, budget: number, isRate: boolean): number {
  if (isRate) return actual - budget // pp diff
  return safeDivide(actual, budget, 0) * 100 // %
}

function computeYoY(actual: number, ly: number | null, isRate: boolean): number | null {
  if (ly == null || ly === 0) return null
  if (isRate) return actual - ly // pp diff
  return safeDivide(actual, ly, 0) * 100 // %
}

// ─── Public: Build Rows ─────────────────────────────────

export interface BuildRowsInput {
  readonly allStoreResults: ReadonlyMap<string, StoreResult>
  readonly stores: ReadonlyMap<string, Store>
  readonly metric: MetricKey
  readonly tab: PeriodTab
  readonly elapsedDays: number | undefined
  readonly daysInMonth: number
  readonly prevYear: PrevYearData
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
}

export function buildRows(input: BuildRowsInput): readonly EnhancedRow[] {
  const { allStoreResults, stores, metric, tab, elapsedDays, daysInMonth } = input
  const isElapsed = tab === 'elapsed' && elapsedDays != null && elapsedDays < daysInMonth
  const def = METRIC_DEFS[metric]

  const rows: EnhancedRow[] = []

  for (const [storeId, sr] of allStoreResults) {
    const storeMaster = stores.get(storeId)
    const storeName = storeMaster?.name ?? storeId

    const { budget, actual } = extractMetric(sr, metric, tab, elapsedDays, daysInMonth)
    const achievement = computeAchievement(actual, budget, def.isRate)
    const diff = actual - budget

    // YoY: 売上のみ（GP の前年データは未提供）
    let ly: number | null = null
    let yoy: number | null = null
    if (metric === 'sales') {
      ly = extractLySales(storeId, input.prevYear, input.prevYearMonthlyKpi, isElapsed)
      yoy = computeYoY(actual, ly, def.isRate)
    }

    rows.push({ storeId, storeName, budget, actual, ly, achievement, diff, yoy })
  }

  // 店舗コード順にソート
  return rows.sort((a, b) => {
    const sa = stores.get(a.storeId)
    const sb = stores.get(b.storeId)
    return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
  })
}

// ─── Public: Build Total ────────────────────────────────

export function buildTotal(input: BuildRowsInput): EnhancedTotal {
  const { metric, tab, elapsedDays, daysInMonth, prevYear } = input
  const def = METRIC_DEFS[metric]

  // result は WidgetContext.result（全店合計の StoreResult）を使う
  // ただし buildTotal は allStoreResults の集約でも計算可能
  // ここでは rows から集約する（一貫性のため）
  const rows = buildRows(input)

  if (def.isRate) {
    // 粗利率: 加重平均（売上額ベース）が必要 → 全店 StoreResult から直接取る方が正確
    // rows の budget/actual はすでに % なので単純平均は不適切
    // → 呼び出し元で result を使う別パスが必要
    // ここでは rows の値をそのまま返す（全店1行のケース or 加重平均を別途実装）
    const budget = rows.length > 0 ? rows.reduce((s, r) => s + r.budget, 0) / rows.length : 0
    const actual = rows.length > 0 ? rows.reduce((s, r) => s + r.actual, 0) / rows.length : 0
    const achievement = actual - budget
    const diff = actual - budget
    return { budget, actual, ly: null, achievement, diff, yoy: null }
  }

  const budget = rows.reduce((s, r) => s + r.budget, 0)
  const actual = rows.reduce((s, r) => s + r.actual, 0)
  const achievement = computeAchievement(actual, budget, false)
  const diff = actual - budget

  let ly: number | null = null
  let yoy: number | null = null
  if (metric === 'sales' && prevYear.hasPrevYear) {
    const isElapsed = tab === 'elapsed' && elapsedDays != null && elapsedDays < daysInMonth
    if (isElapsed) {
      ly = prevYear.totalSales
    } else {
      ly = input.prevYearMonthlyKpi.hasPrevYear ? input.prevYearMonthlyKpi.sameDow.sales : null
    }
    yoy = computeYoY(actual, ly, false)
  }

  return { budget, actual, ly, achievement, diff, yoy }
}

// ─── Public: Build Total from main result ───────────────

/** 全店合計の StoreResult を使って正確な合計を計算する（粗利率の加重平均問題を回避） */
export function buildTotalFromResult(
  result: StoreResult,
  input: Omit<BuildRowsInput, 'allStoreResults' | 'stores'>,
): EnhancedTotal {
  const { metric, tab, elapsedDays, daysInMonth, prevYear, prevYearMonthlyKpi } = input
  const def = METRIC_DEFS[metric]

  const { budget, actual } = extractMetric(result, metric, tab, elapsedDays, daysInMonth)
  const achievement = computeAchievement(actual, budget, def.isRate)
  const diff = actual - budget

  let ly: number | null = null
  let yoy: number | null = null
  if (metric === 'sales' && prevYear.hasPrevYear) {
    const isElapsed = tab === 'elapsed' && elapsedDays != null && elapsedDays < daysInMonth
    if (isElapsed) {
      ly = prevYear.totalSales
    } else {
      ly = prevYearMonthlyKpi.hasPrevYear ? prevYearMonthlyKpi.sameDow.sales : null
    }
    yoy = computeYoY(actual, ly, false)
  }

  return { budget, actual, ly, achievement, diff, yoy }
}

// ─── Signal Colors ──────────────────────────────────────

export function achievementColor(val: number): string {
  if (val >= 100) return '#10b981'
  if (val >= 97) return '#eab308'
  return '#ef4444'
}

export function rateDiffColor(val: number): string {
  if (val >= 0) return '#10b981'
  if (val >= -0.5) return '#eab308'
  return '#ef4444'
}

export function resultColor(val: number, isRate: boolean): string {
  return isRate ? rateDiffColor(val) : achievementColor(val)
}

// ─── Formatters (thin wrappers) ─────────────────────────

/** 値表示: 率は xx.xx%、金額はカンマ区切り */
export function fmtValue(n: number, isRate: boolean): string {
  if (isRate) return formatPercent100(n)
  return n.toLocaleString('ja-JP', { maximumFractionDigits: 0 })
}

/** 達成率/差異表示 */
export function fmtAchievement(val: number, isRate: boolean): string {
  if (isRate) return `${val >= 0 ? '+' : ''}${formatPercent100(val).replace('%', 'pp')}`
  return formatPercent100(val)
}

/** すでに 100倍済みの値を %表示する（formatPercent は 0-1 入力前提のため） */
function formatPercent100(n: number): string {
  return `${n.toFixed(2)}%`
}

// ─── Card Summary (カード表面用データ) ──────────────────

export interface CardSummary {
  readonly key: MetricKey
  readonly label: string
  readonly icon: string
  readonly color: string
  readonly value: string
  readonly sub: string
  readonly signalColor: string
}

/** カード表面に表示する全店合計のサマリーを構築する */
export function buildCardSummaries(
  result: StoreResult,
  elapsedDays: number | undefined,
  daysInMonth: number,
  fmtCurrency: (n: number) => string,
): readonly CardSummary[] {
  const cards: CardSummary[] = []

  // 売上予算
  const salesM = extractMetric(result, 'sales', 'elapsed', elapsedDays, daysInMonth)
  const salesAch = computeAchievement(salesM.actual, salesM.budget, false)
  cards.push({
    key: 'sales',
    label: '売上予算',
    icon: 'S',
    color: '#3b82f6',
    value: fmtAchievement(salesAch, false),
    sub: `予算 ${fmtCurrency(salesM.budget)} / 実績 ${fmtCurrency(salesM.actual)}`,
    signalColor: achievementColor(salesAch),
  })

  // 粗利額予算
  const gpM = extractMetric(result, 'gp', 'elapsed', elapsedDays, daysInMonth)
  const gpAch = computeAchievement(gpM.actual, gpM.budget, false)
  cards.push({
    key: 'gp',
    label: '粗利額予算',
    icon: 'GP',
    color: '#8b5cf6',
    value: fmtAchievement(gpAch, false),
    sub: `予算 ${fmtCurrency(gpM.budget)} / 実績 ${fmtCurrency(gpM.actual)}`,
    signalColor: achievementColor(gpAch),
  })

  // 粗利率
  const gpRateM = extractMetric(result, 'gpRate', 'elapsed', elapsedDays, daysInMonth)
  const gpRateDiff = gpRateM.actual - gpRateM.budget
  cards.push({
    key: 'gpRate',
    label: '粗利率',
    icon: '%',
    color: '#06b6d4',
    value: formatPercent100(gpRateM.actual),
    sub: `予算 ${formatPercent100(gpRateM.budget)} / ${gpRateDiff >= 0 ? '+' : ''}${gpRateDiff.toFixed(2)}pp`,
    signalColor: rateDiffColor(gpRateDiff),
  })

  // 値入率
  const markupDiff = (result.averageMarkupRate - result.grossProfitRateBudget) * 100
  cards.push({
    key: 'markupRate',
    label: '値入率',
    icon: 'M',
    color: '#f59e0b',
    value: formatPercent100(result.averageMarkupRate * 100),
    sub: `コア値入率 ${formatPercent100(result.coreMarkupRate * 100)}`,
    signalColor: rateDiffColor(markupDiff),
  })

  // 値引率
  cards.push({
    key: 'discountRate',
    label: '値引率',
    icon: 'D',
    color: '#ef4444',
    value: formatPercent100(result.discountRate * 100),
    sub: `値引額 ${fmtCurrency(result.totalDiscount)}`,
    signalColor:
      result.discountRate * 100 > 3
        ? '#ef4444'
        : result.discountRate * 100 > 1
          ? '#eab308'
          : '#10b981',
  })

  return cards
}

// ─── Budget Header ──────────────────────────────────────

export interface BudgetHeaderData {
  readonly monthlyBudget: number
  readonly grossProfitBudget: number
  readonly grossProfitRateBudget: number
  readonly prevYearSales: number | null
  readonly budgetGrowthRate: number | null
  readonly alignmentLabel: string
}

/** 月間固定の予算コンテキスト情報を構築する */
export function buildBudgetHeader(
  result: StoreResult,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  policy: AlignmentPolicy,
): BudgetHeaderData {
  const alignmentLabel = policy === 'sameDayOfWeek' ? '同曜日' : '同日'

  let prevYearSales: number | null = null
  if (prevYearMonthlyKpi.hasPrevYear) {
    prevYearSales =
      policy === 'sameDayOfWeek'
        ? prevYearMonthlyKpi.sameDow.sales
        : prevYearMonthlyKpi.sameDate.sales
  }

  const budgetGrowthRate =
    prevYearSales != null && prevYearSales > 0
      ? safeDivide(result.budget, prevYearSales, 0) - 1
      : null

  return {
    monthlyBudget: result.budget,
    grossProfitBudget: result.grossProfitBudget,
    grossProfitRateBudget: result.grossProfitRateBudget,
    prevYearSales,
    budgetGrowthRate,
    alignmentLabel,
  }
}
