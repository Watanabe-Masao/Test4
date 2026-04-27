/**
 * WeatherSummarySection — pure formatter tests
 *
 * 検証対象:
 * - fmt(n): 小数第1位まで固定
 * - diffStr(cur, prev): 当期 − 前期の差分を + sign 付きで整形
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { fmt, diffStr } from '../WeatherSummarySection'

describe('fmt', () => {
  it('整数は .0 付きで返す', () => {
    expect(fmt(25)).toBe('25.0')
  })

  it('小数第2位以降は丸める', () => {
    expect(fmt(25.678)).toBe('25.7')
  })

  it('負の値', () => {
    expect(fmt(-3.5)).toBe('-3.5')
  })

  it('0', () => {
    expect(fmt(0)).toBe('0.0')
  })
})

describe('diffStr', () => {
  it('正の差は + 付き', () => {
    expect(diffStr(25, 20)).toBe('+5.0')
  })

  it('0 の差は +0.0', () => {
    expect(diffStr(10, 10)).toBe('+0.0')
  })

  it('負の差は sign なし（fixed が - を付ける）', () => {
    expect(diffStr(15, 20)).toBe('-5.0')
  })

  it('小数の差分も 1 桁精度で整形', () => {
    expect(diffStr(10.7, 10.3)).toBe('+0.4')
  })

  it('大きな負差', () => {
    expect(diffStr(0, 100)).toBe('-100.0')
  })
})
