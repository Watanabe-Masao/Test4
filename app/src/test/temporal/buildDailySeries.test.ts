/**
 * buildDailySeries テスト
 *
 * requiredRange から連続日次系列を構築する。
 * 月跨ぎ・閏年・欠損・余剰行を検証する。
 */
import { describe, it, expect } from 'vitest'
import { buildDailySeries } from '@/application/services/temporal'
import type { DailySeriesSourceRow } from '@/application/services/temporal'
import type { TemporalFetchPlan } from '@/application/usecases/temporal'

function makePlan(
  from: { year: number; month: number; day: number },
  to: { year: number; month: number; day: number },
): TemporalFetchPlan {
  return {
    anchorRange: { from, to },
    requiredRange: { from, to },
    requiredMonths: [],
  }
}

function makeRow(year: number, month: number, day: number, sales: number): DailySeriesSourceRow {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return {
    date: { year, month, day },
    dateKey: `${year}-${m}-${d}`,
    sourceMonthKey: `${year}-${m}` as DailySeriesSourceRow['sourceMonthKey'],
    values: { sales },
  }
}

describe('buildDailySeries', () => {
  it('requiredRange の全日付が連続して返る（日数一致）', () => {
    // 2026-03-01..2026-03-05 = 5日
    const plan = makePlan({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 3, day: 5 })
    const series = buildDailySeries(plan, [], 'sales')

    expect(series).toHaveLength(5)
    expect(series[0].dateKey).toBe('2026-03-01')
    expect(series[4].dateKey).toBe('2026-03-05')
  })

  it('rows がある日は status=ok（値 + sourceMonthKey 保持）', () => {
    const plan = makePlan({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 3, day: 3 })
    const rows = [makeRow(2026, 3, 2, 50000)]
    const series = buildDailySeries(plan, rows, 'sales')

    const day2 = series.find((p) => p.dateKey === '2026-03-02')!
    expect(day2.status).toBe('ok')
    expect(day2.value).toBe(50000)
    expect(day2.sourceMonthKey).toBe('2026-03')
  })

  it('rows がない日は status=missing（value=null）', () => {
    const plan = makePlan({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 3, day: 3 })
    const series = buildDailySeries(plan, [], 'sales')

    expect(series.every((p) => p.status === 'missing')).toBe(true)
    expect(series.every((p) => p.value === null)).toBe(true)
  })

  it('月跨ぎ（2月末→3月初）でも series が切れない', () => {
    // 2026-02-26..2026-03-03 = 6日
    const plan = makePlan({ year: 2026, month: 2, day: 26 }, { year: 2026, month: 3, day: 3 })
    const series = buildDailySeries(plan, [], 'sales')

    expect(series).toHaveLength(6)
    expect(series[0].dateKey).toBe('2026-02-26')
    expect(series[2].dateKey).toBe('2026-02-28') // 2026 は非閏年
    expect(series[3].dateKey).toBe('2026-03-01')
    expect(series[5].dateKey).toBe('2026-03-03')
  })

  it('閏年（2028-02-24..2028-03-05）で 2/29 が含まれる', () => {
    const plan = makePlan({ year: 2028, month: 2, day: 24 }, { year: 2028, month: 3, day: 5 })
    const series = buildDailySeries(plan, [], 'sales')

    const dateKeys = series.map((p) => p.dateKey)
    expect(dateKeys).toContain('2028-02-29')
    expect(series).toHaveLength(11) // 24,25,26,27,28,29,1,2,3,4,5
  })

  it('sourceMonthKey が row あり/missing 日で正しい', () => {
    const plan = makePlan({ year: 2026, month: 2, day: 28 }, { year: 2026, month: 3, day: 1 })
    const rows = [makeRow(2026, 2, 28, 30000)]
    const series = buildDailySeries(plan, rows, 'sales')

    // 2/28: row あり → row の sourceMonthKey
    expect(series[0].sourceMonthKey).toBe('2026-02')
    // 3/1: row なし → date 由来
    expect(series[1].sourceMonthKey).toBe('2026-03')
  })

  it('出力順が from→to の昇順', () => {
    const plan = makePlan({ year: 2026, month: 3, day: 1 }, { year: 2026, month: 3, day: 10 })
    const series = buildDailySeries(plan, [], 'sales')

    for (let i = 1; i < series.length; i++) {
      expect(series[i].dateKey > series[i - 1].dateKey).toBe(true)
    }
  })

  it('rows が requiredRange 外の日付を含んでいても出力に含まれない', () => {
    const plan = makePlan({ year: 2026, month: 3, day: 5 }, { year: 2026, month: 3, day: 7 })
    const rows = [
      makeRow(2026, 3, 1, 10000), // range 外（前）
      makeRow(2026, 3, 6, 20000), // range 内
      makeRow(2026, 3, 10, 30000), // range 外（後）
    ]
    const series = buildDailySeries(plan, rows, 'sales')

    expect(series).toHaveLength(3) // 5,6,7 のみ
    expect(series[0].dateKey).toBe('2026-03-05')
    expect(series[1].dateKey).toBe('2026-03-06')
    expect(series[1].status).toBe('ok')
    expect(series[1].value).toBe(20000)
    expect(series[2].dateKey).toBe('2026-03-07')
  })
})
