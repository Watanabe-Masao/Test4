import { describe, it, expect } from 'vitest'
import { buildTemporalFetchPlan } from '../buildTemporalFetchPlan'
import type { RollingAnalysisFrame } from '../TemporalFrameTypes'

const baseFrame = (overrides: Partial<RollingAnalysisFrame> = {}): RollingAnalysisFrame => ({
  kind: 'analysis-frame',
  anchorRange: {
    from: { year: 2024, month: 3, day: 10 },
    to: { year: 2024, month: 3, day: 20 },
  },
  storeIds: ['s1'],
  metric: 'sales',
  granularity: 'day',
  analysisMode: 'movingAverage',
  windowSize: 7,
  direction: 'trailing',
  ...overrides,
})

describe('buildTemporalFetchPlan', () => {
  it('extends the range backward for trailing direction (windowSize-1 days)', () => {
    const plan = buildTemporalFetchPlan(baseFrame({ windowSize: 7, direction: 'trailing' }))
    // 10 - (7-1) = 4
    expect(plan.requiredRange.from).toEqual({ year: 2024, month: 3, day: 4 })
    expect(plan.requiredRange.to).toEqual({ year: 2024, month: 3, day: 20 })
    expect(plan.anchorRange).toEqual(baseFrame().anchorRange)
  })

  it('extends around the anchor for centered direction', () => {
    const plan = buildTemporalFetchPlan(baseFrame({ windowSize: 5, direction: 'centered' }))
    // halfBefore = floor(4/2) = 2, halfAfter = ceil(4/2) = 2
    expect(plan.requiredRange.from).toEqual({ year: 2024, month: 3, day: 8 })
    expect(plan.requiredRange.to).toEqual({ year: 2024, month: 3, day: 22 })
  })

  it('extends asymmetrically for even windowSize centered', () => {
    const plan = buildTemporalFetchPlan(baseFrame({ windowSize: 4, direction: 'centered' }))
    // halfBefore = floor(3/2) = 1, halfAfter = ceil(3/2) = 2
    expect(plan.requiredRange.from).toEqual({ year: 2024, month: 3, day: 9 })
    expect(plan.requiredRange.to).toEqual({ year: 2024, month: 3, day: 22 })
  })

  it('extends the range forward for leading direction', () => {
    const plan = buildTemporalFetchPlan(baseFrame({ windowSize: 7, direction: 'leading' }))
    expect(plan.requiredRange.from).toEqual({ year: 2024, month: 3, day: 10 })
    expect(plan.requiredRange.to).toEqual({ year: 2024, month: 3, day: 26 })
  })

  it('extracts requiredMonths as a single month when fully contained', () => {
    const plan = buildTemporalFetchPlan(baseFrame({ windowSize: 3, direction: 'trailing' }))
    expect(plan.requiredMonths).toEqual(['2024-03'])
  })

  it('extracts multiple months when range crosses month boundary', () => {
    const plan = buildTemporalFetchPlan(
      baseFrame({
        anchorRange: {
          from: { year: 2024, month: 3, day: 1 },
          to: { year: 2024, month: 3, day: 5 },
        },
        windowSize: 10,
        direction: 'trailing',
      }),
    )
    // 1 - 9 = -8 → Feb 20
    expect(plan.requiredMonths).toEqual(['2024-02', '2024-03'])
  })

  it('formats month numbers with zero padding', () => {
    const plan = buildTemporalFetchPlan(
      baseFrame({
        anchorRange: {
          from: { year: 2024, month: 1, day: 5 },
          to: { year: 2024, month: 1, day: 10 },
        },
        windowSize: 3,
        direction: 'trailing',
      }),
    )
    expect(plan.requiredMonths).toEqual(['2024-01'])
  })

  it('throws when granularity is not "day"', () => {
    expect(() =>
      buildTemporalFetchPlan(
        baseFrame({ granularity: 'week' as RollingAnalysisFrame['granularity'] }),
      ),
    ).toThrow(/granularity='day'/)
  })
})
