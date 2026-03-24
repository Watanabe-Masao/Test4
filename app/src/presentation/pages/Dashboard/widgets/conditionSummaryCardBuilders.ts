/**
 * コンディションサマリー強化版 — カード/ヘッダー/バッジビルダー
 *
 * @guard F7 View は ViewModel のみ受け取る
 */

import { safeDivide } from '@/domain/calculations/utils'
import { calculateRemainingBudgetRate } from '@/domain/calculations/remainingBudgetRate'
import { formatPercent } from '@/domain/formatting'
import type { MetricId } from '@/domain/models/analysis'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { isMetricEnabled } from '@/domain/calculations/rules/conditionResolver'
import { metricSignal, SIGNAL_COLORS } from './conditionSummaryUtils'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import { calculateTransactionValue } from '@/domain/calculations/utils'
import type { PrevYearData } from '@/application/hooks/analytics'
import type { MetricKey } from './conditionSummaryTypes'
import { extractMetric, computeAchievement } from './conditionSummaryHelpers'
import {
  formatPercent100,
  achievementColor,
  rateDiffColor,
  fmtAchievement,
} from './conditionSummaryFormatters'

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

// ─── Trend Computation (直近7日 vs 前7日) ───────────────

/**
 * 日別データから直近N日の合計を前N日と比較し、トレンド方向と比率を返す。
 *
 * @param daily StoreResult.daily
 * @param effectiveDay 経過日数（最新日）
 * @param extractor 日別レコードから値を抽出する関数
 * @param halfDays 半期間日数（デフォルト7）
 */
