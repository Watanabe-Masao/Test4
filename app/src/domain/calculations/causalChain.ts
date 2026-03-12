/**
 * CausalChainExplorer の純粋ロジック — ファサード
 *
 * 型定義・フォーマッタは causalChainFormatters.ts、
 * ステップビルダーは causalChainSteps.ts に委譲。
 */
import { safeDivide, getEffectiveGrossProfitRate } from './utils'
import type { StoreResult, DiscountEntry } from '@/domain/models'
import type { CausalStep } from './causalChainFormatters'
import {
  buildGrossProfitStep,
  buildFactorDecompositionStep,
  buildDiscountBreakdownStep,
  buildSummaryStep,
} from './causalChainSteps'

// 型の re-export（後方互換）
export type { ColorHint, CausalFactor, CausalStep } from './causalChainFormatters'

/**
 * buildCausalSteps の前年データ入力。
 */
export interface CausalChainPrevInput {
  readonly grossProfitRate: number | null
  readonly costRate: number | null
  readonly discountRate: number
  readonly costInclusionRate: number | null
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
    costInclusionRate: r.costInclusionRate,
    discountEntries: r.discountEntries,
    totalSales: r.totalSales,
    totalCustomers: r.totalCustomers,
  }
}

/**
 * StoreResult（当年）+ 前年データから因果チェーンのステップ列を生成する。
 *
 * ステップ構造:
 * 1. 粗利率の状況 — メイン指標の現在位置
 * 2. 粗利率変動の要因分解 — 原価・売変・消耗品の成分変動
 * 3. 売変種別内訳 — 売変データがある場合のみ
 * 4. 成分サマリー — 売上差のShapley分解 + 全成分の現在値
 */
export function buildCausalSteps(
  result: StoreResult,
  prevYear: CausalChainPrevInput | undefined,
): readonly CausalStep[] {
  const currentGPRate = getEffectiveGrossProfitRate(result)
  const prevGPRate = prevYear?.grossProfitRate ?? null
  const costRate = safeDivide(result.inventoryCost + result.deliverySalesCost, result.grossSales, 0)
  const discountRate = result.discountRate
  const costInclusionRate = result.costInclusionRate

  const steps: CausalStep[] = []

  steps.push(
    buildGrossProfitStep(
      currentGPRate,
      prevGPRate,
      result.grossProfitRateBudget,
      costRate,
      discountRate,
      costInclusionRate,
    ),
  )

  steps.push(
    buildFactorDecompositionStep(costRate, discountRate, costInclusionRate, prevYear, result),
  )

  const discountStep = buildDiscountBreakdownStep(result, prevYear?.discountEntries)
  if (discountStep) steps.push(discountStep)

  steps.push(buildSummaryStep(result, prevYear, costRate, discountRate, costInclusionRate))

  return steps
}
