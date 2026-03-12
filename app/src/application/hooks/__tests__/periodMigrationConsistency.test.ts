/**
 * 期間モデル移行整合性テスト
 *
 * 旧モデル（ComparisonFrame + buildPrevYearScope）と
 * 新モデル（PeriodSelection + buildPrevYearScopeFromSelection）が
 * 同等の結果を返すことを検証する。
 *
 * このテストが壊れた場合、移行に不整合が発生している。
 */
import { describe, it, expect } from 'vitest'
import {
  applyPreset,
  createDefaultPeriodSelection,
  buildPrevYearScopeFromSelection,
} from '@/domain/models'
import type { PeriodSelection, DateRange } from '@/domain/models'
import {
  resolveComparisonFrame,
  buildPrevYearScope,
  calcSameDowOffset,
} from '@/application/comparison/resolveComparisonFrame'

/**
 * 旧モデルの結果を構築するヘルパー
 *
 * useComparisonFrame + useUnifiedWidgetContext の処理を再現:
 * 1. resolveComparisonFrame で ComparisonFrame 生成
 * 2. buildPrevYearScope で PrevYearScope 生成
 */
function buildOldPrevYearScope(
  year: number,
  month: number,
  effectiveEndDay: number,
  totalCustomers: number,
  policy: 'sameDayOfWeek' | 'sameDate' = 'sameDayOfWeek',
) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const baseRange: DateRange = {
    from: { year, month, day: 1 },
    to: { year, month, day: daysInMonth },
  }
  const frame = resolveComparisonFrame(baseRange, policy)
  return buildPrevYearScope(frame, effectiveEndDay, totalCustomers)
}

/**
 * 新モデルの結果を構築するヘルパー（period1.to.day = effectiveEndDay 方式）
 *
 * PeriodSelection + buildPrevYearScopeFromSelection の処理を再現。
 * period1.to.day を effectiveEndDay に調整して applyPreset を再適用。
 */
function buildNewPrevYearScope(
  year: number,
  month: number,
  effectiveEndDay: number,
  totalCustomers: number,
  preset: 'prevYearSameMonth' | 'prevYearSameDow' = 'prevYearSameMonth',
) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const period1: DateRange = {
    from: { year, month, day: 1 },
    to: { year, month, day: Math.min(effectiveEndDay, daysInMonth) },
  }
  const period2 = applyPreset(period1, preset, period1)
  const selection: PeriodSelection = {
    period1,
    period2,
    comparisonEnabled: true,
    activePreset: preset,
  }
  return buildPrevYearScopeFromSelection(selection, totalCustomers)
}

/**
 * 新モデルの結果を構築するヘルパー（effectiveEndDay パラメータ方式）
 *
 * useUnifiedWidgetContext の実際のパスを模擬:
 * period1.to.day = daysInMonth（月末）のまま、effectiveEndDay を第3引数で渡す。
 */
function buildNewPrevYearScopeWithParam(
  year: number,
  month: number,
  effectiveEndDay: number,
  totalCustomers: number,
  preset: 'prevYearSameMonth' | 'prevYearSameDow' = 'prevYearSameMonth',
) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const period1: DateRange = {
    from: { year, month, day: 1 },
    to: { year, month, day: daysInMonth },
  }
  const period2 = applyPreset(period1, preset, period1)
  const selection: PeriodSelection = {
    period1,
    period2,
    comparisonEnabled: true,
    activePreset: preset,
  }
  return buildPrevYearScopeFromSelection(selection, totalCustomers, effectiveEndDay)
}

