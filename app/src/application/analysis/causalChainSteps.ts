/**
 * 因果チェーンの各ステップビルダー（純粋関数）
 *
 * causalChain.ts から抽出。各ステップの CausalStep 構築を担う。
 */
import type { TwoFactorResult } from '@/domain/calculations/factorDecomposition'
import type { DiscountEntry } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { DiscountType } from '@/domain/models/ClassifiedSales'
import type { CausalChainPrevInput } from './causalChain'
import type { CausalStep, CausalFactor } from '@/domain/formatting/causalChainFormatters'
import {
  fmtPct,
  fmtComma,
  fmtYen,
  fmtDelta,
  findMaxFactorIndex,
} from '@/domain/formatting/causalChainFormatters'

/**
 * 売変種別ごとのカラーヒント。
 * キーは ClassifiedSales.DISCOUNT_TYPES と同一の DiscountType。
 */
const DISCOUNT_COLOR_HINTS: Readonly<
  Record<DiscountType, 'negative' | 'warning' | 'info' | 'secondary'>
> = {
  '71': 'negative',
  '72': 'warning',
  '73': 'info',
  '74': 'secondary',
}

/** Step 1: 粗利率の状況 */
export function buildGrossProfitStep(
  currentGPRate: number,
  prevGPRate: number | null,
  budgetGPRate: number,
  costRate: number,
  discountRate: number,
  costInclusionRate: number,
): CausalStep {
  const gpRateDelta = prevGPRate != null ? currentGPRate - prevGPRate : 0
  const budgetDelta = budgetGPRate > 0 ? currentGPRate - budgetGPRate : 0

  const deltaDesc =
    prevGPRate != null
      ? `前年 ${fmtPct(prevGPRate)} → 今年 ${fmtPct(currentGPRate)}（${gpRateDelta >= 0 ? '+' : ''}${fmtPct(gpRateDelta)}）`
      : `今年 ${fmtPct(currentGPRate)}`

  const factors: CausalFactor[] = [
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
  ]

  return {
    title: '粗利率の状況',
    description: deltaDesc,
    factors,
    maxFactorIndex: 0,
    insight: `構成: 原価率 ${fmtPct(costRate)} / 売変率 ${fmtPct(discountRate)} / 原価算入率 ${fmtPct(costInclusionRate)}`,
  }
}

/** Step 2: 粗利率変動の要因分解 */
export function buildFactorDecompositionStep(
  costRate: number,
  discountRate: number,
  costInclusionRate: number,
  prev: CausalChainPrevInput | undefined,
  result: StoreResult,
  shapley: TwoFactorResult | null,
): CausalStep {
  const prevCostRate = prev?.costRate ?? null
  const prevDiscountRate = prev ? prev.discountRate : null
  const prevCostInclusionRate = prev?.costInclusionRate ?? null

  const costDelta = prevCostRate != null ? costRate - prevCostRate : 0
  const discountDelta = prevDiscountRate != null ? discountRate - prevDiscountRate : 0
  const costInclusionDelta =
    prevCostInclusionRate != null ? costInclusionRate - prevCostInclusionRate : 0

  const factors: CausalFactor[] = [
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
      label: '原価算入率変動',
      value: Math.abs(costInclusionDelta),
      formatted: `${costInclusionDelta >= 0 ? '+' : ''}${fmtPct(costInclusionDelta)}`,
      colorHint: 'caution',
    },
  ]

  let shapleyInsight = ''
  if (shapley && prev?.totalSales != null) {
    const salesDelta = result.totalSales - prev.totalSales
    shapleyInsight = `売上差 ${fmtYen(salesDelta)} = 客数効果 ${fmtYen(shapley.custEffect)} + 客単価効果 ${fmtYen(shapley.ticketEffect)}`
  }

  return {
    title: '粗利率変動の要因分解',
    description: `原価率 ${fmtPct(costRate)} / 売変率 ${fmtPct(discountRate)} / 原価算入率 ${fmtPct(costInclusionRate)}`,
    factors,
    maxFactorIndex: findMaxFactorIndex(factors),
    insight:
      shapleyInsight ||
      (prev
        ? `原価率差 ${fmtDelta(costDelta)} / 売変率差 ${fmtDelta(discountDelta)} / 原価算入率差 ${fmtDelta(costInclusionDelta)}`
        : '前年データなし'),
  }
}

/** Step 3: 売変種別内訳（売変データがある場合のみ） */
export function buildDiscountBreakdownStep(
  result: StoreResult,
  prevEntries: readonly DiscountEntry[] | undefined,
): CausalStep | null {
  const entries = result.discountEntries
  if (entries.length === 0) return null

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

  return {
    title: '売変種別内訳',
    description: `売変合計: ${fmtComma(result.totalDiscount)}円（${fmtPct(result.discountRate)}）`,
    factors: entryFactors,
    maxFactorIndex: findMaxFactorIndex(entryFactors),
    insight: `売変率 ${fmtPct(result.discountRate)}（売変合計 ${fmtComma(result.totalDiscount)}円 / 粗売上 ${fmtComma(result.grossSales)}円）`,
  }
}

/** Step 4: 成分サマリー */
export function buildSummaryStep(
  result: StoreResult,
  prev: CausalChainPrevInput | undefined,
  costRate: number,
  discountRate: number,
  costInclusionRate: number,
  shapley: TwoFactorResult | null,
): CausalStep {
  const prevCostRate = prev?.costRate ?? null
  const prevDiscountRate = prev ? prev.discountRate : null
  const prevCostInclusionRate = prev?.costInclusionRate ?? null

  const summaryFactors: CausalFactor[] = []

  if (shapley) {
    summaryFactors.push(
      {
        label: '客数効果',
        value: Math.abs(shapley.custEffect),
        formatted: fmtYen(shapley.custEffect),
        colorHint: 'primary',
      },
      {
        label: '客単価効果',
        value: Math.abs(shapley.ticketEffect),
        formatted: fmtYen(shapley.ticketEffect),
        colorHint: 'secondary',
      },
    )
  }

  const summaryLines: string[] = [
    `売上 ${fmtComma(result.totalSales)}円 / 客数 ${fmtComma(result.totalCustomers)}人 / 客単価 ${fmtComma(result.transactionValue)}円`,
    `原価率 ${fmtPct(costRate)} / 売変率 ${fmtPct(discountRate)} / 原価算入率 ${fmtPct(costInclusionRate)}`,
  ]

  if (prev) {
    const lines: string[] = []
    const costDelta = prevCostRate != null ? costRate - prevCostRate : 0
    const discountDelta = prevDiscountRate != null ? discountRate - prevDiscountRate : 0
    const costInclusionDelta =
      prevCostInclusionRate != null ? costInclusionRate - prevCostInclusionRate : 0
    if (prevCostRate != null) lines.push(`原価率差 ${fmtDelta(costDelta)}`)
    if (prevDiscountRate != null) lines.push(`売変率差 ${fmtDelta(discountDelta)}`)
    if (prevCostInclusionRate != null) lines.push(`原価算入率差 ${fmtDelta(costInclusionDelta)}`)
    if (lines.length > 0) summaryLines.push(lines.join(' / '))
  }

  return {
    title: '成分サマリー',
    description: '全成分の現在値と変動',
    factors: summaryFactors,
    maxFactorIndex: findMaxFactorIndex(summaryFactors),
    insight: summaryLines.join('\n'),
  }
}
