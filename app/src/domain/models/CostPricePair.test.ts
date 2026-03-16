import { describe, it, expect } from 'vitest'
import {
  addCostPricePairs,
  markupRateOf,
  costRateOf,
  markupAmountOf,
  aggregateMarkupRate,
  type CostPricePair,
} from './CostPricePair'

describe('addCostPricePairs', () => {
  it('2つのペアを加算する', () => {
    const a = { cost: 100, price: 130 }
    const b = { cost: 200, price: 260 }
    const result = addCostPricePairs(a, b)

    expect(result.cost).toBe(300)
    expect(result.price).toBe(390)
  })

  it('負の値も正しく加算', () => {
    const a = { cost: 100, price: 130 }
    const b = { cost: -50, price: -30 }
    const result = addCostPricePairs(a, b)

    expect(result.cost).toBe(50)
    expect(result.price).toBe(100)
  })
})

// ── compose 関数の不変条件テスト ──

describe('markupRateOf / costRateOf 不変条件', () => {
  const cases: CostPricePair[] = [
    { cost: 700, price: 1000 },
    { cost: 0, price: 1000 },
    { cost: 1000, price: 1000 },
    { cost: 500, price: 500 },
    { cost: 123, price: 456 },
  ]

  it.each(cases)('markupRate + costRate === 1 (cost=$cost, price=$price)', (pair) => {
    expect(markupRateOf(pair) + costRateOf(pair)).toBeCloseTo(1, 10)
  })

  it.each(cases)('markupRate === (price - cost) / price (cost=$cost, price=$price)', (pair) => {
    expect(markupRateOf(pair)).toBeCloseTo((pair.price - pair.cost) / pair.price, 10)
  })

  it.each(cases)('costRate === cost / price (cost=$cost, price=$price)', (pair) => {
    expect(costRateOf(pair)).toBeCloseTo(pair.cost / pair.price, 10)
  })

  it('price=0 の場合 markupRate と costRate は共に 0', () => {
    const pair = { cost: 100, price: 0 }
    expect(markupRateOf(pair)).toBe(0)
    expect(costRateOf(pair)).toBe(0)
  })
})

describe('markupAmountOf 不変条件', () => {
  it('markupAmount === price - cost', () => {
    const pair = { cost: 700, price: 1000 }
    expect(markupAmountOf(pair)).toBe(300)
  })

  it('markupAmount === markupRate * price（price≠0）', () => {
    const pair = { cost: 700, price: 1000 }
    expect(markupAmountOf(pair)).toBeCloseTo(markupRateOf(pair) * pair.price, 10)
  })
})

describe('aggregateMarkupRate — 加重平均の不変条件', () => {
  it('個別率の単純平均ではなく、額の合算から率を1回計算する', () => {
    const pairs: CostPricePair[] = [
      { cost: 300, price: 500 }, // markupRate = 0.4
      { cost: 900, price: 1000 }, // markupRate = 0.1
    ]

    const aggregated = aggregateMarkupRate(pairs)
    const simpleAverage = (0.4 + 0.1) / 2 // = 0.25（間違った値）

    // 合算: cost=1200, price=1500 → markupRate = 300/1500 = 0.2
    expect(aggregated).toBeCloseTo(0.2, 10)
    expect(aggregated).not.toBeCloseTo(simpleAverage, 5) // 単純平均とは異なる
  })

  it('空配列は ZERO から算出（= 0）', () => {
    expect(aggregateMarkupRate([])).toBe(0)
  })

  it('1要素は markupRateOf と一致', () => {
    const pair = { cost: 700, price: 1000 }
    expect(aggregateMarkupRate([pair])).toBeCloseTo(markupRateOf(pair), 10)
  })
})
