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

// ── 1. 前年同日・単月 ──

describe('alignRows — 前年同日・単月', () => {
  it('2026-03 ↔ 2025-03: 同月同日でペアリングする', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 200 }),
      makeRow({ dateKey: '2026-03-15', storeId: 'S1', month: 3, day: 15, sales: 300 }),
      makeRow({ dateKey: '2026-03-31', storeId: 'S1', month: 3, day: 31, sales: 400 }),
    ]
    const previous = [
      makeRow({
        dateKey: '2025-03-01',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 1,
        sales: 150,
      }),
      makeRow({
        dateKey: '2025-03-15',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 15,
        sales: 250,
      }),
      makeRow({
        dateKey: '2025-03-31',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 31,
        sales: 350,
      }),
    ]

    const aligned = alignRows(current, previous, 'sameDate', 0)
    expect(aligned).toHaveLength(3)

    const day1 = aligned.find((r) => r.currentDateKey === '2026-03-01')!
    expect(day1.compareDateKey).toBe('2025-03-01')
    expect(day1.currentSales).toBe(200)
    expect(day1.compareSales).toBe(150)

    const day31 = aligned.find((r) => r.currentDateKey === '2026-03-31')!
    expect(day31.compareDateKey).toBe('2025-03-31')
    expect(day31.currentSales).toBe(400)
    expect(day31.compareSales).toBe(350)
  })

  it('複数店舗を正しく分離する', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 100 }),
      makeRow({ dateKey: '2026-03-01', storeId: 'S2', month: 3, day: 1, sales: 200 }),
    ]
    const previous = [
      makeRow({
        dateKey: '2025-03-01',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 1,
        sales: 80,
      }),
      makeRow({
        dateKey: '2025-03-01',
        storeId: 'S2',
        year: 2025,
        month: 3,
        day: 1,
        sales: 160,
      }),
    ]

    const aligned = alignRows(current, previous, 'sameDate', 0)
    expect(aligned).toHaveLength(2)
    const s1 = aligned.find((r) => r.storeId === 'S1')!
    const s2 = aligned.find((r) => r.storeId === 'S2')!
    expect(s1.currentSales).toBe(100)
    expect(s1.compareSales).toBe(80)
    expect(s2.currentSales).toBe(200)
    expect(s2.compareSales).toBe(160)
  })

  it('同じ storeId|dateKey の複数行を合算する', () => {
    const current = [
      makeRow({
        dateKey: '2026-03-01',
        storeId: 'S1',
        month: 3,
        day: 1,
        sales: 100,
        customers: 5,
      }),
      makeRow({
        dateKey: '2026-03-01',
        storeId: 'S1',
        month: 3,
        day: 1,
        sales: 50,
        customers: 3,
      }),
    ]

    const aligned = alignRows(current, [], 'sameDate', 0)
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

    const aligned = alignRows(current, [], 'sameDate', 0)
    expect(aligned.map((r) => `${r.storeId}:${r.currentDateKey}`)).toEqual([
      'S1:2026-03-01',
      'S1:2026-03-02',
      'S2:2026-03-03',
    ])
  })
})

// ── 2. 前年同曜日・単月 ──

describe('alignRows — 前年同曜日・単月', () => {
  it('dowOffset=1: 当年3/1 ↔ 前年3/2 にずれる', () => {
    // dowOffset=1 → 前年の day+1 を比較先とする
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 200 }),
      makeRow({ dateKey: '2026-03-02', storeId: 'S1', month: 3, day: 2, sales: 300 }),
    ]
    const previous = [
      makeRow({
        dateKey: '2025-03-02',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 2,
        sales: 150,
      }),
      makeRow({
        dateKey: '2025-03-03',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 3,
        sales: 250,
      }),
    ]

    const aligned = alignRows(current, previous, 'sameDayOfWeek', 1)
    expect(aligned).toHaveLength(2)

    const day1 = aligned.find((r) => r.currentDateKey === '2026-03-01')!
    expect(day1.compareDateKey).toBe('2025-03-02')
    expect(day1.compareSales).toBe(150)

    const day2 = aligned.find((r) => r.currentDateKey === '2026-03-02')!
    expect(day2.compareDateKey).toBe('2025-03-03')
    expect(day2.compareSales).toBe(250)
  })

  it('dowOffset=6: 大きなオフセットでも正しく対応する', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 100 }),
    ]
    const previous = [
      makeRow({
        dateKey: '2025-03-07',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 7,
        sales: 90,
      }),
    ]

    const aligned = alignRows(current, previous, 'sameDayOfWeek', 6)
    expect(aligned).toHaveLength(1)
    expect(aligned[0].currentDateKey).toBe('2026-03-01')
    expect(aligned[0].compareDateKey).toBe('2025-03-07')
    expect(aligned[0].compareSales).toBe(90)
  })

  it('alignmentKey に compareMode が含まれる', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 100 }),
    ]

    const alignedSameDate = alignRows(current, [], 'sameDate', 0)
    expect(alignedSameDate[0].alignmentKey).toContain('sameDate')

    const alignedSameDow = alignRows(current, [], 'sameDayOfWeek', 1)
    expect(alignedSameDow[0].alignmentKey).toContain('sameDayOfWeek')
  })
})

