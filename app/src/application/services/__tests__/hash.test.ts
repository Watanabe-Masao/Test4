/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { murmurhash3, hashData } from '@/domain/utilities/hash'

describe('murmurhash3', () => {
  it('returns consistent hash for same input', () => {
    expect(murmurhash3('hello')).toBe(murmurhash3('hello'))
  })

  it('returns different hash for different input', () => {
    expect(murmurhash3('hello')).not.toBe(murmurhash3('world'))
  })

  it('returns 0 or positive number', () => {
    expect(murmurhash3('test')).toBeGreaterThanOrEqual(0)
  })

  it('handles empty string', () => {
    const h = murmurhash3('')
    expect(typeof h).toBe('number')
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('handles single character', () => {
    const h = murmurhash3('a')
    expect(typeof h).toBe('number')
  })

  it('handles string length not divisible by 4 (tail handling)', () => {
    // tail=1
    const h1 = murmurhash3('a')
    // tail=2
    const h2 = murmurhash3('ab')
    // tail=3
    const h3 = murmurhash3('abc')
    // tail=0
    const h4 = murmurhash3('abcd')
    expect(h1).not.toBe(h2)
    expect(h2).not.toBe(h3)
    expect(h3).not.toBe(h4)
  })

  it('handles long strings', () => {
    const long = 'a'.repeat(10000)
    const h = murmurhash3(long)
    expect(typeof h).toBe('number')
    expect(h).toBeGreaterThanOrEqual(0)
  })

  it('uses seed parameter', () => {
    const h1 = murmurhash3('test', 0)
    const h2 = murmurhash3('test', 42)
    expect(h1).not.toBe(h2)
  })

  it('handles unicode strings', () => {
    const h = murmurhash3('日本語テスト')
    expect(typeof h).toBe('number')
    expect(h).toBeGreaterThanOrEqual(0)
  })
})

describe('hashData', () => {
  it('hashes null and undefined', () => {
    const h1 = hashData(null)
    const h2 = hashData(undefined)
    expect(h1).toBe(h2) // both serialize to 'N'
  })

  it('hashes numbers', () => {
    const h1 = hashData(42)
    const h2 = hashData(43)
    expect(h1).not.toBe(h2)
  })

  it('hashes strings', () => {
    const h1 = hashData('hello')
    const h2 = hashData('world')
    expect(h1).not.toBe(h2)
  })

  it('hashes booleans', () => {
    const h1 = hashData(true)
    const h2 = hashData(false)
    expect(h1).not.toBe(h2)
  })

  it('hashes arrays', () => {
    const h1 = hashData([1, 2, 3])
    const h2 = hashData([3, 2, 1])
    expect(h1).not.toBe(h2)
  })

  it('hashes objects deterministically (key order independent)', () => {
    const h1 = hashData({ a: 1, b: 2 })
    const h2 = hashData({ b: 2, a: 1 })
    expect(h1).toBe(h2)
  })

  it('hashes Maps', () => {
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

  it('hashes Sets', () => {
    const s1 = new Set([1, 2, 3])
    const h = hashData(s1)
    expect(typeof h).toBe('number')
  })

  it('hashes nested structures', () => {
    const data = { a: [1, { b: new Map([['c', true]]) }] }
    const h = hashData(data)
    expect(typeof h).toBe('number')
  })

  it('uses seed parameter', () => {
    const h1 = hashData('test', 0)
    const h2 = hashData('test', 42)
    expect(h1).not.toBe(h2)
  })

  it('different objects produce different hashes', () => {
    const h1 = hashData({ x: 1 })
    const h2 = hashData({ x: 2 })
    expect(h1).not.toBe(h2)
  })

  it('empty containers hash differently', () => {
    const hArr = hashData([])
    const hObj = hashData({})
    const hMap = hashData(new Map())
    const hSet = hashData(new Set())
    // At least some of these should differ
    const hashes = new Set([hArr, hObj, hMap, hSet])
    expect(hashes.size).toBeGreaterThan(1)
  })
})
