import { describe, it, expect } from 'vitest'
import { murmurhash3, hashData } from './hash'

describe('murmurhash3', () => {
  it('should return a 32-bit unsigned integer', () => {
    const result = murmurhash3('hello')
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(0xffffffff)
  })

  it('should be deterministic (same input → same output)', () => {
    expect(murmurhash3('test')).toBe(murmurhash3('test'))
  })

  it('should produce different hashes for different inputs', () => {
    expect(murmurhash3('a')).not.toBe(murmurhash3('b'))
  })

  it('should handle empty string', () => {
    const result = murmurhash3('')
    expect(typeof result).toBe('number')
  })

  it('should use seed parameter', () => {
    expect(murmurhash3('hello', 0)).not.toBe(murmurhash3('hello', 42))
  })

  it('should handle strings not aligned to 4-byte boundary (tail=1)', () => {
    // 'a' length=1, tail=1
    expect(typeof murmurhash3('a')).toBe('number')
  })

  it('should handle strings with tail=2', () => {
    // 'ab' length=2, tail=2
    expect(typeof murmurhash3('ab')).toBe('number')
  })

  it('should handle strings with tail=3', () => {
    // 'abc' length=3, tail=3
    expect(typeof murmurhash3('abc')).toBe('number')
  })

  it('should handle exact 4-byte boundary (no tail)', () => {
    // 'abcd' length=4, tail=0
    expect(typeof murmurhash3('abcd')).toBe('number')
  })
})

describe('hashData', () => {
  it('should hash null to a number', () => {
    expect(typeof hashData(null)).toBe('number')
  })

  it('should hash undefined to a number', () => {
    expect(typeof hashData(undefined)).toBe('number')
  })

  it('should hash numbers', () => {
    expect(hashData(42)).toBe(hashData(42))
    expect(hashData(42)).not.toBe(hashData(43))
  })

  it('should hash strings', () => {
    expect(hashData('hello')).toBe(hashData('hello'))
  })

  it('should hash booleans', () => {
    expect(hashData(true)).not.toBe(hashData(false))
  })

  it('should hash Map deterministically with sorted keys', () => {
    const map1 = new Map([
      ['b', 2],
      ['a', 1],
    ])
    const map2 = new Map([
      ['a', 1],
      ['b', 2],
    ])
    expect(hashData(map1)).toBe(hashData(map2))
  })

  it('should hash Set deterministically', () => {
    const set1 = new Set([3, 1, 2])
    const set2 = new Set([1, 2, 3])
    expect(hashData(set1)).toBe(hashData(set2))
  })

  it('should hash arrays', () => {
    expect(hashData([1, 2, 3])).toBe(hashData([1, 2, 3]))
    expect(hashData([1, 2, 3])).not.toBe(hashData([3, 2, 1]))
  })

  it('should hash objects with sorted keys', () => {
    expect(hashData({ b: 2, a: 1 })).toBe(hashData({ a: 1, b: 2 }))
  })

  it('should handle nested structures', () => {
    const data = { key: [1, new Map([['x', true]])] }
    expect(typeof hashData(data)).toBe('number')
  })
})
