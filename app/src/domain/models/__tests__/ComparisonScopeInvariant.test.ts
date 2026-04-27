/**
 * ComparisonScope 意味論不変条件テスト
 *
 * ComparisonScope の設計前提が V2 比較サブシステムと整合していることを検証する。
 *
 * ## 背景
 *
 * buildAlignmentMap は alignmentMode に応じてマッピング方式を切り替える:
 * - sameDate / prevMonth: period2.from + dayIndex の位置ベースマッピング
 * - sameDayOfWeek: 各日ごとに前年同日 anchor ±7日から同曜日最近傍を選択
 *
 * applyPreset('prevYearSameDow') は候補窓（±7 日）を返し、
 * buildAlignmentMap が各日の DOW 解決を行う。
 *
 * このテストで設計の境界と責務を明文化し、不整合の検出を機械化する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildComparisonScope } from '../ComparisonScope'
import type { PeriodSelection } from '../PeriodSelection'
import { applyPreset } from '../PeriodSelection'
import { dateRangeDays, getDow } from '../CalendarDate'
import type { DateRange } from '../CalendarDate'

/** ヘルパー: PeriodSelection を構築 */
function makePeriodSelection(
  period1: DateRange,
  preset: 'prevYearSameMonth' | 'prevYearSameDow' | 'prevMonth' | 'custom',
  period2Override?: DateRange,
): PeriodSelection {
  const period2 = period2Override ?? applyPreset(period1, preset, period1)
  return {
    period1,
    period2,
    comparisonEnabled: true,
    activePreset: preset,
  }
}

const MARCH_2026: DateRange = {
  from: { year: 2026, month: 3, day: 1 },
  to: { year: 2026, month: 3, day: 31 },
}

// ── INV-CMP-05: prevYearSameDow の period2 は候補窓 ──

describe('INV-CMP-05: prevYearSameDow の period2 は候補窓', () => {
  it('period2 の日数が period1 より広い（±7 日拡張）', () => {
    const period2 = applyPreset(MARCH_2026, 'prevYearSameDow', MARCH_2026)
    const p1Days = dateRangeDays(MARCH_2026)
    const p2Days = dateRangeDays({ from: period2.from, to: period2.to })
    // ±7 日なので期間長は p1Days + 14 になる
    expect(p2Days).toBe(p1Days + 14)
  })

  it('period2.from は period1 の前年同日 - 7 日', () => {
    const period2 = applyPreset(MARCH_2026, 'prevYearSameDow', MARCH_2026)
    // 2026-03-01 の前年 = 2025-03-01、-7 日 = 2025-02-22
    const expectedFrom = new Date(2025, 2 - 1, 22) // Date が正規化
    expect(period2.from.year).toBe(expectedFrom.getFullYear())
    expect(period2.from.month).toBe(expectedFrom.getMonth() + 1)
    expect(period2.from.day).toBe(expectedFrom.getDate())
  })

  it('prevYearSameMonth では候補窓にならない（日数一致）', () => {
    const period2 = applyPreset(MARCH_2026, 'prevYearSameMonth', MARCH_2026)
    const p1Days = dateRangeDays(MARCH_2026)
    const p2Days = dateRangeDays({ from: period2.from, to: period2.to })
    expect(p2Days).toBe(p1Days)
  })

  it('prevMonth では候補窓拡張されない（日数は月末クランプにより同等以下）', () => {
    const period2 = applyPreset(MARCH_2026, 'prevMonth', MARCH_2026)
    const p1Days = dateRangeDays(MARCH_2026)
    const p2Days = dateRangeDays({ from: period2.from, to: period2.to })
    // 31日月→28日月のクランプがあるため p2Days ≤ p1Days
    expect(p2Days).toBeLessThanOrEqual(p1Days)
    // しかし候補窓（+14日）にはならない
    expect(p2Days).toBeLessThan(p1Days + 14)
  })
})

