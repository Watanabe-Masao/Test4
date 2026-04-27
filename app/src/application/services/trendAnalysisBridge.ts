/**
 * trendAnalysis candidate-authoritative bridge
 *
 * @semanticClass analytic
 * @bridgeKind analytics
 * @contractId ANA-004
 * @authorityKind candidate-authoritative
 *
 * @responsibility R:unclassified
 */
import { analyzeTrend as analyzeTrendTS } from '@/domain/calculations/algorithms/trendAnalysis'
import type {
  MonthlyDataPoint,
  TrendAnalysisResult,
} from '@/domain/calculations/algorithms/trendAnalysis'
import { getTrendAnalysisWasmExports } from './wasmEngine'
import { analyzeTrendWasm } from './trendAnalysisWasm'

export type TrendAnalysisBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: TrendAnalysisBridgeMode = 'current-only'

export function setTrendAnalysisBridgeMode(mode: TrendAnalysisBridgeMode): void {
  bridgeMode = mode
}

export function getTrendAnalysisBridgeMode(): TrendAnalysisBridgeMode {
  return bridgeMode
}

function isCandidateReady(): boolean {
  return getTrendAnalysisWasmExports() !== null
}

export interface DualRunResult {
  readonly current: TrendAnalysisResult
  readonly candidate: TrendAnalysisResult
  readonly match: boolean
}

let lastDualRunResult: DualRunResult | null = null

export function getLastDualRunResult(): DualRunResult | null {
  return lastDualRunResult
}

function numberArraysEqual(
  a: readonly (number | null)[],
  b: readonly (number | null)[],
  epsilon = 1e-6,
): boolean {
  if (a.length !== b.length) return false
  return a.every((v, i) => {
    const w = b[i]
    if (v == null && w == null) return true
    if (v == null || w == null) return false
    return Math.abs(v - w) < epsilon
  })
}

function compareResults(a: TrendAnalysisResult, b: TrendAnalysisResult): boolean {
  return (
    a.overallTrend === b.overallTrend &&
    Math.abs(a.averageMonthlySales - b.averageMonthlySales) < 1e-6 &&
    numberArraysEqual(a.momChanges, b.momChanges) &&
    numberArraysEqual(a.yoyChanges, b.yoyChanges) &&
    numberArraysEqual(a.movingAvg3, b.movingAvg3) &&
    numberArraysEqual(a.movingAvg6, b.movingAvg6) &&
    numberArraysEqual(
      a.seasonalIndex.map((v) => v),
      b.seasonalIndex.map((v) => v),
    )
  )
}

export function analyzeTrend(dataPoints: readonly MonthlyDataPoint[]): TrendAnalysisResult {
  switch (bridgeMode) {
    case 'current-only':
      return analyzeTrendTS(dataPoints)
    case 'candidate-only':
      return analyzeTrendWasm(dataPoints)
    case 'dual-run-compare': {
      const current = analyzeTrendTS(dataPoints)
      if (isCandidateReady()) {
        const candidate = analyzeTrendWasm(dataPoints)
        const match = compareResults(current, candidate)
        lastDualRunResult = { current, candidate, match }
        if (!match && import.meta.env.DEV) {
          console.warn(`[trendAnalysisBridge] dual-run mismatch`)
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return analyzeTrendWasm(dataPoints)
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[trendAnalysisBridge] candidate failed, fallback to current', error)
          }
          return analyzeTrendTS(dataPoints)
        }
      }
      return analyzeTrendTS(dataPoints)
    }
  }
}

export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