// ── 3. 前年同曜日・月跨ぎ ──

describe('alignRows — 前年同曜日・月跨ぎ', () => {
  it('当年3月末 ↔ 前年4月初: offset で月をまたぐ場合', () => {
    // dowOffset=3: 前年 day+3 が比較先
    // 当年 3/30 → 前年 3/33 → Date が自動で 4/2 に正規化
    const current = [
      makeRow({ dateKey: '2026-03-29', storeId: 'S1', month: 3, day: 29, sales: 100 }),
      makeRow({ dateKey: '2026-03-30', storeId: 'S1', month: 3, day: 30, sales: 200 }),
      makeRow({ dateKey: '2026-03-31', storeId: 'S1', month: 3, day: 31, sales: 300 }),
    ]
    const previous = [
      makeRow({
        dateKey: '2025-04-01',
        storeId: 'S1',
        year: 2025,
        month: 4,
        day: 1,
        sales: 80,
      }),
      makeRow({
        dateKey: '2025-04-02',
        storeId: 'S1',
        year: 2025,
        month: 4,
        day: 2,
        sales: 160,
      }),
      makeRow({
        dateKey: '2025-04-03',
        storeId: 'S1',
        year: 2025,
        month: 4,
        day: 3,
        sales: 240,
      }),
    ]

    const aligned = alignRows(current, previous, 'sameDayOfWeek', 3)

    const day29 = aligned.find((r) => r.currentDateKey === '2026-03-29')!
    expect(day29.compareDateKey).toBe('2025-04-01')
    expect(day29.compareSales).toBe(80)

    const day30 = aligned.find((r) => r.currentDateKey === '2026-03-30')!
    expect(day30.compareDateKey).toBe('2025-04-02')
    expect(day30.compareSales).toBe(160)

    const day31 = aligned.find((r) => r.currentDateKey === '2026-03-31')!
    expect(day31.compareDateKey).toBe('2025-04-03')
    expect(day31.compareSales).toBe(240)
  })
})

// ── 4. 2月末を含む ──

describe('alignRows — 2月末を含む比較', () => {
  it('2026-02-28 → 2025-02-28: 非 leap year 同士', () => {
    const current = [
      makeRow({
        dateKey: '2026-02-28',
        storeId: 'S1',
        year: 2026,
        month: 2,
        day: 28,
        sales: 100,
      }),
    ]
    const previous = [
      makeRow({
        dateKey: '2025-02-28',
        storeId: 'S1',
        year: 2025,
        month: 2,
        day: 28,
        sales: 80,
      }),
    ]

    const aligned = alignRows(current, previous, 'sameDate', 0)
    expect(aligned).toHaveLength(1)
    expect(aligned[0].currentDateKey).toBe('2026-02-28')
    expect(aligned[0].compareDateKey).toBe('2025-02-28')
  })

  it('2025-02-28 → 2024-02-28/29: leap year の2月末', () => {
    // 2024 は leap year（2/29 がある）、2025 は非 leap year
    const current = [
      makeRow({
        dateKey: '2025-02-28',
        storeId: 'S1',
        year: 2025,
        month: 2,
        day: 28,
        sales: 100,
      }),
    ]
    const previous = [
      makeRow({
        dateKey: '2024-02-28',
        storeId: 'S1',
        year: 2024,
        month: 2,
        day: 28,
        sales: 80,
      }),
    ]

    const aligned = alignRows(current, previous, 'sameDate', 0)
    expect(aligned).toHaveLength(1)
    // sameDate: 2025-02-28 → 2024-02-28
    expect(aligned[0].compareDateKey).toBe('2024-02-28')
    expect(aligned[0].compareSales).toBe(80)
  })

  it('leap year 2/29 の sameDayOfWeek: 前年3月にオーバーフロー', () => {
    // 2024-02-29 (leap day) + offset=2 → 2023-03-03 (Date が自動正規化)
    const current = [
      makeRow({
        dateKey: '2024-02-29',
        storeId: 'S1',
        year: 2024,
        month: 2,
        day: 29,
        sales: 100,
      }),
    ]
    const previous = [
      makeRow({
        dateKey: '2023-03-03',
        storeId: 'S1',
        year: 2023,
        month: 3,
        day: 3,
        sales: 70,
      }),
    ]

    const aligned = alignRows(current, previous, 'sameDayOfWeek', 2)
    // 2024-02-29 → 前年(2023) 2/29+2 = 2/31 → Date正規化で 3/3
    expect(aligned).toHaveLength(1)
    expect(aligned[0].compareDateKey).toBe('2023-03-03')
    expect(aligned[0].compareSales).toBe(70)
  })
})

