/**
 * aggregateStoreDaySummaryByDateKey — store×day rows を dateKey 単位で集約
 *
 * 検証対象:
 * - 同一 dateKey の複数行を SUM 集約
 * - 出力は dateKey 昇順
 * - 入力並び順に非依存
 * - 単店舗は恒等
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { aggregateStoreDaySummaryByDateKey } from '../aggregateStoreDaySummaryByDateKey'
import type { StoreDaySummaryRowForTemporal } from '../storeDaySummaryTemporalAdapter'

function row(
  overrides: Partial<StoreDaySummaryRowForTemporal> = {},
): StoreDaySummaryRowForTemporal {
  return {
    year: 2026,
    month: 3,
    day: 1,
    dateKey: '2026-03-01',
    sales: 100,
    customers: 10,
    coreSales: 80,
    totalQuantity: 50,
    discountAbsolute: 20,
    ...overrides,
  } as StoreDaySummaryRowForTemporal
}

describe('aggregateStoreDaySummaryByDateKey', () => {
  it('空配列で空配列', () => {
    expect(aggregateStoreDaySummaryByDateKey([])).toEqual([])
  })

  it('単一 row はそのまま 1 件（フィールドコピー）', () => {
    const r = row()
    const result = aggregateStoreDaySummaryByDateKey([r])
    expect(result).toHaveLength(1)
    expect(result[0].sales).toBe(100)
    expect(result[0].customers).toBe(10)
  })

  it('同一 dateKey は SUM 集約', () => {
    const result = aggregateStoreDaySummaryByDateKey([
      row({
        dateKey: '2026-03-01',
        sales: 100,
        customers: 10,
        coreSales: 80,
        totalQuantity: 50,
        discountAbsolute: 20,
      }),
      row({
        dateKey: '2026-03-01',
        sales: 200,
        customers: 20,
        coreSales: 150,
        totalQuantity: 70,
        discountAbsolute: 30,
      }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].sales).toBe(300)
    expect(result[0].customers).toBe(30)
    expect(result[0].coreSales).toBe(230)
    expect(result[0].totalQuantity).toBe(120)
    expect(result[0].discountAbsolute).toBe(50)
  })

  it('異なる dateKey は別グループ', () => {
    const result = aggregateStoreDaySummaryByDateKey([
      row({ dateKey: '2026-03-01', sales: 100 }),
      row({ dateKey: '2026-03-02', sales: 200 }),
    ])
    expect(result).toHaveLength(2)
    expect(result.find((r) => r.dateKey === '2026-03-01')?.sales).toBe(100)
    expect(result.find((r) => r.dateKey === '2026-03-02')?.sales).toBe(200)
  })

  it('出力は dateKey 昇順', () => {
    const result = aggregateStoreDaySummaryByDateKey([
      row({ dateKey: '2026-03-15' }),
      row({ dateKey: '2026-03-01' }),
      row({ dateKey: '2026-03-10' }),
    ])
    expect(result.map((r) => r.dateKey)).toEqual(['2026-03-01', '2026-03-10', '2026-03-15'])
  })

  it('並び順に非依存（集約結果は同じ）', () => {
    const a = aggregateStoreDaySummaryByDateKey([
      row({ dateKey: '2026-03-01', sales: 100 }),
      row({ dateKey: '2026-03-01', sales: 200 }),
    ])
    const b = aggregateStoreDaySummaryByDateKey([
      row({ dateKey: '2026-03-01', sales: 200 }),
      row({ dateKey: '2026-03-01', sales: 100 }),
    ])
    expect(a).toEqual(b)
  })

  it('year/month/day/dateKey は先頭行から取得', () => {
    const result = aggregateStoreDaySummaryByDateKey([
      row({ dateKey: '2026-03-01', year: 2026, month: 3, day: 1 }),
      row({ dateKey: '2026-03-01', year: 9999, month: 99, day: 99 }),
    ])
    expect(result[0].year).toBe(2026)
    expect(result[0].month).toBe(3)
    expect(result[0].day).toBe(1)
  })
})
