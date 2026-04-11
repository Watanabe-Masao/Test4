/**
 * trendAnalysis candidate-authoritative bridge
 *
 * @semanticClass analytic
 * @bridgeKind analytics
 * @contractId ANA-004
 * @authorityKind candidate-authoritative
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

function compareResults(a: TrendAnalysisResult, b: TrendAnalysisResult): boolean {
  return (
    a.overallTrend === b.overallTrend &&
    Math.abs(a.averageMonthlySales - b.averageMonthlySales) < 1e-6 &&
    a.momChanges.length === b.momChanges.length
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
        } catch {
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
