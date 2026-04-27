/**
 * aggregateStoreContributions.test — StoreContribution aggregation helpers
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  aggregateContributions,
  indexContributionsByDay,
  indexContributionsByStore,
} from '../aggregateStoreContributions'
import type { StoreContribution } from '../../comparisonTypes'

const mk = (
  storeId: string,
  mappedDay: number,
  sales: number,
  customers: number,
  discount: number,
  ctsQuantity: number,
): StoreContribution => ({
  storeId,
  originalDay: mappedDay,
  mappedDay,
  sales,
  customers,
  discount,
  ctsQuantity,
})

const SAMPLE: readonly StoreContribution[] = [
  mk('A', 1, 100, 10, 5, 20),
  mk('A', 2, 200, 20, 10, 30),
  mk('B', 1, 300, 15, 7, 25),
  mk('B', 3, 400, 25, 3, 40),
]

describe('aggregateContributions', () => {
  it('sums all entries when no filter is provided', () => {
    expect(aggregateContributions(SAMPLE)).toEqual({
      sales: 1000,
      customers: 70,
      discount: 25,
      ctsQuantity: 115,
      count: 4,
    })
  })

  it('filters by storeId', () => {
    expect(aggregateContributions(SAMPLE, { storeId: 'A' })).toEqual({
      sales: 300,
      customers: 30,
      discount: 15,
      ctsQuantity: 50,
      count: 2,
    })
  })

  it('filters by maxDay inclusive', () => {
    expect(aggregateContributions(SAMPLE, { maxDay: 1 })).toEqual({
      sales: 400,
      customers: 25,
      discount: 12,
      ctsQuantity: 45,
      count: 2,
    })
  })

  it('combines storeId and maxDay filters', () => {
    expect(aggregateContributions(SAMPLE, { storeId: 'B', maxDay: 2 })).toEqual({
      sales: 300,
      customers: 15,
      discount: 7,
      ctsQuantity: 25,
      count: 1,
    })
  })

  it('returns ZERO_AGGREGATE sentinel when nothing matches', () => {
    expect(aggregateContributions(SAMPLE, { storeId: 'missing' })).toEqual({
      sales: 0,
      customers: 0,
      discount: 0,
      ctsQuantity: 0,
      count: 0,
    })
  })

  it('returns ZERO_AGGREGATE on empty input', () => {
    expect(aggregateContributions([])).toEqual({
      sales: 0,
      customers: 0,
      discount: 0,
      ctsQuantity: 0,
      count: 0,
    })
  })
})

describe('indexContributionsByDay', () => {
  it('aggregates every store by day when no storeId is passed', () => {
    const result = indexContributionsByDay(SAMPLE)
    expect(result.get(1)).toEqual({
      sales: 400,
      customers: 25,
      discount: 12,
      ctsQuantity: 45,
      count: 2,
    })
    expect(result.get(2)?.sales).toBe(200)
    expect(result.get(3)?.sales).toBe(400)
  })

  it('filters to a single store when storeId is provided', () => {
    const result = indexContributionsByDay(SAMPLE, 'A')
    expect(result.size).toBe(2)
    expect(result.get(1)?.sales).toBe(100)
    expect(result.get(2)?.sales).toBe(200)
    expect(result.get(3)).toBeUndefined()
  })

  it('returns an empty map for empty input', () => {
    expect(indexContributionsByDay([]).size).toBe(0)
  })
})

describe('indexContributionsByStore', () => {
  it('aggregates contributions keyed by storeId', () => {
    const result = indexContributionsByStore(SAMPLE)
    expect(result.get('A')).toEqual({
      sales: 300,
      customers: 30,
      discount: 15,
      ctsQuantity: 50,
      count: 2,
    })
    expect(result.get('B')?.sales).toBe(700)
    expect(result.get('B')?.count).toBe(2)
  })

  it('honours maxDay filter when aggregating by store', () => {
    const result = indexContributionsByStore(SAMPLE, 1)
    expect(result.get('A')?.sales).toBe(100)
    expect(result.get('B')?.sales).toBe(300)
  })

  it('excludes stores entirely filtered out by maxDay', () => {
    // Only storeId 'B' has a day > 2
    const only = [mk('B', 5, 10, 1, 0, 0)]
    const result = indexContributionsByStore(only, 2)
    expect(result.size).toBe(0)
  })
})
