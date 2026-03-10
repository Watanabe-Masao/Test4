import { describe, it, expect } from 'vitest'
import { alignRows, toYoyDailyRows, type AlignableRow } from '../alignRows'

function makeRow(
  overrides: Partial<AlignableRow> & { dateKey: string; storeId: string },
): AlignableRow {
  return {
    year: 2026,
    month: 3,
    day: 1,
    sales: 100,
    customers: 10,
    ...overrides,
  }
}

describe('alignRows', () => {
  it('当期・比較期の両方にある行をマージする', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 200 }),
    ]
    const previous = [
      makeRow({ dateKey: '2025-03-01', storeId: 'S1', year: 2025, month: 3, day: 1, sales: 150 }),
    ]

    const aligned = alignRows(current, previous)
    expect(aligned).toHaveLength(1)
    expect(aligned[0].currentDateKey).toBe('2026-03-01')
    expect(aligned[0].compareDateKey).toBe('2025-03-01')
    expect(aligned[0].currentSales).toBe(200)
    expect(aligned[0].compareSales).toBe(150)
    expect(aligned[0].storeId).toBe('S1')
  })

  it('当期のみの行は compareSales が null', () => {
    const current = [
      makeRow({ dateKey: '2026-03-15', storeId: 'S1', month: 3, day: 15, sales: 300 }),
    ]
    const previous: AlignableRow[] = []

    const aligned = alignRows(current, previous)
    expect(aligned).toHaveLength(1)
    expect(aligned[0].currentDateKey).toBe('2026-03-15')
    expect(aligned[0].compareDateKey).toBeNull()
    expect(aligned[0].compareSales).toBeNull()
  })

  it('比較期のみの行は currentSales が 0', () => {
    const current: AlignableRow[] = []
    const previous = [
      makeRow({ dateKey: '2025-03-20', storeId: 'S1', year: 2025, month: 3, day: 20, sales: 180 }),
    ]

    const aligned = alignRows(current, previous)
    expect(aligned).toHaveLength(1)
    expect(aligned[0].currentDateKey).toBeNull()
    expect(aligned[0].compareDateKey).toBe('2025-03-20')
    expect(aligned[0].currentSales).toBe(0)
    expect(aligned[0].compareSales).toBe(180)
  })

  it('複数店舗を正しく分離する', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 100 }),
      makeRow({ dateKey: '2026-03-01', storeId: 'S2', month: 3, day: 1, sales: 200 }),
    ]
    const previous = [
      makeRow({ dateKey: '2025-03-01', storeId: 'S1', year: 2025, month: 3, day: 1, sales: 80 }),
      makeRow({ dateKey: '2025-03-01', storeId: 'S2', year: 2025, month: 3, day: 1, sales: 160 }),
    ]

    const aligned = alignRows(current, previous)
    expect(aligned).toHaveLength(2)
    const s1 = aligned.find((r) => r.storeId === 'S1')!
    const s2 = aligned.find((r) => r.storeId === 'S2')!
    expect(s1.currentSales).toBe(100)
    expect(s1.compareSales).toBe(80)
    expect(s2.currentSales).toBe(200)
    expect(s2.compareSales).toBe(160)
  })

  it('同じ storeId|month|day の複数行を合算する', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 100, customers: 5 }),
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 50, customers: 3 }),
    ]
    const previous: AlignableRow[] = []

    const aligned = alignRows(current, previous)
    expect(aligned).toHaveLength(1)
    expect(aligned[0].currentSales).toBe(150)
    expect(aligned[0].currentCustomers).toBe(8)
  })

  it('結果は storeId → dateKey 順にソートされる', () => {
    const current = [
      makeRow({ dateKey: '2026-03-03', storeId: 'S2', month: 3, day: 3 }),
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1 }),
      makeRow({ dateKey: '2026-03-02', storeId: 'S1', month: 3, day: 2 }),
    ]

    const aligned = alignRows(current, [])
    expect(aligned.map((r) => `${r.storeId}:${r.currentDateKey}`)).toEqual([
      'S1:2026-03-01',
      'S1:2026-03-02',
      'S2:2026-03-03',
    ])
  })
})

describe('toYoyDailyRows', () => {
  it('AlignedRow を YoyDailyRow 互換の shape に変換する', () => {
    const current = [
      makeRow({
        dateKey: '2026-03-01',
        storeId: 'S1',
        month: 3,
        day: 1,
        sales: 200,
        customers: 20,
      }),
    ]
    const previous = [
      makeRow({
        dateKey: '2025-03-01',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 1,
        sales: 150,
        customers: 15,
      }),
    ]

    const aligned = alignRows(current, previous)
    const yoyRows = toYoyDailyRows(aligned)

    expect(yoyRows).toHaveLength(1)
    expect(yoyRows[0]).toEqual({
      curDateKey: '2026-03-01',
      prevDateKey: '2025-03-01',
      storeId: 'S1',
      curSales: 200,
      prevSales: 150,
      salesDiff: 50,
      curCustomers: 20,
      prevCustomers: 15,
    })
  })

  it('比較期なしの行は salesDiff = curSales', () => {
    const aligned = alignRows(
      [makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 300 })],
      [],
    )
    const yoyRows = toYoyDailyRows(aligned)
    expect(yoyRows[0].salesDiff).toBe(300)
    expect(yoyRows[0].prevSales).toBeNull()
  })
})
