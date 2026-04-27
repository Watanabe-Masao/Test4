/**
 * correlation candidate-authoritative bridge
 *
 * @semanticClass analytic
 * @bridgeKind analytics
 * @contractId ANA-005
 * @authorityKind candidate-authoritative
 *
 * correlationMatrix は string 入出力のため candidate 対象外（TS 固定）。
 *
 * @responsibility R:unclassified
 */
import {
  pearsonCorrelation as pearsonTS,
  cosineSimilarity as cosineTS,
  normalizeMinMax as normalizeTS,
  detectDivergence as detectTS,
  movingAverage as movingAvgTS,
  calculateZScores as zScoresTS,
} from '@/domain/calculations/algorithms/correlation'
import type { CorrelationResult } from '@/domain/calculations/algorithms/correlation'
import { getCorrelationWasmExports } from './wasmEngine'
import { pearsonCorrelationWasm } from './correlationWasm'

export type CorrelationBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: CorrelationBridgeMode = 'current-only'

export function setCorrelationBridgeMode(mode: CorrelationBridgeMode): void {
  bridgeMode = mode
}

export function getCorrelationBridgeMode(): CorrelationBridgeMode {
  return bridgeMode
}

function isCandidateReady(): boolean {
  return getCorrelationWasmExports() !== null
}

export interface DualRunResult {
  readonly current: CorrelationResult
  readonly candidate: CorrelationResult
  readonly match: boolean
}

let lastDualRunResult: DualRunResult | null = null

export function getLastDualRunResult(): DualRunResult | null {
  return lastDualRunResult
}

export function pearsonCorrelation(
  xs: readonly number[],
  ys: readonly number[],
): CorrelationResult {
  switch (bridgeMode) {
    case 'current-only':
      return pearsonTS(xs, ys)
    case 'candidate-only':
      return pearsonCorrelationWasm(xs, ys)
    case 'dual-run-compare': {
      const current = pearsonTS(xs, ys)
      if (isCandidateReady()) {
        const candidate = pearsonCorrelationWasm(xs, ys)
        const match = Math.abs(current.r - candidate.r) < 1e-10 && current.n === candidate.n
        lastDualRunResult = { current, candidate, match }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return pearsonCorrelationWasm(xs, ys)
        } catch {
          return pearsonTS(xs, ys)
        }
      }
      return pearsonTS(xs, ys)
    }
  }
}

// 他の関数は current-only/candidate-only のみ（dual-run は pearson で代表）
export const cosineSimilarity = cosineTS
export const normalizeMinMax = normalizeTS
export const detectDivergence = detectTS
export const movingAverage = movingAvgTS
export const calculateZScores = zScoresTS

export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
