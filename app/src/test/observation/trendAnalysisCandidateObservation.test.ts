/**
 * trendAnalysis candidate dual-run compare + rollback テスト
 * @contractId ANA-004
 * @semanticClass analytic
 * @authorityKind candidate-authoritative
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyzeTrend as analyzeTS } from '@/domain/calculations/algorithms/trendAnalysis'
import * as wasmEngine from '@/application/services/wasmEngine'

vi.mock('@/application/services/trendAnalysisWasm', () => ({
  analyzeTrendWasm: vi.fn(),
}))

import {
  analyzeTrend,
  setTrendAnalysisBridgeMode,
  getTrendAnalysisBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/trendAnalysisBridge'
import { analyzeTrendWasm } from '@/application/services/trendAnalysisWasm'

function makeData(months: number) {
  return Array.from({ length: months }, (_, i) => ({
    year: 2025,
    month: i + 1,
    totalSales: (i + 1) * 100_000,
    totalCustomers: null,
    grossProfit: null,
    grossProfitRate: null,
    budget: null,
    budgetAchievement: null,
    storeCount: 1,
    discountRate: null,
    costRate: null,
    costInclusionRate: null,
    averageMarkupRate: null,
  }))
}

function setupWasmMocks(): void {
  vi.mocked(analyzeTrendWasm).mockImplementation((dp) => analyzeTS(dp))
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getTrendAnalysisWasmExports').mockReturnValue({} as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  setTrendAnalysisBridgeMode('current-only')
  setupWasmMocks()
})

describe('trendAnalysis candidate dual-run compare', () => {
  it('dual-run match 6 months', () => {
    setupWasmReady()
    setTrendAnalysisBridgeMode('dual-run-compare')
    analyzeTrend(makeData(6))
    expect(getLastDualRunResult()!.match).toBe(true)
  })

  it('fallback on crash', () => {
    setupWasmReady()
    setTrendAnalysisBridgeMode('fallback-to-current')
    vi.mocked(analyzeTrendWasm).mockImplementation(() => {
      throw new Error('crash')
    })
    const result = analyzeTrend(makeData(6))
    expect(result.overallTrend).toBeDefined()
  })
})

describe('trendAnalysis candidate rollback', () => {
  it('rollback resets', () => {
    setTrendAnalysisBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getTrendAnalysisBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})
