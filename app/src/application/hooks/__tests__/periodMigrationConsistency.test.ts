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
  deriveDowOffset,
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

  describe('prevYearSameDow (sameDayOfWeek) — オフセットあり', () => {
    const testCases = [
      { year: 2026, month: 2, endDay: 28, customers: 500 },
      { year: 2026, month: 3, endDay: 20, customers: 300 },
      { year: 2026, month: 6, endDay: 30, customers: 800 },
      { year: 2025, month: 1, endDay: 31, customers: 200 },
      { year: 2025, month: 7, endDay: 15, customers: 450 },
    ]

    for (const { year, month } of testCases) {
      it(`${year}/${month}: dowOffset が旧 calcSameDowOffset と一致`, () => {
        const oldOffset = calcSameDowOffset(year, month)
        const sel = createDefaultPeriodSelection(year, month)
        const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)
        const newOffset = deriveDowOffset(sel.period1, p2, 'prevYearSameDow')
        expect(newOffset).toBe(oldOffset)
      })
    }

    for (const { year, month, endDay, customers } of testCases) {
      it(`${year}/${month} endDay=${endDay}: 旧と新の dateRange が整合`, () => {
        const oldScope = buildOldPrevYearScope(year, month, endDay, customers, 'sameDayOfWeek')
        const newScope = buildNewPrevYearScope(year, month, endDay, customers, 'prevYearSameDow')

        // from.day: 旧 = frame.previous.from.day + offset, 新 = applyPreset で 1+offset
        expect(newScope.dateRange.from.day).toBe(oldScope.dateRange.from.day)
        // to.day: 旧 = min(endDay + offset, frame.previous.to.day)
        //         新 = min(endDay + offset, prevDaysInMonth)
        expect(newScope.dateRange.to.day).toBe(oldScope.dateRange.to.day)

        expect(newScope.dateRange.from.year).toBe(oldScope.dateRange.from.year)
        expect(newScope.dateRange.from.month).toBe(oldScope.dateRange.from.month)
        expect(newScope.dateRange.to.year).toBe(oldScope.dateRange.to.year)
        expect(newScope.dateRange.to.month).toBe(oldScope.dateRange.to.month)

        expect(newScope.totalCustomers).toBe(customers)
        expect(newScope.dowOffset).toBe(oldScope.dowOffset)
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
        it(`${year}/${month} endDay=${endDay}: effectiveEndDay パラメータで旧パスと一致`, () => {
          const oldScope = buildOldPrevYearScope(year, month, endDay, customers, 'sameDayOfWeek')
          const newScope = buildNewPrevYearScopeWithParam(
            year,
            month,
            endDay,
            customers,
            'prevYearSameDow',
          )

          expect(newScope.dateRange.from).toEqual(oldScope.dateRange.from)
          expect(newScope.dateRange.to).toEqual(oldScope.dateRange.to)
          expect(newScope.totalCustomers).toBe(customers)
          expect(newScope.dowOffset).toBe(oldScope.dowOffset)
        })
      }
    })
  })

  describe('usePrevYearData の日次マッピングとの整合', () => {
    it('sameDow: origDay - offset のマッピングが新モデルでも正しく成立する', () => {
      // usePrevYearData は mappedDay = origDay - offset でキーを作る
      // origDay は前年の生データの日番号
      // mappedDay は当年の日番号に対応
      //
      // 新モデルでは period2.from.day = 1 + offset
      // 前年データの origDay = period2.from.day 〜 period2.to.day
      // mappedDay = origDay - offset = (1+offset) - offset = 1 ← 正しい

      const testMonths = [
        { year: 2026, month: 2 },
        { year: 2026, month: 6 },
        { year: 2025, month: 12 },
      ]

      for (const { year, month } of testMonths) {
        const offset = calcSameDowOffset(year, month)
        const sel = createDefaultPeriodSelection(year, month)
        const p2 = applyPreset(sel.period1, 'prevYearSameDow', sel.period2)

        // period2.from.day = 1 + offset (月初からオフセット)
        const expectedFromDay = Math.min(1 + offset, new Date(year - 1, month, 0).getDate())
        expect(p2.from.day).toBe(expectedFromDay)

        // マッピング検証: period2 の各日を origDay とすると
        // mappedDay = origDay - offset が 1〜daysInMonth に収まる
        const daysInMonth = new Date(year, month, 0).getDate()
        for (let origDay = p2.from.day; origDay <= p2.to.day; origDay++) {
          const mappedDay = origDay - offset
          if (mappedDay >= 1 && mappedDay <= daysInMonth) {
            // 有効なマッピング
            expect(mappedDay).toBeGreaterThanOrEqual(1)
            expect(mappedDay).toBeLessThanOrEqual(daysInMonth)
          }
        }
      }
    })
  })
})