export function computeTrend<T>(
  daily: ReadonlyMap<number, T>,
  effectiveDay: number,
  extractor: (rec: T) => number,
  halfDays = 7,
): { direction: TrendDirection; ratio: string } | undefined {
  if (effectiveDay < halfDays * 2) return undefined

  let recentSum = 0
  let prevSum = 0
  const recentStart = effectiveDay - halfDays + 1
  const prevStart = recentStart - halfDays

  for (let d = recentStart; d <= effectiveDay; d++) {
    const rec = daily.get(d)
    if (rec) recentSum += extractor(rec)
  }
  for (let d = prevStart; d < recentStart; d++) {
    const rec = daily.get(d)
    if (rec) prevSum += extractor(rec)
  }

  if (prevSum === 0) return undefined
  const ratio = recentSum / prevSum
  const direction: TrendDirection = ratio >= 1.02 ? 'up' : ratio <= 0.98 ? 'down' : 'flat'
  return { direction, ratio: formatPercent(ratio, 2) }
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
  /**
   * 月間前年売上（alignment不要の固定値）。
   * 前年ソース月の全日データを単純合計。取り込み期間に影響されない。
   */
  readonly prevYearMonthlySales: number | null
  /** 予算前年比（例: 1.0135 = 101.35%）— 月間トータルベース */
  readonly budgetVsPrevYear: number | null
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
function buildDowGapSummary(dowGap: DowGapAnalysis | undefined): DowGapSummary | null {
  if (!dowGap || dowGap.isSameStructure || !dowGap.isValid) return null

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

  // 中央値があればそちらを優先（外れ値に対してロバスト）
  const avgImpact = dowGap.methodResults?.median?.salesImpact ?? dowGap.estimatedImpact

  return {
    label,
    avgImpact,
    actualImpact: dowGap.actualDayImpact?.isValid ? dowGap.actualDayImpact.estimatedImpact : null,
  }
}

/**
 * 月間固定の予算コンテキスト情報を構築する。
 *
 * ## 期間スコープの意味論
 *
 * prevYearMode に応じて前年売上の取得元を切り替える:
 * - 'sameDate': monthlyTotal（alignment不要の全日合計）を使用
 * - 'sameDow': sameDow.sales（同曜日 alignment 経由の集計）を使用
 *
 * 予算前年比もこれに連動する。
 */
export function buildBudgetHeader(
  result: StoreResult,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  dowGap: DowGapAnalysis | undefined,
  prevYearMode: 'sameDate' | 'sameDow' = 'sameDate',
): BudgetHeaderData {
  const rawSales =
    prevYearMode === 'sameDow'
      ? prevYearMonthlyKpi.sameDow.sales
      : prevYearMonthlyKpi.monthlyTotal.sales
  const prevYearMonthlySales = prevYearMonthlyKpi.hasPrevYear && rawSales > 0 ? rawSales : null

  const budgetVsPrevYear =
    prevYearMonthlySales != null ? safeDivide(result.budget, prevYearMonthlySales, 0) : null

  return {
    monthlyBudget: result.budget,
    grossProfitBudget: result.grossProfitBudget,
    grossProfitRateBudget: result.grossProfitRateBudget,
    prevYearMonthlySales,
    budgetVsPrevYear,
    dowGap: buildDowGapSummary(dowGap),
  }
}

// ─── YoY Card Summary (前年比メトリクス) ───────────────

export type YoYCardKey = 'customerYoY' | 'itemsYoY' | 'txValue' | 'requiredPace' | 'totalCost'

export interface YoYCardSummary {
  readonly key: YoYCardKey
  readonly label: string
  readonly value: string
  readonly sub: string
  readonly signalColor: string
  readonly metricId: MetricId | null
  readonly detailBreakdown:
    | 'customerYoY'
    | 'txValue'
    | 'itemsYoY'
    | 'requiredPace'
    | 'totalCost'
    | null
}

export interface BuildYoYCardsInput {
  readonly result: StoreResult
  readonly prevYear: PrevYearData
  readonly config: ConditionSummaryConfig
  readonly ctsCurrentQty: number
  readonly ctsPrevQty: number
  readonly fmtCurrency: (n: number) => string
  readonly prevYearTotalCost?: number
  readonly elapsedDays: number
  readonly daysInMonth: number
}

/** 前年比系のカードデータを構築する */
export function buildYoYCards(input: BuildYoYCardsInput): readonly YoYCardSummary[] {
  const {
    result: r,
    prevYear,
    config,
    ctsCurrentQty,
    ctsPrevQty,
    fmtCurrency,
    prevYearTotalCost,
    elapsedDays,
    daysInMonth,
  } = input
  const cards: YoYCardSummary[] = []

  // 客数前年比
  if (
    isMetricEnabled(config, 'customerYoY') &&
    prevYear.hasPrevYear &&
    prevYear.totalCustomers > 0 &&
    r.totalCustomers > 0
  ) {
    const custYoY = r.totalCustomers / prevYear.totalCustomers
    cards.push({
      key: 'customerYoY',
      label: '客数前年比',
      value: formatPercent(custYoY, 2),
      sub: `${r.totalCustomers.toLocaleString()}人 / 前年${prevYear.totalCustomers.toLocaleString()}人`,
      signalColor: SIGNAL_COLORS[metricSignal(custYoY, 'customerYoY', config)],
      metricId: 'totalCustomers',
      detailBreakdown: 'customerYoY',
    })
  }

  // 販売点数前年比
  if (
    isMetricEnabled(config, 'itemsYoY') &&
    prevYear.hasPrevYear &&
    ctsCurrentQty > 0 &&
    ctsPrevQty > 0
  ) {
    const itemsYoY = ctsCurrentQty / ctsPrevQty
    cards.push({
      key: 'itemsYoY',
      label: '販売点数前年比',
      value: formatPercent(itemsYoY, 2),
      sub: `当年 ${ctsCurrentQty.toLocaleString()}点 / 前年 ${ctsPrevQty.toLocaleString()}点`,
      signalColor: SIGNAL_COLORS[metricSignal(itemsYoY, 'itemsYoY', config)],
      metricId: null,
      detailBreakdown: 'itemsYoY' as const,
    })
  }

  // 客単価前年比
  if (
    isMetricEnabled(config, 'txValue') &&
    prevYear.hasPrevYear &&
    r.totalCustomers > 0 &&
    prevYear.totalCustomers > 0
  ) {
    const txValue = r.transactionValue
    const prevTxValue = calculateTransactionValue(prevYear.totalSales, prevYear.totalCustomers)
    const txYoY = prevTxValue > 0 ? txValue / prevTxValue : null
    const fmtTx = (v: number) =>
      `${v.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}円`
    if (txYoY != null) {
      cards.push({
        key: 'txValue',
        label: '客単価前年比',
        value: formatPercent(txYoY, 2),
        sub: `当年 ${fmtTx(txValue)} / 前年 ${fmtTx(prevTxValue)}`,
        signalColor: SIGNAL_COLORS[metricSignal(txYoY, 'txValue', config)],
        metricId: 'totalCustomers',
        detailBreakdown: 'txValue',
      })
    }
  }

  // 残予算必要達成率
  if (isMetricEnabled(config, 'requiredPace') && r.budget > 0 && elapsedDays < daysInMonth) {
    const rate = calculateRemainingBudgetRate({
      budget: r.budget,
      totalSales: r.totalSales,
      budgetDaily: r.budgetDaily,
      elapsedDays,
      daysInMonth,
    })
    // rate は %値 (100 = 計画通り)
    const remaining = r.budget - r.totalSales
    let remainingPeriodBudget = 0
    for (let d = elapsedDays + 1; d <= daysInMonth; d++) {
      remainingPeriodBudget += r.budgetDaily.get(d) ?? 0
    }
    const paceRatio = rate / 100 // signalの比較用に比率化
    cards.push({
      key: 'requiredPace',
      label: '残予算必要達成率',
      value: formatPercent(paceRatio, 2),
      sub: `残予算 ${fmtCurrency(remaining)} / 残期間予算 ${fmtCurrency(remainingPeriodBudget)}`,
      signalColor: SIGNAL_COLORS[metricSignal(paceRatio, 'requiredPace', config)],
      metricId: null,
      detailBreakdown: 'requiredPace' as const,
    })
  }

  // 総仕入前年比
  if (r.totalCost > 0 && prevYearTotalCost != null && prevYearTotalCost > 0) {
    const costYoY = r.totalCost / prevYearTotalCost
    cards.push({
      key: 'totalCost',
      label: '総仕入前年比',
      value: formatPercent(costYoY, 2),
      sub: `当年 ${fmtCurrency(r.totalCost)} / 前年 ${fmtCurrency(prevYearTotalCost)}`,
      signalColor: SIGNAL_COLORS[metricSignal(costYoY, 'customerYoY', config)],
      metricId: null,
      detailBreakdown: 'totalCost' as const,
    })
  }

  return cards
}

// ─── Unified Card Data ─────────────────────────────────

export type ConditionCardId =
  | 'sales'
  | 'gp'
  | 'gpRate'
  | 'markupRate'
  | 'discountRate'
  | 'totalCost'
  | 'customerYoY'
  | 'itemsYoY'
  | 'txValue'
  | 'requiredPace'

/**
 * カードの表示順序定義。
 * 並び替えはこの配列の順序を変更するだけで反映される。
 */
export const CONDITION_CARD_ORDER: readonly ConditionCardId[] = [
  'sales',
  'gp',
  'gpRate',
  'markupRate',
  'discountRate',
  'customerYoY',
  'itemsYoY',
  'txValue',
  'totalCost',
  'requiredPace',
]

/** カードの分類グループ */
export const CONDITION_CARD_GROUP: Record<ConditionCardId, 'budget' | 'yoy'> = {
  sales: 'budget',
  gp: 'budget',
  gpRate: 'budget',
  markupRate: 'budget',
  discountRate: 'budget',
  customerYoY: 'yoy',
  itemsYoY: 'yoy',
  txValue: 'yoy',
  totalCost: 'yoy',
  requiredPace: 'yoy',
}

export type TrendDirection = 'up' | 'down' | 'flat'

export interface UnifiedCardData {
  readonly id: ConditionCardId
  readonly group: 'budget' | 'yoy'
  readonly label: string
  readonly value: string
  readonly sub: string
  readonly signalColor: string
  readonly clickable: boolean
  /** 直近1週間トレンド（前半 vs 後半）。対象メトリクスのみ */
  readonly trend?: { readonly direction: TrendDirection; readonly ratio: string }
}

/** budget + yoY カードを統一配列に変換し、CONDITION_CARD_ORDER 順でソートする */
export function buildUnifiedCards(
  budgetCards: readonly CardSummary[],
  yoyCards: readonly YoYCardSummary[],
  hasMultipleStores: boolean,
  trends?: ReadonlyMap<string, { direction: TrendDirection; ratio: string }>,
): readonly UnifiedCardData[] {
  const map = new Map<string, UnifiedCardData>()

  for (const c of budgetCards) {
    map.set(c.key, {
      id: c.key as ConditionCardId,
      group: 'budget',
      label: c.label,
      value: c.value,
      sub: c.sub,
      signalColor: c.signalColor,
      clickable: true,
      trend: trends?.get(c.key),
    })
  }

  for (const c of yoyCards) {
    map.set(c.key, {
      id: c.key as ConditionCardId,
      group: 'yoy',
      label: c.label,
      value: c.value,
      sub: c.sub,
      signalColor: c.signalColor,
      clickable: hasMultipleStores && c.detailBreakdown != null,
      trend: trends?.get(c.key),
    })
  }

  const ordered: UnifiedCardData[] = []
  for (const id of CONDITION_CARD_ORDER) {
    const card = map.get(id)
    if (card) ordered.push(card)
  }
  return ordered
}
