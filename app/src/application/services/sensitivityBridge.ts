/**
 * sensitivity candidate-authoritative bridge
 *
 * @semanticClass analytic
 * @bridgeKind analytics
 * @contractId ANA-003
 * @authorityKind candidate-authoritative
 *
 * @responsibility R:unclassified
 */
import {
  calculateSensitivity as calculateSensitivityTS,
  calculateElasticity as calculateElasticityTS,
} from '@/domain/calculations/algorithms/sensitivity'
import type {
  SensitivityBase,
  SensitivityDeltas,
  SensitivityResult,
  ElasticityResult,
} from '@/domain/calculations/algorithms/sensitivity'
import { getSensitivityWasmExports } from './wasmEngine'
import { calculateSensitivityWasm, calculateElasticityWasm } from './sensitivityWasm'

export type { SensitivityBase, SensitivityDeltas, SensitivityResult, ElasticityResult }

export type SensitivityBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: SensitivityBridgeMode = 'current-only'

export function setSensitivityBridgeMode(mode: SensitivityBridgeMode): void {
  bridgeMode = mode
}

export function getSensitivityBridgeMode(): SensitivityBridgeMode {
  return bridgeMode
}

function isCandidateReady(): boolean {
  return getSensitivityWasmExports() !== null
}

export interface DualRunResult {
  readonly current: SensitivityResult
  readonly candidate: SensitivityResult
  readonly match: boolean
}

let lastDualRunResult: DualRunResult | null = null

export function getLastDualRunResult(): DualRunResult | null {
  return lastDualRunResult
}

function compareResults(a: SensitivityResult, b: SensitivityResult): boolean {
  const tol = 1e-6
  return (
    Math.abs(a.baseGrossProfit - b.baseGrossProfit) < tol &&
    Math.abs(a.simulatedGrossProfit - b.simulatedGrossProfit) < tol &&
    Math.abs(a.grossProfitDelta - b.grossProfitDelta) < tol &&
    Math.abs(a.simulatedSales - b.simulatedSales) < tol
  )
}

export function calculateSensitivity(
  base: SensitivityBase,
  deltas: SensitivityDeltas,
): SensitivityResult {
  switch (bridgeMode) {
    case 'current-only':
      return calculateSensitivityTS(base, deltas)
    case 'candidate-only':
      return calculateSensitivityWasm(base, deltas)
    case 'dual-run-compare': {
      const current = calculateSensitivityTS(base, deltas)
      if (isCandidateReady()) {
        const candidate = calculateSensitivityWasm(base, deltas)
        const match = compareResults(current, candidate)
        lastDualRunResult = { current, candidate, match }
        if (!match && import.meta.env.DEV) {
          console.warn(`[sensitivityBridge] dual-run mismatch`)
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return calculateSensitivityWasm(base, deltas)
        } catch {
          return calculateSensitivityTS(base, deltas)
        }
      }
      return calculateSensitivityTS(base, deltas)
    }
  }
}

export function calculateElasticity(base: SensitivityBase): ElasticityResult {
  switch (bridgeMode) {
    case 'current-only':
      return calculateElasticityTS(base)
    case 'candidate-only':
      return calculateElasticityWasm(base)
    case 'dual-run-compare':
    case 'fallback-to-current':
      return calculateElasticityTS(base)
  }
}

export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
