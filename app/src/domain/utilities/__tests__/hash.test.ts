import { describe, it, expect } from 'vitest'
import { murmurhash3, hashData } from '@/domain/utilities/hash'

describe('murmurhash3', () => {
  it('returns unsigned 32-bit integer', () => {
    const h = murmurhash3('hello')
    expect(Number.isInteger(h)).toBe(true)
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThanOrEqual(0xffffffff)
  })

  it('is deterministic for the same input', () => {
    expect(murmurhash3('abc')).toBe(murmurhash3('abc'))
  })

  it('returns different hashes for different inputs', () => {
    expect(murmurhash3('abc')).not.toBe(murmurhash3('abd'))
  })

  it('respects the seed', () => {
    expect(murmurhash3('abc', 0)).not.toBe(murmurhash3('abc', 1))
  })

  it('handles empty string', () => {
    const h = murmurhash3('')
    expect(Number.isInteger(h)).toBe(true)
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('handles tail bytes for non-multiple-of-4 lengths', () => {
    // Cover tail = 1, 2, 3
    expect(murmurhash3('a')).toBeGreaterThanOrEqual(0)
    expect(murmurhash3('ab')).toBeGreaterThanOrEqual(0)
    expect(murmurhash3('abc')).toBeGreaterThanOrEqual(0)
    expect(murmurhash3('abcd')).toBeGreaterThanOrEqual(0)
    expect(murmurhash3('abcde')).toBeGreaterThanOrEqual(0)
  })
})

describe('hashData', () => {
  it('returns same hash for equal primitives', () => {
    expect(hashData(42)).toBe(hashData(42))
    expect(hashData('hello')).toBe(hashData('hello'))
    expect(hashData(true)).toBe(hashData(true))
    expect(hashData(null)).toBe(hashData(null))
    expect(hashData(undefined)).toBe(hashData(undefined))
  })

  it('distinguishes null/undefined from falsy primitives', () => {
    // Both null and undefined serialize to 'N', so they hash equal; but they differ from 0/false/''.
    expect(hashData(null)).toBe(hashData(undefined))
    expect(hashData(0)).not.toBe(hashData(null))
    expect(hashData(false)).not.toBe(hashData(null))
    expect(hashData('')).not.toBe(hashData(null))
  })

  it('distinguishes numbers and strings with same text', () => {
    expect(hashData(42)).not.toBe(hashData('42'))
  })

  it('hashes arrays stably', () => {
    expect(hashData([1, 2, 3])).toBe(hashData([1, 2, 3]))
    expect(hashData([1, 2, 3])).not.toBe(hashData([3, 2, 1]))
  })

  it('hashes objects independent of key order', () => {
    expect(hashData({ a: 1, b: 2 })).toBe(hashData({ b: 2, a: 1 }))
  })

  it('hashes Maps independent of insertion order', () => {
    const m1 = new Map<string, number>([
      ['a', 1],
      ['b', 2],
    ])
    const m2 = new Map<string, number>([
      ['b', 2],
      ['a', 1],
    ])
    expect(hashData(m1)).toBe(hashData(m2))
  })

  it('hashes Sets independent of insertion order', () => {
    const s1 = new Set([1, 2, 3])
    const s2 = new Set([3, 2, 1])
    expect(hashData(s1)).toBe(hashData(s2))
  })

  it('distinguishes different nested structures', () => {
    expect(hashData({ a: [1, 2] })).not.toBe(hashData({ a: [2, 1] }))
  })

  it('respects custom seed', () => {
    expect(hashData('abc', 0)).not.toBe(hashData('abc', 99))
  })
})
