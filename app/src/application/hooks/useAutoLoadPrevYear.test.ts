import { describe, it, expect } from 'vitest'
import { adjacentMonth, mergeAdjacentMonthRecords, OVERFLOW_DAYS } from './useAutoLoadPrevYear'

// ─── adjacentMonth ──────────────────────────────────────

describe('adjacentMonth', () => {
  it('翌月（年内）', () => {
    expect(adjacentMonth(2025, 2, 1)).toEqual({ year: 2025, month: 3 })
  })

  it('翌月（年跨ぎ 12月→1月）', () => {
    expect(adjacentMonth(2025, 12, 1)).toEqual({ year: 2026, month: 1 })
  })

  it('前月（年内）', () => {
    expect(adjacentMonth(2025, 3, -1)).toEqual({ year: 2025, month: 2 })
  })

  it('前月（年跨ぎ 1月→12月）', () => {
    expect(adjacentMonth(2025, 1, -1)).toEqual({ year: 2024, month: 12 })
  })

  it('全月で前後往復が元に戻る', () => {
    for (let year = 2020; year <= 2030; year++) {
      for (let month = 1; month <= 12; month++) {
        const next = adjacentMonth(year, month, 1)
        const backToOriginal = adjacentMonth(next.year, next.month, -1)
        expect(backToOriginal).toEqual({ year, month })

        const prev = adjacentMonth(year, month, -1)
        const forwardToOriginal = adjacentMonth(prev.year, prev.month, 1)
        expect(forwardToOriginal).toEqual({ year, month })
      }
    }
  })
})

// ─── mergeAdjacentMonthRecords ──────────────────────────

type TestRecord = {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly value: string
}

function makeRec(year: number, month: number, day: number, value = 'test'): TestRecord {
  return { year, month, day, value }
}

