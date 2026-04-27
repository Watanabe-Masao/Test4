/**
 * buildTemporalFetchPlan テスト
 *
 * RollingAnalysisFrame から requiredRange / requiredMonths を導出する。
 * 月跨ぎ・閏年・エッジケースを網羅する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildTemporalFetchPlan } from '@/application/usecases/temporal'
import type { RollingAnalysisFrame } from '@/application/usecases/temporal'

function makeFrame(overrides: Partial<RollingAnalysisFrame> = {}): RollingAnalysisFrame {
  return {
    kind: 'analysis-frame',
    anchorRange: {
      from: { year: 2026, month: 3, day: 1 },
      to: { year: 2026, month: 3, day: 31 },
    },
    storeIds: ['S001'],
    metric: 'sales',
    granularity: 'day',
    analysisMode: 'movingAverage',
    windowSize: 7,
    direction: 'trailing',
    ...overrides,
  }
}

describe('buildTemporalFetchPlan', () => {
  it('2026-03 trailing 7日 → requiredMonths に前月を含む', () => {
    const plan = buildTemporalFetchPlan(makeFrame())

    // trailing 7日: from を 6日前に拡張 → 2/23
    expect(plan.requiredRange.from).toEqual({ year: 2026, month: 2, day: 23 })
    expect(plan.requiredRange.to).toEqual({ year: 2026, month: 3, day: 31 })
    expect(plan.requiredMonths).toEqual(['2026-02', '2026-03'])
  })

  it('2026-03 trailing 28日 → requiredRange が十分に前月へ拡張', () => {
    const plan = buildTemporalFetchPlan(makeFrame({ windowSize: 28 }))

    // trailing 28日: from を 27日前に拡張 → 2/2
    expect(plan.requiredRange.from).toEqual({ year: 2026, month: 2, day: 2 })
    expect(plan.requiredMonths).toEqual(['2026-02', '2026-03'])
  })

  it('centered window → 前後に拡張', () => {
    // anchorRange = 2026-03-10..2026-03-20, windowSize=7, centered
    // halfBefore = floor(6/2) = 3, halfAfter = ceil(6/2) = 3
    const plan = buildTemporalFetchPlan(
      makeFrame({
        anchorRange: {
          from: { year: 2026, month: 3, day: 10 },
          to: { year: 2026, month: 3, day: 20 },
        },
        windowSize: 7,
        direction: 'centered',
      }),
    )

    expect(plan.requiredRange.from).toEqual({ year: 2026, month: 3, day: 7 })
    expect(plan.requiredRange.to).toEqual({ year: 2026, month: 3, day: 23 })
    expect(plan.requiredMonths).toEqual(['2026-03'])
  })

  it('leading window → 後ろだけ拡張', () => {
    const plan = buildTemporalFetchPlan(
      makeFrame({
        anchorRange: {
          from: { year: 2026, month: 3, day: 1 },
          to: { year: 2026, month: 3, day: 25 },
        },
        windowSize: 7,
        direction: 'leading',
      }),
    )

    // leading 7日: to を 6日後に拡張 → 3/31
    expect(plan.requiredRange.from).toEqual({ year: 2026, month: 3, day: 1 })
    expect(plan.requiredRange.to).toEqual({ year: 2026, month: 3, day: 31 })
    expect(plan.requiredMonths).toEqual(['2026-03'])
  })

  it('2028-03 trailing 7日 → 閏年で 2/29 を含む', () => {
    const plan = buildTemporalFetchPlan(
      makeFrame({
        anchorRange: {
          from: { year: 2028, month: 3, day: 1 },
          to: { year: 2028, month: 3, day: 31 },
        },
        windowSize: 7,
      }),
    )

    // trailing 7日: from を 6日前に拡張 → 2/24（2028は閏年なので2/29含む）
    expect(plan.requiredRange.from).toEqual({ year: 2028, month: 2, day: 24 })
    expect(plan.requiredMonths).toContain('2028-02')
  })

  it('requiredMonths に重複がない', () => {
    const plan = buildTemporalFetchPlan(makeFrame({ windowSize: 60 }))

    const unique = new Set(plan.requiredMonths)
    expect(plan.requiredMonths).toHaveLength(unique.size)
  })

  it('windowSize=1（エッジ）→ requiredRange === anchorRange', () => {
    const anchor = {
      from: { year: 2026, month: 3, day: 15 },
      to: { year: 2026, month: 3, day: 15 },
    }
    const plan = buildTemporalFetchPlan(makeFrame({ anchorRange: anchor, windowSize: 1 }))

    // windowSize=1: 拡張なし
    expect(plan.requiredRange.from).toEqual(anchor.from)
    expect(plan.requiredRange.to).toEqual(anchor.to)
    expect(plan.requiredMonths).toEqual(['2026-03'])
  })
})
