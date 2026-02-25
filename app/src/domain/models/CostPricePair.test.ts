import { describe, it, expect } from 'vitest'
import { addCostPricePairs } from './CostPricePair'

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
