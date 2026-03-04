/**
 * CausalChainExplorer の純粋ロジック。
 *
 * UIコンポーネントから抽出した因果チェーンのステップ生成ロジック。
 * ドメイン層の型のみに依存し、React非依存でテスト可能。
 */
import { safeDivide, getEffectiveGrossProfitRate } from './utils'
import { decompose2 } from './factorDecomposition'
import type { StoreResult, DiscountEntry } from '@/domain/models'
import type { DiscountType } from '@/domain/models/ClassifiedSales'

/**
 * 売変種別ごとのカラーヒント。
 * キーは ClassifiedSales.DISCOUNT_TYPES と同一の DiscountType。
 * Record<DiscountType, ColorHint> 型により、新タイプ追加時はコンパイルエラーで検出。
 */
const DISCOUNT_COLOR_HINTS: Readonly<Record<DiscountType, ColorHint>> = {
  '71': 'negative',
  '72': 'warning',
  '73': 'info',
  '74': 'secondary',
}

/** セマンティックなカラーヒント。実際の色は Presentation 層で解決する。 */
export type ColorHint =
  | 'positive'
  | 'negative'
  | 'caution'
  | 'primary'
  | 'secondary'
  | 'info'
  | 'warning'

export interface CausalFactor {
  readonly label: string
  readonly value: number
  readonly formatted: string
  readonly colorHint: ColorHint
}

export interface CausalStep {
  readonly title: string
  readonly description: string
  readonly factors: readonly CausalFactor[]
  readonly maxFactorIndex: number
  readonly insight: string
}

/**
 * buildCausalSteps の前年データ入力。
 * StoreResult の全フィールドは不要。PrevYearData から変換する場合は
 * 取得不可能なフィールドを null にすることで部分的な比較を行える。
 */
export interface CausalChainPrevInput {
  readonly grossProfitRate: number | null
  readonly costRate: number | null
  readonly discountRate: number
  readonly consumableRate: number | null
  readonly discountEntries: readonly DiscountEntry[]
  readonly totalSales: number | null
  readonly totalCustomers: number | null
}

/** StoreResult → CausalChainPrevInput 変換 */
export function storeResultToCausalPrev(r: StoreResult): CausalChainPrevInput {
  return {
    grossProfitRate: getEffectiveGrossProfitRate(r),
    costRate: safeDivide(r.inventoryCost + r.deliverySalesCost, r.grossSales, 0),
    discountRate: r.discountRate,
    consumableRate: r.consumableRate,
    discountEntries: r.discountEntries,
    totalSales: r.totalSales,
    totalCustomers: r.totalCustomers,
  }
}

