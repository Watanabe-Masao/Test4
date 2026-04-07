/**
 * AnalysisFrame 正本ガード
 *
 * AnalysisFrame / CalculationFrame が分析入力の唯一入口。
 * cache key の一意性と fingerprint の安定性を保証する。
 * ルール定義: architectureRules.ts (AR-STRUCT-ANALYSIS-FRAME)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('AnalysisFrame 正本ガード', () => {
  it('AnalysisFrame 型が domain/models に存在する', () => {
    const file = path.join(SRC_DIR, 'domain/models/AnalysisFrame.ts')
    expect(fs.existsSync(file)).toBe(true)
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('BaseAnalysisFrame')
    expect(content).toContain('FreePeriodAnalysisFrame')
    expect(content).toContain('TemporalAnalysisFrame')
  })

  it('CalculationFrame 型と factory が存在する', () => {
    const file = path.join(SRC_DIR, 'domain/models/CalculationFrame.ts')
    expect(fs.existsSync(file)).toBe(true)
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export interface CalculationFrame')
    expect(content).toContain('export function buildCalculationFrame')
  })

  it('analysisFrameFingerprint が存在する', () => {
    const file = path.join(SRC_DIR, 'domain/models/analysisFrameFingerprint.ts')
    expect(fs.existsSync(file)).toBe(true)
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function computeAnalysisFrameKey')
  })

  it('buildFreePeriodFrame factory が存在する', () => {
    const file = path.join(SRC_DIR, 'domain/models/buildFreePeriodFrame.ts')
    expect(fs.existsSync(file)).toBe(true)
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function buildFreePeriodFrame')
  })
})

// ── fingerprint の安定性テスト ──

import { computeAnalysisFrameKey } from '@/domain/models/analysisFrameFingerprint'
import type { FreePeriodAnalysisFrame } from '@/domain/models/AnalysisFrame'

function makeFrame(overrides: Partial<FreePeriodAnalysisFrame> = {}): FreePeriodAnalysisFrame {
  return {
    kind: 'free-period',
    anchorRange: { from: { year: 2025, month: 3, day: 1 }, to: { year: 2025, month: 3, day: 31 } },
    storeIds: ['s1', 's2'],
    granularity: 'day',
    comparison: null,
    ...overrides,
  }
}

describe('computeAnalysisFrameKey', () => {
  it('同一入力で同一キー', () => {
    const f = makeFrame()
    expect(computeAnalysisFrameKey(f)).toBe(computeAnalysisFrameKey(f))
  })

  it('storeIds の順序が違っても同一キー', () => {
    const f1 = makeFrame({ storeIds: ['s2', 's1'] })
    const f2 = makeFrame({ storeIds: ['s1', 's2'] })
    expect(computeAnalysisFrameKey(f1)).toBe(computeAnalysisFrameKey(f2))
  })

  it('期間が違えば別キー', () => {
    const f1 = makeFrame()
    const f2 = makeFrame({
      anchorRange: {
        from: { year: 2025, month: 4, day: 1 },
        to: { year: 2025, month: 4, day: 30 },
      },
    })
    expect(computeAnalysisFrameKey(f1)).not.toBe(computeAnalysisFrameKey(f2))
  })

  it('comparison あり/なしで別キー', () => {
    const f1 = makeFrame({ comparison: null })
    const f2 = makeFrame({
      comparison: {
        period1: { from: { year: 2025, month: 3, day: 1 }, to: { year: 2025, month: 3, day: 31 } },
        period2: { from: { year: 2024, month: 3, day: 1 }, to: { year: 2024, month: 3, day: 31 } },
        preset: 'prevYearSameMonth',
        alignmentMode: 'sameDate',
        dowOffset: 0,
        effectivePeriod1: {
          from: { year: 2025, month: 3, day: 1 },
          to: { year: 2025, month: 3, day: 31 },
        },
        effectivePeriod2: {
          from: { year: 2024, month: 3, day: 1 },
          to: { year: 2024, month: 3, day: 31 },
        },
        queryRanges: [],
        alignmentMap: [],
        sourceMonth: { year: 2024, month: 3 },
      },
    })
    expect(computeAnalysisFrameKey(f1)).not.toBe(computeAnalysisFrameKey(f2))
  })

  it('storeIds が空なら * になる', () => {
    const key = computeAnalysisFrameKey(makeFrame({ storeIds: [] }))
    expect(key).toContain(':*:')
  })
})
