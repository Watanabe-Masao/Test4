/**
 * computeMovingAverage candidate-authoritative bridge
 *
 * @semanticClass analytic
 * @bridgeKind analytics
 * @contractId ANA-009
 * @authorityKind candidate-authoritative
 *
 * @responsibility R:unclassified
 */
import { computeMovingAverage as computeTS } from '@/domain/calculations/temporal/computeMovingAverage'
import type {
  MovingAveragePoint,
  MovingAverageMissingnessPolicy,
} from '@/domain/calculations/temporal/computeMovingAverage'
import { getMovingAverageWasmExports } from './wasmEngine'
import { computeMovingAverageWasm } from './movingAverageWasm'

export type MovingAverageBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: MovingAverageBridgeMode = 'current-only'

export function setMovingAverageBridgeMode(mode: MovingAverageBridgeMode): void {
  bridgeMode = mode
}

export function getMovingAverageBridgeMode(): MovingAverageBridgeMode {
  return bridgeMode
}

function isCandidateReady(): boolean {
  return getMovingAverageWasmExports() !== null
}

export interface DualRunResult {
  readonly current: readonly MovingAveragePoint[]
  readonly candidate: readonly MovingAveragePoint[]
  readonly match: boolean
}

let lastDualRunResult: DualRunResult | null = null

export function getLastDualRunResult(): DualRunResult | null {
  return lastDualRunResult
}

function compareResults(
  a: readonly MovingAveragePoint[],
  b: readonly MovingAveragePoint[],
): boolean {
  if (a.length !== b.length) return false
  return a.every((ai, i) => ai.value === b[i].value && ai.status === b[i].status)
}

export function computeMovingAverage(
  series: readonly MovingAveragePoint[],
  windowSize: number,
  policy: MovingAverageMissingnessPolicy,
): readonly MovingAveragePoint[] {
  switch (bridgeMode) {
    case 'current-only':
      return computeTS(series, windowSize, policy)
    case 'candidate-only':
      return computeMovingAverageWasm(series, windowSize, policy)
    case 'dual-run-compare': {
      const current = computeTS(series, windowSize, policy)
      if (isCandidateReady()) {
        const candidate = computeMovingAverageWasm(series, windowSize, policy)
        const match = compareResults(current, candidate)
        lastDualRunResult = { current, candidate, match }
        if (!match && import.meta.env.DEV) {
          console.warn(`[movingAverageBridge] dual-run mismatch`)
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return computeMovingAverageWasm(series, windowSize, policy)
        } catch {
          return computeTS(series, windowSize, policy)
        }
      }
      return computeTS(series, windowSize, policy)
    }
  }
}

export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
