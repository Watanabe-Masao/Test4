/**
 * 曜日ギャップ分析テスト
 *
 * 検証する不変条件:
 *   1. countDowsInMonth の合計 = その月の日数
 *   2. analyzeDowGap の diff 合計 = 当年日数 - 前年日数
 *   3. estimatedImpact = Σ(diff × prevDowDailyAvg[dow])
 *   3a. prevDowSales 未指定時: estimatedImpact = Σ(diff) × dailyAverageSales
 *   3b. prevDowSales 指定時: 曜日別重み付けで影響額を算出
 *   4. analyzeDowGapActualDay: currentDay ベースの突き合わせで境界シフトを正確に検出
 *   5. calcMedian: 中央値の算出が正しいこと
 *   6. calcAdjustedMean: 外れ値除外の調整平均が正しいこと
 *   7. methodResults: 手法別結果の不変条件（salesImpact = Σ(diff × dowAvg)）
 *   8. 客数ギャップ: prevDowDailyAvgCustomers の曜日別計算
 *   9. ShiftedDay: prevMonth/prevYear/prevCustomers の拡張フィールド
 */
import { describe, it, expect } from 'vitest'
import {
  countDowsInMonth,
  analyzeDowGap,
  analyzeDowGapActualDay,
  calcMedian,
  calcAdjustedMean,
  ZERO_DOW_GAP_ANALYSIS,
  ZERO_ACTUAL_DAY_IMPACT,
} from '../dowGapAnalysis'
import type { DowGapDailyData } from '../dowGapAnalysis'

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

  it('prevDowDailyAvgCustomers が常に長さ7で返る', () => {
    const result = analyzeDowGap(2026, 3, 2025, 3, 100000)
    expect(result.prevDowDailyAvgCustomers).toHaveLength(7)
  })
})

describe('calcMedian', () => {
  it('空配列なら 0', () => {
    expect(calcMedian([])).toBe(0)
  })

  it('1件なら唯一の値', () => {
    expect(calcMedian([42])).toBe(42)
  })

  it('奇数件なら中央の値', () => {
    expect(calcMedian([1, 3, 5])).toBe(3)
    expect(calcMedian([10, 30, 20, 40, 50])).toBe(30)
  })

  it('偶数件なら中央2値の平均', () => {
    expect(calcMedian([1, 2, 3, 4])).toBe(2.5)
    expect(calcMedian([10, 20])).toBe(15)
  })

  it('元の配列を変更しない', () => {
    const arr = [3, 1, 2]
    calcMedian(arr)
    expect(arr).toEqual([3, 1, 2])
  })
})

describe('calcAdjustedMean', () => {
  it('空配列なら 0', () => {
    expect(calcAdjustedMean([])).toBe(0)
  })

  it('2件以下なら単純平均', () => {
    expect(calcAdjustedMean([10, 20])).toBe(15)
    expect(calcAdjustedMean([100])).toBe(100)
  })

  it('外れ値がなければ単純平均と一致', () => {
    const values = [100, 102, 98, 101, 99]
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    expect(calcAdjustedMean(values)).toBeCloseTo(mean, 5)
  })

  it('外れ値を除外して再計算', () => {
    // 正常値 100前後 + 極端な外れ値 5000（z-score >> 2σ で確実に除外）
    const values = [100, 102, 98, 101, 5000]
    const adjusted = calcAdjustedMean(values)
    const meanWithout = (100 + 102 + 98 + 101) / 4
    // 外れ値(5000)を除外した平均に近い値になるはず
    expect(adjusted).toBeCloseTo(meanWithout, 0)
    expect(adjusted).toBeLessThan(200) // 外れ値を含めた平均(1080.2)より十分小さい
  })
})

