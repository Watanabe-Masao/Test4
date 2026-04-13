import { describe, it, expect } from 'vitest'
import { buildChartPeriodProps } from '../buildChartPeriodProps'
import { PERIOD_LABELS } from '../periodLabels'
import type { DualPeriodRangeResult } from '@/presentation/components/charts/useDualPeriodRange'

function makeRange(overrides: Partial<DualPeriodRangeResult> = {}): DualPeriodRangeResult {
  return {
    p1Start: 1,
    p1End: 10,
    p2Start: 11,
    p2End: 20,
    p2Enabled: true,
    ...overrides,
  } as DualPeriodRangeResult
}

describe('buildChartPeriodProps', () => {
  it('maps range fields to ChartPeriodProps and uses prevYearSameMonth labels', () => {
    const result = buildChartPeriodProps(makeRange(), 'prevYearSameMonth')
    expect(result.rangeStart).toBe(1)
    expect(result.rangeEnd).toBe(10)
    expect(result.p2Start).toBe(11)
    expect(result.p2End).toBe(20)
    expect(result.comparisonEnabled).toBe(true)
    expect(result.p1Label).toBe('当期')
    expect(result.p2Label).toBe('前年同月')
  })

  it('uses prevMonth labels', () => {
    const out = buildChartPeriodProps(makeRange(), 'prevMonth')
    expect(out.p2Label).toBe('前月')
  })

  it('uses prevWeek labels', () => {
    const out = buildChartPeriodProps(makeRange(), 'prevWeek')
    expect(out.p2Label).toBe('前週')
  })

  it('uses custom labels', () => {
    const out = buildChartPeriodProps(makeRange(), 'custom')
    expect(out.p1Label).toBe('期間1')
    expect(out.p2Label).toBe('期間2')
  })

  it('propagates p2Enabled=false', () => {
    const out = buildChartPeriodProps(makeRange({ p2Enabled: false }), 'prevYearSameMonth')
    expect(out.comparisonEnabled).toBe(false)
  })

  it('PERIOD_LABELS contains entries for all known presets', () => {
    expect(PERIOD_LABELS.prevYearSameMonth.p1).toBe('当期')
    expect(PERIOD_LABELS.prevYearSameDow.p2).toBe('前年同曜日')
    expect(PERIOD_LABELS.prevYearNextWeek.p2).toBe('前年翌週')
  })
})
