/**
 * timeSlot 不変条件テスト（authoritative）
 *
 * timeSlot は WASM authoritative に昇格済み。
 * 2 関数 × 7 フィクスチャで不変条件を検証する。
 *
 * @see references/02-status/engine-promotion-matrix.md — authoritative
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  findCoreTime as findCoreTimeTS,
  findTurnaroundHour as findTurnaroundHourTS,
  buildHourlyMap,
} from '@/domain/calculations/timeSlotCalculations'
import * as wasmEngine from '@/application/services/wasmEngine'
import { ALL_FIXTURES, NORMAL, type TimeSlotFixture } from './fixtures/timeSlotFixtures'

/* ── WASM mock: TS passthrough ── */

vi.mock('@/application/services/timeSlotWasm', () => ({
  findCoreTimeWasm: vi.fn(),
  findTurnaroundHourWasm: vi.fn(),
}))

import { findCoreTime, findTurnaroundHour } from '@/application/services/timeSlotBridge'
import { findCoreTimeWasm, findTurnaroundHourWasm } from '@/application/services/timeSlotWasm'

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

describe('timeSlot 不変条件テスト（authoritative）', () => {
  beforeEach(() => {
    vi.spyOn(wasmEngine, 'getTimeSlotWasmExports').mockReturnValue(
      {} as ReturnType<typeof wasmEngine.getTimeSlotWasmExports>,
    )
    setupCleanMocks()
  })

  for (const fixture of ALL_FIXTURES) {
    describe(`fixture: ${fixture.name}`, () => {
      it('findCoreTime: WASM 経由で呼ばれる', () => {
        const hourlyMap = toMap(fixture)
        findCoreTime(hourlyMap)
        expect(findCoreTimeWasm).toHaveBeenCalled()
      })

      it('findTurnaroundHour: WASM 経由で呼ばれる', () => {
        const hourlyMap = toMap(fixture)
        findTurnaroundHour(hourlyMap)
        expect(findTurnaroundHourWasm).toHaveBeenCalled()
      })
    })
  }

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

  describe('TS フォールバック', () => {
    it('WASM 未初期化時は TS にフォールバック', () => {
      vi.spyOn(wasmEngine, 'getTimeSlotWasmExports').mockReturnValue(null)
      vi.mocked(findCoreTimeWasm).mockClear()
      const hourlyMap = toMap(NORMAL)
      const r = findCoreTime(hourlyMap)
      expect(findCoreTimeWasm).not.toHaveBeenCalled()
      if (r !== null) {
        expect(r.total).toBeGreaterThan(0)
      }
    })
  })
})
