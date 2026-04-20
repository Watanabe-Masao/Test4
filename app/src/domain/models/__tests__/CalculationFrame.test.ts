/**
 * CalculationFrame — buildCalculationFrame factory tests
 *
 * effectiveDays の解釈を単一化する factory のふるまいを固定する。
 */
import { describe, it, expect } from 'vitest'
import { buildCalculationFrame } from '../CalculationFrame'
import type { AppSettings } from '@/domain/models/storeTypes'

function settings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    targetYear: 2026,
    targetMonth: 3,
    dataEndDay: null,
    ...overrides,
  } as AppSettings
}

describe('buildCalculationFrame', () => {
  it('targetYear / targetMonth をそのまま持つ', () => {
    const f = buildCalculationFrame(settings({ targetYear: 2025, targetMonth: 7 }))
    expect(f.targetYear).toBe(2025)
    expect(f.targetMonth).toBe(7)
  })

  it('daysInMonth を月から計算（3月=31日）', () => {
    const f = buildCalculationFrame(settings({ targetYear: 2026, targetMonth: 3 }))
    expect(f.daysInMonth).toBe(31)
  })

  it('daysInMonth を月から計算（2月=28日）', () => {
    const f = buildCalculationFrame(settings({ targetYear: 2026, targetMonth: 2 }))
    expect(f.daysInMonth).toBe(28)
  })

  it('うるう年の 2月=29日', () => {
    const f = buildCalculationFrame(settings({ targetYear: 2028, targetMonth: 2 }))
    expect(f.daysInMonth).toBe(29)
  })

  it('dataEndDay=null で effectiveDays = daysInMonth', () => {
    const f = buildCalculationFrame(
      settings({ targetYear: 2026, targetMonth: 3, dataEndDay: null }),
    )
    expect(f.effectiveDays).toBe(31)
    expect(f.dataEndDay).toBeNull()
  })

  it('dataEndDay < daysInMonth で effectiveDays = dataEndDay', () => {
    const f = buildCalculationFrame(settings({ targetYear: 2026, targetMonth: 3, dataEndDay: 15 }))
    expect(f.effectiveDays).toBe(15)
    expect(f.dataEndDay).toBe(15)
  })

  it('dataEndDay > daysInMonth で effectiveDays = daysInMonth（clamp）', () => {
    const f = buildCalculationFrame(settings({ targetYear: 2026, targetMonth: 2, dataEndDay: 40 }))
    expect(f.effectiveDays).toBe(28)
  })

  it('dataEndDay === daysInMonth で両者一致', () => {
    const f = buildCalculationFrame(settings({ targetYear: 2026, targetMonth: 3, dataEndDay: 31 }))
    expect(f.effectiveDays).toBe(31)
    expect(f.dataEndDay).toBe(31)
  })
})
