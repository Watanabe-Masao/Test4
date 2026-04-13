/**
 * purchaseComparisonKpi.ts — pure helper test
 *
 * 検証対象:
 * - toDateKey: 日付 → YYYY-MM-DD (zero pad)
 * - categoryLabel: preset / user / unknown fallback
 * - categoryColor: preset / user / unknown fallback
 * - markupRate: price>0 のみ / price=0 は 0
 * - buildKpi: 各 diff / rate の計算
 * - buildStoreData: 両期間の store id 和集合 + markup + 降順ソート
 * - groupCategoryRows: categoryKey ごとの cost/price 集約
 */
import { describe, it, expect } from 'vitest'
import {
  toDateKey,
  categoryLabel,
  categoryColor,
  markupRate,
  buildKpi,
  buildStoreData,
  groupCategoryRows,
} from '../purchaseComparisonKpi'
import type { CustomCategoryId } from '@/domain/constants/customCategories'

// ─── toDateKey ───────────────────────────────────────

describe('toDateKey', () => {
  it('2桁 zero pad', () => {
    expect(toDateKey({ year: 2026, month: 4, day: 5 })).toBe('2026-04-05')
  })

  it('2桁月日は pad しない', () => {
    expect(toDateKey({ year: 2026, month: 12, day: 31 })).toBe('2026-12-31')
  })
})

// ─── categoryLabel ───────────────────────────────────

