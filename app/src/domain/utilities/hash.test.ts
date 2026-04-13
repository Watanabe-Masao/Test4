import { describe, it, expect } from 'vitest'
import { murmurhash3, hashData } from './hash'

describe('murmurhash3', () => {
  it('produces a non-negative 32-bit integer', () => {
    const hash = murmurhash3('hello')
    expect(Number.isInteger(hash)).toBe(true)
    expect(hash).toBeGreaterThanOrEqual(0)
    expect(hash).toBeLessThan(2 ** 32)
  })

  it('is deterministic for the same input', () => {
    expect(murmurhash3('hello')).toBe(murmurhash3('hello'))
    expect(murmurhash3('foo-bar-baz-123')).toBe(murmurhash3('foo-bar-baz-123'))
  })

  it('produces different hashes for different inputs', () => {
    expect(murmurhash3('a')).not.toBe(murmurhash3('b'))
    expect(murmurhash3('hello')).not.toBe(murmurhash3('world'))
  })

  it('respects seed parameter', () => {
    expect(murmurhash3('hello', 0)).not.toBe(murmurhash3('hello', 1))
  })

  it('handles empty string', () => {
    const hash = murmurhash3('')
    expect(Number.isInteger(hash)).toBe(true)
    expect(hash).toBeGreaterThanOrEqual(0)
  })

  it('handles tail bytes (non-multiple-of-4 length)', () => {
    // Cover all tail lengths (1, 2, 3 chars beyond multiples of 4)
    expect(murmurhash3('a')).not.toBe(murmurhash3('ab'))
    expect(murmurhash3('ab')).not.toBe(murmurhash3('abc'))
    expect(murmurhash3('abcd')).not.toBe(murmurhash3('abcde'))
  })
})

describe('hashData', () => {
  it('is deterministic for primitive values', () => {
    expect(hashData(42)).toBe(hashData(42))
    expect(hashData('hello')).toBe(hashData('hello'))
    expect(hashData(true)).toBe(hashData(true))
    expect(hashData(null)).toBe(hashData(null))
    expect(hashData(undefined)).toBe(hashData(undefined))
  })

  it('distinguishes null from undefined semantically via same token', () => {
    // Both serialize to 'N' — document current behavior
    expect(hashData(null)).toBe(hashData(undefined))
  })

  it('distinguishes number from string with same display', () => {
    expect(hashData(42)).not.toBe(hashData('42'))
  })

  it('distinguishes true from false', () => {
    expect(hashData(true)).not.toBe(hashData(false))
  })

  it('hashes objects with key ordering independence', () => {
    expect(hashData({ a: 1, b: 2 })).toBe(hashData({ b: 2, a: 1 }))
  })

  it('hashes arrays order-dependently', () => {
    expect(hashData([1, 2, 3])).not.toBe(hashData([3, 2, 1]))
  })

  it('hashes Maps with key ordering independence', () => {
    const m1 = new Map([
      ['a', 1],
      ['b', 2],
    ])
    const m2 = new Map([
      ['b', 2],
      ['a', 1],
    ])
    expect(hashData(m1)).toBe(hashData(m2))
  })

  it('hashes Sets with order independence', () => {
    const s1 = new Set([3, 1, 2])
    const s2 = new Set([1, 2, 3])
    expect(hashData(s1)).toBe(hashData(s2))
  })

  it('respects seed for data', () => {
    expect(hashData({ a: 1 }, 0)).not.toBe(hashData({ a: 1 }, 1))
  })

  it('handles nested structures', () => {
    const data = { a: [1, 2, { b: 'x' }], c: new Map([['k', 'v']]) }
    expect(hashData(data)).toBe(hashData(data))
  })
})
