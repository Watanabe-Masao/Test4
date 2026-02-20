import { describe, it, expect } from 'vitest'
import { calcSameDowOffset } from './usePrevYearData'
import type { CategoryTimeSalesRecord } from '@/domain/models'

/**
 * 同曜日オフセットによる日マッピングのロジックテスト
 *
 * usePrevYearCategoryTimeSales フック内部の
 * `mappedDay = rec.day - offset` ロジックを直接テストする。
 * （フック本体は React コンテキスト依存のため、ロジックのみ検証）
 */

/** フック内部と同じマッピングロジック */
function mapPrevYearRecords(
  records: readonly CategoryTimeSalesRecord[],
  targetYear: number,
  targetMonth: number,
  targetStoreIds: Set<string>,
  daysInTargetMonth: number,
): CategoryTimeSalesRecord[] {
  const offset = calcSameDowOffset(targetYear, targetMonth)
  const mapped: CategoryTimeSalesRecord[] = []
  for (const rec of records) {
    if (targetStoreIds.size > 0 && !targetStoreIds.has(rec.storeId)) continue
    const mappedDay = rec.day - offset
    if (mappedDay < 1 || mappedDay > daysInTargetMonth) continue
    mapped.push({ ...rec, day: mappedDay })
  }
  return mapped
}

function makeRecord(day: number, storeId = '1', amount = 10000): CategoryTimeSalesRecord {
  return {
    day,
    storeId,
    department: { code: '01', name: '食品' },
    line: { code: '001', name: 'ライン1' },
    klass: { code: '0001', name: 'クラス1' },
    timeSlots: [{ hour: 10, quantity: 5, amount }],
    totalQuantity: 5,
    totalAmount: amount,
  }
}

describe('前年分類別時間帯売上 同曜日マッピング', () => {
  describe('2026年2月（offset=1）での曜日アラインメント', () => {
    const year = 2026
    const month = 2
    const offset = calcSameDowOffset(year, month)

    it('オフセットが1であること', () => {
      expect(offset).toBe(1)
    })

    it('マッピング後の全日で曜日が一致する', () => {
      // 前年の全28日分のレコードを作成
      const prevRecords = Array.from({ length: 28 }, (_, i) => makeRecord(i + 1))
      const mapped = mapPrevYearRecords(prevRecords, year, month, new Set(), 28)

      for (const rec of mapped) {
        const curDate = new Date(year, month - 1, rec.day)
        const prevOrigDay = rec.day + offset // 元の前年day
        const prevDate = new Date(year - 1, month - 1, prevOrigDay)
        expect(curDate.getDay()).toBe(prevDate.getDay())
      }
    })

    it('前年 day 1 (土) は除外される（mappedDay=0）', () => {
      const prevRecords = [makeRecord(1)]
      const mapped = mapPrevYearRecords(prevRecords, year, month, new Set(), 28)
      expect(mapped).toHaveLength(0)
    })

    it('前年 day 2 (日) → 当年 day 1 (日) にマッピング', () => {
      const prevRecords = [makeRecord(2)]
      const mapped = mapPrevYearRecords(prevRecords, year, month, new Set(), 28)
      expect(mapped).toHaveLength(1)
      expect(mapped[0].day).toBe(1)
      // 両方とも日曜日
      expect(new Date(2026, 1, 1).getDay()).toBe(0) // 日
      expect(new Date(2025, 1, 2).getDay()).toBe(0) // 日
    })

    it('前年 day 28 → 当年 day 27 にマッピング', () => {
      const prevRecords = [makeRecord(28)]
      const mapped = mapPrevYearRecords(prevRecords, year, month, new Set(), 28)
      expect(mapped).toHaveLength(1)
      expect(mapped[0].day).toBe(27)
    })

    it('範囲外の day は除外される', () => {
      // daysInTargetMonth=28 の場合、mappedDay=29 以上は除外
      const prevRecords = [makeRecord(30)] // mappedDay = 29 → 除外
      const mapped = mapPrevYearRecords(prevRecords, year, month, new Set(), 28)
      expect(mapped).toHaveLength(0)
    })
  })

  describe('店舗フィルタリング', () => {
    it('selectedStoreIds が空の場合は全店舗を含む', () => {
      const prevRecords = [makeRecord(2, '1'), makeRecord(2, '2')]
      const mapped = mapPrevYearRecords(prevRecords, 2026, 2, new Set(), 28)
      expect(mapped).toHaveLength(2)
    })

    it('selectedStoreIds で指定した店舗のみ含む', () => {
      const prevRecords = [makeRecord(2, '1'), makeRecord(2, '2'), makeRecord(2, '3')]
      const mapped = mapPrevYearRecords(prevRecords, 2026, 2, new Set(['1', '3']), 28)
      expect(mapped).toHaveLength(2)
      expect(mapped.map((r) => r.storeId).sort()).toEqual(['1', '3'])
    })
  })

  describe('曜日アラインメント 複数年検証', () => {
    const testCases: [number, number][] = [
      [2025, 1], [2025, 6], [2025, 12],
      [2026, 1], [2026, 3], [2026, 7],
      [2027, 4], [2027, 11],
      [2028, 2], [2028, 8], // うるう年
    ]

    testCases.forEach(([year, month]) => {
      it(`${year}年${month}月: 全マッピング日で曜日が一致`, () => {
        const offset = calcSameDowOffset(year, month)
        const daysInMonth = new Date(year, month, 0).getDate()
        const daysInPrevMonth = new Date(year - 1, month, 0).getDate()

        // 前年の全日を作成
        const prevRecords = Array.from({ length: daysInPrevMonth }, (_, i) => makeRecord(i + 1))
        const mapped = mapPrevYearRecords(prevRecords, year, month, new Set(), daysInMonth)

        for (const rec of mapped) {
          const curDow = new Date(year, month - 1, rec.day).getDay()
          const prevDay = rec.day + offset
          const prevDow = new Date(year - 1, month - 1, prevDay).getDay()
          expect(curDow).toBe(prevDow)
        }
      })
    })
  })
})
