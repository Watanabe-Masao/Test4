import { describe, it, expect } from 'vitest'
import {
  SIGNAL_COLORS,
  customersBreakdown,
  txValueBreakdown,
  buildCrossMult,
  type SignalLevel,
} from '@/presentation/pages/Dashboard/widgets/conditionSummaryUtils'
import type { StoreResult, CustomCategory } from '@/domain/models/storeTypes'

describe('SIGNAL_COLORS', () => {
  it('has all signal levels', () => {
    const levels: SignalLevel[] = ['blue', 'yellow', 'red', 'warning']
    for (const lv of levels) {
      expect(typeof SIGNAL_COLORS[lv]).toBe('string')
      expect(SIGNAL_COLORS[lv].length).toBeGreaterThan(0)
    }
  })

  it('distinct color per level', () => {
    const values = Object.values(SIGNAL_COLORS)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })
})

describe('customersBreakdown', () => {
  const sr = {} as unknown as StoreResult

  it('formats customer count with thousand separator and 人 suffix', () => {
    expect(customersBreakdown(sr, 1234).value).toBe('1,234人')
  })

  it('returns blue signal', () => {
    expect(customersBreakdown(sr, 100).signal).toBe('blue')
  })

  it('handles zero customers', () => {
    expect(customersBreakdown(sr, 0).value).toBe('0人')
  })
})

describe('txValueBreakdown', () => {
  const mkSr = (tx: number) => ({ transactionValue: tx }) as unknown as StoreResult

  it('formats transactionValue with 円 suffix and no decimals', () => {
    expect(txValueBreakdown(mkSr(1234)).value).toBe('1,234円')
  })

  it('rounds to integer', () => {
    expect(txValueBreakdown(mkSr(1234.56)).value).toBe('1,235円')
  })

  it('returns blue signal', () => {
    expect(txValueBreakdown(mkSr(500)).signal).toBe('blue')
  })
})

describe('buildCrossMult', () => {
  const mkStoreResult = (
    categoryTotals: [string, { cost: number; price: number }][],
    supplierTotals: [string, { supplierCode: string; cost: number; price: number }][] = [],
  ): StoreResult =>
    ({
      categoryTotals: new Map(categoryTotals),
      supplierTotals: new Map(supplierTotals),
    }) as unknown as StoreResult

  it('returns empty array when no categories have data', () => {
    const sr = mkStoreResult([])
    const rows = buildCrossMult(sr, {})
    expect(rows).toEqual([])
  })

  it('skips categories with zero cost and price', () => {
    const sr = mkStoreResult([['market', { cost: 0, price: 0 }]])
    const rows = buildCrossMult(sr, {})
    expect(rows).toEqual([])
  })

  it('includes categories with non-zero values', () => {
    const sr = mkStoreResult([['market', { cost: 80, price: 100 }]])
    const rows = buildCrossMult(sr, {})
    expect(rows).toHaveLength(1)
    expect(rows[0].cost).toBe(80)
    expect(rows[0].price).toBe(100)
    // markupRate = (price - cost) / price = 20/100 = 0.2
    expect(rows[0].markupRate).toBeCloseTo(0.2, 5)
  })

  it('computes priceShare as share of total abs price', () => {
    const sr = mkStoreResult([
      ['market', { cost: 50, price: 100 }],
      ['lfc', { cost: 60, price: 300 }],
    ])
    const rows = buildCrossMult(sr, {})
    expect(rows).toHaveLength(2)
    const totalAbs = 400
    const market = rows.find((r) => r.label === '市場')
    const lfc = rows.find((r) => r.label === 'LFC')
    expect(market?.priceShare).toBeCloseTo(100 / totalAbs, 5)
    expect(lfc?.priceShare).toBeCloseTo(300 / totalAbs, 5)
  })

  it('handles supplier custom categories', () => {
    const sr = mkStoreResult([], [['sup1', { supplierCode: 'sup1', cost: 40, price: 100 }]])
    const supplierMap: Record<string, CustomCategory> = {
      sup1: 'market_purchase' as CustomCategory,
    }
    const rows = buildCrossMult(sr, supplierMap)
    expect(rows.length).toBeGreaterThan(0)
    const market = rows.find((r) => r.label.includes('市場'))
    expect(market?.cost).toBe(40)
    expect(market?.price).toBe(100)
  })

  it('assigns a color string to each row', () => {
    const sr = mkStoreResult([['market', { cost: 50, price: 100 }]])
    const rows = buildCrossMult(sr, {})
    expect(rows[0].color).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
