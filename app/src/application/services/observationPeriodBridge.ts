/**
 * observationPeriod candidate-authoritative bridge
 *
 * @semanticClass business
 * @bridgeKind business
 * @contractId BIZ-010
 * @authorityKind candidate-authoritative
 *
 * @see references/03-guides/tier1-business-migration-plan.md
 */
import {
  evaluateObservationPeriod as evaluateObservationPeriodTS,
  DEFAULT_OBSERVATION_THRESHOLDS,
} from '@/domain/calculations/observationPeriod'
import type { ObservationThresholds } from '@/domain/calculations/observationPeriod'
import type { ObservationPeriod } from '@/domain/models/ObservationPeriod'
import { getObservationPeriodWasmExports } from './wasmEngine'
import { evaluateObservationPeriodWasm } from './observationPeriodWasm'

export type { ObservationThresholds, ObservationPeriod }

export type ObservationPeriodBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: ObservationPeriodBridgeMode = 'current-only'

export function setObservationPeriodBridgeMode(mode: ObservationPeriodBridgeMode): void {
  bridgeMode = mode
}

export function getObservationPeriodBridgeMode(): ObservationPeriodBridgeMode {
  return bridgeMode
}

function isCandidateReady(): boolean {
  return getObservationPeriodWasmExports() !== null
}

export interface DualRunResult {
  readonly current: ObservationPeriod
  readonly candidate: ObservationPeriod
  readonly match: boolean
}

let lastDualRunResult: DualRunResult | null = null

export function getLastDualRunResult(): DualRunResult | null {
  return lastDualRunResult
}

function compareResults(a: ObservationPeriod, b: ObservationPeriod): boolean {
  return (
    a.lastRecordedSalesDay === b.lastRecordedSalesDay &&
    a.elapsedDays === b.elapsedDays &&
    a.salesDays === b.salesDays &&
    a.remainingDays === b.remainingDays &&
    a.status === b.status &&
    a.warnings.length === b.warnings.length &&
    a.warnings.every((w, i) => w === b.warnings[i])
  )
}

export function evaluateObservationPeriod(
  daily: ReadonlyMap<number, { readonly sales: number }>,
  daysInMonth: number,
  currentElapsedDays: number,
  thresholds: ObservationThresholds = DEFAULT_OBSERVATION_THRESHOLDS,
): ObservationPeriod {
  switch (bridgeMode) {
    case 'current-only':
      return evaluateObservationPeriodTS(daily, daysInMonth, currentElapsedDays, thresholds)
    case 'candidate-only':
      return evaluateObservationPeriodWasm(daily, daysInMonth, currentElapsedDays, thresholds)
    case 'dual-run-compare': {
      const current = evaluateObservationPeriodTS(
        daily,
        daysInMonth,
        currentElapsedDays,
        thresholds,
      )
      if (isCandidateReady()) {
        const candidate = evaluateObservationPeriodWasm(
          daily,
          daysInMonth,
          currentElapsedDays,
          thresholds,
        )
        const match = compareResults(current, candidate)
        lastDualRunResult = { current, candidate, match }
        if (!match && import.meta.env.DEV) {
          console.warn(
            `[observationPeriodBridge] dual-run mismatch: current=${JSON.stringify(current)} candidate=${JSON.stringify(candidate)}`,
          )
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return evaluateObservationPeriodWasm(daily, daysInMonth, currentElapsedDays, thresholds)
        } catch {
          return evaluateObservationPeriodTS(daily, daysInMonth, currentElapsedDays, thresholds)
        }
      }
      return evaluateObservationPeriodTS(daily, daysInMonth, currentElapsedDays, thresholds)
    }
  }
}

export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
