/**
 * domain/formatting — formatCurrency / formatManYen / formatPercent / formatPointDiff / formatCustomers / formatTransactionValue tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatManYen,
  formatPercent,
  formatPointDiff,
  formatCustomers,
  formatTransactionValue,
} from '../index'

describe('formatCurrency', () => {
  it('null で "-"', () => {
    expect(formatCurrency(null)).toBe('-')
  })

  it('NaN で "-"', () => {
    expect(formatCurrency(NaN)).toBe('-')
  })

  it('整数はカンマ区切り', () => {
    expect(formatCurrency(1234567)).toBe('1,234,567')
  })

  it('小数は四捨五入', () => {
    expect(formatCurrency(1234.567)).toBe('1,235')
  })

  it('0 は "0"', () => {
    expect(formatCurrency(0)).toBe('0')
  })

  it('負数も対応', () => {
    expect(formatCurrency(-1000)).toBe('-1,000')
  })
})

describe('formatManYen', () => {
  it('null / NaN で "-"', () => {
    expect(formatManYen(null)).toBe('-')
    expect(formatManYen(NaN)).toBe('-')
  })

  it('10000 → "+1万円"', () => {
    expect(formatManYen(10000)).toBe('+1万円')
  })

  it('0 → "0万円"（+ なし）', () => {
    expect(formatManYen(0)).toBe('0万円')
  })

  it('負数で +/- 表示', () => {
    expect(formatManYen(-20000)).toBe('-2万円')
  })
})

describe('formatPercent', () => {
  it('null / NaN で "-"', () => {
    expect(formatPercent(null)).toBe('-')
    expect(formatPercent(NaN)).toBe('-')
  })

  it('0.05 → "5.00%"', () => {
    expect(formatPercent(0.05)).toBe('5.00%')
  })

  it('1.0 → "100.00%"', () => {
    expect(formatPercent(1.0)).toBe('100.00%')
  })

  it('小数桁数を指定できる', () => {
    expect(formatPercent(0.1234, 1)).toBe('12.3%')
    expect(formatPercent(0.1234, 0)).toBe('12%')
  })

  it('負数対応', () => {
    expect(formatPercent(-0.05)).toBe('-5.00%')
  })
})

describe('formatPointDiff', () => {
  it('null / NaN で "-"', () => {
    expect(formatPointDiff(null)).toBe('-')
    expect(formatPointDiff(NaN)).toBe('-')
  })

  it('プラス値は + 付き', () => {
    expect(formatPointDiff(0.05)).toBe('+5.0pt')
  })

  it('マイナス値は - 自動付加', () => {
    expect(formatPointDiff(-0.03)).toBe('-3.0pt')
  })

  it('0 は "0.0pt"', () => {
    expect(formatPointDiff(0)).toBe('0.0pt')
  })
})

describe('formatCustomers', () => {
  it('null / NaN で "-"', () => {
    expect(formatCustomers(null)).toBe('-')
    expect(formatCustomers(NaN)).toBe('-')
  })

  it('人数をカンマ区切り + 人', () => {
    expect(formatCustomers(1234)).toBe('1,234人')
  })

  it('小数は四捨五入', () => {
    expect(formatCustomers(99.7)).toBe('100人')
  })
})

describe('formatTransactionValue', () => {
  it('null / NaN で "-"', () => {
    expect(formatTransactionValue(null)).toBe('-')
    expect(formatTransactionValue(NaN)).toBe('-')
  })

  it('金額をカンマ区切り + 円', () => {
    expect(formatTransactionValue(1234)).toBe('1,234円')
  })

  it('decimals 指定で小数保持', () => {
    expect(formatTransactionValue(1234.56, 2)).toBe('1,234.56円')
  })
})
