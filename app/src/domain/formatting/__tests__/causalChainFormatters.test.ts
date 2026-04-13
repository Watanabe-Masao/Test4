/**
 * causalChainFormatters のユニットテスト
 *
 * fmtPct / fmtComma / fmtYen / fmtDelta / findMaxFactorIndex の動作を検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  fmtPct,
  fmtComma,
  fmtYen,
  fmtDelta,
  findMaxFactorIndex,
  type CausalFactor,
} from '@/domain/formatting/causalChainFormatters'

const mkFactor = (label: string, value: number): CausalFactor => ({
  label,
  value,
  formatted: String(value),
  colorHint: 'primary',
})

describe('fmtPct', () => {
  it('デフォルトで小数2位のパーセント表示', () => {
    expect(fmtPct(0.1234)).toBe('12.34%')
  })

  it('decimals 引数で桁数を変更できる', () => {
    expect(fmtPct(0.12345, 3)).toBe('12.345%')
  })

  it('0 は 0.00%', () => {
    expect(fmtPct(0)).toBe('0.00%')
  })

  it('negative 値を処理する', () => {
    expect(fmtPct(-0.05)).toBe('-5.00%')
  })
})

describe('fmtComma', () => {
  it('3桁区切りでフォーマット', () => {
    expect(fmtComma(1234567)).toBe('1,234,567')
  })

  it('0 を処理する', () => {
    expect(fmtComma(0)).toBe('0')
  })

  it('小数は四捨五入する', () => {
    expect(fmtComma(1000.6)).toBe('1,001')
  })
})

describe('fmtYen', () => {
  it('正の値に + 符号を付与', () => {
    expect(fmtYen(1000)).toBe('+1,000円')
  })

  it('負の値は符号なし（既にマイナス）', () => {
    expect(fmtYen(-500)).toBe('-500円')
  })

  it('0 は + 符号付き', () => {
    expect(fmtYen(0)).toBe('+0円')
  })
})

describe('fmtDelta', () => {
  it('正の値に + を付ける', () => {
    expect(fmtDelta(0.1)).toBe('+10.00%')
  })

  it('負の値は符号なし', () => {
    expect(fmtDelta(-0.1)).toBe('-10.00%')
  })

  it('0 は + 符号付き', () => {
    expect(fmtDelta(0)).toBe('+0.00%')
  })
})

describe('findMaxFactorIndex', () => {
  it('最大値のインデックスを返す', () => {
    const factors = [mkFactor('a', 10), mkFactor('b', 30), mkFactor('c', 20)]
    expect(findMaxFactorIndex(factors)).toBe(1)
  })

  it('要素が空なら 0 を返す', () => {
    expect(findMaxFactorIndex([])).toBe(0)
  })

  it('最初の要素が最大のとき 0', () => {
    const factors = [mkFactor('a', 50), mkFactor('b', 30)]
    expect(findMaxFactorIndex(factors)).toBe(0)
  })

  it('最後の要素が最大のとき最後のインデックス', () => {
    const factors = [mkFactor('a', 1), mkFactor('b', 2), mkFactor('c', 3)]
    expect(findMaxFactorIndex(factors)).toBe(2)
  })

  it('同値なら先に現れた方を返す（strict >）', () => {
    const factors = [mkFactor('a', 5), mkFactor('b', 5)]
    expect(findMaxFactorIndex(factors)).toBe(0)
  })

  it('単一要素でも正しく動作', () => {
    expect(findMaxFactorIndex([mkFactor('a', 42)])).toBe(0)
  })
})
