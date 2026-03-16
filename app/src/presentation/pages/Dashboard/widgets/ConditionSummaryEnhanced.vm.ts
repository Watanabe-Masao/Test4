/**
 * コンディションサマリー強化版 — ViewModel
 *
 * WidgetContext + StoreResult から店別予算達成メトリクスを導出する純粋関数群。
 * Presentation 層の描画ロジックからデータ変換を分離する（原則#9: 描画は純粋）。
 */

import {
  safeDivide,
  calculateAchievementRate,
  calculateYoYRatio,
} from '@/domain/calculations/utils'
import { calculateMarkupRates } from '@/domain/calculations/markupRate'
import { calculateDiscountRate } from '@/domain/calculations/estMethod'
import {
  computeGpAfterConsumable,
  computeGpAfterConsumableAmount,
  computeGpBeforeConsumable,
} from './conditionSummaryUtils'
import type { StoreResult, Store, DiscountEntry } from '@/domain/models'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
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
  discountRate: { label: '売変率', icon: 'D', color: '#ef4444', isRate: true },
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
  /** 粗利率メトリクス専用: 原算前粗利率 (×100済) */
  readonly gpBeforeConsumable: number | null
  /** 売変率メトリクス専用: 種別内訳 (71/72/73/74) */
  readonly discountEntries: readonly DiscountEntry[] | null
}

export interface EnhancedTotal {
  readonly budget: number
  readonly actual: number
  readonly ly: number | null
  readonly achievement: number
  readonly diff: number
  readonly yoy: number | null
  /** 粗利率メトリクス専用: 原算前粗利率 (×100済) */
  readonly gpBeforeConsumable: number | null
  /** 売変率メトリクス専用: 種別内訳 (71/72/73/74) */
  readonly discountEntries: readonly DiscountEntry[] | null
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
  return calculateAchievementRate(actual, budget) * 100 // %
}

function computeYoY(actual: number, ly: number | null, isRate: boolean): number | null {
  if (ly == null || ly === 0) return null
  if (isRate) return actual - ly // pp diff
  return calculateYoYRatio(actual, ly) * 100 // %
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

    // 粗利率メトリクス: 原算前粗利率
    const gpBeforeConsumable = metric === 'gpRate' ? computeGpBeforeConsumable(sr) * 100 : null

    // 売変率メトリクス: 種別内訳
    const discountEntries = metric === 'discountRate' ? sr.discountEntries : null

    rows.push({
      storeId,
      storeName,
      budget,
      actual,
      ly,
      achievement,
      diff,
      yoy,
      gpBeforeConsumable,
      discountEntries,
    })
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
    return {
      budget,
      actual,
      ly: null,
      achievement,
      diff,
      yoy: null,
      gpBeforeConsumable: null,
      discountEntries: null,
    }
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

  return {
    budget,
    actual,
    ly,
    achievement,
    diff,
    yoy,
    gpBeforeConsumable: null,
    discountEntries: null,
  }
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

  const gpBeforeConsumable = metric === 'gpRate' ? computeGpBeforeConsumable(result) * 100 : null
  const discountEntries = metric === 'discountRate' ? result.discountEntries : null

  return { budget, actual, ly, achievement, diff, yoy, gpBeforeConsumable, discountEntries }
}

// ─── Daily Modal Data ───────────────────────────────────

export interface DailyDetailRow {
  readonly day: number
  readonly budget: number
  readonly actual: number
  readonly diff: number
  readonly achievement: number
  readonly cumBudget: number
  readonly cumActual: number
  readonly cumDiff: number
  readonly cumAchievement: number
}

/** 日別モーダルの前年比行 */
export interface DailyYoYRow {
  readonly day: number
  readonly prevActual: number
  readonly curActual: number
  readonly yoy: number
}

