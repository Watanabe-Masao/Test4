/**
 * dowGapAnalysis candidate-authoritative bridge
 *
 * @semanticClass analytic
 * @bridgeKind analytics
 * @contractId ANA-007
 * @authorityKind candidate-authoritative
 */
import { analyzeDowGap as analyzeDowGapTS } from '@/domain/calculations/dowGapAnalysis'
import type { DowGapDailyData } from '@/domain/calculations/dowGapAnalysis'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import { getDowGapWasmExports } from './wasmEngine'
import { analyzeDowGapWasm } from './dowGapWasm'

export type DowGapBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: DowGapBridgeMode = 'current-only'

export function setDowGapBridgeMode(mode: DowGapBridgeMode): void {
  bridgeMode = mode
}

export function getDowGapBridgeMode(): DowGapBridgeMode {
  return bridgeMode
}

function isCandidateReady(): boolean {
  return getDowGapWasmExports() !== null
}

export interface DualRunResult {
  readonly current: DowGapAnalysis
  readonly candidate: DowGapAnalysis
  readonly match: boolean
}

let lastDualRunResult: DualRunResult | null = null

export function getLastDualRunResult(): DualRunResult | null {
  return lastDualRunResult
}

function compareResults(a: DowGapAnalysis, b: DowGapAnalysis): boolean {
  return (
    Math.abs(a.estimatedImpact - b.estimatedImpact) < 1e-6 &&
    a.isValid === b.isValid &&
    a.isSameStructure === b.isSameStructure
  )
}

export function analyzeDowGap(
  currentYear: number,
  currentMonth: number,
  previousYear: number,
  previousMonth: number,
  dailyAverageSales: number,
  prevDowSales?: readonly number[],
  dailyData?: DowGapDailyData,
): DowGapAnalysis {
  switch (bridgeMode) {
    case 'current-only':
      return analyzeDowGapTS(
        currentYear,
        currentMonth,
        previousYear,
        previousMonth,
        dailyAverageSales,
        prevDowSales,
        dailyData,
      )
    case 'candidate-only':
      return analyzeDowGapWasm(
        currentYear,
        currentMonth,
        previousYear,
        previousMonth,
        dailyAverageSales,
        prevDowSales,
        dailyData,
      )
    case 'dual-run-compare': {
      const current = analyzeDowGapTS(
        currentYear,
        currentMonth,
        previousYear,
        previousMonth,
        dailyAverageSales,
        prevDowSales,
        dailyData,
      )
      if (isCandidateReady()) {
        const candidate = analyzeDowGapWasm(
          currentYear,
          currentMonth,
          previousYear,
          previousMonth,
          dailyAverageSales,
          prevDowSales,
          dailyData,
        )
        const match = compareResults(current, candidate)
        lastDualRunResult = { current, candidate, match }
        if (!match && import.meta.env.DEV) {
          console.warn(`[dowGapBridge] dual-run mismatch`)
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return analyzeDowGapWasm(
            currentYear,
            currentMonth,
            previousYear,
            previousMonth,
            dailyAverageSales,
            prevDowSales,
            dailyData,
          )
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[dowGapBridge] candidate failed, fallback to current', error)
          }
          return analyzeDowGapTS(
            currentYear,
            currentMonth,
            previousYear,
            previousMonth,
            dailyAverageSales,
            prevDowSales,
            dailyData,
          )
        }
      }
      return analyzeDowGapTS(
        currentYear,
        currentMonth,
        previousYear,
        previousMonth,
        dailyAverageSales,
        prevDowSales,
        dailyData,
      )
    }
  }
}

export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
