/**
 * buildAnalysisFrame テスト
 *
 * AnalysisRequest → AnalysisFrame（rolling/non-rolling union）の変換を検証。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildAnalysisFrame } from '@/application/usecases/temporal'
import type { AnalysisRequest } from '@/domain/models/temporal'

const BASE_REQUEST: Omit<AnalysisRequest, 'analysisMode' | 'windowSize' | 'direction'> = {
  kind: 'analysis',
  anchorRange: {
    from: { year: 2026, month: 3, day: 1 },
    to: { year: 2026, month: 3, day: 31 },
  },
  storeIds: ['S001'],
  metric: 'sales',
  granularity: 'day',
}

describe('buildAnalysisFrame', () => {
  it('rolling 系: movingAverage + windowSize=7 + direction=trailing → RollingAnalysisFrame', () => {
    const request: AnalysisRequest = {
      ...BASE_REQUEST,
      analysisMode: 'movingAverage',
      windowSize: 7,
      direction: 'trailing',
    }
    const frame = buildAnalysisFrame(request)

    expect(frame.kind).toBe('analysis-frame')
    expect(frame.analysisMode).toBe('movingAverage')
    if (frame.analysisMode === 'movingAverage') {
      expect(frame.windowSize).toBe(7)
      expect(frame.direction).toBe('trailing')
    }
  })

  it('rolling 系: windowSize 未指定 → エラー', () => {
    const request: AnalysisRequest = {
      ...BASE_REQUEST,
      analysisMode: 'movingAverage',
      // windowSize 未指定
    }
    expect(() => buildAnalysisFrame(request)).toThrow('requires windowSize')
  })

  it('rolling 系: windowSize <= 0 → エラー', () => {
    const request: AnalysisRequest = {
      ...BASE_REQUEST,
      analysisMode: 'rollingSum',
      windowSize: 0,
    }
    expect(() => buildAnalysisFrame(request)).toThrow('positive integer')
  })

  it('rolling 系: direction 未指定 → trailing に補完', () => {
    const request: AnalysisRequest = {
      ...BASE_REQUEST,
      analysisMode: 'movingAverage',
      windowSize: 7,
      // direction 未指定
    }
    const frame = buildAnalysisFrame(request)

    if (frame.analysisMode === 'movingAverage') {
      expect(frame.direction).toBe('trailing')
    }
  })

  it('non-rolling 系: cumulative → NonRollingAnalysisFrame（windowSize なし）', () => {
    const request: AnalysisRequest = {
      ...BASE_REQUEST,
      analysisMode: 'cumulative',
    }
    const frame = buildAnalysisFrame(request)

    expect(frame.kind).toBe('analysis-frame')
    expect(frame.analysisMode).toBe('cumulative')
    // non-rolling 系には windowSize / direction がない
    expect('windowSize' in frame).toBe(false)
    expect('direction' in frame).toBe(false)
  })
})