/** 店舗の日別詳細データを構築する（売上・粗利額用） */
export function buildDailyDetailRows(
  sr: StoreResult,
  metric: MetricKey,
  elapsedDays: number,
  daysInMonth: number,
): readonly DailyDetailRow[] {
  const effectiveElapsed = elapsedDays ?? daysInMonth

  // GP: 日別は推定法（sales - totalCost - costInclusion）で計算するが、
  // 店別行は在庫法（invMethodGrossProfit）を使うため差異が出る。
  // 在庫法の調整額を各日に按分し、累計が店別行の値と一致するようにする。
  if (metric === 'gp') {
    return buildGpDailyRows(sr, effectiveElapsed)
  }

  const rows: DailyDetailRow[] = []
  let cumBudget = 0
  let cumActual = 0

  for (let day = 1; day <= effectiveElapsed; day++) {
    let dailyBudget: number
    let dailyActual: number

    if (metric === 'sales') {
      dailyBudget = sr.budgetDaily.get(day) ?? 0
      dailyActual = sr.daily.get(day)?.sales ?? 0
    } else {
      // Rate metrics: use daily rate values
      const dailyRecord = sr.daily.get(day)
      if (!dailyRecord) {
        rows.push({
          day,
          budget: 0,
          actual: 0,
          diff: 0,
          achievement: 0,
          cumBudget: cumBudget,
          cumActual: cumActual,
          cumDiff: cumActual - cumBudget,
          cumAchievement: 0,
        })
        continue
      }
      if (metric === 'markupRate') {
        dailyBudget = sr.grossProfitRateBudget * 100
        // domain/calculations/markupRate の calculateMarkupRates を使用
        const { averageMarkupRate } = calculateMarkupRates({
          purchasePrice: dailyRecord.purchase.price,
          purchaseCost: dailyRecord.purchase.cost,
          deliveryPrice: dailyRecord.flowers.price + dailyRecord.directProduce.price,
          deliveryCost: dailyRecord.flowers.cost + dailyRecord.directProduce.cost,
          transferPrice:
            dailyRecord.interStoreIn.price +
            dailyRecord.interStoreOut.price +
            dailyRecord.interDepartmentIn.price +
            dailyRecord.interDepartmentOut.price,
          transferCost:
            dailyRecord.interStoreIn.cost +
            dailyRecord.interStoreOut.cost +
            dailyRecord.interDepartmentIn.cost +
            dailyRecord.interDepartmentOut.cost,
          defaultMarkupRate: 0,
        })
        dailyActual = averageMarkupRate * 100
      } else if (metric === 'discountRate') {
        dailyBudget = 0
        // domain/calculations/estMethod の calculateDiscountRate を使用
        dailyActual = calculateDiscountRate(dailyRecord.sales, dailyRecord.discountAbsolute) * 100
      } else if (metric === 'gpRate') {
        dailyBudget = sr.grossProfitRateBudget * 100
        dailyActual =
          dailyRecord.sales > 0
            ? ((dailyRecord.sales - dailyRecord.totalCost - dailyRecord.costInclusion.cost) /
                dailyRecord.sales) *
              100
            : 0
      } else {
        dailyBudget = 0
        dailyActual = 0
      }
    }

    cumBudget += dailyBudget
    cumActual += dailyActual

    const diff = dailyActual - dailyBudget
    const achievement =
      metric === 'markupRate'
        ? dailyActual - dailyBudget
        : dailyBudget > 0
          ? calculateAchievementRate(dailyActual, dailyBudget) * 100
          : 0
    const cumDiff = cumActual - cumBudget
    const cumAchievement =
      metric === 'markupRate'
        ? cumBudget > 0
          ? safeDivide(cumActual, effectiveElapsed > 0 ? day : 1, 0) -
            sr.grossProfitRateBudget * 100
          : 0
        : cumBudget > 0
          ? calculateAchievementRate(cumActual, cumBudget) * 100
          : 0

    rows.push({
      day,
      budget: dailyBudget,
      actual: dailyActual,
      diff,
      achievement,
      cumBudget,
      cumActual,
      cumDiff,
      cumAchievement,
    })
  }
  return rows
}

/**
 * GP 日別行を構築する。
 *
 * 在庫法と推定法を明確に分けて計算する。
 *
 * 【在庫法】invMethodGrossProfitRate が有効な場合:
 *   dailyGP = dailySales × invMethodGrossProfitRate - dailyCostInclusion
 *   → 在庫法の粗利率を日別売上に一律適用し、原価算入費を控除
 *   → 累計 = invMethodGrossProfit - totalCostInclusion（店別行と一致）
 *
 * 【推定法】invMethodGrossProfitRate が null の場合:
 *   dailyGP = dailyCoreSales × estMethodMarginRate
 *   → 推定法マージン率をコア売上に適用（COGS に原価算入費が既に含まれる）
 *   → 累計 = estMethodMargin（店別行と一致）
 */