// ── INV-CMP-06: alignmentMap は DOW 解決を担当する ──

describe('INV-CMP-06: prevYearSameDow の alignmentMap は DOW 解決を担当する', () => {
  it('alignmentMap の全エントリで sourceDate と targetDate の曜日が一致する', () => {
    const selection = makePeriodSelection(MARCH_2026, 'prevYearSameDow')
    const scope = buildComparisonScope(selection)

    // buildAlignmentMap が sameDayOfWeek モードで per-day DOW 解決を行う。
    // 全エントリで曜日が一致することを検証する。
    const mismatchCount = scope.alignmentMap.filter(
      (e) => getDow(e.sourceDate) !== getDow(e.targetDate),
    ).length

    expect(mismatchCount).toBe(0)
  })

  it('prevYearSameMonth では alignmentMap の位置対応が正しい（同日）', () => {
    const selection = makePeriodSelection(MARCH_2026, 'prevYearSameMonth')
    const scope = buildComparisonScope(selection)

    // 同月プリセットでは period2 = 1年前の同月
    // 位置ベースなので day[i] ↔ day[i]
    for (const entry of scope.alignmentMap) {
      expect(entry.targetDate.day).toBe(entry.sourceDate.day)
      expect(entry.sourceDate.year).toBe(entry.targetDate.year - 1)
      expect(entry.sourceDate.month).toBe(entry.targetDate.month)
    }
  })
})

// ── INV-CMP-07: prevYearSameMonth/prevMonth の alignmentMap 1:1 対応 ──

describe('INV-CMP-07: 1:1 プリセットの alignmentMap 長 = effectivePeriod1 長', () => {
  it('prevYearSameMonth: alignmentMap 長 = period1 の日数', () => {
    const selection = makePeriodSelection(MARCH_2026, 'prevYearSameMonth')
    const scope = buildComparisonScope(selection)
    const expectedDays = dateRangeDays(MARCH_2026)
    expect(scope.alignmentMap).toHaveLength(expectedDays)
  })

  it('prevMonth: alignmentMap 長 = period1 の日数', () => {
    const selection = makePeriodSelection(MARCH_2026, 'prevMonth')
    const scope = buildComparisonScope(selection)
    const expectedDays = dateRangeDays(MARCH_2026)
    expect(scope.alignmentMap).toHaveLength(expectedDays)
  })

  it('prevYearSameDow: alignmentMap 長 = period1 の日数（候補窓は切り捨て）', () => {
    // buildAlignmentMap は effectivePeriod1 を走査するので、
    // period2 が広くても alignmentMap は period1 の日数分しか生成されない
    const selection = makePeriodSelection(MARCH_2026, 'prevYearSameDow')
    const scope = buildComparisonScope(selection)
    const expectedDays = dateRangeDays(MARCH_2026)
    expect(scope.alignmentMap).toHaveLength(expectedDays)
  })

  it('elapsedDays 指定時は alignmentMap 長 = elapsedDays', () => {
    const selection = makePeriodSelection(MARCH_2026, 'prevYearSameMonth')
    const scope = buildComparisonScope(selection, 15)
    expect(scope.alignmentMap).toHaveLength(15)
  })
})

// ── INV-CMP-08: 月跨ぎ境界値の安全性 ──

