/**
 * ComparisonScope 意味論不変条件テスト
 *
 * ComparisonScope の設計前提が V2 比較サブシステムと整合していることを検証する。
 *
 * ## 背景
 *
 * buildAlignmentMap は period2.from + dayIndex の位置ベースマッピングを行う。
 * しかし applyPreset('prevYearSameDow') は候補窓（±7 日）を返すため、
 * prevYearSameDow ではこの位置マッピングは DOW 解決を担当しない。
 * 実際の DOW 解決は resolveComparisonRows が担う。
 *
 * このテストで設計の境界と責務を明文化し、不整合の検出を機械化する。
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

// ── INV-CMP-06: alignmentMap は位置ベース（DOW 解決を担当しない） ──

describe('INV-CMP-06: prevYearSameDow の alignmentMap は DOW 解決を担当しない', () => {
  it('alignmentMap の sourceDate と targetDate の曜日が一致しないエントリが存在しうる', () => {
    const selection = makePeriodSelection(MARCH_2026, 'prevYearSameDow')
    const scope = buildComparisonScope(selection)

    // prevYearSameDow の period2 は候補窓（-7日シフト）なので、
    // 位置ベースマッピングでは曜日が合わないエントリが存在する
    const mismatchCount = scope.alignmentMap.filter(
      (e) => getDow(e.sourceDate) !== getDow(e.targetDate),
    ).length

    // 候補窓の場合、少なくとも一部は曜日不一致になる（offset が0でない限り）
    // DOW offset が 0 のケースは理論上存在するが、連続年では offset は 1 or 2
    // このテストは「alignmentMap が曜日一致を保証しない」ことの明文化
    if (scope.dowOffset !== 0) {
      expect(mismatchCount).toBeGreaterThan(0)
    }
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