function buildGpDailyRows(sr: StoreResult, effectiveElapsed: number): DailyDetailRow[] {
  const useInvMethod = sr.invMethodGrossProfitRate != null
  const gpRate = useInvMethod ? sr.invMethodGrossProfitRate! : sr.estMethodMarginRate

  const rows: DailyDetailRow[] = []
  let cumBudget = 0
  let cumActual = 0

  for (let day = 1; day <= effectiveElapsed; day++) {
    const salesBudgetDay = sr.budgetDaily.get(day) ?? 0
    const dailyBudget = sr.budget > 0 ? sr.grossProfitBudget * (salesBudgetDay / sr.budget) : 0
    const dailyRecord = sr.daily.get(day)

    let dailyActual: number
    if (!dailyRecord) {
      dailyActual = 0
    } else if (useInvMethod) {
      // 在庫法: 粗利率を売上に適用 → 原価算入費を別途控除
      dailyActual = dailyRecord.sales * gpRate - dailyRecord.costInclusion.cost
    } else {
      // 推定法: マージン率をコア売上に適用（原価算入費はレートに含まれる）
      dailyActual = dailyRecord.coreSales * gpRate
    }

    cumBudget += dailyBudget
    cumActual += dailyActual

    const diff = dailyActual - dailyBudget
    const achievement =
      dailyBudget > 0 ? calculateAchievementRate(dailyActual, dailyBudget) * 100 : 0
    const cumDiff = cumActual - cumBudget
    const cumAchievement = cumBudget > 0 ? calculateAchievementRate(cumActual, cumBudget) * 100 : 0

    rows.push({
      day,
      budget: dailyBudget,
      actual: dailyActual,
      diff,
      achievement,
      cumBudget,
      cumActual,
      cumDiff,
      cumAchievement,
    })
  }

  return rows
}

/** 店舗の日別前年比データを構築する（storeContributions ベース） */
export function buildDailyYoYRows(
  sr: StoreResult,
  storeId: string,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  elapsedDays: number,
  daysInMonth: number,
): readonly DailyYoYRow[] {
  if (!prevYearMonthlyKpi.hasPrevYear) return []
  const effectiveElapsed = elapsedDays ?? daysInMonth

  // storeContributions から storeId × mappedDay でインデックス化
  const prevByDay = new Map<number, number>()
  for (const c of prevYearMonthlyKpi.sameDow.storeContributions) {
    if (c.storeId === storeId) {
      prevByDay.set(c.mappedDay, (prevByDay.get(c.mappedDay) ?? 0) + c.sales)
    }
  }

  const rows: DailyYoYRow[] = []
  for (let day = 1; day <= effectiveElapsed; day++) {
    const curActual = sr.daily.get(day)?.sales ?? 0
    const prevActual = prevByDay.get(day) ?? 0
    const yoy = prevActual > 0 ? calculateYoYRatio(curActual, prevActual) * 100 : 0
    rows.push({ day, prevActual, curActual, yoy })
  }
  return rows
}

/** 日別売変種別内訳行 */
export interface DailyDiscountRow {
  readonly day: number
  readonly totalRate: number
  /** 種別別金額 (71/72/73/74 順) */
  readonly entries: readonly { readonly type: string; readonly amount: number }[]
  readonly totalAmount: number
}

