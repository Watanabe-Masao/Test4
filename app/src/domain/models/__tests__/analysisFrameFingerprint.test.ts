/**
 * analysisFrameFingerprint — computeAnalysisFrameKey tests
 *
 * cache key の安定性が要件。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { computeAnalysisFrameKey } from '../analysisFrameFingerprint'
import type { FreePeriodAnalysisFrame } from '../AnalysisFrame'

const sampleFrame: FreePeriodAnalysisFrame = {
  kind: 'free-period',
  anchorRange: {
    from: { year: 2026, month: 3, day: 1 },
    to: { year: 2026, month: 3, day: 31 },
  },
  storeIds: ['s1', 's2', 's3'],
  granularity: 'day',
  comparison: null,
}

describe('computeAnalysisFrameKey', () => {
  it('fp: prefix で始まる', () => {
    expect(computeAnalysisFrameKey(sampleFrame)).toMatch(/^fp:/)
  })

  it('storeIds が異なる順序でも同じ key（sort される）', () => {
    const k1 = computeAnalysisFrameKey(sampleFrame)
    const k2 = computeAnalysisFrameKey({ ...sampleFrame, storeIds: ['s3', 's1', 's2'] })
    expect(k1).toBe(k2)
  })

  it('storeIds が空ならワイルドカード *', () => {
    const k = computeAnalysisFrameKey({ ...sampleFrame, storeIds: [] })
    expect(k).toContain('*')
  })

  it('comparison=null は key に "none" が入る', () => {
    expect(computeAnalysisFrameKey(sampleFrame)).toContain(':none')
  })

  it('comparison あり: alignmentMode + period2 + dowOffset を含む', () => {
    const withComp: FreePeriodAnalysisFrame = {
      ...sampleFrame,
      comparison: {
        effectivePeriod2: {
          from: { year: 2025, month: 3, day: 1 },
          to: { year: 2025, month: 3, day: 31 },
        },
        alignmentMode: 'sameDow',
        dowOffset: 3,
      } as unknown as FreePeriodAnalysisFrame['comparison'],
    }
    const k = computeAnalysisFrameKey(withComp)
    expect(k).toContain('sameDow')
    expect(k).toContain('2025-3-1')
    expect(k).toContain('dow3')
  })

  it('日付差で異なる key', () => {
    const a = computeAnalysisFrameKey(sampleFrame)
    const b = computeAnalysisFrameKey({
      ...sampleFrame,
      anchorRange: { ...sampleFrame.anchorRange, to: { year: 2026, month: 3, day: 30 } },
    })
    expect(a).not.toBe(b)
  })

  it('granularity を含む', () => {
    expect(computeAnalysisFrameKey(sampleFrame)).toContain(':day:')
  })
})
