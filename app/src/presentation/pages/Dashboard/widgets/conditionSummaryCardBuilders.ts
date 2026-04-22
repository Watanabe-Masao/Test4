/**
 * コンディションサマリー強化版 — カード/ヘッダー/バッジビルダー
 *
 * @guard F7 View は ViewModel のみ受け取る
 */

import { safeDivide, calculateYoYRatio } from '@/domain/calculations/utils'
import { calculateRemainingBudgetRate } from '@/domain/calculations/remainingBudgetRate'
import { calculateCustomerGap } from '@/domain/calculations/customerGap'
import { formatPercent } from '@/domain/formatting'
import type { MetricId } from '@/domain/models/analysis'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { isMetricEnabled } from '@/application/rules/conditionResolver'
import { metricSignal, SIGNAL_COLORS } from './conditionSummaryUtils'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import { calculateTransactionValue } from '@/domain/calculations/utils'
import type { PrevYearData } from '@/application/hooks/analytics'
import { selectMonthlyPrevYearSales } from '@/application/readModels/prevYear'
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
  /** 未設定データがある場合のツールチップ案内 */
  readonly hint?: string
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
  const gpBudgetSet = result.grossProfitBudget > 0
  if (gpBudgetSet) {
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
  } else {
    cards.push({
      key: 'gp',
      label: '粗利額予算',
      icon: 'GP',
      color: '#9ca3af',
      value: '未設定',
      sub: `実績 ${fmtCurrency(gpM.actual)}`,
      signalColor: '#9ca3af',
      hint: '在庫設定ファイルで粗利額予算を入力してください',
    })
  }

  // 粗利率
  const gpRateM = extractMetric(result, 'gpRate', 'elapsed', elapsedDays, daysInMonth)
  const gpRateDiff = gpRateM.actual - gpRateM.budget
  cards.push({
    key: 'gpRate',
    label: '粗利率',
    icon: '%',
    color: '#06b6d4',
    value: formatPercent100(gpRateM.actual),
    sub: gpBudgetSet
      ? `予算 ${formatPercent100(gpRateM.budget)} / ${gpRateDiff >= 0 ? '+' : ''}${gpRateDiff.toFixed(2)}pp`
      : `予算未設定 / 実績 ${formatPercent100(gpRateM.actual)}`,
    signalColor: gpBudgetSet ? rateDiffColor(gpRateDiff) : '#9ca3af',
    hint: gpBudgetSet ? undefined : '粗利額予算が未設定のため予算対比を算出できません',
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

/**
 * 率メトリクスのトレンド: 直近N日と前N日の加重平均率を比較する。
 *
 * 通常の computeTrend は合計値の比率を見るが、率指標は
 * sum(numerator) / sum(denominator) の加重平均で比較しないと
 * 曜日ごとの売上規模の偏りで歪む。
 *
 * direction は率の差（pp）で判定: ≥+0.2pp up, ≤-0.2pp down, else flat
 */
export function computeRateTrend<T>(
  daily: ReadonlyMap<number, T>,
  effectiveDay: number,
  numeratorExtractor: (rec: T) => number,
  denominatorExtractor: (rec: T) => number,
  halfDays = 7,
): { direction: TrendDirection; ratio: string } | undefined {
  if (effectiveDay < halfDays * 2) return undefined

  let recentNum = 0
  let recentDen = 0
  let prevNum = 0
  let prevDen = 0
  const recentStart = effectiveDay - halfDays + 1
  const prevStart = recentStart - halfDays

  for (let d = recentStart; d <= effectiveDay; d++) {
    const rec = daily.get(d)
    if (rec) {
      recentNum += numeratorExtractor(rec)
      recentDen += denominatorExtractor(rec)
    }
  }
  for (let d = prevStart; d < recentStart; d++) {
    const rec = daily.get(d)
    if (rec) {
      prevNum += numeratorExtractor(rec)
      prevDen += denominatorExtractor(rec)
    }
  }

  if (recentDen === 0 || prevDen === 0) return undefined
  const recentRate = recentNum / recentDen
  const prevRate = prevNum / prevDen
  const diffPp = (recentRate - prevRate) * 100
  const direction: TrendDirection = diffPp >= 0.2 ? 'up' : diffPp <= -0.2 ? 'down' : 'flat'
  return { direction, ratio: `${diffPp >= 0 ? '+' : ''}${diffPp.toFixed(2)}pp` }
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
 * ヘッダーは「月間粒度の期間プリセット」として機能する。`prevYearMode` による
 * 前年売上の切替:
 * - 'sameDate': 前年同月の全日合計 (`kpi.monthlyTotal.sales`)
 * - 'sameDow' : 前年同曜日 alignment 経由の月全体合計 (`kpi.sameDow.sales`)
 *
 * どちらのモードも **取り込み期間 (elapsedDays / dataEndDay) にキャップされない**
 * 月全体の値を返す (選択経路は `selectMonthlyPrevYearSales` に集約)。
 *
 * ## 期間スコープ値の使用禁止
 *
 * `FreePeriodReadModel.comparisonSummary.totalSales` 等の analysis frame scope
 * 値はヘッダーでは使用しない。bundle ロード完了で月間ラベルの値が縮む回帰
 * (「月間前年売上」が elapsed 日までの合計に上書きされる) を防止するため。
 *
 * @see features/comparison/application/selectMonthlyPrevYearSales.ts
 */
export function buildBudgetHeader(
  result: StoreResult,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  dowGap: DowGapAnalysis | undefined,
  prevYearMode: 'sameDate' | 'sameDow' = 'sameDate',
): BudgetHeaderData {
  const prevYearProjection = selectMonthlyPrevYearSales(prevYearMonthlyKpi, prevYearMode)
  const prevYearMonthlySales = prevYearProjection.hasPrevYear
    ? prevYearProjection.monthlySales
    : null

  const budgetVsPrevYear =
    prevYearMonthlySales != null && prevYearMonthlySales > 0
      ? safeDivide(result.budget, prevYearMonthlySales, 0)
      : null

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

export type YoYCardKey =
  | 'customerYoY'
  | 'itemsYoY'
  | 'txValue'
  | 'requiredPace'
  | 'totalCost'
  | 'qtyCustomerGap'
  | 'amtCustomerGap'

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
    | 'qtyCustomerGap'
    | 'amtCustomerGap'
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
  /** CustomerFact 経由の当年客数（正本） */
  readonly curTotalCustomers: number
  /** 前年客数（PrevYearData 経由） */
  readonly prevTotalCustomers: number
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
    curTotalCustomers,
    prevTotalCustomers,
  } = input
  const cards: YoYCardSummary[] = []

  // 客数前年比
  if (
    isMetricEnabled(config, 'customerYoY') &&
    prevYear.hasPrevYear &&
    prevTotalCustomers > 0 &&
    curTotalCustomers > 0
  ) {
    const custYoY = calculateYoYRatio(curTotalCustomers, prevTotalCustomers)
    cards.push({
      key: 'customerYoY',
      label: '客数前年比',
      value: formatPercent(custYoY, 2),
      sub: `${curTotalCustomers.toLocaleString()}人 / 前年${prevTotalCustomers.toLocaleString()}人`,
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
    const itemsYoY = calculateYoYRatio(ctsCurrentQty, ctsPrevQty)
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
    curTotalCustomers > 0 &&
    prevTotalCustomers > 0
  ) {
    const txValue = r.transactionValue
    const prevTxValue = calculateTransactionValue(prevYear.totalSales, prevTotalCustomers)
    const txYoY = prevTxValue > 0 ? calculateYoYRatio(txValue, prevTxValue) : null
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
  if (
    isMetricEnabled(config, 'totalCost') &&
    r.totalCost > 0 &&
    prevYearTotalCost != null &&
    prevYearTotalCost > 0
  ) {
    const costYoY = calculateYoYRatio(r.totalCost, prevYearTotalCost)
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

  // 前年比客数GAP（点数・金額）— 正本関数 calculateCustomerGap 経由
  if (
    isMetricEnabled(config, 'qtyCustomerGap') &&
    prevYear.hasPrevYear &&
    curTotalCustomers > 0 &&
    prevTotalCustomers > 0 &&
    ctsCurrentQty > 0 &&
    ctsPrevQty > 0
  ) {
    const gap = calculateCustomerGap({
      curCustomers: curTotalCustomers,
      prevCustomers: prevTotalCustomers,
      curQuantity: ctsCurrentQty,
      prevQuantity: ctsPrevQty,
      curSales: r.totalSales,
      prevSales: prevYear.totalSales,
    })
    if (gap) {
      const fmtGap = (v: number) => `${v >= 0 ? '+' : ''}${formatPercent(v, 1)}`
      cards.push({
        key: 'qtyCustomerGap',
        label: '点数客数GAP',
        value: fmtGap(gap.quantityCustomerGap),
        sub: `点数${formatPercent(gap.quantityYoY)} − 客数${formatPercent(gap.customerYoY)}`,
        signalColor: SIGNAL_COLORS[metricSignal(gap.quantityCustomerGap, 'qtyCustomerGap', config)],
        metricId: null,
        detailBreakdown: 'qtyCustomerGap',
      })
      cards.push({
        key: 'amtCustomerGap',
        label: '金額客数GAP',
        value: fmtGap(gap.amountCustomerGap),
        sub: `金額${formatPercent(gap.salesYoY)} − 客数${formatPercent(gap.customerYoY)}`,
        signalColor: SIGNAL_COLORS[metricSignal(gap.amountCustomerGap, 'amtCustomerGap', config)],
        metricId: null,
        detailBreakdown: 'amtCustomerGap',
      })
    }
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
  | 'qtyCustomerGap'
  | 'amtCustomerGap'

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
  'qtyCustomerGap',
  'amtCustomerGap',
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
  qtyCustomerGap: 'yoy',
  amtCustomerGap: 'yoy',
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
  /** 未設定データがある場合のツールチップ案内 */
  readonly hint?: string
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
      hint: c.hint,
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