/** 店舗の日別売変種別内訳を構築する */
export function buildDailyDiscountRows(
  sr: StoreResult,
  elapsedDays: number,
  daysInMonth: number,
): readonly DailyDiscountRow[] {
  const effectiveElapsed = elapsedDays ?? daysInMonth
  const rows: DailyDiscountRow[] = []

  for (let day = 1; day <= effectiveElapsed; day++) {
    const dailyRecord = sr.daily.get(day)
    if (!dailyRecord) {
      rows.push({ day, totalRate: 0, entries: [], totalAmount: 0 })
      continue
    }

    const grossSales = dailyRecord.sales + dailyRecord.discountAbsolute
    const totalRate = grossSales > 0 ? (dailyRecord.discountAbsolute / grossSales) * 100 : 0

    const entries = dailyRecord.discountEntries.map((e) => ({
      type: e.type,
      amount: e.amount,
    }))

    rows.push({ day, totalRate, entries, totalAmount: dailyRecord.discountAbsolute })
  }
  return rows
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
    label: '売変率',
    icon: 'D',
    color: '#ef4444',
    value: formatPercent100(result.discountRate * 100),
    sub: `売変額 ${fmtCurrency(result.totalDiscount)}`,
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

export interface DowGapSummary {
  /** 曜日構成ラベル（例: "▲土＋火"） */
  readonly label: string
  /** 平均売上ベースの影響額 */
  readonly avgImpact: number
  /** 実日ベースの影響額（shiftedIn/Out の実売上差分） */
  readonly actualImpact: number | null
}

export interface BudgetHeaderData {
  readonly monthlyBudget: number
  readonly grossProfitBudget: number
  readonly grossProfitRateBudget: number
  /** 前年同日（カレンダー同月）売上 — 月間フル */
  readonly prevYearSalesSameDate: number | null
  /** 前年同曜日売上 — 月間フル */
  readonly prevYearSalesSameDow: number | null
  /** 予算前年比（例: 1.0135 = 101.35%） — sameDate ベース */
  readonly budgetVsPrevYearSameDate: number | null
  /** 予算前年比 — sameDow ベース */
  readonly budgetVsPrevYearSameDow: number | null
  /** 曜日ギャップ情報（構成が同じ場合は null） */
  readonly dowGap: DowGapSummary | null
}

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/**
 * 曜日ギャップの要約を構築する。
 *
 * dowCounts から日数差がある曜日を抽出し、
 * "▲土＋火" のようなラベルと、平均売上 / 実日の2種の影響額を返す。
 * アライメント設定に依存しない固定値。
 */
function buildDowGapSummary(dowGap: DowGapAnalysis): DowGapSummary | null {
  if (dowGap.isSameStructure || !dowGap.isValid) return null

  // ラベル構築: 減った曜日を▲、増えた曜日を＋で表記
  const parts: string[] = []
  for (const c of dowGap.dowCounts) {
    if (c.diff < 0) {
      // 前年より当年が少ない = 前年に多かった曜日 → 同曜日では消える
      for (let i = 0; i < Math.abs(c.diff); i++) parts.push(`▲${DOW_LABELS[c.dow]}`)
    }
    if (c.diff > 0) {
      // 前年より当年が多い = 同曜日では新たに加わる
      for (let i = 0; i < c.diff; i++) parts.push(`＋${DOW_LABELS[c.dow]}`)
    }
  }

  const label = parts.join('')

  return {
    label,
    avgImpact: dowGap.estimatedImpact,
    actualImpact: dowGap.actualDayImpact?.isValid ? dowGap.actualDayImpact.estimatedImpact : null,
  }
}

/** 月間固定の予算コンテキスト情報を構築する */
export function buildBudgetHeader(
  result: StoreResult,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  dowGap: DowGapAnalysis,
): BudgetHeaderData {
  let prevYearSalesSameDate: number | null = null
  let prevYearSalesSameDow: number | null = null
  if (prevYearMonthlyKpi.hasPrevYear) {
    prevYearSalesSameDate = prevYearMonthlyKpi.sameDate.sales
    prevYearSalesSameDow = prevYearMonthlyKpi.sameDow.sales
  }

  const budgetVsPrevYearSameDate =
    prevYearSalesSameDate != null && prevYearSalesSameDate > 0
      ? safeDivide(result.budget, prevYearSalesSameDate, 0)
      : null
  const budgetVsPrevYearSameDow =
    prevYearSalesSameDow != null && prevYearSalesSameDow > 0
      ? safeDivide(result.budget, prevYearSalesSameDow, 0)
      : null

  return {
    monthlyBudget: result.budget,
    grossProfitBudget: result.grossProfitBudget,
    grossProfitRateBudget: result.grossProfitRateBudget,
    prevYearSalesSameDate,
    prevYearSalesSameDow,
    budgetVsPrevYearSameDate,
    budgetVsPrevYearSameDow,
    dowGap: buildDowGapSummary(dowGap),
  }
}
