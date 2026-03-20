/**
 * 感度分析フック
 *
 * presentation 層が domain/calculations/sensitivity を直接呼ぶことを避け、
 * application 層で感度分析結果を提供する。
 */
import { useMemo } from 'react'
import {
  calculateSensitivity,
  calculateElasticity,
  extractSensitivityBase,
} from '@/domain/calculations/algorithms/sensitivity'
import type {
  SensitivityBase,
  SensitivityDeltas,
  SensitivityResult,
  ElasticityResult,
} from '@/domain/calculations/algorithms/sensitivity'
import type { StoreResult } from '@/domain/models/storeTypes'

// Re-export types for presentation layer
export type { SensitivityBase, SensitivityDeltas, SensitivityResult, ElasticityResult }

/** StoreResult から感度分析ベースパラメータを抽出 */
export function useSensitivityBase(result: StoreResult): SensitivityBase {
  return useMemo(() => extractSensitivityBase(result), [result])
}

/** 感度分析を実行 */
export function useSensitivityAnalysis(
  base: SensitivityBase,
  deltas: SensitivityDeltas,
): SensitivityResult {
  return useMemo(() => calculateSensitivity(base, deltas), [base, deltas])
}

/** 弾力性分析を実行 */
export function useElasticity(base: SensitivityBase): ElasticityResult {
  return useMemo(() => calculateElasticity(base), [base])
}
