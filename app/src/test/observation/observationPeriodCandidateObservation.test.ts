/**
 * observationPeriod candidate dual-run compare + rollback テスト
 * @contractId BIZ-010
 * @semanticClass business
 * @authorityKind candidate-authoritative
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { evaluateObservationPeriod as evaluateTS } from '@/domain/calculations/observationPeriod'
import * as wasmEngine from '@/application/services/wasmEngine'

vi.mock('@/application/services/observationPeriodWasm', () => ({
  evaluateObservationPeriodWasm: vi.fn(),
  normalizeObservationPeriodInput: vi.fn(),
}))

import {
  evaluateObservationPeriod,
  setObservationPeriodBridgeMode,
  getObservationPeriodBridgeMode,
  getLastDualRunResult,
  rollbackToCurrentOnly,
} from '@/application/services/observationPeriodBridge'
import { evaluateObservationPeriodWasm } from '@/application/services/observationPeriodWasm'

function makeDaily(salesDays: number[]): ReadonlyMap<number, { sales: number }> {
  const m = new Map<number, { sales: number }>()
  for (const d of salesDays) m.set(d, { sales: 100 })
  return m
}

const FIXTURES = [
  {
    name: '全日営業 → ok',
    daily: makeDaily(Array.from({ length: 30 }, (_, i) => i + 1)),
    daysInMonth: 30,
    currentElapsedDays: 30,
  },
  {
    name: '売上なし → undefined',
    daily: new Map<number, { sales: number }>(),
    daysInMonth: 30,
    currentElapsedDays: 15,
  },
  {
    name: '3日のみ → invalid',
    daily: makeDaily([1, 2, 4]),
    daysInMonth: 30,
    currentElapsedDays: 4,
  },
  {
    name: '8日 → partial',
    daily: makeDaily([1, 2, 3, 4, 5, 6, 7, 8]),
    daysInMonth: 30,
    currentElapsedDays: 8,
  },
] as const

function setupWasmMocks(): void {
  vi.mocked(evaluateObservationPeriodWasm).mockImplementation(
    (daily, daysInMonth, currentElapsedDays, thresholds) =>
      evaluateTS(daily, daysInMonth, currentElapsedDays, thresholds),
  )
}

function setupWasmReady(): void {
  vi.spyOn(wasmEngine, 'getObservationPeriodWasmExports').mockReturnValue({} as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  setObservationPeriodBridgeMode('current-only')
  setupWasmMocks()
})

describe('observationPeriod candidate dual-run compare', () => {
  it.each(FIXTURES)('$name: dual-run match', ({ daily, daysInMonth, currentElapsedDays }) => {
    setupWasmReady()
    setObservationPeriodBridgeMode('dual-run-compare')
    evaluateObservationPeriod(daily, daysInMonth, currentElapsedDays)
    const dualRun = getLastDualRunResult()
    expect(dualRun).not.toBeNull()
    expect(dualRun!.match).toBe(true)
  })

  it('fallback on WASM crash', () => {
    setupWasmReady()
    setObservationPeriodBridgeMode('fallback-to-current')
    vi.mocked(evaluateObservationPeriodWasm).mockImplementation(() => {
      throw new Error('crash')
    })
    const result = evaluateObservationPeriod(FIXTURES[0].daily, 30, 30)
    expect(result.status).toBe('ok')
  })
})

describe('observationPeriod candidate rollback', () => {
  it('rollback resets mode and result', () => {
    setObservationPeriodBridgeMode('dual-run-compare')
    rollbackToCurrentOnly()
    expect(getObservationPeriodBridgeMode()).toBe('current-only')
    expect(getLastDualRunResult()).toBeNull()
  })
})