describe('mergeAdjacentMonthRecords', () => {
  describe('month フィールドの正規化（バグ修正の検証）', () => {
    it('翌月(3月)レコードが sourceMonth(2月) に正規化される', () => {
      const sourceRecords = [makeRec(2025, 2, 28)]
      const nextMonthRecords = [makeRec(2025, 3, 1), makeRec(2025, 3, 2)]

      const merged = mergeAdjacentMonthRecords(
        sourceRecords,
        null, // prevMonth
        nextMonthRecords,
        2025, // sourceYear
        2, // sourceMonth
        28, // daysInSourceMonth (Feb 2025)
        31, // daysInPrevMonth (Jan 2025)
      )

      // 翌月レコードの month が 2 に正規化されること
      const overflowRecords = merged.filter((r) => r.day > 28)
      expect(overflowRecords).toHaveLength(2)
      for (const rec of overflowRecords) {
        expect(rec.month).toBe(2) // 3ではなく2
        expect(rec.year).toBe(2025)
      }
    })

    it('前月(1月)レコードが sourceMonth(2月) に正規化される', () => {
      const sourceRecords = [makeRec(2025, 2, 1)]
      const prevMonthRecords = [makeRec(2025, 1, 31), makeRec(2025, 1, 30)]

      const merged = mergeAdjacentMonthRecords(
        sourceRecords,
        prevMonthRecords,
        null, // nextMonth
        2025, // sourceYear
        2, // sourceMonth
        28, // daysInSourceMonth
        31, // daysInPrevMonth (Jan)
      )

      const underflowRecords = merged.filter((r) => r.day <= 0)
      expect(underflowRecords).toHaveLength(2)
      for (const rec of underflowRecords) {
        expect(rec.month).toBe(2)
        expect(rec.year).toBe(2025)
      }
    })

    it('本月レコードも year/month が正規化される', () => {
      // ソース月のレコードの year/month が異なっていても正規化される
      const sourceRecords = [makeRec(2024, 12, 15)]

      const merged = mergeAdjacentMonthRecords(
        sourceRecords,
        null,
        null,
        2025, // sourceYear
        2, // sourceMonth
        28,
        31,
      )

      expect(merged).toHaveLength(1)
      expect(merged[0].year).toBe(2025)
      expect(merged[0].month).toBe(2)
      expect(merged[0].day).toBe(15)
    })
  })

  describe('オーバーフロー（翌月先頭）', () => {
    it('翌月 day 1〜OVERFLOW_DAYS が拡張day番号でマージされる', () => {
      const sourceRecords = [makeRec(2025, 2, 28)]
      const nextMonthRecords = Array.from({ length: 10 }, (_, i) =>
        makeRec(2025, 3, i + 1, `mar${i + 1}`),
      )

      const merged = mergeAdjacentMonthRecords(
        sourceRecords,
        null,
        nextMonthRecords,
        2025,
        2,
        28,
        31,
      )

      // ソース月1件 + OVERFLOW_DAYS件
      expect(merged).toHaveLength(1 + OVERFLOW_DAYS)

      // 拡張day: 29, 30, 31, 32, 33, 34
      for (let i = 0; i < OVERFLOW_DAYS; i++) {
        const rec = merged[1 + i]
        expect(rec.day).toBe(28 + (i + 1))
        expect(rec.value).toBe(`mar${i + 1}`)
      }
    })

    it('翌月 day > OVERFLOW_DAYS はマージされない', () => {
      const nextMonthRecords = [makeRec(2025, 3, 7, 'excluded')]

      const merged = mergeAdjacentMonthRecords([], null, nextMonthRecords, 2025, 2, 28, 31)

      expect(merged).toHaveLength(0)
    })
  })

  describe('アンダーフロー（前月末尾）', () => {
    it('前月末 OVERFLOW_DAYS 日が負の拡張day番号でマージされる', () => {
      const prevMonthRecords = Array.from({ length: 31 }, (_, i) =>
        makeRec(2025, 1, i + 1, `jan${i + 1}`),
      )

      const merged = mergeAdjacentMonthRecords([], prevMonthRecords, null, 2025, 2, 28, 31)

      // 31日の月でOVERFLOW_DAYS=6 → day 26〜31 がマージ対象
      expect(merged).toHaveLength(OVERFLOW_DAYS)

      // 拡張day: 26-31=−5, 27-31=−4, ..., 31-31=0
      const days = merged.map((r) => r.day).sort((a, b) => a - b)
      expect(days).toEqual([-5, -4, -3, -2, -1, 0])
    })

    it('前月の初日〜中旬はマージされない', () => {
      const prevMonthRecords = [makeRec(2025, 1, 15, 'excluded')]

      const merged = mergeAdjacentMonthRecords([], prevMonthRecords, null, 2025, 2, 28, 31)

      expect(merged).toHaveLength(0)
    })
  })

  describe('年跨ぎ（12月→1月）', () => {
    it('ソース月=12月: 翌月=翌年1月のレコードが正しくマージされる', () => {
      const sourceRecords = [makeRec(2025, 12, 31)]
      const nextMonthRecords = [makeRec(2026, 1, 1, 'jan1')]

      const merged = mergeAdjacentMonthRecords(
        sourceRecords,
        null,
        nextMonthRecords,
        2025,
        12,
        31,
        30, // Dec has 31 days, Nov has 30
      )

      // 翌月の1月1日 → day = 31 + 1 = 32, month=12, year=2025 に正規化
      const overflow = merged.filter((r) => r.day > 31)
      expect(overflow).toHaveLength(1)
      expect(overflow[0].day).toBe(32)
      expect(overflow[0].month).toBe(12)
      expect(overflow[0].year).toBe(2025)
      expect(overflow[0].value).toBe('jan1')
    })

    it('ソース月=1月: 前月=前年12月のレコードが正しくマージされる', () => {
      const prevMonthRecords = [makeRec(2024, 12, 31, 'dec31')]

      const merged = mergeAdjacentMonthRecords(
        [],
        prevMonthRecords,
        null,
        2025,
        1,
        31,
        31, // Jan has 31 days, Dec has 31
      )

      // 12月31日 → day = 31 - 31 = 0, month=1, year=2025 に正規化
      expect(merged).toHaveLength(1)
      expect(merged[0].day).toBe(0)
      expect(merged[0].month).toBe(1)
      expect(merged[0].year).toBe(2025)
      expect(merged[0].value).toBe('dec31')
    })
  })

  describe('実際のユースケース: 2026年2月 vs 前年2025年2月', () => {
    it('2025/3/1 データが day=29 として取り込まれ month=2 に正規化される', () => {
      // 2026/2/28(土) → 前年の同曜日は 2025/3/1(土)
      // offset=1 のため、当年 day 28 は前年 day 29 にマッピングされる
      // 前年 day 29 は 2月にはないので、3月1日のデータが必要
      const sourceRecords = Array.from({ length: 28 }, (_, i) =>
        makeRec(2025, 2, i + 1, `feb${i + 1}`),
      )
      const nextMonthRecords = Array.from({ length: 6 }, (_, i) =>
        makeRec(2025, 3, i + 1, `mar${i + 1}`),
      )

      const merged = mergeAdjacentMonthRecords(
        sourceRecords,
        null,
        nextMonthRecords,
        2025,
        2,
        28,
        31,
      )

      // 28(本月) + 6(overflow) = 34
      expect(merged).toHaveLength(34)

      // day=29 のレコードが存在し、month=2 であること
      const day29 = merged.find((r) => r.day === 29)
      expect(day29).toBeDefined()
      expect(day29!.month).toBe(2)
      expect(day29!.year).toBe(2025)
      expect(day29!.value).toBe('mar1')
    })
  })

  describe('エッジケース', () => {
    it('前月・翌月データが null の場合はソースのみ', () => {
      const sourceRecords = [makeRec(2025, 2, 15)]

      const merged = mergeAdjacentMonthRecords(sourceRecords, null, null, 2025, 2, 28, 31)

      expect(merged).toHaveLength(1)
      expect(merged[0].day).toBe(15)
    })

    it('前月・翌月データが空配列の場合はソースのみ', () => {
      const sourceRecords = [makeRec(2025, 2, 15)]

      const merged = mergeAdjacentMonthRecords(sourceRecords, [], [], 2025, 2, 28, 31)

      expect(merged).toHaveLength(1)
    })

    it('ソースレコードが空でも前月・翌月データはマージされる', () => {
      const prevMonthRecords = [makeRec(2025, 1, 31)]
      const nextMonthRecords = [makeRec(2025, 3, 1)]

      const merged = mergeAdjacentMonthRecords(
        [],
        prevMonthRecords,
        nextMonthRecords,
        2025,
        2,
        28,
        31,
      )

      expect(merged).toHaveLength(2)
    })

    it('daysInPrevMonth=0 の場合、前月マージはスキップされる', () => {
      const prevMonthRecords = [makeRec(2025, 1, 31)]

      const merged = mergeAdjacentMonthRecords([], prevMonthRecords, null, 2025, 2, 28, 0)

      expect(merged).toHaveLength(0)
    })

    it('うるう年2月（29日）のオーバーフロー', () => {
      const sourceRecords = Array.from({ length: 29 }, (_, i) => makeRec(2024, 2, i + 1))
      const nextMonthRecords = [makeRec(2024, 3, 1, 'mar1')]

      const merged = mergeAdjacentMonthRecords(
        sourceRecords,
        null,
        nextMonthRecords,
        2024,
        2,
        29,
        31,
      )

      const overflow = merged.find((r) => r.day === 30)
      expect(overflow).toBeDefined()
      expect(overflow!.value).toBe('mar1')
      expect(overflow!.month).toBe(2)
    })
  })
})
