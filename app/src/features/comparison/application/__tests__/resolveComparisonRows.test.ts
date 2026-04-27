/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { resolveComparisonRows } from '../resolveComparisonRows'
import type { MatchableRow } from '../comparisonTypes'

function makeRow(
  overrides: Partial<MatchableRow> & { dateKey: string; storeId: string },
): MatchableRow {
  const parts = overrides.dateKey.split('-')
  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2]),
    sales: 100,
    customers: 10,
    ...overrides,
  }
}

// ── 正常 match ──

describe('resolveComparisonRows — sameDate match', () => {
  it('1:1 正常 match', () => {
    const current = [makeRow({ dateKey: '2026-03-15', storeId: 'S1', sales: 200, customers: 20 })]
    const previous = [makeRow({ dateKey: '2025-03-15', storeId: 'S1', sales: 150, customers: 15 })]

    const result = resolveComparisonRows(current, previous, 'sameDate')
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('matched')
    expect(result[0].currentDateKey).toBe('2026-03-15')
    expect(result[0].compareDateKey).toBe('2025-03-15')
    expect(result[0].requestedCompareDateKey).toBe('2025-03-15')
    expect(result[0].currentSales).toBe(200)
    expect(result[0].compareSales).toBe(150)
    expect(result[0].currentCustomers).toBe(20)
    expect(result[0].compareCustomers).toBe(15)
  })

  it('複数日の match', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', sales: 100 }),
      makeRow({ dateKey: '2026-03-02', storeId: 'S1', sales: 200 }),
      makeRow({ dateKey: '2026-03-03', storeId: 'S1', sales: 300 }),
    ]
    const previous = [
      makeRow({ dateKey: '2025-03-01', storeId: 'S1', sales: 80 }),
      makeRow({ dateKey: '2025-03-02', storeId: 'S1', sales: 160 }),
      makeRow({ dateKey: '2025-03-03', storeId: 'S1', sales: 240 }),
    ]

    const result = resolveComparisonRows(current, previous, 'sameDate')
    expect(result).toHaveLength(3)
    expect(result.every((r) => r.status === 'matched')).toBe(true)
    expect(result[0].compareSales).toBe(80)
    expect(result[1].compareSales).toBe(160)
    expect(result[2].compareSales).toBe(240)
  })
})

// ── missing_previous ──

describe('resolveComparisonRows — missing_previous', () => {
  it('requested date にデータなし → missing_previous', () => {
    const current = [makeRow({ dateKey: '2026-03-15', storeId: 'S1', sales: 200 })]

    const result = resolveComparisonRows(current, [], 'sameDate')
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('missing_previous')
    expect(result[0].compareDateKey).toBeNull()
    expect(result[0].compareSales).toBeNull()
    expect(result[0].requestedCompareDateKey).toBe('2025-03-15')
  })

  it('一部の日のみ欠損', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1' }),
      makeRow({ dateKey: '2026-03-02', storeId: 'S1' }),
      makeRow({ dateKey: '2026-03-03', storeId: 'S1' }),
    ]
    const previous = [
      makeRow({ dateKey: '2025-03-01', storeId: 'S1', sales: 80 }),
      // 3/2 欠損
      makeRow({ dateKey: '2025-03-03', storeId: 'S1', sales: 240 }),
    ]

    const result = resolveComparisonRows(current, previous, 'sameDate')
    expect(result[0].status).toBe('matched')
    expect(result[1].status).toBe('missing_previous')
    expect(result[2].status).toBe('matched')
  })
})

// ── ambiguous_previous ──

describe('resolveComparisonRows — ambiguous_previous', () => {
  it('同一キーに複数行 → ambiguous_previous', () => {
    const current = [makeRow({ dateKey: '2026-03-15', storeId: 'S1' })]
    const previous = [
      makeRow({ dateKey: '2025-03-15', storeId: 'S1', sales: 100 }),
      makeRow({ dateKey: '2025-03-15', storeId: 'S1', sales: 200 }),
    ]

    const result = resolveComparisonRows(current, previous, 'sameDate')
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('ambiguous_previous')
    expect(result[0].compareDateKey).toBeNull()
    expect(result[0].compareSales).toBeNull()
  })
})

// ── 月跨ぎ ──

describe('resolveComparisonRows — 月跨ぎ', () => {
  it('月跨ぎ current range', () => {
    const current = [
      makeRow({ dateKey: '2026-03-30', storeId: 'S1', sales: 100 }),
      makeRow({ dateKey: '2026-03-31', storeId: 'S1', sales: 200 }),
      makeRow({ dateKey: '2026-04-01', storeId: 'S1', sales: 300 }),
    ]
    const previous = [
      makeRow({ dateKey: '2025-03-30', storeId: 'S1', sales: 80 }),
      makeRow({ dateKey: '2025-03-31', storeId: 'S1', sales: 160 }),
      makeRow({ dateKey: '2025-04-01', storeId: 'S1', sales: 240 }),
    ]

    const result = resolveComparisonRows(current, previous, 'sameDate')
    expect(result).toHaveLength(3)
    expect(result.every((r) => r.status === 'matched')).toBe(true)
  })
})

// ── 複数店舗 ──

describe('resolveComparisonRows — 複数店舗', () => {
  it('店舗を正しく分離する', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', sales: 100 }),
      makeRow({ dateKey: '2026-03-01', storeId: 'S2', sales: 200 }),
    ]
    const previous = [
      makeRow({ dateKey: '2025-03-01', storeId: 'S1', sales: 80 }),
      makeRow({ dateKey: '2025-03-01', storeId: 'S2', sales: 160 }),
    ]

    const result = resolveComparisonRows(current, previous, 'sameDate')
    expect(result).toHaveLength(2)
    const s1 = result.find((r) => r.storeId === 'S1')!
    const s2 = result.find((r) => r.storeId === 'S2')!
    expect(s1.compareSales).toBe(80)
    expect(s2.compareSales).toBe(160)
  })
})

