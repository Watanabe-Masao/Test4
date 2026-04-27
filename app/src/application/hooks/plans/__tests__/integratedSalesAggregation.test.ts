/**
 * aggregateDailyQuantity のユニットテスト
 *
 * 日別点数データの集約・前年アラインメント・欠損入力の動作を検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { aggregateDailyQuantity } from '@/application/hooks/plans/integratedSalesAggregation'
import type { DateRange } from '@/domain/models/calendar'

const dateRange = (fromY: number, fromM: number, fromD: number, toD: number): DateRange => ({
  from: { year: fromY, month: fromM, day: fromD },
  to: { year: fromY, month: fromM, day: toD },
})

describe('aggregateDailyQuantity', () => {
  it('curRecords が undefined なら undefined を返す', () => {
    const result = aggregateDailyQuantity(
      undefined,
      undefined,
      undefined,
      dateRange(2026, 3, 1, 31),
      31,
    )
    expect(result).toBeUndefined()
  })

  it('当期のみ（前年なし）を集約する', () => {
    const result = aggregateDailyQuantity(
      [
        { dateKey: '2026-03-01', dailyQuantity: 10 },
        { dateKey: '2026-03-02', dailyQuantity: 20 },
      ],
      undefined,
      undefined,
      dateRange(2026, 3, 1, 31),
      31,
    )
    expect(result).toBeTruthy()
    expect(result!.current.get(1)).toBe(10)
    expect(result!.current.get(2)).toBe(20)
    expect(result!.prev.size).toBe(0)
  })

  it('同日の複数レコードを合算する', () => {
    const result = aggregateDailyQuantity(
      [
        { dateKey: '2026-03-01', dailyQuantity: 10 },
        { dateKey: '2026-03-01', dailyQuantity: 15 },
        { dateKey: '2026-03-02', dailyQuantity: 5 },
      ],
      undefined,
      undefined,
      dateRange(2026, 3, 1, 31),
      31,
    )
    expect(result!.current.get(1)).toBe(25)
    expect(result!.current.get(2)).toBe(5)
  })

  it('前年データを当年日番号にアラインメントする（同日アライン）', () => {
    const result = aggregateDailyQuantity(
      [{ dateKey: '2026-03-01', dailyQuantity: 100 }],
      [
        { dateKey: '2025-03-01', dailyQuantity: 50 },
        { dateKey: '2025-03-02', dailyQuantity: 60 },
      ],
      dateRange(2025, 3, 1, 31),
      dateRange(2026, 3, 1, 31),
      31,
    )
    expect(result!.prev.get(1)).toBe(50)
    expect(result!.prev.get(2)).toBe(60)
  })

  it('daysInMonth 範囲外の前年データは除外する', () => {
    const result = aggregateDailyQuantity(
      [{ dateKey: '2026-03-01', dailyQuantity: 1 }],
      [
        { dateKey: '2025-03-31', dailyQuantity: 99 }, // targetDay=31 → in range
        { dateKey: '2025-04-01', dailyQuantity: 77 }, // targetDay=32 → out of range
      ],
      dateRange(2025, 3, 1, 31),
      dateRange(2026, 3, 1, 31),
      31,
    )
    expect(result!.prev.get(31)).toBe(99)
    expect(result!.prev.has(32)).toBe(false)
  })

  it('前年の同日複数レコードを合算する', () => {
    const result = aggregateDailyQuantity(
      [{ dateKey: '2026-03-01', dailyQuantity: 1 }],
      [
        { dateKey: '2025-03-05', dailyQuantity: 10 },
        { dateKey: '2025-03-05', dailyQuantity: 20 },
      ],
      dateRange(2025, 3, 1, 31),
      dateRange(2026, 3, 1, 31),
      31,
    )
    expect(result!.prev.get(5)).toBe(30)
  })

  it('当期が空でも undefined を返さず空マップ', () => {
    const result = aggregateDailyQuantity([], undefined, undefined, dateRange(2026, 3, 1, 31), 31)
    expect(result).toBeTruthy()
    expect(result!.current.size).toBe(0)
    expect(result!.prev.size).toBe(0)
  })

  it('prevYearDateRange が undefined なら prev は空', () => {
    const result = aggregateDailyQuantity(
      [{ dateKey: '2026-03-01', dailyQuantity: 1 }],
      [{ dateKey: '2025-03-01', dailyQuantity: 5 }],
      undefined,
      dateRange(2026, 3, 1, 31),
      31,
    )
    expect(result!.prev.size).toBe(0)
  })
})
