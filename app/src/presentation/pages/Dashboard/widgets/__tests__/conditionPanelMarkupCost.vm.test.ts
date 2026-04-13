/**
 * conditionPanelMarkupCost.vm — pure helper test
 *
 * 検証対象:
 * - aggregateCostInclusionItems: sr.daily を巡回して itemName で集計、cost 降順
 *
 * builder 関数 (buildMarkupRateDetailVm / buildCostInclusionDetailVm) は
 * resolveThresholds / evaluateSignal / buildCrossMult 等に依存するためここではテストしない。
 */
import { describe, it, expect } from 'vitest'
import { aggregateCostInclusionItems } from '../conditionPanelMarkupCost.vm'
import type { StoreResult } from '@/domain/models/storeTypes'

function makeDaily(items: { itemName: string; cost: number }[]): {
  costInclusion: { items: { itemName: string; cost: number }[] }
} {
  return {
    costInclusion: {
      items,
    },
  }
}

function makeStoreResult(dailyMap: Map<number, ReturnType<typeof makeDaily>>): StoreResult {
  return { daily: dailyMap } as unknown as StoreResult
}

describe('aggregateCostInclusionItems', () => {
  it('returns empty array when daily map is empty', () => {
    const sr = makeStoreResult(new Map())
    expect(aggregateCostInclusionItems(sr)).toEqual([])
  })

  it('aggregates single item across multiple days', () => {
    const daily = new Map()
    daily.set(1, makeDaily([{ itemName: 'レジ袋', cost: 100 }]))
    daily.set(2, makeDaily([{ itemName: 'レジ袋', cost: 250 }]))
    const result = aggregateCostInclusionItems(makeStoreResult(daily))
    expect(result).toEqual([{ itemName: 'レジ袋', cost: 350 }])
  })

  it('aggregates multiple distinct items and sorts by cost descending', () => {
    const daily = new Map()
    daily.set(
      1,
      makeDaily([
        { itemName: 'A', cost: 100 },
        { itemName: 'B', cost: 500 },
      ]),
    )
    daily.set(
      2,
      makeDaily([
        { itemName: 'C', cost: 200 },
        { itemName: 'A', cost: 50 },
      ]),
    )
    const result = aggregateCostInclusionItems(makeStoreResult(daily))
    expect(result).toEqual(
      [
        { itemName: 'B', cost: 500 },
        { itemName: 'A', cost: 150 },
        { itemName: 'C', cost: 200 },
      ].sort((a, b) => b.cost - a.cost),
    )
    // Explicit order check
    expect(result.map((r) => r.itemName)).toEqual(['B', 'C', 'A'])
  })

  it('handles day with empty items array', () => {
    const daily = new Map()
    daily.set(1, makeDaily([]))
    daily.set(2, makeDaily([{ itemName: 'X', cost: 42 }]))
    const result = aggregateCostInclusionItems(makeStoreResult(daily))
    expect(result).toEqual([{ itemName: 'X', cost: 42 }])
  })

  it('sums zero costs correctly', () => {
    const daily = new Map()
    daily.set(1, makeDaily([{ itemName: 'Z', cost: 0 }]))
    daily.set(2, makeDaily([{ itemName: 'Z', cost: 0 }]))
    const result = aggregateCostInclusionItems(makeStoreResult(daily))
    expect(result).toEqual([{ itemName: 'Z', cost: 0 }])
  })
})