/** パーセントフォーマット（toPctと同等だがReact非依存） */
function fmtPct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`
}

function fmtComma(v: number): string {
  return Math.round(v).toLocaleString('ja-JP')
}

/**
 * StoreResult（当年）+ 前年データから因果チェーンのステップ列を生成する。
 *
 * ステップ構造:
 * 1. 粗利率の状況 — メイン指標の現在位置
 * 2. 粗利率変動の要因分解 — 原価・売変・消耗品の成分変動
 * 3. 売変種別内訳 — 売変データがある場合のみ
 * 4. 成分サマリー — 売上差のShapley分解 + 全成分の現在値
 *
 * 設計原則: 各ステップは数値の成分を提示するのみ。
 * 解釈（「なぜ」）や推奨（「どうすべき」）は含めない。
 */
export function buildCausalSteps(
  result: StoreResult,
  prevYear: CausalChainPrevInput | undefined,
): readonly CausalStep[] {
  const r = result
  const prev = prevYear
  const steps: CausalStep[] = []

  // Step 1: 粗利率の状況
  const currentGPRate = getEffectiveGrossProfitRate(r)
  const prevGPRate = prev?.grossProfitRate ?? null
  const gpRateDelta = prevGPRate != null ? currentGPRate - prevGPRate : 0

  const budgetGPRate = r.grossProfitRateBudget
  const budgetDelta = budgetGPRate > 0 ? currentGPRate - budgetGPRate : 0

  const deltaDesc =
    prevGPRate != null
      ? `前年 ${fmtPct(prevGPRate)} → 今年 ${fmtPct(currentGPRate)}（${gpRateDelta >= 0 ? '+' : ''}${fmtPct(gpRateDelta)}）`
      : `今年 ${fmtPct(currentGPRate)}`

  const costRate = safeDivide(r.inventoryCost + r.deliverySalesCost, r.grossSales, 0)
  const discountRate = r.discountRate
  const consumableRate = r.consumableRate

  steps.push({
    title: '粗利率の状況',
    description: deltaDesc,
    factors: [
      ...(prevGPRate != null
        ? [
            {
              label: '前年比変動',
              value: Math.abs(gpRateDelta),
              formatted: `${gpRateDelta >= 0 ? '+' : ''}${fmtPct(gpRateDelta)}`,
              colorHint: gpRateDelta >= 0 ? ('positive' as const) : ('negative' as const),
            },
          ]
        : []),
      ...(budgetGPRate > 0
        ? [
            {
              label: '予算比変動',
              value: Math.abs(budgetDelta),
              formatted: `${budgetDelta >= 0 ? '+' : ''}${fmtPct(budgetDelta)}`,
              colorHint: budgetDelta >= 0 ? ('positive' as const) : ('negative' as const),
            },
          ]
        : []),
      {
        label: '現在の粗利率',
        value: currentGPRate,
        formatted: fmtPct(currentGPRate),
        colorHint: 'primary' as const,
      },
    ],
    maxFactorIndex: 0,
    insight: `構成: 原価率 ${fmtPct(costRate)} / 売変率 ${fmtPct(discountRate)} / 消耗品率 ${fmtPct(consumableRate)}`,
  })

  // Step 2: 要因分解
  const prevCostRate = prev?.costRate ?? null
  const prevDiscountRate = prev ? prev.discountRate : null
  const prevConsumableRate = prev?.consumableRate ?? null

  const costDelta = prevCostRate != null ? costRate - prevCostRate : 0
  const discountDelta = prevDiscountRate != null ? discountRate - prevDiscountRate : 0
  const consumableDelta = prevConsumableRate != null ? consumableRate - prevConsumableRate : 0

  const factors2: CausalFactor[] = [
    {
      label: '原価率変動',
      value: Math.abs(costDelta),
      formatted: `${costDelta >= 0 ? '+' : ''}${fmtPct(costDelta)}`,
      colorHint: 'negative',
    },
    {
      label: '売変率変動',
      value: Math.abs(discountDelta),
      formatted: `${discountDelta >= 0 ? '+' : ''}${fmtPct(discountDelta)}`,
      colorHint: 'warning',
    },
    {
      label: '消耗品率変動',
      value: Math.abs(consumableDelta),
      formatted: `${consumableDelta >= 0 ? '+' : ''}${fmtPct(consumableDelta)}`,
      colorHint: 'caution',
    },
  ]

  const maxIdx2 = factors2.reduce((max, f, i) => (f.value > factors2[max].value ? i : max), 0)

  // Shapley分解（売上差 = 客数効果 + 客単価効果）
  const prevSales = prev?.totalSales ?? null
  const prevCust = prev?.totalCustomers ?? null
  let shapleyInsight = ''
  if (prevSales != null && prevCust != null && prevCust > 0) {
    const { custEffect, ticketEffect } = decompose2(
      prevSales,
      r.totalSales,
      prevCust,
      r.totalCustomers,
    )
    const salesDelta = r.totalSales - prevSales
    shapleyInsight = `売上差 ${fmtYen(salesDelta)} = 客数効果 ${fmtYen(custEffect)} + 客単価効果 ${fmtYen(ticketEffect)}`
  }

  steps.push({
    title: '粗利率変動の要因分解',
    description: `原価率 ${fmtPct(costRate)} / 売変率 ${fmtPct(discountRate)} / 消耗品率 ${fmtPct(consumableRate)}`,
    factors: factors2,
    maxFactorIndex: maxIdx2,
    insight:
      shapleyInsight ||
      (prev
        ? `原価率差 ${fmtDelta(costDelta)} / 売変率差 ${fmtDelta(discountDelta)} / 消耗品率差 ${fmtDelta(consumableDelta)}`
        : '前年データなし'),
  })

  // Step 3: 売変種別内訳
  const entries = r.discountEntries
  const prevEntries = prev?.discountEntries

  if (entries.length > 0) {
    const entryFactors = entries.map((e: DiscountEntry) => {
      const prevEntry = prevEntries?.find((pe: DiscountEntry) => pe.type === e.type)
      const delta = prevEntry ? e.amount - prevEntry.amount : 0
      return {
        label: e.label,
        value: Math.abs(delta),
        formatted: `${fmtComma(e.amount)}円${prevEntry ? `（差: ${delta >= 0 ? '+' : ''}${fmtComma(delta)}円）` : ''}`,
        colorHint: DISCOUNT_COLOR_HINTS[e.type] ?? ('secondary' as const),
      }
    })

    const maxIdx3 =
      entryFactors.length > 0
        ? entryFactors.reduce((max, f, i) => (f.value > entryFactors[max].value ? i : max), 0)
        : 0

    steps.push({
      title: '売変種別内訳',
      description: `売変合計: ${fmtComma(r.totalDiscount)}円（${fmtPct(r.discountRate)}）`,
      factors: entryFactors,
      maxFactorIndex: maxIdx3,
      insight: `売変率 ${fmtPct(r.discountRate)}（売変合計 ${fmtComma(r.totalDiscount)}円 / 粗売上 ${fmtComma(r.grossSales)}円）`,
    })
  }

  // Step 4: 成分サマリー — 全成分の現在値とShapley分解
  const summaryFactors: CausalFactor[] = []

  if (prevSales != null && prevCust != null && prevCust > 0) {
    const { custEffect, ticketEffect } = decompose2(
      prevSales,
      r.totalSales,
      prevCust,
      r.totalCustomers,
    )
    summaryFactors.push(
      {
        label: '客数効果',
        value: Math.abs(custEffect),
        formatted: fmtYen(custEffect),
        colorHint: 'primary',
      },
      {
        label: '客単価効果',
        value: Math.abs(ticketEffect),
        formatted: fmtYen(ticketEffect),
        colorHint: 'secondary',
      },
    )
  }

  const summaryLines: string[] = [
    `売上 ${fmtComma(r.totalSales)}円 / 客数 ${fmtComma(r.totalCustomers)}人 / 客単価 ${fmtComma(safeDivide(r.totalSales, r.totalCustomers, 0))}円`,
    `原価率 ${fmtPct(costRate)} / 売変率 ${fmtPct(discountRate)} / 消耗品率 ${fmtPct(consumableRate)}`,
  ]

  if (prev) {
    const lines: string[] = []
    if (prevCostRate != null) lines.push(`原価率差 ${fmtDelta(costDelta)}`)
    if (prevDiscountRate != null) lines.push(`売変率差 ${fmtDelta(discountDelta)}`)
    if (prevConsumableRate != null) lines.push(`消耗品率差 ${fmtDelta(consumableDelta)}`)
    if (lines.length > 0) summaryLines.push(lines.join(' / '))
  }

  const maxSummaryIdx =
    summaryFactors.length > 0
      ? summaryFactors.reduce((max, f, i) => (f.value > summaryFactors[max].value ? i : max), 0)
      : 0

  steps.push({
    title: '成分サマリー',
    description: '全成分の現在値と変動',
    factors: summaryFactors,
    maxFactorIndex: maxSummaryIdx,
    insight: summaryLines.join('\n'),
  })

  return steps
}

/** 円表記（符号付き） */
function fmtYen(v: number): string {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${fmtComma(v)}円`
}

/** 差分のフォーマット（%表記、符号付き） */
function fmtDelta(v: number): string {
  return `${v >= 0 ? '+' : ''}${fmtPct(v)}`
}
