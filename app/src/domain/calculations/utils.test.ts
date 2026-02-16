import { describe, it, expect } from 'vitest'
import {
  safeNumber,
  safeDivide,
  formatCurrency,
  formatManYen,
  formatPercent,
  formatPointDiff,
} from './utils'

describe('safeNumber', () => {
  it('数値はそのまま', () => expect(safeNumber(42)).toBe(42))
  it('文字列の数値を変換', () => expect(safeNumber('123')).toBe(123))
  it('nullは0', () => expect(safeNumber(null)).toBe(0))
  it('undefinedは0', () => expect(safeNumber(undefined)).toBe(0))
  it('NaN文字列は0', () => expect(safeNumber('abc')).toBe(0))
  it('0は0', () => expect(safeNumber(0)).toBe(0))
  it('負の数', () => expect(safeNumber(-5)).toBe(-5))
  it('小数', () => expect(safeNumber(3.14)).toBe(3.14))
})

describe('safeDivide', () => {
  it('正常な除算', () => expect(safeDivide(10, 5)).toBe(2))
  it('ゼロ除算はフォールバック', () => expect(safeDivide(10, 0)).toBe(0))
  it('カスタムフォールバック', () => expect(safeDivide(10, 0, -1)).toBe(-1))
  it('0 / 0', () => expect(safeDivide(0, 0)).toBe(0))
  it('負の除算', () => expect(safeDivide(-10, 2)).toBe(-5))
})

describe('formatCurrency', () => {
  it('通常の金額', () => expect(formatCurrency(1234567)).toBe('1,234,567'))
  it('四捨五入', () => expect(formatCurrency(1234567.6)).toBe('1,234,568'))
  it('nullはハイフン', () => expect(formatCurrency(null)).toBe('-'))
  it('NaNはハイフン', () => expect(formatCurrency(NaN)).toBe('-'))
  it('0', () => expect(formatCurrency(0)).toBe('0'))
  it('負の値', () => expect(formatCurrency(-500000)).toBe('-500,000'))
})

describe('formatManYen', () => {
  it('プラス値', () => expect(formatManYen(1230000)).toBe('+123万円'))
  it('マイナス値', () => expect(formatManYen(-500000)).toBe('-50万円'))
  it('nullはハイフン', () => expect(formatManYen(null)).toBe('-'))
  it('ゼロ', () => expect(formatManYen(0)).toBe('0万円'))
})

describe('formatPercent', () => {
  it('通常の率', () => expect(formatPercent(0.2534)).toBe('25.34%'))
  it('小数1桁', () => expect(formatPercent(0.2534, 1)).toBe('25.3%'))
  it('nullはハイフン', () => expect(formatPercent(null)).toBe('-'))
  it('0%', () => expect(formatPercent(0)).toBe('0.00%'))
})

describe('formatPointDiff', () => {
  it('プラス差', () => expect(formatPointDiff(0.015)).toBe('+1.5pt'))
  it('マイナス差', () => expect(formatPointDiff(-0.02)).toBe('-2.0pt'))
  it('nullはハイフン', () => expect(formatPointDiff(null)).toBe('-'))
  it('ゼロ', () => expect(formatPointDiff(0)).toBe('0.0pt'))
})