// ── grainKey ──

describe('resolveComparisonRows — grainKey', () => {
  it('grainKey 付き match', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', grainKey: 'dept-A', sales: 100 }),
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', grainKey: 'dept-B', sales: 200 }),
    ]
    const previous = [
      makeRow({ dateKey: '2025-03-01', storeId: 'S1', grainKey: 'dept-A', sales: 80 }),
      makeRow({ dateKey: '2025-03-01', storeId: 'S1', grainKey: 'dept-B', sales: 160 }),
    ]

    const result = resolveComparisonRows(current, previous, 'sameDate')
    expect(result).toHaveLength(2)
    const a = result.find((r) => r.grainKey === 'dept-A')!
    const b = result.find((r) => r.grainKey === 'dept-B')!
    expect(a.compareSales).toBe(80)
    expect(b.compareSales).toBe(160)
  })

  it('grainKey が異なると match しない', () => {
    const current = [
      makeRow({ dateKey: '2026-03-01', storeId: 'S1', grainKey: 'dept-A', sales: 100 }),
    ]
    const previous = [
      makeRow({ dateKey: '2025-03-01', storeId: 'S1', grainKey: 'dept-B', sales: 80 }),
    ]

    const result = resolveComparisonRows(current, previous, 'sameDate')
    expect(result[0].status).toBe('missing_previous')
  })
})

// ── 入力順保持 ──

describe('resolveComparisonRows — 出力順序', () => {
  it('返却順は currentRows の入力順に一致', () => {
    const current = [
      makeRow({ dateKey: '2026-03-03', storeId: 'S2' }),
      makeRow({ dateKey: '2026-03-01', storeId: 'S1' }),
      makeRow({ dateKey: '2026-03-02', storeId: 'S1' }),
    ]

    const result = resolveComparisonRows(current, [], 'sameDate')
    expect(result[0].currentDateKey).toBe('2026-03-03')
    expect(result[0].storeId).toBe('S2')
    expect(result[1].currentDateKey).toBe('2026-03-01')
    expect(result[1].storeId).toBe('S1')
    expect(result[2].currentDateKey).toBe('2026-03-02')
    expect(result[2].storeId).toBe('S1')
  })
})

// ── sameDayOfWeek モード ──

describe('resolveComparisonRows — sameDayOfWeek', () => {
  it('sameDayOfWeek で正しい比較先を引く', () => {
    // 2026-03-10 (火) → resolver は前年の同曜日を探す
    const row = makeRow({ dateKey: '2026-03-10', storeId: 'S1', sales: 200 })
    const current = [row]

    // resolver が返す requested date を先に算出して、その日の previous を用意
    const currentDate = new Date(2026, 2, 10)
    const anchor = new Date(2025, 2, 10)
    const currentDow = currentDate.getDay()

    // anchor 前後で同曜日の最近傍を見つける
    let bestCandidate: Date | null = null
    let bestDist = Infinity
    for (let diff = -7; diff <= 7; diff++) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + diff)
      if (d.getDay() === currentDow) {
        const dist = Math.abs(d.getTime() - anchor.getTime())
        if (dist < bestDist) {
          bestDist = dist
          bestCandidate = d
        }
      }
    }

    const expectedDateKey = `${bestCandidate!.getFullYear()}-${String(bestCandidate!.getMonth() + 1).padStart(2, '0')}-${String(bestCandidate!.getDate()).padStart(2, '0')}`

    const previous = [makeRow({ dateKey: expectedDateKey, storeId: 'S1', sales: 150 })]

    const result = resolveComparisonRows(current, previous, 'sameDayOfWeek')
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('matched')
    expect(result[0].compareSales).toBe(150)
  })
})

// ── 空配列 ──

describe('resolveComparisonRows — 空配列', () => {
  it('空 current → 空結果', () => {
    expect(resolveComparisonRows([], [], 'sameDate')).toEqual([])
  })

  it('空 current + 非空 previous → 空結果', () => {
    const previous = [makeRow({ dateKey: '2025-03-01', storeId: 'S1' })]
    expect(resolveComparisonRows([], previous, 'sameDate')).toEqual([])
  })
})

// ── alignmentKey ──

describe('resolveComparisonRows — alignmentKey', () => {
  it('alignmentKey は requestedCompareDateKey ベース', () => {
    const current = [makeRow({ dateKey: '2026-03-15', storeId: 'S1' })]

    const result = resolveComparisonRows(current, [], 'sameDate')
    expect(result[0].alignmentKey).toContain('2025-03-15')
    expect(result[0].alignmentKey).toContain('sameDate')
    expect(result[0].alignmentKey).toContain('S1')
  })

  it('missing_previous でも alignmentKey は安定', () => {
    const current = [makeRow({ dateKey: '2026-03-15', storeId: 'S1' })]

    const matched = resolveComparisonRows(
      current,
      [makeRow({ dateKey: '2025-03-15', storeId: 'S1' })],
      'sameDate',
    )
    const missing = resolveComparisonRows(current, [], 'sameDate')

    // alignmentKey は同一（requestedCompareDateKey ベースなので）
    expect(matched[0].alignmentKey).toBe(missing[0].alignmentKey)
  })
})
