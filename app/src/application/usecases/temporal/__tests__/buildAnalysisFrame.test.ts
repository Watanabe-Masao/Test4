/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { buildAnalysisFrame } from '../buildAnalysisFrame'
import type { AnalysisRequest } from '@/domain/models/temporal'

const baseAnchor = {
  from: { year: 2024, month: 1, day: 1 },
  to: { year: 2024, month: 1, day: 31 },
}

describe('buildAnalysisFrame', () => {
  it('builds a movingAverage frame with default direction=trailing', () => {
    const req: AnalysisRequest = {
      kind: 'analysis' as const,
      anchorRange: baseAnchor,
      storeIds: ['s1'],
      metric: 'sales',
      granularity: 'day',
      analysisMode: 'movingAverage',
      windowSize: 7,
    }
    const frame = buildAnalysisFrame(req)
    expect(frame.kind).toBe('analysis-frame')
    expect(frame.analysisMode).toBe('movingAverage')
    if (frame.analysisMode === 'movingAverage') {
      expect(frame.windowSize).toBe(7)
      expect(frame.direction).toBe('trailing')
    }
  })

  it('preserves explicit direction=centered', () => {
    const frame = buildAnalysisFrame({
      kind: 'analysis' as const,
      anchorRange: baseAnchor,
      storeIds: ['s1'],
      metric: 'sales',
      granularity: 'day',
      analysisMode: 'rollingSum',
      windowSize: 5,
      direction: 'centered',
    })
    if (frame.analysisMode === 'rollingSum') {
      expect(frame.direction).toBe('centered')
      expect(frame.windowSize).toBe(5)
    }
  })

  it('builds a cumulative (non-rolling) frame without windowSize', () => {
    const frame = buildAnalysisFrame({
      kind: 'analysis' as const,
      anchorRange: baseAnchor,
      storeIds: ['s1'],
      metric: 'sales',
      granularity: 'day',
      analysisMode: 'cumulative',
    })
    expect(frame.analysisMode).toBe('cumulative')
    expect(frame.kind).toBe('analysis-frame')
    expect('windowSize' in frame).toBe(false)
  })

  it('builds a trend frame', () => {
    const frame = buildAnalysisFrame({
      kind: 'analysis' as const,
      anchorRange: baseAnchor,
      storeIds: [],
      metric: 'sales',
      granularity: 'day',
      analysisMode: 'trend',
    })
    expect(frame.analysisMode).toBe('trend')
  })

  it('throws if windowSize is missing for rolling modes', () => {
    expect(() =>
      buildAnalysisFrame({
        kind: 'analysis' as const,
        anchorRange: baseAnchor,
        storeIds: ['s1'],
        metric: 'sales',
        granularity: 'day',
        analysisMode: 'movingAverage',
      } as unknown as AnalysisRequest),
    ).toThrow(/requires windowSize/)
  })

  it('throws if windowSize is zero or negative', () => {
    expect(() =>
      buildAnalysisFrame({
        kind: 'analysis' as const,
        anchorRange: baseAnchor,
        storeIds: ['s1'],
        metric: 'sales',
        granularity: 'day',
        analysisMode: 'movingAverage',
        windowSize: 0,
      }),
    ).toThrow(/positive integer/)
    expect(() =>
      buildAnalysisFrame({
        kind: 'analysis' as const,
        anchorRange: baseAnchor,
        storeIds: ['s1'],
        metric: 'sales',
        granularity: 'day',
        analysisMode: 'rollingSum',
        windowSize: -3,
      }),
    ).toThrow(/positive integer/)
  })

  it('throws for non-integer windowSize', () => {
    expect(() =>
      buildAnalysisFrame({
        kind: 'analysis' as const,
        anchorRange: baseAnchor,
        storeIds: ['s1'],
        metric: 'sales',
        granularity: 'day',
        analysisMode: 'movingAverage',
        windowSize: 2.5,
      }),
    ).toThrow(/positive integer/)
  })
})