// ── 5. 比較先が欠損する日 ──

describe('alignRows — 比較先が欠損する日', () => {
  it('当期のみの行は compareSales が null', () => {
    const current = [
      makeRow({ dateKey: '2026-03-15', storeId: 'S1', month: 3, day: 15, sales: 300 }),
    ]

    const aligned = alignRows(current, [], 'sameDate', 0)
    expect(aligned).toHaveLength(1)
    expect(aligned[0].currentDateKey).toBe('2026-03-15')
    expect(aligned[0].compareSales).toBeNull()
  })

  it('比較期のみの行は currentSales が 0', () => {
    const previous = [
      makeRow({
        dateKey: '2025-03-20',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 20,
        sales: 180,
      }),
    ]

    const aligned = alignRows([], previous, 'sameDate', 0)
    expect(aligned).toHaveLength(1)
    expect(aligned[0].currentDateKey).toBeNull()
    expect(aligned[0].compareDateKey).toBe('2025-03-20')
    expect(aligned[0].currentSales).toBe(0)
    expect(aligned[0].compareSales).toBe(180)
  })

  it('一部の日のみ比較先がない場合、その日だけ null', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 100 }),
      makeRow({ dateKey: '2026-03-02', storeId: 'S1', month: 3, day: 2, sales: 200 }),
      makeRow({ dateKey: '2026-03-03', storeId: 'S1', month: 3, day: 3, sales: 300 }),
    ]
    // 前年の 3/2 のみデータがない
    const previous = [
      makeRow({
        dateKey: '2025-03-01',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 1,
        sales: 80,
      }),
      makeRow({
        dateKey: '2025-03-03',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 3,
        sales: 240,
      }),
    ]

    const aligned = alignRows(current, previous, 'sameDate', 0)
    expect(aligned).toHaveLength(3)

    const day1 = aligned.find((r) => r.currentDateKey === '2026-03-01')!
    expect(day1.compareSales).toBe(80)

    const day2 = aligned.find((r) => r.currentDateKey === '2026-03-02')!
    expect(day2.compareSales).toBeNull()

    const day3 = aligned.find((r) => r.currentDateKey === '2026-03-03')!
    expect(day3.compareSales).toBe(240)
  })

  it('sameDayOfWeek で offset 先の日にデータがない場合も null', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 100 }),
    ]
    // offset=2 → 2025-03-03 を探すが、データなし
    const previous: AlignableRow[] = []

    const aligned = alignRows(current, previous, 'sameDayOfWeek', 2)
    expect(aligned).toHaveLength(1)
    expect(aligned[0].currentDateKey).toBe('2026-03-01')
    expect(aligned[0].compareSales).toBeNull()
  })

  it('空配列同士を渡すと空配列を返す', () => {
    expect(alignRows([], [], 'sameDate', 0)).toEqual([])
  })
})

// ── 後方互換: デフォルト引数 ──

describe('alignRows — 後方互換（デフォルト引数）', () => {
  it('compareMode 省略時は sameDate / offset=0 で動作する', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', month: 3, day: 1, sales: 200 }),
    ]
    const previous = [
      makeRow({
        dateKey: '2025-03-01',
        storeId: 'S1',
        year: 2025,
        month: 3,
        day: 1,
        sales: 150,
      }),
    ]

    const aligned = alignRows(current, previous)
    expect(aligned).toHaveLength(1)
    expect(aligned[0].currentSales).toBe(200)
    expect(aligned[0].compareSales).toBe(150)
  })
})

// ── toYoyDailyRows ──

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

    const aligned = alignRows(current, previous, 'sameDate', 0)
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
      'sameDate',
      0,
    )
    const yoyRows = toYoyDailyRows(aligned)
    expect(yoyRows[0].salesDiff).toBe(300)
    expect(yoyRows[0].prevSales).toBeNull()
  })
})
