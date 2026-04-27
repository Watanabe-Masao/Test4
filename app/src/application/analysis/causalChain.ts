/**
 * CausalChainExplorer の純粋ロジック — ファサード
 *
 * 型定義・フォーマッタは causalChainFormatters.ts、
 * ステップビルダーは causalChainSteps.ts に委譲。
 *
 * @responsibility R:unclassified
 */
import { safeDivide, getEffectiveGrossProfitRate } from '@/domain/calculations/utils'
import { calculateFactorDecomposition } from '@/application/readModels/factorDecomposition'
import type { TwoFactorResult } from '@/domain/calculations/factorDecomposition'
import type { DiscountEntry } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { CausalStep } from '@/domain/formatting/causalChainFormatters'
import {
  buildGrossProfitStep,
  buildFactorDecompositionStep,
  buildDiscountBreakdownStep,
  buildSummaryStep,
} from './causalChainSteps'

// 型の re-export（後方互換）
export type { ColorHint, CausalFactor, CausalStep } from '@/domain/formatting/causalChainFormatters'

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

/** 原価率を算出する（仕入原価＋売上納品原価 / 粗売上） */
function computeCostRate(r: StoreResult): number {
  return safeDivide(r.inventoryCost + r.deliverySalesCost, r.grossSales, 0)
}

/** StoreResult → CausalChainPrevInput 変換 */
export function storeResultToCausalPrev(r: StoreResult): CausalChainPrevInput {
  return {
    grossProfitRate: getEffectiveGrossProfitRate(r),
    costRate: computeCostRate(r),
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
  const costRate = computeCostRate(result)
  const discountRate = result.discountRate
  const costInclusionRate = result.costInclusionRate

  // Shapley 2因子分解を1回だけ計算（Step 2 と Step 4 で共有）
  const shapley: TwoFactorResult | null =
    prevYear?.totalSales != null && prevYear?.totalCustomers != null && prevYear.totalCustomers > 0
      ? (() => {
          const decomp = calculateFactorDecomposition({
            prevSales: prevYear.totalSales!,
            curSales: result.totalSales,
            prevCustomers: prevYear.totalCustomers!,
            curCustomers: result.totalCustomers,
            level: 'two',
          })
          return {
            custEffect: decomp.effects.custEffect ?? 0,
            ticketEffect: decomp.effects.ticketEffect ?? 0,
          }
        })()
      : null

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
    buildFactorDecompositionStep(
      costRate,
      discountRate,
      costInclusionRate,
      prevYear,
      result,
      shapley,
    ),
  )

  const discountStep = buildDiscountBreakdownStep(result, prevYear?.discountEntries)
  if (discountStep) steps.push(discountStep)

  steps.push(buildSummaryStep(result, prevYear, costRate, discountRate, costInclusionRate, shapley))

  return steps
}
