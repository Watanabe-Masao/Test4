import { describe, it, expect } from 'vitest'
import { ZERO_COST_PRICE_PAIR, addCostPricePairs } from './CostPricePair'

describe('ZERO_COST_PRICE_PAIR', () => {
  it('cost と price が 0', () => {
    expect(ZERO_COST_PRICE_PAIR.cost).toBe(0)
    expect(ZERO_COST_PRICE_PAIR.price).toBe(0)
  })
})

describe('addCostPricePairs', () => {
  it('2つのペアを加算する', () => {
    const a = { cost: 100, price: 130 }
    const b = { cost: 200, price: 260 }
    const result = addCostPricePairs(a, b)

    expect(result.cost).toBe(300)
    expect(result.price).toBe(390)
  })

  it('ゼロとの加算は元の値', () => {
    const a = { cost: 500, price: 650 }
    const result = addCostPricePairs(a, ZERO_COST_PRICE_PAIR)

    expect(result.cost).toBe(500)
    expect(result.price).toBe(650)
  })

  it('負の値も正しく加算', () => {
    const a = { cost: 100, price: 130 }
    const b = { cost: -50, price: -30 }
    const result = addCostPricePairs(a, b)

    expect(result.cost).toBe(50)
    expect(result.price).toBe(100)
  })

  it('新しいオブジェクトが返される（不変性）', () => {
    const a = { cost: 100, price: 130 }
    const b = { cost: 200, price: 260 }
    const result = addCostPricePairs(a, b)

    expect(result).not.toBe(a)
    expect(result).not.toBe(b)
  })
})
