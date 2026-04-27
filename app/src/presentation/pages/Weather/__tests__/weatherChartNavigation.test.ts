/**
 * weatherChartNavigation — 月区切り検出と連続スクロールロジックのテスト
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  detectCenterMonth,
  formatContinuousLabel,
  calcInitialZoomRange,
} from '../weatherChartNavigation'
import type { MonthBoundaries } from '@/application/hooks/useWeatherTriple'

function makeBoundaries(prev: number, cur: number, next: number): MonthBoundaries {
  return { prevCount: prev, curCount: cur, nextCount: next }
}

// ─── detectCenterMonth ───────────────────────────────

describe('detectCenterMonth', () => {
  const b = makeBoundaries(30, 31, 30) // total = 91

  it('中心が当月内は 0', () => {
    // centerPercent 50 → centerIdx ≒ 45.5（curStart=30, curEnd=61）
    expect(detectCenterMonth(40, 60, b)).toBe(0)
  })

  it('中心が curStart の直前なら -1（前月）', () => {
    // centerPercent 0 → centerIdx = 0 < 30
    expect(detectCenterMonth(0, 0, b)).toBe(-1)
  })

  it('中心が curEnd 以上なら 1（翌月）', () => {
    // centerPercent 100 → centerIdx = 91 ≥ 61
    expect(detectCenterMonth(100, 100, b)).toBe(1)
  })

  it('total=0 のときは 0 を返す', () => {
    expect(detectCenterMonth(0, 100, makeBoundaries(0, 0, 0))).toBe(0)
  })

  it('均等分布 (30/30/30) で中心近傍は 0', () => {
    const even = makeBoundaries(30, 30, 30)
    // centerPercent = 50 → centerIdx = 45（curStart=30, curEnd=60）
    expect(detectCenterMonth(45, 55, even)).toBe(0)
  })

  it('均等分布で start=end=0 は -1', () => {
    const even = makeBoundaries(30, 30, 30)
    expect(detectCenterMonth(0, 10, even)).toBe(-1)
  })

  it('prev=0 のとき中心 0 は 0（当月）', () => {
    // prev=0, cur=30, next=30, total=60. curStart=0, curEnd=30.
    // centerPercent=25 → centerIdx=15 in [0,30) → 0
    expect(detectCenterMonth(20, 30, makeBoundaries(0, 30, 30))).toBe(0)
  })
})

// ─── formatContinuousLabel ───────────────────────────

describe('formatContinuousLabel', () => {
  it('1日は月名付きラベル（2026-01-01=木）', () => {
    const label = formatContinuousLabel('2026-01-01')
    expect(label).toContain('{monthLabel|1月}')
    expect(label).toContain('1(木)')
  })

  it('2日以降は月名なし（2026-01-02=金）', () => {
    const label = formatContinuousLabel('2026-01-02')
    expect(label).not.toContain('monthLabel')
    expect(label).toBe('2(金)')
  })

  it('曜日が正しく計算される: 2026-04-13=月', () => {
    const label = formatContinuousLabel('2026-04-13')
    expect(label).toBe('13(月)')
  })

  it('月初の月番号は先頭 0 パディングされていても正しく解釈', () => {
    const label = formatContinuousLabel('2026-02-01')
    // 2026-02-01 = 日曜
    expect(label).toContain('{monthLabel|2月}')
    expect(label).toContain('1(日)')
  })

  it('12 月も正しく月名を付ける', () => {
    const label = formatContinuousLabel('2026-12-01')
    expect(label).toContain('{monthLabel|12月}')
    // 2026-12-01 = 火
    expect(label).toContain('1(火)')
  })
})

// ─── calcInitialZoomRange ────────────────────────────

describe('calcInitialZoomRange', () => {
  it('均等 3 ヶ月（each=30）なら start=33.33, end=66.67', () => {
    const range = calcInitialZoomRange(makeBoundaries(30, 30, 30))
    expect(range.start).toBeCloseTo(33.333, 2)
    expect(range.end).toBeCloseTo(66.666, 2)
  })

  it('total=0 は start=0, end=100', () => {
    expect(calcInitialZoomRange(makeBoundaries(0, 0, 0))).toEqual({ start: 0, end: 100 })
  })

  it('前月なし (prev=0) は start=0', () => {
    const range = calcInitialZoomRange(makeBoundaries(0, 30, 30))
    expect(range.start).toBe(0)
    expect(range.end).toBeCloseTo(50, 5)
  })

  it('翌月なし (next=0) は end=100', () => {
    const range = calcInitialZoomRange(makeBoundaries(30, 30, 0))
    expect(range.start).toBeCloseTo(50, 5)
    expect(range.end).toBe(100)
  })

  it('異なる月日数（31/28/31）でも正しく計算', () => {
    const range = calcInitialZoomRange(makeBoundaries(31, 28, 31))
    const total = 90
    expect(range.start).toBeCloseTo((31 / total) * 100, 5)
    expect(range.end).toBeCloseTo(((31 + 28) / total) * 100, 5)
  })
})
