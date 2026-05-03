/**
 * customerGap candidate-authoritative bridge
 *
 * @semanticClass business
 * @bridgeKind business
 * @contractId BIZ-013
 * @authorityKind candidate-authoritative
 *
 * Current reference: TS (domain/calculations/customerGap.ts)
 * Candidate: WASM (wasm/customer-gap/)
 * Promote Ceremony まで current authoritative (business-authoritative) は不変。
 *
 * @see references/03-implementation/tier1-business-migration-plan.md
 *
 * @responsibility R:unclassified
 */
import { calculateCustomerGap as calculateCustomerGapTS } from '@/domain/calculations/customerGap'
import type { CustomerGapInput, CustomerGapResult } from '@/domain/calculations/customerGap'
import { getCustomerGapWasmExports } from './wasmEngine'
import { calculateCustomerGapWasm } from './customerGapWasm'

export type { CustomerGapInput, CustomerGapResult }

export type CustomerGapBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: CustomerGapBridgeMode = 'current-only'

export function setCustomerGapBridgeMode(mode: CustomerGapBridgeMode): void {
  bridgeMode = mode
}

export function getCustomerGapBridgeMode(): CustomerGapBridgeMode {
  return bridgeMode
}

function isCandidateReady(): boolean {
  return getCustomerGapWasmExports() !== null
}

export interface DualRunResult<T> {
  readonly current: T
  readonly candidate: T
  readonly match: boolean
}

let lastDualRunResult: DualRunResult<CustomerGapResult | null> | null = null

export function getLastDualRunResult(): DualRunResult<CustomerGapResult | null> | null {
  return lastDualRunResult
}

function compareResults(a: CustomerGapResult | null, b: CustomerGapResult | null): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  return (
    a.customerYoY === b.customerYoY &&
    a.quantityYoY === b.quantityYoY &&
    a.salesYoY === b.salesYoY &&
    a.quantityCustomerGap === b.quantityCustomerGap &&
    a.amountCustomerGap === b.amountCustomerGap
  )
}

export function calculateCustomerGap(input: CustomerGapInput): CustomerGapResult | null {
  switch (bridgeMode) {
    case 'current-only':
      return calculateCustomerGapTS(input)
    case 'candidate-only':
      return calculateCustomerGapWasm(input)
    case 'dual-run-compare': {
      const current = calculateCustomerGapTS(input)
      if (isCandidateReady()) {
        const candidate = calculateCustomerGapWasm(input)
        const match = compareResults(current, candidate)
        lastDualRunResult = { current, candidate, match }
        if (!match && import.meta.env.DEV) {
          console.warn(
            `[customerGapBridge] dual-run mismatch: current=${JSON.stringify(current)} candidate=${JSON.stringify(candidate)}`,
          )
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return calculateCustomerGapWasm(input)
        } catch {
          return calculateCustomerGapTS(input)
        }
      }
      return calculateCustomerGapTS(input)
    }
  }
}

export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
