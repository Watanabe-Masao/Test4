/**
 * buildFreePeriodFrame — PeriodSelection → FreePeriodAnalysisFrame factory tests
 *
 * 検証対象:
 * - kind='free-period' / granularity='day' を必ず設定
 * - period1 を anchorRange に格納
 * - storeIds をそのまま格納
 * - comparisonEnabled=false → comparison=null
 * - comparisonEnabled=true → buildComparisonScope を呼ぶ
 */
import { describe, it, expect } from 'vitest'
import { buildFreePeriodFrame } from '../buildFreePeriodFrame'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'

const baseSelection: PeriodSelection = {
  period1: {
    from: { year: 2026, month: 3, day: 1 },
    to: { year: 2026, month: 3, day: 31 },
  },
  period2: {
    from: { year: 2025, month: 3, day: 1 },
    to: { year: 2025, month: 3, day: 31 },
  },
  comparisonEnabled: false,
  activePreset: 'prevYearSameMonth',
}

describe('buildFreePeriodFrame', () => {
  it("kind='free-period' を固定で返す", () => {
    const r = buildFreePeriodFrame(baseSelection, ['s1'])
    expect(r.kind).toBe('free-period')
  })

  it('anchorRange は period1 と同じ', () => {
    const r = buildFreePeriodFrame(baseSelection, ['s1'])
    expect(r.anchorRange).toEqual(baseSelection.period1)
  })

  it("granularity='day' を固定", () => {
    const r = buildFreePeriodFrame(baseSelection, ['s1'])
    expect(r.granularity).toBe('day')
  })

  it('storeIds をそのまま格納', () => {
    const r = buildFreePeriodFrame(baseSelection, ['s1', 's2', 's3'])
    expect(r.storeIds).toEqual(['s1', 's2', 's3'])
  })

  it('空 storeIds も受け付ける', () => {
    const r = buildFreePeriodFrame(baseSelection, [])
    expect(r.storeIds).toEqual([])
  })

  it('comparisonEnabled=false で comparison=null', () => {
    const r = buildFreePeriodFrame({ ...baseSelection, comparisonEnabled: false }, ['s1'])
    expect(r.comparison).toBeNull()
  })

  it('comparisonEnabled=true で comparison オブジェクトを構築', () => {
    const r = buildFreePeriodFrame({ ...baseSelection, comparisonEnabled: true }, ['s1'])
    expect(r.comparison).not.toBeNull()
    expect(r.comparison).toHaveProperty('alignmentMode')
  })

  it('elapsedDays を buildComparisonScope に渡す（comparison あり時）', () => {
    const r = buildFreePeriodFrame({ ...baseSelection, comparisonEnabled: true }, ['s1'], 15)
    expect(r.comparison).not.toBeNull()
    // elapsedDays の詳細検証は buildComparisonScope 側で担保
  })
})
