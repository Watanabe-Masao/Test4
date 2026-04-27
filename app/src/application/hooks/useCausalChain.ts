/**
 * 因果連鎖フック
 *
 * presentation 層が domain/calculations/causalChain を直接呼ぶことを避け、
 * application 層で因果連鎖結果を提供する。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import { buildCausalSteps, storeResultToCausalPrev } from '@/application/analysis/causalChain'
import type {
  CausalStep,
  CausalChainPrevInput,
  CausalFactor,
  ColorHint,
} from '@/application/analysis/causalChain'
import type { StoreResult } from '@/domain/models/storeTypes'

// Re-export types for presentation layer
export type { CausalStep, CausalChainPrevInput, CausalFactor, ColorHint }

/** 因果連鎖ステップを構築しメモ化する */
export function useCausalChain(
  result: StoreResult,
  prevYearData: CausalChainPrevInput | undefined,
): readonly CausalStep[] {
  return useMemo(() => buildCausalSteps(result, prevYearData), [result, prevYearData])
}

/** StoreResult を CausalChainPrevInput に変換 */
export { storeResultToCausalPrev }
