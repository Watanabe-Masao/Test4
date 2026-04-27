/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  toDateKey,
  categoryLabel,
  categoryColor,
  markupRate,
  buildDailyPivot,
  buildKpi,
} from './purchaseComparisonBuilders'
import type { CategoryComparisonRow } from '@/domain/models/PurchaseComparison'

describe('purchaseComparisonBuilders', () => {
  describe('toDateKey', () => {
    it('formats date as YYYY-MM-DD with zero-padded month and day', () => {
      expect(toDateKey({ year: 2025, month: 3, day: 5 })).toBe('2025-03-05')
      expect(toDateKey({ year: 2025, month: 12, day: 25 })).toBe('2025-12-25')
    })
  })

  describe('categoryLabel', () => {
    it('returns preset label for preset category', () => {
      const userCats = new Map<string, string>()
      expect(categoryLabel('flowers', userCats)).toBe('花')
    })

    it('returns user category name from map', () => {
      const userCats = new Map([['user:abc', '自家製パン']])
      expect(categoryLabel('user:abc' as never, userCats)).toBe('自家製パン')
    })

    it('falls back to stripped id when user category not in map', () => {
      const userCats = new Map<string, string>()
      expect(categoryLabel('user:xyz' as never, userCats)).toBe('xyz')
    })
  })

  describe('categoryColor', () => {
    it('returns specific color for preset category', () => {
      expect(categoryColor('flowers')).toBe('#ec4899')
      expect(categoryColor('market_purchase')).toBe('#f59e0b')
    })

    it('returns teal for user categories', () => {
      expect(categoryColor('user:test' as never)).toBe('#14b8a6')
    })
  })

  describe('markupRate', () => {
    it('calculates markup rate correctly', () => {
      expect(markupRate(700, 1000)).toBeCloseTo(0.3)
    })

    it('returns 0 when price is 0', () => {
      expect(markupRate(100, 0)).toBe(0)
    })
  })

  describe('buildDailyPivot', () => {
    const cat: CategoryComparisonRow = {
      categoryId: 'market_purchase',
      category: '市場仕入',
      color: '#f59e0b',
      currentCost: 1000,
      currentPrice: 1200,
      prevCost: 900,
      prevPrice: 1100,
      costDiff: 100,
      priceDiff: 100,
      costChangeRate: 0.11,
      currentCostShare: 1,
      prevCostShare: 1,
      costShareDiff: 0,
      currentMarkupRate: 0.17,
      prevMarkupRate: 0.18,
      currentPriceShare: 1,
      crossMultiplication: 0.17,
    }

    it('builds pivot with no data', () => {
      const result = buildDailyPivot([], [], [], [], [], [], [cat], {}, 2025, 3)
      expect(result.columns).toHaveLength(1)
      expect(result.columns[0].key).toBe('market_purchase')
      expect(result.rows).toHaveLength(0)
      expect(result.totals.grandCost).toBe(0)
    })

    it('aggregates current period supplier data into correct category', () => {
      const curDaily = [
        {
          storeId: 'S001',
          day: 1,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 500,
          totalPrice: 600,
        },
        {
          storeId: 'S001',
          day: 1,
          supplierCode: 'S002',
          supplierName: 'B',
          totalCost: 300,
          totalPrice: 400,
        },
      ]
      const supplierMap = { S001: 'market_purchase' as const, S002: 'market_purchase' as const }

      const result = buildDailyPivot(curDaily, [], [], [], [], [], [cat], supplierMap, 2025, 3)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].day).toBe(1)
      expect(result.rows[0].totalCost).toBe(800)
      expect(result.rows[0].totalPrice).toBe(1000)
      expect(result.totals.grandCost).toBe(800)
    })

    it('aggregates previous period data separately', () => {
      const prevDaily = [
        {
          storeId: 'S001',
          day: 5,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 400,
          totalPrice: 500,
        },
      ]
      const supplierMap = { S001: 'market_purchase' as const }

      const result = buildDailyPivot([], prevDaily, [], [], [], [], [cat], supplierMap, 2025, 3)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].prevTotalCost).toBe(400)
      expect(result.rows[0].prevTotalPrice).toBe(500)
      expect(result.totals.prevGrandCost).toBe(400)
    })

    it('aligns prev day numbers when dowOffset > 0 (same-weekday mode)', () => {
      // 2026年3月: 日曜始まり, 2025年3月: 土曜始まり → offset=1
      // prev day 2 → current day 1, prev day 3 → current day 2
      const curDaily = [
        {
          storeId: 'S001',
          day: 1,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 100,
          totalPrice: 120,
        },
      ]
      const prevDaily = [
        {
          storeId: 'S001',
          day: 2,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 400,
          totalPrice: 500,
        },
      ]
      const supplierMap = { S001: 'market_purchase' as const }

      const result = buildDailyPivot(
        curDaily,
        prevDaily,
        [],
        [],
        [],
        [],
        [cat],
        supplierMap,
        2026,
        3,
        1, // dowOffset=1
      )
      // prev day 2 should align to current day 1
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].day).toBe(1)
      expect(result.rows[0].totalCost).toBe(100)
      expect(result.rows[0].prevTotalCost).toBe(400)
    })

    it('wraps prev day from next month when dowOffset causes underflow', () => {
      // offset=1, prev day 1 (from April) → current day 31 (March has 31 days)
      const prevDaily = [
        {
          storeId: 'S001',
          day: 1,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 300,
          totalPrice: 350,
        },
      ]
      const supplierMap = { S001: 'market_purchase' as const }

      const result = buildDailyPivot(
        [],
        prevDaily,
        [],
        [],
        [],
        [],
        [cat],
        supplierMap,
        2026,
        3,
        1, // dowOffset=1
      )
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].day).toBe(31) // mapped to last day of March
      expect(result.rows[0].prevTotalCost).toBe(300)
    })

    it('includes special sales in correct category', () => {
      const curSpecial = [
        { storeId: 'S001', day: 2, categoryKey: 'flowers', totalCost: 200, totalPrice: 250 },
      ]
      const flowerCat: CategoryComparisonRow = {
        ...cat,
        categoryId: 'flowers',
        category: '花',
        color: '#ec4899',
      }

      const result = buildDailyPivot([], [], curSpecial, [], [], [], [flowerCat], {}, 2025, 3)
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].totalCost).toBe(200)
    })

    it('includes inter-store transfers (IN + OUT, net value)', () => {
      const curTransfers = [
        { storeId: 'S001', day: 3, categoryKey: 'interStoreIn', totalCost: 150, totalPrice: 180 },
        {
          storeId: 'S001',
          day: 3,
          categoryKey: 'interStoreOut',
          totalCost: -100,
          totalPrice: -120,
        },
      ]
      const storeCat: CategoryComparisonRow = {
        ...cat,
        categoryId: 'inter_store',
        category: '店間移動',
        color: '#8b5cf6',
      }

      const result = buildDailyPivot([], [], [], [], curTransfers, [], [storeCat], {}, 2025, 3)
      expect(result.rows).toHaveLength(1)
      // IN + OUT の両方を含める（purchase-cost-definition.md §4）
      expect(result.rows[0].totalCost).toBe(150 + -100)
    })

    it('computes dayOfWeek correctly', () => {
      // 2025-03-01 is a Saturday (6)
      const curDaily = [
        {
          storeId: 'S001',
          day: 1,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 100,
          totalPrice: 120,
        },
      ]
      const supplierMap = { S001: 'market_purchase' as const }

      const result = buildDailyPivot(curDaily, [], [], [], [], [], [cat], supplierMap, 2025, 3)
      expect(result.rows[0].dayOfWeek).toBe(6) // Saturday
    })

    it('一貫性不変条件: ピボット行合計 = grandTotal', () => {
      const curDaily = [
        {
          storeId: 'S001',
          day: 1,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 500,
          totalPrice: 600,
        },
        {
          storeId: 'S001',
          day: 2,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 300,
          totalPrice: 400,
        },
        {
          storeId: 'S001',
          day: 2,
          supplierCode: 'S002',
          supplierName: 'B',
          totalCost: 200,
          totalPrice: 250,
        },
      ]
      const prevDaily = [
        {
          storeId: 'S001',
          day: 1,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 450,
          totalPrice: 550,
        },
        {
          storeId: 'S001',
          day: 3,
          supplierCode: 'S002',
          supplierName: 'B',
          totalCost: 100,
          totalPrice: 130,
        },
      ]
      const curSpecial = [
        { storeId: 'S001', day: 1, categoryKey: 'flowers', totalCost: 50, totalPrice: 70 },
      ]
      const prevSpecial = [
        { storeId: 'S001', day: 1, categoryKey: 'flowers', totalCost: 40, totalPrice: 60 },
      ]
      const curTransfers = [
        { storeId: 'S001', day: 2, categoryKey: 'interStoreIn', totalCost: 30, totalPrice: 35 },
      ]

      const flowerCat: CategoryComparisonRow = {
        ...cat,
        categoryId: 'flowers',
        category: '花',
        color: '#ec4899',
      }
      const storeCat: CategoryComparisonRow = {
        ...cat,
        categoryId: 'inter_store',
        category: '店間移動',
        color: '#8b5cf6',
      }
      const supplierMap = {
        S001: 'market_purchase' as const,
        S002: 'market_purchase' as const,
      }

      const result = buildDailyPivot(
        curDaily,
        prevDaily,
        curSpecial,
        prevSpecial,
        curTransfers,
        [],
        [cat, flowerCat, storeCat],
        supplierMap,
        2025,
        3,
      )

      // 行合計の合算 = grandTotal
      const rowSumCost = result.rows.reduce((s, r) => s + r.totalCost, 0)
      const rowSumPrice = result.rows.reduce((s, r) => s + r.totalPrice, 0)
      const rowSumPrevCost = result.rows.reduce((s, r) => s + r.prevTotalCost, 0)
      const rowSumPrevPrice = result.rows.reduce((s, r) => s + r.prevTotalPrice, 0)

      expect(rowSumCost).toBe(result.totals.grandCost)
      expect(rowSumPrice).toBe(result.totals.grandPrice)
      expect(rowSumPrevCost).toBe(result.totals.prevGrandCost)
      expect(rowSumPrevPrice).toBe(result.totals.prevGrandPrice)

      // 列合計の合算 = grandTotal
      const colSumCost = Object.values(result.totals.byColumn).reduce((s, c) => s + c.cost, 0)
      const colSumPrice = Object.values(result.totals.byColumn).reduce((s, c) => s + c.price, 0)

      expect(colSumCost).toBe(result.totals.grandCost)
      expect(colSumPrice).toBe(result.totals.grandPrice)
    })

    it('一貫性不変条件: ピボット grandTotal から構築した KPI は同じ値', () => {
      const curDaily = [
        {
          storeId: 'S001',
          day: 1,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 1000,
          totalPrice: 1200,
        },
      ]
      const prevDaily = [
        {
          storeId: 'S001',
          day: 1,
          supplierCode: 'S001',
          supplierName: 'A',
          totalCost: 900,
          totalPrice: 1100,
        },
      ]
      const supplierMap = { S001: 'market_purchase' as const }

      const pivot = buildDailyPivot(
        curDaily,
        prevDaily,
        [],
        [],
        [],
        [],
        [cat],
        supplierMap,
        2025,
        3,
      )

      // ピボット grandTotal から KPI を構築
      const kpi = buildKpi(
        {
          allCurCost: pivot.totals.grandCost,
          allCurPrice: pivot.totals.grandPrice,
          allPrevCost: pivot.totals.prevGrandCost,
          allPrevPrice: pivot.totals.prevGrandPrice,
        },
        5000,
        4500,
      )

      expect(kpi.currentTotalCost).toBe(pivot.totals.grandCost)
      expect(kpi.currentTotalPrice).toBe(pivot.totals.grandPrice)
      expect(kpi.prevTotalCost).toBe(pivot.totals.prevGrandCost)
      expect(kpi.prevTotalPrice).toBe(pivot.totals.prevGrandPrice)
    })
  })
})
