import { describe, it, expect } from 'vitest'
import { murmurhash3, hashData } from '../murmurhash'

describe('murmurhash3', () => {
  it('returns a non-negative 32-bit integer', () => {
    const result = murmurhash3('test')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(0xffffffff)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('returns consistent results for the same input', () => {
    const a = murmurhash3('hello world')
    const b = murmurhash3('hello world')
    expect(a).toBe(b)
  })

  it('returns different results for different inputs', () => {
    const a = murmurhash3('hello')
    const b = murmurhash3('world')
    expect(a).not.toBe(b)
  })

  it('uses seed parameter', () => {
    const a = murmurhash3('test', 0)
    const b = murmurhash3('test', 42)
    expect(a).not.toBe(b)
  })

  it('defaults seed to 0', () => {
    const a = murmurhash3('test')
    const b = murmurhash3('test', 0)
    expect(a).toBe(b)
  })

  it('handles empty string', () => {
    const result = murmurhash3('')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('handles single character', () => {
    const result = murmurhash3('a')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('handles two characters (tail = 2)', () => {
    const result = murmurhash3('ab')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('handles three characters (tail = 3)', () => {
    const result = murmurhash3('abc')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('handles exactly four characters (no tail)', () => {
    const result = murmurhash3('abcd')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('handles five characters (one block + tail=1)', () => {
    const result = murmurhash3('abcde')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('handles long strings', () => {
    const longStr = 'a'.repeat(1000)
    const result = murmurhash3(longStr)
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('handles unicode characters', () => {
    const result = murmurhash3('日本語テスト')
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('produces good distribution (no obvious collisions for simple inputs)', () => {
    const results = new Set<number>()
    for (let i = 0; i < 100; i++) {
      results.add(murmurhash3(`key${i}`))
    }
    // Should have very few collisions for 100 unique inputs
    expect(results.size).toBeGreaterThan(95)
  })
})

describe('hashData', () => {
  it('hashes null', () => {
    const result = hashData(null)
    expect(typeof result).toBe('number')
    expect(result).toBeGreaterThanOrEqual(0)
  })

  it('hashes undefined', () => {
    const result = hashData(undefined)
    expect(typeof result).toBe('number')
  })

  it('hashes numbers', () => {
    const a = hashData(42)
    const b = hashData(43)
    expect(a).not.toBe(b)
  })

  it('hashes strings', () => {
    const a = hashData('hello')
    const b = hashData('world')
    expect(a).not.toBe(b)
  })

  it('hashes booleans', () => {
    const a = hashData(true)
    const b = hashData(false)
    expect(a).not.toBe(b)
  })

  it('hashes arrays', () => {
    const a = hashData([1, 2, 3])
    const b = hashData([1, 2, 4])
    expect(a).not.toBe(b)
  })

  it('hashes objects deterministically (key order independent)', () => {
    const a = hashData({ x: 1, y: 2 })
    const b = hashData({ y: 2, x: 1 })
    expect(a).toBe(b)
  })

  it('hashes Map instances', () => {
    const map = new Map<string, number>([
      ['a', 1],
      ['b', 2],
    ])
    const result = hashData(map)
    expect(typeof result).toBe('number')
  })

  it('hashes Map deterministically regardless of insertion order', () => {
    const map1 = new Map<string, number>([
      ['a', 1],
      ['b', 2],
    ])
    const map2 = new Map<string, number>([
      ['b', 2],
      ['a', 1],
    ])
    expect(hashData(map1)).toBe(hashData(map2))
  })

  it('hashes Set instances', () => {
    const set = new Set([1, 2, 3])
    const result = hashData(set)
    expect(typeof result).toBe('number')
  })

  it('hashes nested structures', () => {
    const data = {
      name: 'test',
      values: [1, 2, 3],
      nested: { a: true, b: null },
    }
    const a = hashData(data)
    const b = hashData(data)
    expect(a).toBe(b)
  })

  it('uses seed parameter', () => {
    const a = hashData('test', 0)
    const b = hashData('test', 99)
    expect(a).not.toBe(b)
  })

  it('produces consistent results across calls', () => {
    const data = { key: 'value', num: 42, arr: [1, 2] }
    const first = hashData(data)
    const second = hashData(data)
    expect(first).toBe(second)
  })

  it('differentiates between similar but different structures', () => {
    const a = hashData({ x: [1, 2] })
    const b = hashData({ x: [2, 1] })
    expect(a).not.toBe(b)
  })
})