describe('categoryLabel', () => {
  it('preset category → 定義済み label', () => {
    const result = categoryLabel('market_purchase' as CustomCategoryId, new Map())
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('user category → userCategories から解決', () => {
    const map = new Map([['user:abc', '独自カテゴリA']])
    expect(categoryLabel('user:abc' as CustomCategoryId, map)).toBe('独自カテゴリA')
  })

  it('user category 未登録 → "user:" prefix を除去', () => {
    expect(categoryLabel('user:xyz' as CustomCategoryId, new Map())).toBe('xyz')
  })
})

// ─── categoryColor ───────────────────────────────────

describe('categoryColor', () => {
  it('preset category → 定義された色', () => {
    expect(categoryColor('market_purchase' as CustomCategoryId)).toBe('#f59e0b')
  })

  it('user category → default user color', () => {
    const result = categoryColor('user:xyz' as CustomCategoryId)
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^#/)
  })
})

// ─── markupRate ──────────────────────────────────────

describe('markupRate', () => {
  it('price>0: 1 - cost/price', () => {
    expect(markupRate(60, 100)).toBeCloseTo(0.4, 5)
  })

  it('price=0: 0 を返す', () => {
    expect(markupRate(100, 0)).toBe(0)
  })

  it('cost=0 && price>0: 1 を返す', () => {
    expect(markupRate(0, 100)).toBe(1)
  })

  it('cost > price: 負の値 (赤字)', () => {
    expect(markupRate(120, 100)).toBeCloseTo(-0.2, 5)
  })
})

// ─── buildKpi ────────────────────────────────────────

describe('buildKpi', () => {
  const totals = {
    allCurCost: 600,
    allCurPrice: 1000,
    allPrevCost: 500,
    allPrevPrice: 900,
  }

  it('currentTotal* / prevTotal* を伝搬', () => {
    const result = buildKpi(totals, 1500, 1200)
    expect(result.currentTotalCost).toBe(600)
    expect(result.currentTotalPrice).toBe(1000)
    expect(result.prevTotalCost).toBe(500)
    expect(result.prevTotalPrice).toBe(900)
  })

  it('totalCostDiff = curCost - prevCost', () => {
    const result = buildKpi(totals, 1500, 1200)
    expect(result.totalCostDiff).toBe(100)
  })

  it('totalCostChangeRate = diff / prev', () => {
    const result = buildKpi(totals, 1500, 1200)
    expect(result.totalCostChangeRate).toBeCloseTo(100 / 500, 5)
  })

  it('prevCost=0 → changeRate=0', () => {
    const result = buildKpi({ ...totals, allPrevCost: 0 }, 1500, 1200)
    expect(result.totalCostChangeRate).toBe(0)
  })

  it('markupRate 差分を算出', () => {
    const result = buildKpi(totals, 1500, 1200)
    // cur: 1 - 600/1000 = 0.4
    // prev: 1 - 500/900 ≈ 0.4444
    expect(result.currentMarkupRate).toBeCloseTo(0.4, 3)
    expect(result.prevMarkupRate).toBeCloseTo(1 - 500 / 900, 3)
  })

  it('currentCostToSalesRatio / prevCostToSalesRatio', () => {
    const result = buildKpi(totals, 1500, 1200)
    expect(result.currentCostToSalesRatio).toBeCloseTo(600 / 1500, 5)
    expect(result.prevCostToSalesRatio).toBeCloseTo(500 / 1200, 5)
  })

  it('curSales=0 → costToSalesRatio=0', () => {
    const result = buildKpi(totals, 0, 1200)
    expect(result.currentCostToSalesRatio).toBe(0)
  })
})

// ─── buildStoreData ──────────────────────────────────

describe('buildStoreData', () => {
  it('両期間の store id 和集合を構築', () => {
    const cur = [
      { storeId: 's1', totalCost: 100, totalPrice: 200 },
      { storeId: 's2', totalCost: 50, totalPrice: 100 },
    ]
    const prev = [
      { storeId: 's1', totalCost: 80, totalPrice: 180 },
      { storeId: 's3', totalCost: 30, totalPrice: 70 },
    ]
    const names = new Map([
      ['s1', 'Store One'],
      ['s2', 'Store Two'],
      ['s3', 'Store Three'],
    ])
    const result = buildStoreData(cur, prev, names)
    expect(result).toHaveLength(3)
    const ids = result.map((r) => r.storeId).sort()
    expect(ids).toEqual(['s1', 's2', 's3'])
  })

  it('store 名を解決する', () => {
    const cur = [{ storeId: 's1', totalCost: 100, totalPrice: 200 }]
    const names = new Map([['s1', 'Store One']])
    const result = buildStoreData(cur, [], names)
    expect(result[0].storeName).toBe('Store One')
  })

  it('store 名が無い場合は storeId をそのまま使う', () => {
    const cur = [{ storeId: 'unknown', totalCost: 100, totalPrice: 200 }]
    const result = buildStoreData(cur, [], new Map())
    expect(result[0].storeName).toBe('unknown')
  })

  it('currentCost 降順でソート', () => {
    const cur = [
      { storeId: 's1', totalCost: 50, totalPrice: 100 },
      { storeId: 's2', totalCost: 200, totalPrice: 400 },
      { storeId: 's3', totalCost: 100, totalPrice: 200 },
    ]
    const result = buildStoreData(cur, [], new Map())
    expect(result.map((r) => r.currentCost)).toEqual([200, 100, 50])
  })

  it('missing prev: prevCost=0, costDiff = cur', () => {
    const cur = [{ storeId: 's1', totalCost: 100, totalPrice: 200 }]
    const result = buildStoreData(cur, [], new Map())
    expect(result[0].prevCost).toBe(0)
    expect(result[0].costDiff).toBe(100)
  })

  it('markup rate を各店舗に設定', () => {
    const cur = [{ storeId: 's1', totalCost: 60, totalPrice: 100 }]
    const result = buildStoreData(cur, [], new Map())
    expect(result[0].currentMarkupRate).toBeCloseTo(0.4, 3)
  })
})

// ─── groupCategoryRows ───────────────────────────────

describe('groupCategoryRows', () => {
  it('同一 key を cost/price で合算', () => {
    const rows = [
      { categoryKey: 'A', cost: 100, price: 200 },
      { categoryKey: 'A', cost: 50, price: 100 },
      { categoryKey: 'B', cost: 30, price: 60 },
    ]
    const result = groupCategoryRows(rows)
    expect(result.get('A')).toEqual({ cost: 150, price: 300 })
    expect(result.get('B')).toEqual({ cost: 30, price: 60 })
  })

  it('空配列 → 空 Map', () => {
    expect(groupCategoryRows([]).size).toBe(0)
  })

  it('単一 row → そのまま Map に', () => {
    const rows = [{ categoryKey: 'X', cost: 10, price: 20 }]
    const result = groupCategoryRows(rows)
    expect(result.size).toBe(1)
    expect(result.get('X')).toEqual({ cost: 10, price: 20 })
  })
})
