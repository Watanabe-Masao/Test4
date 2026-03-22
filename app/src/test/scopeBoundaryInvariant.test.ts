/**
 * スコープ境界値不変条件テスト
 *
 * ComparisonScope の消費者（resolveDayDetailRanges, 天気取得等）が
 * 月跨ぎ・同曜日オフセット・閏年の境界で正しいスコープを算出するか検証する。
 *
 * ## 不変条件
 * - INV-BOUNDARY-01: cumPrevRange の日数 === cumRange の日数
 * - INV-BOUNDARY-02: cumPrevRange は ComparisonScope.effectivePeriod2 に収まる
 * - INV-BOUNDARY-03: 天気取得月は effectivePeriod2 の全月をカバーする
 */
import { describe, it, expect } from 'vitest'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
import { applyPreset } from '@/domain/models/PeriodSelection'
import type { ComparisonFrame } from '@/domain/models/ComparisonFrame'
import type { DateRange } from '@/domain/models/CalendarDate'
import { resolveDayDetailRanges } from '@/application/hooks/duckdb/useDayDetailData'

// ─── ヘルパー ────────────────────────────────────────

function makeFrame(
  year: number,
  month: number,
  preset: 'prevYearSameMonth' | 'prevYearSameDow',
): ComparisonFrame {
  const daysInMonth = new Date(year, month, 0).getDate()
  const period1: DateRange = {
    from: { year, month, day: 1 },
    to: { year, month, day: daysInMonth },
  }
  const period2 = applyPreset(period1, preset, period1)
  const scope = buildComparisonScope({
    period1,
    period2,
    comparisonEnabled: true,
    activePreset: preset,
  })
  return {
    current: scope.effectivePeriod1,
    previous: scope.effectivePeriod2,
    dowOffset: scope.dowOffset,
    policy: scope.alignmentMode,
  }
}

/** DateRange の日数を計算 */
function rangeDays(r: DateRange): number {
  const from = new Date(r.from.year, r.from.month - 1, r.from.day)
  const to = new Date(r.to.year, r.to.month - 1, r.to.day)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
}

// ─── INV-BOUNDARY-01: cumPrevRange の日数は cumRange と一致 ──

describe('INV-BOUNDARY-01: cumPrevRange の日数 === cumRange の日数', () => {
  const testCases = [
    { year: 2026, month: 2, label: '2026年2月（非閏年、同曜日オフセット発生）' },
    { year: 2028, month: 2, label: '2028年2月（閏年）' },
    { year: 2026, month: 1, label: '2026年1月（31日月）' },
    { year: 2026, month: 3, label: '2026年3月（31日月）' },
    { year: 2026, month: 12, label: '2026年12月（年末境界）' },
  ]

  for (const preset of ['prevYearSameMonth', 'prevYearSameDow'] as const) {
    describe(`preset: ${preset}`, () => {
      for (const { year, month, label } of testCases) {
        it(`${label}: 全日で cumPrevRange 日数 === cumRange 日数`, () => {
          const frame = makeFrame(year, month, preset)
          const daysInMonth = new Date(year, month, 0).getDate()

          for (let day = 1; day <= daysInMonth; day++) {
            const r = resolveDayDetailRanges(year, month, day, frame)
            const cumDays = rangeDays(r.cumRange)
            const cumPrevDays = rangeDays(r.cumPrevRange)

            expect(
              cumPrevDays,
              `day=${day}: cumRange=${cumDays}日, cumPrevRange=${cumPrevDays}日（不一致）`,
            ).toBe(cumDays)
          }
        })
      }
    })
  }
})

// ─── INV-BOUNDARY-02: cumPrevRange は effectivePeriod2 に収まる ──

