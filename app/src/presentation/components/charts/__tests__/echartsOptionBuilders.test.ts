/**
 * echartsOptionBuilders.ts — formatter tests
 */
import { describe, it, expect } from 'vitest'
import { toAxisManYen, toCommaYen } from '../echartsOptionBuilders'

describe('toAxisManYen', () => {
  it('formats tens of thousands of yen as 万', () => {
    expect(toAxisManYen(10000)).toBe('1万')
    expect(toAxisManYen(50000)).toBe('5万')
    expect(toAxisManYen(123456)).toBe('12万')
  })

  it('rounds to nearest', () => {
    expect(toAxisManYen(14999)).toBe('1万')
    expect(toAxisManYen(15000)).toBe('2万')
  })

  it('handles zero', () => {
    expect(toAxisManYen(0)).toBe('0万')
  })

  it('handles negative values', () => {
    expect(toAxisManYen(-20000)).toBe('-2万')
  })
})

describe('toCommaYen', () => {
  it('formats with comma separators and 円 suffix', () => {
    expect(toCommaYen(1500)).toBe('1,500円')
    expect(toCommaYen(1234567)).toBe('1,234,567円')
  })

  it('handles zero', () => {
    expect(toCommaYen(0)).toBe('0円')
  })

  it('rounds non-integer values', () => {
    expect(toCommaYen(1500.7)).toBe('1,501円')
  })

  it('handles negative values', () => {
    expect(toCommaYen(-100)).toBe('-100円')
  })
})
