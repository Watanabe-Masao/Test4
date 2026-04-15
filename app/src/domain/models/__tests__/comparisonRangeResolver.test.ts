/**
 * comparisonRangeResolver — unit test
 *
 * unify-period-analysis Phase 2: presentation 層から比較先日付計算を剥がす
 * ための domain resolver の挙動を固定する。月跨ぎ・閏年・provenance を
 * locked。
 */
import { describe, it, expect } from 'vitest'
import {
  resolveComparisonRange,
  deriveSameDowStartDateKey,
} from '@/domain/models/comparisonRangeResolver'

describe('resolveComparisonRange', () => {
  describe('mode: yoy', () => {
    it('sameDate (dowOffset=0): year-1 の同日同月を返す', () => {
      const result = resolveComparisonRange({
        mode: 'yoy',
        year: 2026,
        month: 5,
        dayStart: 1,
        dayEnd: 7,
        dowOffset: 0,
        canWoW: false,
        wowPrevStart: 0,
        wowPrevEnd: 0,
      })
      expect(result.range).toEqual({
        from: { year: 2025, month: 5, day: 1 },
        to: { year: 2025, month: 5, day: 7 },
      })
      expect(result.provenance).toEqual({
        mode: 'yoy',
        mappingKind: 'sameDate',
        dowOffset: 0,
        fallbackApplied: false,
      })
    })

    it('sameDayOfWeek (dowOffset=2): year-1 + 2 日を返す', () => {
      const result = resolveComparisonRange({
        mode: 'yoy',
        year: 2026,
        month: 5,
        dayStart: 10,
        dayEnd: 12,
        dowOffset: 2,
        canWoW: false,
        wowPrevStart: 0,
        wowPrevEnd: 0,
      })
      expect(result.range).toEqual({
        from: { year: 2025, month: 5, day: 12 },
        to: { year: 2025, month: 5, day: 14 },
      })
      expect(result.provenance?.mappingKind).toBe('sameDayOfWeek')
      expect(result.provenance?.dowOffset).toBe(2)
    })

    it('月跨ぎ (dowOffset で月境界を超える): Date 演算で正しく解決される', () => {
      // 2026/5/30 + dowOffset=3 → year-1 の 6/2 になる
      const result = resolveComparisonRange({
        mode: 'yoy',
        year: 2026,
        month: 5,
        dayStart: 30,
        dayEnd: 30,
        dowOffset: 3,
        canWoW: false,
        wowPrevStart: 0,
        wowPrevEnd: 0,
      })
      expect(result.range?.from).toEqual({ year: 2025, month: 6, day: 2 })
      expect(result.range?.to).toEqual({ year: 2025, month: 6, day: 2 })
    })

    it('閏年: 2025/2/29 → 2024/3/1 (Date 演算が正規化する)', () => {
      // 2025 は平年。dayStart=29 を渡すと year-1=2024 の 2/29（閏年あり）になる
      const result = resolveComparisonRange({
        mode: 'yoy',
        year: 2025,
        month: 2,
        dayStart: 29,
        dayEnd: 29,
        dowOffset: 0,
        canWoW: false,
        wowPrevStart: 0,
        wowPrevEnd: 0,
      })
      // 2024 は閏年なので 2024-02-29 が存在する
      expect(result.range?.from).toEqual({ year: 2024, month: 2, day: 29 })
    })
  })

  describe('mode: wow', () => {
    it('canWoW=true: wowPrevStart..wowPrevEnd を当月で返す', () => {
      const result = resolveComparisonRange({
        mode: 'wow',
        year: 2026,
        month: 5,
        dayStart: 8,
        dayEnd: 14,
        dowOffset: 0,
        canWoW: true,
        wowPrevStart: 1,
        wowPrevEnd: 7,
      })
      expect(result.range).toEqual({
        from: { year: 2026, month: 5, day: 1 },
        to: { year: 2026, month: 5, day: 7 },
      })
      expect(result.provenance).toEqual({
        mode: 'wow',
        mappingKind: 'previousWeek',
        dowOffset: 0,
        fallbackApplied: false,
      })
    })

    it('canWoW=false: range は undefined だが provenance に fallbackApplied=true が載る', () => {
      const result = resolveComparisonRange({
        mode: 'wow',
        year: 2026,
        month: 5,
        dayStart: 1,
        dayEnd: 7,
        dowOffset: 0,
        canWoW: false,
        wowPrevStart: 0,
        wowPrevEnd: 0,
      })
      expect(result.range).toBeUndefined()
      expect(result.provenance).toEqual({
        mode: 'wow',
        mappingKind: 'previousWeek',
        dowOffset: 0,
        fallbackApplied: true,
      })
    })
  })
})

describe('deriveSameDowStartDateKey', () => {
  it('dowOffset=0 のときは undefined を返す (補正不要)', () => {
    expect(deriveSameDowStartDateKey(2026, 5, 0)).toBeUndefined()
  })

  it('year/month が undefined なら undefined を返す', () => {
    expect(deriveSameDowStartDateKey(undefined, 5, 2)).toBeUndefined()
    expect(deriveSameDowStartDateKey(2026, undefined, 2)).toBeUndefined()
  })

  it('dowOffset=2: year-1 の (1 + dowOffset) 日を YYYY-MM-DD で返す', () => {
    expect(deriveSameDowStartDateKey(2026, 5, 2)).toBe('2025-05-03')
  })

  it('dowOffset=6: 月内に収まる場合', () => {
    expect(deriveSameDowStartDateKey(2026, 5, 6)).toBe('2025-05-07')
  })

  it('既存実装 deriveCompStartDateKey との完全等価 (旧式 string template リテラル形式)', () => {
    // 旧 deriveCompStartDateKey: `${year - 1}-${String(month).padStart(2, '0')}-${String(1 + dowOffset).padStart(2, '0')}`
    // 旧式は Date 演算ではなく単純 template なので、月跨ぎは表現できない（dowOffset が
    // 月内に収まる前提）。本テストはその範囲内で旧実装と等価であることを固定する。
    for (let dow = 1; dow <= 6; dow++) {
      const expected = `${2026 - 1}-${String(5).padStart(2, '0')}-${String(1 + dow).padStart(2, '0')}`
      expect(deriveSameDowStartDateKey(2026, 5, dow)).toBe(expected)
    }
  })
})
