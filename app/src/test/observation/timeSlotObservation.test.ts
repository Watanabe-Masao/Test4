/**
 * timeSlot 自動観測ハーネス
 *
 * 2 関数 × 7 フィクスチャで dual-run compare pipeline を自動検証する。
 * 既存 4 engine (factorDecomposition/grossProfit/budgetAnalysis/forecast) と
 * 同一パターンで timeSlot を promotion-candidate に進めるための基盤。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  findCoreTime as findCoreTimeTS,
  findTurnaroundHour as findTurnaroundHourTS,
  buildHourlyMap,
} from '@/domain/calculations/timeSlotCalculations'
import { setExecutionMode } from '@/application/services/wasmEngine'
import * as wasmEngine from '@/application/services/wasmEngine'
import { resetObserver, buildRunResult } from './observationRunner'
import { judgeObservation } from './observationAssertions'
import { buildJsonReport } from './observationReport'
import { ALL_FIXTURES, NORMAL, type TimeSlotFixture } from './fixtures/timeSlotFixtures'

/* ── WASM mock: TS passthrough ── */

vi.mock('@/application/services/timeSlotWasm', () => ({
  findCoreTimeWasm: vi.fn(),
  findTurnaroundHourWasm: vi.fn(),
}))

import { findCoreTime, findTurnaroundHour } from '@/application/services/timeSlotBridge'
import { findCoreTimeWasm, findTurnaroundHourWasm } from '@/application/services/timeSlotWasm'

const EXPECTED_FUNCTIONS = ['findCoreTime', 'findTurnaroundHour'] as const

function setupCleanMocks(): void {
  vi.mocked(findCoreTimeWasm).mockImplementation((hourlyMap) => findCoreTimeTS(new Map(hourlyMap)))
  vi.mocked(findTurnaroundHourWasm).mockImplementation((hourlyMap) =>
    findTurnaroundHourTS(new Map(hourlyMap)),
  )
}

function toMap(f: TimeSlotFixture): Map<number, number> {
  return buildHourlyMap(f.hourlyData.map((d) => ({ hour: d.hour, amount: d.amount }))) as Map<
    number,
    number
  >
}

function runAllFunctions(f: TimeSlotFixture): void {
  const hourlyMap = toMap(f)
  findCoreTime(hourlyMap)
  findTurnaroundHour(hourlyMap)
}

describe('timeSlot 自動観測ハーネス', () => {
  beforeEach(() => {
    resetObserver()
    setExecutionMode('dual-run-compare')
    vi.spyOn(wasmEngine, 'getWasmModuleState').mockReturnValue('ready')
    vi.spyOn(wasmEngine, 'getWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getWasmExports>,
    )
    vi.spyOn(wasmEngine, 'getTimeSlotWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getTimeSlotWasmExports>,
    )
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    setupCleanMocks()
  })

  // ── per-fixture tests ──
  for (const fixture of ALL_FIXTURES) {
    describe(`fixture: ${fixture.name}`, () => {
      it('2 関数が呼ばれ、verdict が clean', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('timeSlot', fixture.name)
        expect(result.summary.totalCalls).toBeGreaterThanOrEqual(2)
        expect(result.summary.verdict).toBe('clean')
      })

      it('expected call coverage を満たす', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('timeSlot', fixture.name)
        const judgment = judgeObservation(result, EXPECTED_FUNCTIONS)
        expect(judgment.status).not.toBe('fail')
      })

      it('JSON report が生成できる', () => {
        runAllFunctions(fixture)
        const result = buildRunResult('timeSlot', fixture.name)
        const judgment = judgeObservation(result, EXPECTED_FUNCTIONS)
        const report = buildJsonReport(result, judgment, EXPECTED_FUNCTIONS)
        expect(report.engine).toBe('timeSlot')
        expect(report.fixture).toBe(fixture.name)
        expect(report.status).not.toBe('fail')
      })
    })
  }

  // ── 数学的不変条件 ──
  describe('数学的不変条件', () => {
    it('findCoreTime: endHour - startHour <= 2（3時間窓）', () => {
      const hourlyMap = toMap(NORMAL)
      const r = findCoreTime(hourlyMap)
      if (r !== null) {
        expect(r.endHour - r.startHour).toBeGreaterThanOrEqual(0)
        expect(r.endHour - r.startHour).toBeLessThanOrEqual(2)
        expect(r.total).toBeGreaterThan(0)
      }
    })

    it('findTurnaroundHour: 結果は hourlyMap のキー範囲内', () => {
      const hourlyMap = toMap(NORMAL)
      const r = findTurnaroundHour(hourlyMap)
      if (r !== null) {
        const hours = [...hourlyMap.keys()]
        expect(r).toBeGreaterThanOrEqual(Math.min(...hours))
        expect(r).toBeLessThanOrEqual(Math.max(...hours))
      }
    })

    it('空入力 → 両関数 null', () => {
      const hourlyMap = buildHourlyMap([]) as Map<number, number>
      expect(findCoreTime(hourlyMap)).toBeNull()
      expect(findTurnaroundHour(hourlyMap)).toBeNull()
    })
  })

  // ── mismatch 検出の動作確認 ──
  describe('mismatch 検出', () => {
    it('WASM が異なる値を返す → mismatch 検出', () => {
      vi.mocked(findCoreTimeWasm).mockReturnValue({
        startHour: 9999,
        endHour: 9999,
        total: 9999,
      })
      const hourlyMap = toMap(NORMAL)
      findCoreTime(hourlyMap)
      const result = buildRunResult('timeSlot', 'mismatch-test')
      expect(result.summary.totalMismatches).toBeGreaterThan(0)
    })
  })
})
