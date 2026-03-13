import { describe, it, expect } from 'vitest'
import { buildSourceDataIndex, type SourceMonthContext } from '../sourceDataIndex'
import type { ClassifiedSalesDaySummary } from '@/domain/models/ClassifiedSales'
import { ZERO_DISCOUNT_ENTRIES } from '@/domain/models/ClassifiedSales'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models'

// ── ヘルパー ──

function makeSummary(sales: number): ClassifiedSalesDaySummary {
  return { sales, discount: 0, discountEntries: ZERO_DISCOUNT_ENTRIES }
}

function makeFlower(
  storeId: string,
  year: number,
  month: number,
  day: number,
  customers: number,
): SpecialSalesDayEntry {
  return { storeId, year, month, day, price: 0, cost: 0, customers }
}

// ── SourceDataIndex ──

describe('buildSourceDataIndex', () => {
  // allAgg: 2025年2月（28日間）をベース、3月1日がリナンバリング day=29
  const allAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
    S1: {
      1: makeSummary(100), // 2025/2/1
      15: makeSummary(1500), // 2025/2/15
      28: makeSummary(2800), // 2025/2/28
      29: makeSummary(2900), // 2025/3/1 (リナンバリング: 28+1)
      30: makeSummary(3000), // 2025/3/2 (リナンバリング: 28+2)
      0: makeSummary(3100), // 2025/1/31 (リナンバリング: 31-31=0)
      '-1': makeSummary(3000), // 2025/1/30 (リナンバリング: 30-31=-1)
    },
  }

  const ctx: SourceMonthContext = { year: 2025, month: 2, daysInMonth: 28 }

  const flowersIndex: StoreDayIndex<SpecialSalesDayEntry> = {
    S1: {
      1: makeFlower('S1', 2025, 2, 1, 10),
      15: makeFlower('S1', 2025, 2, 15, 50),
      28: makeFlower('S1', 2025, 2, 28, 80),
    },
  }

  const idx = buildSourceDataIndex(allAgg, flowersIndex, ctx)

  // ── getSummary ──

  describe('getSummary', () => {
    it('同月ルックアップ: day がそのまま使われる', () => {
      expect(idx.getSummary('S1', { year: 2025, month: 2, day: 1 })).toEqual(makeSummary(100))
      expect(idx.getSummary('S1', { year: 2025, month: 2, day: 15 })).toEqual(makeSummary(1500))
      expect(idx.getSummary('S1', { year: 2025, month: 2, day: 28 })).toEqual(makeSummary(2800))
    })

    it('翌月オーバーフロー: daysInMonth + day に変換される', () => {
      // 2025/3/1 → 28+1=29
      expect(idx.getSummary('S1', { year: 2025, month: 3, day: 1 })).toEqual(makeSummary(2900))
      // 2025/3/2 → 28+2=30
      expect(idx.getSummary('S1', { year: 2025, month: 3, day: 2 })).toEqual(makeSummary(3000))
    })

    it('前月アンダーフロー: day - daysInPrevMonth に変換される', () => {
      // 2025/1/31 → 31 - 31 = 0
      expect(idx.getSummary('S1', { year: 2025, month: 1, day: 31 })).toEqual(makeSummary(3100))
      // 2025/1/30 → 30 - 31 = -1
      expect(idx.getSummary('S1', { year: 2025, month: 1, day: 30 })).toEqual(makeSummary(3000))
    })

    it('存在しない storeId は undefined を返す', () => {
      expect(idx.getSummary('UNKNOWN', { year: 2025, month: 2, day: 1 })).toBeUndefined()
    })

    it('存在しない日は undefined を返す', () => {
      expect(idx.getSummary('S1', { year: 2025, month: 2, day: 20 })).toBeUndefined()
    })
  })

  // ── getFlowers ──

  describe('getFlowers', () => {
    it('同月なら flowersIndex から取得', () => {
      const flower = idx.getFlowers('S1', { year: 2025, month: 2, day: 15 })
      expect(flower).toBeDefined()
      expect(flower!.customers).toBe(50)
    })

    it('月跨ぎ（翌月）は undefined を返す', () => {
      // flowersIndex はリナンバリング非対応なので月跨ぎは undefined
      expect(idx.getFlowers('S1', { year: 2025, month: 3, day: 1 })).toBeUndefined()
    })

    it('月跨ぎ（前月）は undefined を返す', () => {
      expect(idx.getFlowers('S1', { year: 2025, month: 1, day: 31 })).toBeUndefined()
    })

    it('存在しない storeId は undefined を返す', () => {
      expect(idx.getFlowers('UNKNOWN', { year: 2025, month: 2, day: 1 })).toBeUndefined()
    })

    it('flowersIndex が undefined の場合は常に undefined', () => {
      const idxNoFlowers = buildSourceDataIndex(allAgg, undefined, ctx)
      expect(idxNoFlowers.getFlowers('S1', { year: 2025, month: 2, day: 1 })).toBeUndefined()
    })
  })

  // ── storeIds ──

  describe('storeIds', () => {
    it('allAgg のキーと一致する', () => {
      expect(idx.storeIds).toEqual(['S1'])
    })

    it('複数店舗の場合は全て含む', () => {
      const multiAgg = {
        S1: { 1: makeSummary(100) },
        S2: { 1: makeSummary(200) },
        S3: { 1: makeSummary(300) },
      }
      const multiIdx = buildSourceDataIndex(multiAgg, undefined, ctx)
      expect(multiIdx.storeIds).toEqual(['S1', 'S2', 'S3'])
    })
  })

  // ── 年跨ぎのエッジケース ──

  describe('年跨ぎ（12月→1月）', () => {
    const decAgg: Record<string, Record<number, ClassifiedSalesDaySummary>> = {
      S1: {
        31: makeSummary(5000), // 12/31
        32: makeSummary(6000), // 1/1 (リナンバリング: 31+1)
      },
    }
    const decCtx: SourceMonthContext = { year: 2025, month: 12, daysInMonth: 31 }
    const decIdx = buildSourceDataIndex(decAgg, undefined, decCtx)

    it('翌月が翌年1月の場合も正しく変換', () => {
      // 2026/1/1 → 31+1=32
      expect(decIdx.getSummary('S1', { year: 2026, month: 1, day: 1 })).toEqual(makeSummary(6000))
    })

    it('同月12月はそのまま', () => {
      expect(decIdx.getSummary('S1', { year: 2025, month: 12, day: 31 })).toEqual(makeSummary(5000))
    })
  })
})