describe('INV-CMP-08: 月跨ぎ境界値', () => {
  // 2月（28日）→ 3月（31日）: 日数が異なる月の比較
  const FEB_2026: DateRange = {
    from: { year: 2026, month: 2, day: 1 },
    to: { year: 2026, month: 2, day: 28 },
  }

  // 1月（31日）→ 2月（28日）の prevMonth 比較
  const JAN_2026: DateRange = {
    from: { year: 2026, month: 1, day: 1 },
    to: { year: 2026, month: 1, day: 31 },
  }

  it('31日月→28日月の prevMonth: alignmentMap が31日分生成される', () => {
    // 3月(31日) の前月 = 2月(28日)。位置ベースなので day29-31 は3月にはみ出す。
    // alignmentMap は period1 の日数（31日）分が常に生成される。
    const selection = makePeriodSelection(MARCH_2026, 'prevMonth')
    const scope = buildComparisonScope(selection)
    expect(scope.alignmentMap).toHaveLength(31)

    // 最後のエントリの sourceDate が有効な日付であること（Date正規化が壊れていない）
    const last = scope.alignmentMap[30]
    expect(last.sourceDate.day).toBeGreaterThan(0)
    expect(last.sourceDate.month).toBeGreaterThan(0)
  })

  it('28日月→31日月の prevMonth: alignmentMap が28日分生成される', () => {
    const selection = makePeriodSelection(FEB_2026, 'prevMonth')
    const scope = buildComparisonScope(selection)
    expect(scope.alignmentMap).toHaveLength(28)
  })

  it('同曜日比較で月末付近: sourceDate が月跨ぎしても曜日は一致する', () => {
    // 3月31日の前年同曜日は2月末付近に跨ぐ可能性がある
    const selection = makePeriodSelection(MARCH_2026, 'prevYearSameDow')
    const scope = buildComparisonScope(selection)

    // 月末付近（day 28-31）のエントリを検証
    const lastEntries = scope.alignmentMap.slice(-4)
    for (const entry of lastEntries) {
      expect(getDow(entry.sourceDate)).toBe(getDow(entry.targetDate))
    }
  })

  it('同曜日比較で月初: sourceDate が前月にずれても曜日は一致する', () => {
    // 3月1日の前年同曜日候補は2月に含まれる可能性がある
    const selection = makePeriodSelection(MARCH_2026, 'prevYearSameDow')
    const scope = buildComparisonScope(selection)

    const firstEntry = scope.alignmentMap[0]
    expect(getDow(firstEntry.sourceDate)).toBe(getDow(firstEntry.targetDate))
    // sourceDate が2月であっても問題ない（月跨ぎ許容）
  })

  it('1月→前月12月: 年跨ぎでも alignmentMap が正しく生成される', () => {
    const selection = makePeriodSelection(JAN_2026, 'prevMonth')
    const scope = buildComparisonScope(selection)

    expect(scope.alignmentMap).toHaveLength(31)
    // sourceDate は12月のはず
    expect(scope.alignmentMap[0].sourceDate.year).toBe(2025)
    expect(scope.alignmentMap[0].sourceDate.month).toBe(12)
  })

  it('閏年2月29日: prevYearSameMonth で前年2月は28日しかない', () => {
    // 2028年は閏年。2028年2月の前年比較は2027年2月（28日）
    const FEB_2028_LEAP: DateRange = {
      from: { year: 2028, month: 2, day: 1 },
      to: { year: 2028, month: 2, day: 29 },
    }
    const selection = makePeriodSelection(FEB_2028_LEAP, 'prevYearSameMonth')
    const scope = buildComparisonScope(selection)

    // 29日分の alignmentMap が生成される
    expect(scope.alignmentMap).toHaveLength(29)

    // 29日目の sourceDate は Date 正規化により 3月1日になる（2027年2月は28日まで）
    const day29 = scope.alignmentMap[28]
    // sourceDate が有効な日付であること
    expect(day29.sourceDate.day).toBeGreaterThan(0)
  })

  it('queryRanges に月跨ぎ分の月が含まれる', () => {
    // 同曜日で3月を比較する場合、前年2月のデータも必要
    const selection = makePeriodSelection(MARCH_2026, 'prevYearSameDow')
    const scope = buildComparisonScope(selection)

    // queryRanges に2025年2月が含まれること（月跨ぎ対応）
    const hasFeb2025 = scope.queryRanges.some((q) => q.year === 2025 && q.month === 2)
    expect(hasFeb2025).toBe(true)
  })
})
