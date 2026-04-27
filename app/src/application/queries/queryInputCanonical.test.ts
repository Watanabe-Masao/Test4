/**
 * Query Input Canonicalization — 単体テスト
 *
 * @invariant INV-RUN-01 Semantic Determinism
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  canonicalizeQueryInput,
  normalizeStoreIds,
  stableDateRangeKey,
} from './queryInputCanonical'

describe('canonicalizeQueryInput', () => {
  it('sorts object keys alphabetically', () => {
    const a = { dateTo: '2025-03-31', dateFrom: '2025-03-01' }
    const b = { dateFrom: '2025-03-01', dateTo: '2025-03-31' }
    expect(JSON.stringify(canonicalizeQueryInput(a))).toBe(
      JSON.stringify(canonicalizeQueryInput(b)),
    )
  })

  it('sorts storeIds array', () => {
    const a = { storeIds: ['3', '1', '2'], dateFrom: '2025-03-01', dateTo: '2025-03-31' }
    const b = { storeIds: ['1', '2', '3'], dateFrom: '2025-03-01', dateTo: '2025-03-31' }
    expect(JSON.stringify(canonicalizeQueryInput(a))).toBe(
      JSON.stringify(canonicalizeQueryInput(b)),
    )
  })

  it('removes undefined fields', () => {
    const a = { dateFrom: '2025-03-01', dateTo: '2025-03-31', storeIds: undefined }
    const b = { dateFrom: '2025-03-01', dateTo: '2025-03-31' }
    expect(JSON.stringify(canonicalizeQueryInput(a))).toBe(
      JSON.stringify(canonicalizeQueryInput(b)),
    )
  })

  it('normalizes empty array to undefined (removed)', () => {
    const a = { dateFrom: '2025-03-01', dateTo: '2025-03-31', storeIds: [] as string[] }
    const b = { dateFrom: '2025-03-01', dateTo: '2025-03-31' }
    expect(JSON.stringify(canonicalizeQueryInput(a))).toBe(
      JSON.stringify(canonicalizeQueryInput(b)),
    )
  })

  it('handles nested objects recursively', () => {
    const a = { outer: { z: 1, a: 2 }, dateFrom: '2025-03-01' }
    const b = { dateFrom: '2025-03-01', outer: { a: 2, z: 1 } }
    expect(JSON.stringify(canonicalizeQueryInput(a))).toBe(
      JSON.stringify(canonicalizeQueryInput(b)),
    )
  })

  it('handles comparison date fields', () => {
    const a = {
      dateTo: '2025-03-31',
      comparisonDateTo: '2024-03-31',
      dateFrom: '2025-03-01',
      comparisonDateFrom: '2024-03-01',
    }
    const result = canonicalizeQueryInput(a)
    const keys = Object.keys(result as Record<string, unknown>)
    expect(keys).toEqual(['comparisonDateFrom', 'comparisonDateTo', 'dateFrom', 'dateTo'])
  })

  it('sorts numeric arrays', () => {
    const a = { dow: [5, 1, 3] }
    const result = canonicalizeQueryInput(a)
    expect((result as { dow: number[] }).dow).toEqual([1, 3, 5])
  })

  it('preserves null values', () => {
    const result = canonicalizeQueryInput(null)
    expect(result).toBeNull()
  })

  it('preserves primitive values', () => {
    expect(canonicalizeQueryInput(42)).toBe(42)
    expect(canonicalizeQueryInput('hello')).toBe('hello')
    expect(canonicalizeQueryInput(true)).toBe(true)
  })

  it('handles arrays of objects without sorting them', () => {
    const input = { items: [{ id: 2 }, { id: 1 }] }
    const result = canonicalizeQueryInput(input)
    const items = (result as { items: { id: number }[] }).items
    expect(items[0].id).toBe(2)
    expect(items[1].id).toBe(1)
  })
})

describe('normalizeStoreIds', () => {
  it('sorts and deduplicates', () => {
    expect(normalizeStoreIds(['3', '1', '2', '1'])).toEqual(['1', '2', '3'])
  })

  it('returns undefined for empty array', () => {
    expect(normalizeStoreIds([])).toBeUndefined()
  })

  it('returns undefined for undefined', () => {
    expect(normalizeStoreIds(undefined)).toBeUndefined()
  })

  it('preserves single element', () => {
    expect(normalizeStoreIds(['S1'])).toEqual(['S1'])
  })
})

describe('stableDateRangeKey', () => {
  it('produces stable key', () => {
    expect(stableDateRangeKey('2025-03-01', '2025-03-31')).toBe('2025-03-01..2025-03-31')
  })
})