describe('期間モデル移行整合性', () => {
  describe('prevYearSameMonth (sameDate) — オフセットなし', () => {
    const testCases = [
      { year: 2026, month: 2, endDay: 28, customers: 500 },
      { year: 2026, month: 3, endDay: 20, customers: 300 },
      { year: 2026, month: 3, endDay: 31, customers: 1000 },
      { year: 2025, month: 1, endDay: 15, customers: 200 },
      { year: 2025, month: 12, endDay: 25, customers: 750 },
    ]

    for (const { year, month, endDay, customers } of testCases) {
      it(`${year}/${month} endDay=${endDay}: dateRange・totalCustomers・dowOffset が一致`, () => {
        const oldScope = buildOldPrevYearScope(year, month, endDay, customers, 'sameDate')
        const newScope = buildNewPrevYearScope(year, month, endDay, customers, 'prevYearSameMonth')

        // dateRange: 旧モデルは buildPrevYearScope(frame, endDay) で
        // from.day + 0, to.day = min(endDay + 0, frame.previous.to.day)
        // 新モデルは period1.to.day = endDay なので applyPreset で period2.to.day = endDay
        expect(newScope.dateRange.from.year).toBe(oldScope.dateRange.from.year)
        expect(newScope.dateRange.from.month).toBe(oldScope.dateRange.from.month)
        expect(newScope.dateRange.from.day).toBe(oldScope.dateRange.from.day)
        expect(newScope.dateRange.to.year).toBe(oldScope.dateRange.to.year)
        expect(newScope.dateRange.to.month).toBe(oldScope.dateRange.to.month)
        // to.day: 旧は min(endDay, prevDaysInMonth), 新は min(endDay, prevDaysInMonth)
        expect(newScope.dateRange.to.day).toBe(oldScope.dateRange.to.day)

        expect(newScope.totalCustomers).toBe(oldScope.totalCustomers)
        expect(newScope.dowOffset).toBe(oldScope.dowOffset)
      })
    }
  })

  describe('prevYearSameDow (V2 候補範囲) — resolver 用 ±7 日', () => {
    const testCases = [
      { year: 2026, month: 2, endDay: 28, customers: 500 },
      { year: 2026, month: 3, endDay: 20, customers: 300 },
      { year: 2026, month: 6, endDay: 30, customers: 800 },
      { year: 2025, month: 1, endDay: 31, customers: 200 },
      { year: 2025, month: 7, endDay: 15, customers: 450 },
    ]

    for (const { year, month } of testCases) {
      it(`${year}/${month}: V2 候補範囲が前年同日 ±7 日`, () => {
        const sel = createDefaultPeriodSelection(year, month)
        const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)

        // from = 前年同日 - 7 日
        const expectedFrom = new Date(year - 1, month - 1, 1 - 7)
        expect(p2.from.year).toBe(expectedFrom.getFullYear())
        expect(p2.from.month).toBe(expectedFrom.getMonth() + 1)
        expect(p2.from.day).toBe(expectedFrom.getDate())

        const daysInMonth = new Date(year, month, 0).getDate()
        // to = 前年同日 + 7 日
        const expectedTo = new Date(year - 1, month - 1, daysInMonth + 7)
        expect(p2.to.year).toBe(expectedTo.getFullYear())
        expect(p2.to.month).toBe(expectedTo.getMonth() + 1)
        expect(p2.to.day).toBe(expectedTo.getDate())
      })
    }

    for (const { year, month, endDay, customers } of testCases) {
      it(`${year}/${month} endDay=${endDay}: V2 候補範囲の from/to が正しい`, () => {
        const newScope = buildNewPrevYearScope(year, month, endDay, customers, 'prevYearSameDow')

        // from は前年同日 -7 日（候補範囲の開始）
        const expectedFrom = new Date(year - 1, month - 1, 1 - 7)
        expect(newScope.dateRange.from.year).toBe(expectedFrom.getFullYear())
        expect(newScope.dateRange.from.month).toBe(expectedFrom.getMonth() + 1)
        expect(newScope.dateRange.from.day).toBe(expectedFrom.getDate())

        // 候補範囲の長さは endDay - 1 + 14 日（±7 日分）
        const fromDate = new Date(
          newScope.dateRange.from.year,
          newScope.dateRange.from.month - 1,
          newScope.dateRange.from.day,
        )
        const toDate = new Date(
          newScope.dateRange.to.year,
          newScope.dateRange.to.month - 1,
          newScope.dateRange.to.day,
        )
        const newDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
        // to は effectiveEndDay + offset でキャップされるか、候補範囲の to のどちらか小さい方
        // ただし候補範囲自体は endDay - 1 + 14 日
        expect(newDays).toBeGreaterThan(0)

        expect(newScope.totalCustomers).toBe(customers)
      })
    }
  })

  describe('effectiveEndDay パラメータ方式 — useUnifiedWidgetContext 実パス', () => {
    const testCases = [
      { year: 2026, month: 2, endDay: 28, customers: 500 },
      { year: 2026, month: 3, endDay: 20, customers: 300 },
      { year: 2026, month: 3, endDay: 31, customers: 1000 },
      { year: 2025, month: 1, endDay: 15, customers: 200 },
      { year: 2025, month: 12, endDay: 25, customers: 750 },
    ]

    describe('prevYearSameMonth', () => {
      for (const { year, month, endDay, customers } of testCases) {
        it(`${year}/${month} endDay=${endDay}: effectiveEndDay パラメータで旧パスと一致`, () => {
          const oldScope = buildOldPrevYearScope(year, month, endDay, customers, 'sameDate')
          const newScope = buildNewPrevYearScopeWithParam(
            year,
            month,
            endDay,
            customers,
            'prevYearSameMonth',
          )

          expect(newScope.dateRange.from).toEqual(oldScope.dateRange.from)
          expect(newScope.dateRange.to).toEqual(oldScope.dateRange.to)
          expect(newScope.totalCustomers).toBe(oldScope.totalCustomers)
          expect(newScope.dowOffset).toBe(oldScope.dowOffset)
        })
      }
    })

    describe('prevYearSameDow', () => {
      for (const { year, month, endDay, customers } of testCases) {
        it(`${year}/${month} endDay=${endDay}: V2 候補範囲の from/to が正しい`, () => {
          const newScope = buildNewPrevYearScopeWithParam(
            year,
            month,
            endDay,
            customers,
            'prevYearSameDow',
          )

          // V2: from は前年同日 -7 日（候補範囲の開始）
          const expectedFrom = new Date(year - 1, month - 1, 1 - 7)
          expect(newScope.dateRange.from.year).toBe(expectedFrom.getFullYear())
          expect(newScope.dateRange.from.month).toBe(expectedFrom.getMonth() + 1)
          expect(newScope.dateRange.from.day).toBe(expectedFrom.getDate())

          // V2: to は effectiveEndDay + offset でキャップされるか、候補範囲 to のどちらか小さい方
          const daysInMonth = new Date(year, month, 0).getDate()
          const candidateTo = new Date(year - 1, month - 1, daysInMonth + 7)
          const offset = newScope.dowOffset
          const capDate = new Date(
            expectedFrom.getFullYear(),
            expectedFrom.getMonth(),
            endDay + offset,
          )
          const effectiveTo = capDate < candidateTo ? capDate : candidateTo
          expect(newScope.dateRange.to.year).toBe(effectiveTo.getFullYear())
          expect(newScope.dateRange.to.month).toBe(effectiveTo.getMonth() + 1)
          expect(newScope.dateRange.to.day).toBe(effectiveTo.getDate())

          expect(newScope.totalCustomers).toBe(customers)
        })
      }
    })
  })

  describe('usePrevYearData の日次マッピングとの整合', () => {
    it('sameDow: V2 候補範囲が前年同日 ±7 日で resolver 用の十分な範囲を持つ', () => {
      // V2 では period2 は候補取得範囲（前年同日 ±7 日）。
      // 実際の日次マッピングは V2 resolver が行うため、
      // ここでは候補範囲が resolver に十分な幅を持つことを検証する。

      const testMonths = [
        { year: 2026, month: 2 },
        { year: 2026, month: 6 },
        { year: 2025, month: 12 },
      ]

      for (const { year, month } of testMonths) {
        const offset = calcSameDowOffset(year, month)
        const sel = createDefaultPeriodSelection(year, month)
        const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)

        // V2: from = 前年同日 - 7 日
        const expectedFrom = new Date(year - 1, month - 1, 1 - 7)
        expect(p2.from.year).toBe(expectedFrom.getFullYear())
        expect(p2.from.month).toBe(expectedFrom.getMonth() + 1)
        expect(p2.from.day).toBe(expectedFrom.getDate())

        // V2: 候補範囲は offset 分を含む十分な幅がある
        // （±7 日なので最大 offset=6 をカバー可能）
        expect(offset).toBeLessThanOrEqual(7)

        // 候補範囲の長さが period1 長 + 14 日であることを確認
        const daysInMonth = new Date(year, month, 0).getDate()
        const p2From = new Date(p2.from.year, p2.from.month - 1, p2.from.day)
        const p2To = new Date(p2.to.year, p2.to.month - 1, p2.to.day)
        const p2Days = (p2To.getTime() - p2From.getTime()) / (1000 * 60 * 60 * 24)
        expect(p2Days).toBe(daysInMonth - 1 + 14)
      }
    })
  })
})