describe('INV-BOUNDARY-02: cumPrevRange は effectivePeriod2 内に収まる', () => {
  const testCases = [
    { year: 2026, month: 2, label: '2026年2月' },
    { year: 2028, month: 2, label: '2028年2月（閏年）' },
    { year: 2026, month: 3, label: '2026年3月' },
  ]

  for (const { year, month, label } of testCases) {
    it(`${label} (prevYearSameDow): cumPrevRange.from >= effectivePeriod2.from`, () => {
      const frame = makeFrame(year, month, 'prevYearSameDow')
      const ep2 = frame.previous
      const daysInMonth = new Date(year, month, 0).getDate()

      for (let day = 1; day <= daysInMonth; day++) {
        const r = resolveDayDetailRanges(year, month, day, frame)
        const cumFromMs = new Date(
          r.cumPrevRange.from.year,
          r.cumPrevRange.from.month - 1,
          r.cumPrevRange.from.day,
        ).getTime()
        const ep2FromMs = new Date(ep2.from.year, ep2.from.month - 1, ep2.from.day).getTime()

        expect(
          cumFromMs >= ep2FromMs,
          `day=${day}: cumPrevRange.from (${r.cumPrevRange.from.year}-${r.cumPrevRange.from.month}-${r.cumPrevRange.from.day}) ` +
            `< effectivePeriod2.from (${ep2.from.year}-${ep2.from.month}-${ep2.from.day})`,
        ).toBe(true)
      }
    })
  }
})

// ─── INV-BOUNDARY-03: 天気取得月が effectivePeriod2 を全月カバー ──

describe('INV-BOUNDARY-03: 天気取得月が effectivePeriod2 の全月をカバーする', () => {
  /**
   * useUnifiedWidgetContext の天気取得ロジックをシミュレートする。
   * prevYearDateRange が月跨ぎする場合、from 月と to 月の両方を取得すべき。
   */
  function simulateWeatherFetchMonths(prevYearDateRange: DateRange | undefined, targetYear: number, targetMonth: number) {
    if (!prevYearDateRange) {
      return [{ year: targetYear - 1, month: targetMonth }]
    }
    const from = { year: prevYearDateRange.from.year, month: prevYearDateRange.from.month }
    const to = { year: prevYearDateRange.to.year, month: prevYearDateRange.to.month }
    const spansTwoMonths = from.year !== to.year || from.month !== to.month
    return spansTwoMonths ? [from, to] : [from]
  }

  /** effectivePeriod2 が含む全月の集合 */
  function monthsInRange(r: DateRange): Set<string> {
    const months = new Set<string>()
    const cur = new Date(r.from.year, r.from.month - 1, r.from.day)
    const end = new Date(r.to.year, r.to.month - 1, r.to.day)
    while (cur <= end) {
      months.add(`${cur.getFullYear()}-${cur.getMonth() + 1}`)
      cur.setMonth(cur.getMonth() + 1)
      cur.setDate(1)
    }
    return months
  }

  const testCases = [
    { year: 2026, month: 2, label: '2026年2月（同曜日で月跨ぎ発生）' },
    { year: 2026, month: 1, label: '2026年1月' },
    { year: 2026, month: 3, label: '2026年3月' },
    { year: 2028, month: 2, label: '2028年2月（閏年）' },
  ]

  for (const { year, month, label } of testCases) {
    it(`${label}: prevYearSameDow の全月が取得される`, () => {
      const frame = makeFrame(year, month, 'prevYearSameDow')
      const ep2 = frame.previous

      const fetchedMonths = simulateWeatherFetchMonths(ep2, year, month)
      const fetchedSet = new Set(fetchedMonths.map((m) => `${m.year}-${m.month}`))
      const requiredSet = monthsInRange(ep2)

      for (const required of requiredSet) {
        expect(
          fetchedSet.has(required),
          `effectivePeriod2 に含まれる月 ${required} が天気取得されていません。\n` +
            `effectivePeriod2: ${ep2.from.year}-${ep2.from.month}-${ep2.from.day} 〜 ${ep2.to.year}-${ep2.to.month}-${ep2.to.day}\n` +
            `取得月: ${[...fetchedSet].join(', ')}`,
        ).toBe(true)
      }
    })
  }
})