describe('analyzeDowGap with dailyData', () => {
  const dailyData: DowGapDailyData = {
    // 簡易: 各曜日に4-5件の日次売上値
    salesByDow: [
      [200000, 210000, 190000, 200000], // 日(dow=0) 4日
      [100000, 110000, 90000, 100000, 100000], // 月(dow=1) 5日
      [100000, 110000, 90000, 100000], // 火(dow=2) 4日
      [100000, 110000, 90000, 100000, 100000], // 水(dow=3) 5日
      [100000, 110000, 90000, 100000], // 木(dow=4) 4日
      [150000, 160000, 140000, 150000, 150000], // 金(dow=5) 5日
      [300000, 310000, 290000, 300000], // 土(dow=6) 4日
    ],
    customersByDow: [
      [400, 420, 380, 400], // 日
      [200, 210, 190, 200, 200], // 月
      [200, 210, 190, 200], // 火
      [200, 210, 190, 200, 200], // 水
      [200, 210, 190, 200], // 木
      [300, 310, 290, 300, 300], // 金
      [500, 520, 480, 500], // 土
    ],
    dailyAverageCustomers: 300,
  }

  it('methodResults が全3手法を含む（不変条件7）', () => {
    const result = analyzeDowGap(2026, 3, 2025, 3, 100000, undefined, dailyData)
    expect(result.methodResults).toBeDefined()
    expect(result.methodResults!.mean).toBeDefined()
    expect(result.methodResults!.median).toBeDefined()
    expect(result.methodResults!.adjustedMean).toBeDefined()
  })

  it('各手法の salesImpact = Σ(diff × dowAvgSales[dow])（不変条件7）', () => {
    const result = analyzeDowGap(2026, 3, 2025, 3, 100000, undefined, dailyData)
    for (const method of ['mean', 'median', 'adjustedMean'] as const) {
      const mr = result.methodResults![method]
      const expected = result.dowCounts.reduce((s, d) => s + d.diff * mr.dowAvgSales[d.dow], 0)
      expect(mr.salesImpact).toBeCloseTo(expected, 5)
    }
  })

  it('各手法の customerImpact = Σ(diff × dowAvgCustomers[dow])（不変条件7）', () => {
    const result = analyzeDowGap(2026, 3, 2025, 3, 100000, undefined, dailyData)
    for (const method of ['mean', 'median', 'adjustedMean'] as const) {
      const mr = result.methodResults![method]
      const expected = result.dowCounts.reduce((s, d) => s + d.diff * mr.dowAvgCustomers[d.dow], 0)
      expect(mr.customerImpact).toBeCloseTo(expected, 5)
    }
  })

  it('prevDowDailyAvgCustomers が曜日別平均客数を返す（不変条件8）', () => {
    const result = analyzeDowGap(2026, 3, 2025, 3, 100000, undefined, dailyData)
    expect(result.prevDowDailyAvgCustomers).toHaveLength(7)
    // 日曜の平均客数 = (400+420+380+400)/4 = 400
    expect(result.prevDowDailyAvgCustomers[0]).toBeCloseTo(400, 0)
    // 土曜の平均客数 = (500+520+480+500)/4 = 500
    expect(result.prevDowDailyAvgCustomers[6]).toBeCloseTo(500, 0)
  })

  it('dowSalesStats / dowCustomerStats が CV を含む', () => {
    const result = analyzeDowGap(2026, 3, 2025, 3, 100000, undefined, dailyData)
    expect(result.dowSalesStats).toHaveLength(7)
    expect(result.dowCustomerStats).toHaveLength(7)
    for (const s of result.dowSalesStats!) {
      expect(s.cv).toBeGreaterThanOrEqual(0)
      expect(s.n).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('ZERO_DOW_GAP_ANALYSIS', () => {
  it('全フィールドがゼロ/false', () => {
    expect(ZERO_DOW_GAP_ANALYSIS.estimatedImpact).toBe(0)
    expect(ZERO_DOW_GAP_ANALYSIS.isValid).toBe(false)
    expect(ZERO_DOW_GAP_ANALYSIS.dowCounts).toHaveLength(7)
    expect(ZERO_DOW_GAP_ANALYSIS.prevDowDailyAvgCustomers).toHaveLength(7)
  })
})

describe('analyzeDowGapActualDay', () => {
  it('不変条件: estimatedImpact = Σ(shiftedIn.prevSales) - Σ(shiftedOut.prevSales)', () => {
    // sameDate: prevDays 1-31 (currentDays 1-31), sameDow: prevDays 2-31 (currentDays 1-30, offset=1)
    const sameDate = Array.from({ length: 31 }, (_, i) => ({
      currentDay: i + 1,
      prevDay: i + 1,
      prevMonth: 3,
      prevYear: 2025,
      prevSales: (i + 1) * 10000,
      prevCustomers: (i + 1) * 10,
    }))
    const sameDow = Array.from({ length: 30 }, (_, i) => ({
      currentDay: i + 1,
      prevDay: i + 2,
      prevMonth: 3,
      prevYear: 2025,
      prevSales: (i + 2) * 10000,
      prevCustomers: (i + 2) * 10,
    }))

    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)

    const gainedSum = result.shiftedIn.reduce((s, d) => s + d.prevSales, 0)
    const lostSum = result.shiftedOut.reduce((s, d) => s + d.prevSales, 0)
    expect(result.estimatedImpact).toBe(gainedSum - lostSum)
    expect(result.isValid).toBe(true)
  })

  it('customerImpact = Σ(shiftedIn.prevCustomers) - Σ(shiftedOut.prevCustomers)', () => {
    const sameDate = [
      {
        currentDay: 1,
        prevDay: 1,
        prevMonth: 3,
        prevYear: 2025,
        prevSales: 100000,
        prevCustomers: 50,
      },
      {
        currentDay: 2,
        prevDay: 2,
        prevMonth: 3,
        prevYear: 2025,
        prevSales: 200000,
        prevCustomers: 80,
      },
      {
        currentDay: 3,
        prevDay: 3,
        prevMonth: 3,
        prevYear: 2025,
        prevSales: 300000,
        prevCustomers: 120,
      },
    ]
    const sameDow = [
      {
        currentDay: 1,
        prevDay: 2,
        prevMonth: 3,
        prevYear: 2025,
        prevSales: 200000,
        prevCustomers: 80,
      },
      {
        currentDay: 2,
        prevDay: 3,
        prevMonth: 3,
        prevYear: 2025,
        prevSales: 300000,
        prevCustomers: 120,
      },
    ]
    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)

    const gainedCust = result.shiftedIn.reduce((s, d) => s + d.prevCustomers, 0)
    const lostCust = result.shiftedOut.reduce((s, d) => s + d.prevCustomers, 0)
    expect(result.customerImpact).toBe(gainedCust - lostCust)
    expect(result.customerImpact).toBe(-50) // lost prevDay=1 (50 customers)
  })

  it('ShiftedDay に prevMonth/prevYear/prevCustomers が含まれる（不変条件9）', () => {
    const sameDate = [
      {
        currentDay: 1,
        prevDay: 1,
        prevMonth: 3,
        prevYear: 2025,
        prevSales: 100000,
        prevCustomers: 50,
      },
    ]
    const sameDow = [
      {
        currentDay: 1,
        prevDay: 1,
        prevMonth: 4,
        prevYear: 2025,
        prevSales: 150000,
        prevCustomers: 70,
      },
    ]
    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)

    expect(result.shiftedIn).toHaveLength(1)
    expect(result.shiftedIn[0].prevMonth).toBe(4)
    expect(result.shiftedIn[0].prevYear).toBe(2025)
    expect(result.shiftedIn[0].prevCustomers).toBe(70)

    expect(result.shiftedOut).toHaveLength(1)
    expect(result.shiftedOut[0].prevMonth).toBe(3)
    expect(result.shiftedOut[0].prevYear).toBe(2025)
    expect(result.shiftedOut[0].prevCustomers).toBe(50)
  })

  it('shiftedOut: sameDateにあるがsameDowにない日を検出', () => {
    const sameDate = [
      { currentDay: 1, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 100000 },
      { currentDay: 2, prevDay: 2, prevMonth: 3, prevYear: 2025, prevSales: 200000 },
      { currentDay: 3, prevDay: 3, prevMonth: 3, prevYear: 2025, prevSales: 300000 },
    ]
    const sameDow = [
      { currentDay: 1, prevDay: 2, prevMonth: 3, prevYear: 2025, prevSales: 200000 },
      { currentDay: 2, prevDay: 3, prevMonth: 3, prevYear: 2025, prevSales: 300000 },
    ]
    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)

    expect(result.shiftedOut).toHaveLength(1)
    expect(result.shiftedIn).toHaveLength(0)
    expect(result.isValid).toBe(true)
    expect(result.estimatedImpact).toBe(-100000)
  })

  it('shiftedIn: sameDowにあるがsameDateにない日を検出', () => {
    const sameDate = [
      { currentDay: 1, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 100000 },
      { currentDay: 2, prevDay: 2, prevMonth: 3, prevYear: 2025, prevSales: 200000 },
    ]
    const sameDow = [
      { currentDay: 1, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 100000 },
      { currentDay: 2, prevDay: 2, prevMonth: 3, prevYear: 2025, prevSales: 200000 },
      { currentDay: 3, prevDay: 28, prevMonth: 3, prevYear: 2025, prevSales: 500000 },
    ]
    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)

    expect(result.shiftedIn).toHaveLength(1)
    expect(result.shiftedIn[0].prevDay).toBe(28)
    expect(result.shiftedIn[0].prevSales).toBe(500000)
    expect(result.estimatedImpact).toBe(500000)
  })

  it('各 shiftedDay に正しい曜日ラベルが付く', () => {
    // 2025年3月1日 = 土曜日
    const sameDate = [
      { currentDay: 1, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 100000 },
      { currentDay: 2, prevDay: 2, prevMonth: 3, prevYear: 2025, prevSales: 200000 },
    ]
    const sameDow = [{ currentDay: 2, prevDay: 2, prevMonth: 3, prevYear: 2025, prevSales: 200000 }]
    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 3, 2026, 3)

    expect(result.shiftedOut).toHaveLength(1)
    expect(result.shiftedOut[0].dow).toBe(6) // 土曜
    expect(result.shiftedOut[0].label).toBe('土')
  })

  it('両マッピングが空なら isValid: false', () => {
    const result = analyzeDowGapActualDay([], [], 2025, 3, 2026, 3)
    expect(result.isValid).toBe(false)
    expect(result.estimatedImpact).toBe(0)
    expect(result.customerImpact).toBe(0)
  })

  it('差分がなければ shiftedIn/Out ともに空', () => {
    const mapping = [
      { currentDay: 1, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 100000 },
      { currentDay: 2, prevDay: 2, prevMonth: 3, prevYear: 2025, prevSales: 200000 },
    ]
    const result = analyzeDowGapActualDay(mapping, mapping, 2025, 3, 2026, 3)
    expect(result.shiftedIn).toHaveLength(0)
    expect(result.shiftedOut).toHaveLength(0)
    expect(result.estimatedImpact).toBe(0)
    expect(result.isValid).toBe(false)
  })

  it('28日同士の月でもDOWオフセットがあれば境界シフトを検出する', () => {
    const sameDate = Array.from({ length: 28 }, (_, i) => ({
      currentDay: i + 1,
      prevDay: i + 1,
      prevMonth: 2,
      prevYear: 2025,
      prevSales: [
        2047609,
        1436878,
        1721485,
        1246231,
        1276671,
        1635982,
        1523406, // week 1
        2047609,
        1436878,
        1721485,
        1246231,
        1276671,
        1635982,
        1523406, // week 2
        2047609,
        1436878,
        1721485,
        1246231,
        1276671,
        1635982,
        1523406, // week 3
        2047609,
        1436878,
        1721485,
        1246231,
        1276671,
        1635982,
        1523406, // week 4
      ][i],
    }))
    const sameDow = Array.from({ length: 28 }, (_, i) => ({
      currentDay: i + 1,
      prevDay: i < 27 ? i + 2 : 1,
      prevMonth: i < 27 ? 2 : 3,
      prevYear: 2025,
      prevSales: [
        1436878,
        1721485,
        1246231,
        1276671,
        1635982,
        1523406,
        2047609,
        1436878,
        1721485,
        1246231,
        1276671,
        1635982,
        1523406,
        2047609,
        1436878,
        1721485,
        1246231,
        1276671,
        1635982,
        1523406,
        2047609,
        1436878,
        1721485,
        1246231,
        1276671,
        1635982,
        1523406,
        1800000, // 3月1日(土)の売上
      ][i],
    }))

    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 2, 2026, 2)

    expect(result.isValid).toBe(true)
    expect(result.shiftedIn.length).toBeGreaterThan(0)
    expect(result.shiftedOut.length).toBeGreaterThan(0)
    const gainedSum = result.shiftedIn.reduce((s, d) => s + d.prevSales, 0)
    const lostSum = result.shiftedOut.reduce((s, d) => s + d.prevSales, 0)
    expect(result.estimatedImpact).toBe(gainedSum - lostSum)
    expect(result.estimatedImpact).not.toBe(0)
  })

  it('prevDayが同じでも異なるデータを持つ月跨ぎケースでcurrentDayベース比較が正しく動く', () => {
    const sameDate = [
      { currentDay: 1, prevDay: 1, prevMonth: 2, prevYear: 2025, prevSales: 500000 },
      { currentDay: 2, prevDay: 2, prevMonth: 2, prevYear: 2025, prevSales: 300000 },
    ]
    const sameDow = [
      { currentDay: 1, prevDay: 2, prevMonth: 2, prevYear: 2025, prevSales: 300000 },
      { currentDay: 2, prevDay: 1, prevMonth: 3, prevYear: 2025, prevSales: 400000 },
    ]
    const result = analyzeDowGapActualDay(sameDate, sameDow, 2025, 2, 2026, 2)

    expect(result.isValid).toBe(true)
    expect(result.shiftedIn).toHaveLength(1)
    expect(result.shiftedOut).toHaveLength(1)
    expect(result.estimatedImpact).toBe(-100000)
  })
})

describe('ZERO_ACTUAL_DAY_IMPACT', () => {
  it('全フィールドがゼロ/false/空', () => {
    expect(ZERO_ACTUAL_DAY_IMPACT.estimatedImpact).toBe(0)
    expect(ZERO_ACTUAL_DAY_IMPACT.customerImpact).toBe(0)
    expect(ZERO_ACTUAL_DAY_IMPACT.isValid).toBe(false)
    expect(ZERO_ACTUAL_DAY_IMPACT.shiftedIn).toHaveLength(0)
    expect(ZERO_ACTUAL_DAY_IMPACT.shiftedOut).toHaveLength(0)
  })
})

// ── ヘルパー ──

function sumDiffs(result: ReturnType<typeof analyzeDowGap>): number {
  return result.dowCounts.reduce((s, d) => s + d.diff, 0)
}
