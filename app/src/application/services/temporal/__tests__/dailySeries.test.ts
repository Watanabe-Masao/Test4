/**
 * DailySeries — toYearMonthKey + resolveDailyPoint + buildDailySeries tests
 *
 * 検証対象:
 * - toYearMonthKey: CalendarDate → "YYYY-MM"
 * - resolveDailyPoint: row + metric → DailySeriesPoint（status=ok/missing）
 * - buildDailySeries: requiredRange の全日を連続列に変換
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { toYearMonthKey } from '../DailySeriesTypes'
import { resolveDailyPoint } from '../dailySeriesMissingness'
import { buildDailySeries } from '../buildDailySeries'
import type { DailySeriesSourceRow } from '../DailySeriesTypes'
import type { TemporalFetchPlan } from '@/application/usecases/temporal/TemporalFrameTypes'

describe('toYearMonthKey', () => {
  it('YYYY-MM 形式（0埋め）', () => {
    expect(toYearMonthKey({ year: 2026, month: 3, day: 15 })).toBe('2026-03')
  })

  it('月が 1 桁でも 0 埋めされる', () => {
    expect(toYearMonthKey({ year: 2026, month: 1, day: 1 })).toBe('2026-01')
  })

  it('12 月でも 2 桁維持', () => {
    expect(toYearMonthKey({ year: 2026, month: 12, day: 31 })).toBe('2026-12')
  })

  it('day は結果に影響しない', () => {
    expect(toYearMonthKey({ year: 2026, month: 5, day: 1 })).toBe(
      toYearMonthKey({ year: 2026, month: 5, day: 31 }),
    )
  })
})

describe('resolveDailyPoint', () => {
  const date = { year: 2026, month: 3, day: 15 }
  const dateKey = '2026-03-15'

  it('row あり + metric が number → status=ok', () => {
    const row: DailySeriesSourceRow = {
      date,
      dateKey,
      sourceMonthKey: '2026-03',
      values: { sales: 1000 },
    }
    const pt = resolveDailyPoint(date, dateKey, row, 'sales')
    expect(pt.status).toBe('ok')
    expect(pt.value).toBe(1000)
    expect(pt.sourceMonthKey).toBe('2026-03')
  })

  it('row あり + metric が null → status=missing', () => {
    const row: DailySeriesSourceRow = {
      date,
      dateKey,
      sourceMonthKey: '2026-03',
      values: { sales: null },
    }
    const pt = resolveDailyPoint(date, dateKey, row, 'sales')
    expect(pt.status).toBe('missing')
    expect(pt.value).toBeNull()
    // sourceMonthKey は row 由来を保持
    expect(pt.sourceMonthKey).toBe('2026-03')
  })

  it('row あり + metric が undefined → status=missing', () => {
    const row: DailySeriesSourceRow = {
      date,
      dateKey,
      sourceMonthKey: '2026-03',
      values: {},
    }
    const pt = resolveDailyPoint(date, dateKey, row, 'sales')
    expect(pt.status).toBe('missing')
    expect(pt.value).toBeNull()
    expect(pt.sourceMonthKey).toBe('2026-03')
  })

  it('row なし → status=missing + sourceMonthKey は date 由来', () => {
    const pt = resolveDailyPoint(date, dateKey, undefined, 'sales')
    expect(pt.status).toBe('missing')
    expect(pt.value).toBeNull()
    expect(pt.sourceMonthKey).toBe('2026-03')
  })

  it('value=0 は ok（0 は有効値）', () => {
    const row: DailySeriesSourceRow = {
      date,
      dateKey,
      sourceMonthKey: '2026-03',
      values: { sales: 0 },
    }
    const pt = resolveDailyPoint(date, dateKey, row, 'sales')
    expect(pt.status).toBe('ok')
    expect(pt.value).toBe(0)
  })
})

describe('buildDailySeries', () => {
  function plan(from: string, to: string): TemporalFetchPlan {
    const [fY, fM, fD] = from.split('-').map(Number)
    const [tY, tM, tD] = to.split('-').map(Number)
    return {
      requiredRange: {
        from: { year: fY, month: fM, day: fD },
        to: { year: tY, month: tM, day: tD },
      },
    } as unknown as TemporalFetchPlan
  }

  function row(dateKey: string, value: number | null): DailySeriesSourceRow {
    const [y, m, d] = dateKey.split('-').map(Number)
    return {
      date: { year: y, month: m, day: d },
      dateKey,
      sourceMonthKey:
        `${y}-${String(m).padStart(2, '0')}` as DailySeriesSourceRow['sourceMonthKey'],
      values: { sales: value },
    }
  }

  it('requiredRange の全日を出力（欠損なし）', () => {
    const result = buildDailySeries(
      plan('2026-03-01', '2026-03-05'),
      [row('2026-03-01', 100), row('2026-03-02', 200)],
      'sales',
    )
    expect(result).toHaveLength(5)
    expect(result.map((r) => r.dateKey)).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
    ])
  })

  it('row なしの日は status=missing', () => {
    const result = buildDailySeries(
      plan('2026-03-01', '2026-03-03'),
      [row('2026-03-02', 100)],
      'sales',
    )
    expect(result[0].status).toBe('missing')
    expect(result[1].status).toBe('ok')
    expect(result[1].value).toBe(100)
    expect(result[2].status).toBe('missing')
  })

  it('requiredRange 外の rows は無視', () => {
    const result = buildDailySeries(
      plan('2026-03-01', '2026-03-02'),
      [row('2025-12-31', 999), row('2026-03-01', 100), row('2026-04-01', 888)],
      'sales',
    )
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe(100)
    expect(result[1].status).toBe('missing')
  })

  it('同一 dateKey の row が複数あれば後勝ち', () => {
    const result = buildDailySeries(
      plan('2026-03-01', '2026-03-01'),
      [row('2026-03-01', 100), row('2026-03-01', 200)],
      'sales',
    )
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(200)
  })

  it('月またぎも 1 日刻みで連続', () => {
    const result = buildDailySeries(plan('2026-02-27', '2026-03-02'), [], 'sales')
    expect(result.map((r) => r.dateKey)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ])
  })

  it('単一日 from=to で 1 件', () => {
    const result = buildDailySeries(plan('2026-03-15', '2026-03-15'), [], 'sales')
    expect(result).toHaveLength(1)
    expect(result[0].dateKey).toBe('2026-03-15')
  })
})
