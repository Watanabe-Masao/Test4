/**
 * dailySeriesMissingness テスト
 *
 * resolveDailyPoint の欠損判定を検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { resolveDailyPoint } from '@/application/services/temporal'
import type { DailySeriesSourceRow } from '@/application/services/temporal'

describe('resolveDailyPoint', () => {
  const date = { year: 2026, month: 3, day: 15 }
  const dateKey = '2026-03-15'

  it('row あり + 値あり → ok', () => {
    const row: DailySeriesSourceRow = {
      date,
      dateKey,
      sourceMonthKey: '2026-03',
      values: { sales: 100000 },
    }
    const point = resolveDailyPoint(date, dateKey, row, 'sales')

    expect(point.status).toBe('ok')
    expect(point.value).toBe(100000)
    expect(point.sourceMonthKey).toBe('2026-03')
  })

  it('row なし → missing（sourceMonthKey は date 由来）', () => {
    const point = resolveDailyPoint(date, dateKey, undefined, 'sales')

    expect(point.status).toBe('missing')
    expect(point.value).toBeNull()
    expect(point.sourceMonthKey).toBe('2026-03')
  })

  it('row あり + metric 値なし → missing（sourceMonthKey は row 由来）', () => {
    const row: DailySeriesSourceRow = {
      date,
      dateKey,
      sourceMonthKey: '2026-03',
      values: { customers: 50 }, // sales がない
    }
    const point = resolveDailyPoint(date, dateKey, row, 'sales')

    expect(point.status).toBe('missing')
    expect(point.value).toBeNull()
    expect(point.sourceMonthKey).toBe('2026-03') // row 由来
  })

  it('missing 時 value === null', () => {
    const point = resolveDailyPoint(date, dateKey, undefined, 'sales')
    expect(point.value).toBeNull()
  })
})
