/**
 * 曜日ギャップ分析テスト
 *
 * 検証する不変条件:
 *   1. countDowsInMonth の合計 = その月の日数
 *   2. analyzeDowGap の diff 合計 = 当年日数 - 前年日数
 *   3. estimatedImpact = Σ(diff × prevDowDailyAvg[dow])
 *   3a. prevDowSales 未指定時: estimatedImpact = Σ(diff) × dailyAverageSales
 *   3b. prevDowSales 指定時: 曜日別重み付けで影響額を算出
 */
import { describe, it, expect } from 'vitest'
import {
  countDowsInMonth,
  analyzeDowGap,
  analyzeDowGapActualDay,
  ZERO_DOW_GAP_ANALYSIS,
  ZERO_ACTUAL_DAY_IMPACT,
} from '../dowGapAnalysis'

describe('countDowsInMonth', () => {
  it.each([
    [2026, 1, 31],
    [2026, 2, 28],
    [2024, 2, 29], // うるう年
    [2026, 4, 30],
  ])('%i年%i月 → 合計 %i 日（不変条件1）', (year, month, expectedDays) => {
    const counts = countDowsInMonth(year, month)
    expect(counts).toHaveLength(7)
    expect(counts.reduce((s, c) => s + c, 0)).toBe(expectedDays)
    // 各曜日 4 or 5 日
    for (const c of counts) {
      expect(c).toBeGreaterThanOrEqual(4)
      expect(c).toBeLessThanOrEqual(5)
    }
  })
})

describe('analyzeDowGap', () => {
  it('diff 合計 = 当年日数 - 前年日数（不変条件2）', () => {
    // 同日数: 31 vs 31
    expect(sumDiffs(analyzeDowGap(2026, 3, 2025, 3, 1))).toBe(0)
    // 28 vs 31
    expect(sumDiffs(analyzeDowGap(2026, 2, 2026, 3, 1))).toBe(-3)
    // うるう年: 29 vs 28
    expect(sumDiffs(analyzeDowGap(2024, 2, 2023, 2, 1))).toBe(1)
  })

  it('prevDowSales未指定: estimatedImpact = Σ(diff) × dailyAvg（不変条件3a）', () => {
    const daily = 500000
    const result = analyzeDowGap(2026, 2, 2026, 1, daily) // 28 vs 31
    expect(result.estimatedImpact).toBe(sumDiffs(result) * daily)
  })

  it('prevDowSales指定: estimatedImpact = Σ(diff × 曜日別日平均)（不変条件3b）', () => {
    // 2026年3月(31日) vs 2025年3月(31日): 同日数でも曜日構成が異なる
    const prevDowSales = [800000, 500000, 500000, 500000, 500000, 600000, 1000000]
    const result = analyzeDowGap(2026, 3, 2025, 3, 100000, prevDowSales)
    // 影響額 = Σ(diff_i × prevDowDailyAvg_i) — 曜日ごとの重み付き
    const expected = result.dowCounts.reduce(
      (s, d) => s + d.diff * result.prevDowDailyAvg[d.dow],
      0,
    )
    expect(result.estimatedImpact).toBe(expected)
    // 同日数でも曜日構成が違うので影響額は0にならない可能性がある
    expect(result.prevDowDailyAvg).toHaveLength(7)
  })

  it('同一年月なら差分ゼロ・影響額ゼロ', () => {
    const result = analyzeDowGap(2026, 3, 2026, 3, 100000)
    expect(result.estimatedImpact).toBe(0)
    expect(result.isValid).toBe(true)
  })

  it('日平均売上ゼロなら isValid: false', () => {
    const result = analyzeDowGap(2026, 3, 2025, 3, 0)
    expect(result.isValid).toBe(false)
  })
})

describe('ZERO_DOW_GAP_ANALYSIS', () => {
  it('全フィールドがゼロ/false', () => {
    expect(ZERO_DOW_GAP_ANALYSIS.estimatedImpact).toBe(0)
    expect(ZERO_DOW_GAP_ANALYSIS.isValid).toBe(false)
    expect(ZERO_DOW_GAP_ANALYSIS.dowCounts).toHaveLength(7)
  })
})

