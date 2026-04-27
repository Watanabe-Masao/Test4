/**
 * remainingBudgetRate candidate-authoritative bridge
 *
 * @semanticClass business
 * @bridgeKind business
 * @contractId BIZ-008
 * @authorityKind candidate-authoritative
 *
 * Current reference: TS (domain/calculations/remainingBudgetRate.ts)
 * Candidate: WASM (wasm/remaining-budget-rate/)
 * Promote Ceremony まで current authoritative (business-authoritative) は不変。
 *
 * @responsibility R:unclassified
 */
import { calculateRemainingBudgetRate as calculateRemainingBudgetRateTS } from '@/domain/calculations/remainingBudgetRate'
import type { RemainingBudgetRateInput } from '@/domain/calculations/remainingBudgetRate'
import { getRemainingBudgetRateWasmExports } from './wasmEngine'
import { calculateRemainingBudgetRateWasm } from './remainingBudgetRateWasm'

export type { RemainingBudgetRateInput }

export type RemainingBudgetRateBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: RemainingBudgetRateBridgeMode = 'current-only'

export function setRemainingBudgetRateBridgeMode(mode: RemainingBudgetRateBridgeMode): void {
  bridgeMode = mode
}

export function getRemainingBudgetRateBridgeMode(): RemainingBudgetRateBridgeMode {
  return bridgeMode
}

function isCandidateReady(): boolean {
  return getRemainingBudgetRateWasmExports() !== null
}

export interface DualRunResult {
  readonly current: number
  readonly candidate: number
  readonly match: boolean
}

let lastDualRunResult: DualRunResult | null = null

export function getLastDualRunResult(): DualRunResult | null {
  return lastDualRunResult
}

export function calculateRemainingBudgetRate(input: RemainingBudgetRateInput): number {
  switch (bridgeMode) {
    case 'current-only':
      return calculateRemainingBudgetRateTS(input)
    case 'candidate-only':
      return calculateRemainingBudgetRateWasm(input)
    case 'dual-run-compare': {
      const current = calculateRemainingBudgetRateTS(input)
      if (isCandidateReady()) {
        const candidate = calculateRemainingBudgetRateWasm(input)
        const match = current === candidate
        lastDualRunResult = { current, candidate, match }
        if (!match && import.meta.env.DEV) {
          console.warn(
            `[remainingBudgetRateBridge] dual-run mismatch: current=${current} candidate=${candidate}`,
          )
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return calculateRemainingBudgetRateWasm(input)
        } catch {
          return calculateRemainingBudgetRateTS(input)
        }
      }
      return calculateRemainingBudgetRateTS(input)
    }
  }
}

export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