describe('analyzeDowGapActualDay', () => {
  it('不変条件: estimatedImpact = Σ(shiftedIn.prevSales) - Σ(shiftedOut.prevSales)', () => {
    // sameDate: prevDays 1-31, sameDow: prevDays 2-31 (offset=1 → prevDay 1 が外れる)
    const sameDate = Array.from({ length: 31 }, (_, i) => ({
      prevDay: i + 1,
      prevSales: (i + 1) * 10000,
    }))
    const sameDow = Array.from({ length: 30 }, (_, i) => ({
      prevDay: i + 2,
      prevSales: (i + 2) * 10000,
    }))

    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3)

    const gainedSum = result.shiftedIn.reduce((s, d) => s + d.prevSales, 0)
    const lostSum = result.shiftedOut.reduce((s, d) => s + d.prevSales, 0)
    expect(result.estimatedImpact).toBe(gainedSum - lostSum)
    expect(result.isValid).toBe(true)
  })

  it('shiftedOut: sameDateにあるがsameDowにない日を検出', () => {
    const sameDate = [
      { prevDay: 1, prevSales: 100000 },
      { prevDay: 2, prevSales: 200000 },
      { prevDay: 3, prevSales: 300000 },
    ]
    const sameDow = [
      { prevDay: 2, prevSales: 200000 },
      { prevDay: 3, prevSales: 300000 },
    ]
    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3)

    expect(result.shiftedOut).toHaveLength(1)
    expect(result.shiftedOut[0].prevDay).toBe(1)
    expect(result.shiftedOut[0].prevSales).toBe(100000)
    expect(result.shiftedIn).toHaveLength(0)
    expect(result.estimatedImpact).toBe(-100000)
  })

  it('shiftedIn: sameDowにあるがsameDateにない日を検出', () => {
    const sameDate = [
      { prevDay: 1, prevSales: 100000 },
      { prevDay: 2, prevSales: 200000 },
    ]
    const sameDow = [
      { prevDay: 1, prevSales: 100000 },
      { prevDay: 2, prevSales: 200000 },
      { prevDay: 28, prevSales: 500000 },
    ]
    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3)

    expect(result.shiftedIn).toHaveLength(1)
    expect(result.shiftedIn[0].prevDay).toBe(28)
    expect(result.shiftedIn[0].prevSales).toBe(500000)
    expect(result.estimatedImpact).toBe(500000)
  })

  it('各 shiftedDay に正しい曜日ラベルが付く', () => {
    // 2025年3月1日 = 土曜日
    const sameDate = [
      { prevDay: 1, prevSales: 100000 },
      { prevDay: 2, prevSales: 200000 },
    ]
    const sameDow = [{ prevDay: 2, prevSales: 200000 }]
    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3)

    expect(result.shiftedOut).toHaveLength(1)
    expect(result.shiftedOut[0].dow).toBe(6) // 土曜
    expect(result.shiftedOut[0].label).toBe('土')
  })

  it('両マッピングが空なら isValid: false', () => {
    const result = analyzeDowGapActualDay([], [], 2025, 3)
    expect(result.isValid).toBe(false)
    expect(result.estimatedImpact).toBe(0)
  })

  it('差分がなければ shiftedIn/Out ともに空', () => {
    const mapping = [
      { prevDay: 1, prevSales: 100000 },
      { prevDay: 2, prevSales: 200000 },
    ]
    const result = analyzeDowGapActualDay(mapping, mapping, 2025, 3)
    expect(result.shiftedIn).toHaveLength(0)
    expect(result.shiftedOut).toHaveLength(0)
    expect(result.estimatedImpact).toBe(0)
    expect(result.isValid).toBe(false)
  })
})

describe('ZERO_ACTUAL_DAY_IMPACT', () => {
  it('全フィールドがゼロ/false/空', () => {
    expect(ZERO_ACTUAL_DAY_IMPACT.estimatedImpact).toBe(0)
    expect(ZERO_ACTUAL_DAY_IMPACT.isValid).toBe(false)
    expect(ZERO_ACTUAL_DAY_IMPACT.shiftedIn).toHaveLength(0)
    expect(ZERO_ACTUAL_DAY_IMPACT.shiftedOut).toHaveLength(0)
  })
})

// ── ヘルパー ──

function sumDiffs(result: ReturnType<typeof analyzeDowGap>): number {
  return result.dowCounts.reduce((s, d) => s + d.diff, 0)
}
