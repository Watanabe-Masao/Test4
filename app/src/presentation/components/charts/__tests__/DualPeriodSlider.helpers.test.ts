/**
 * DualPeriodSlider — pure math helpers
 *
 * 検証対象（座標変換ユーティリティ）:
 * - pxToDay: pixel 位置 → day 値（連続値）
 * - dayToPct: day 値 → % 位置
 * - clamp: 値を [lo, hi] に押し込む
 */
import { describe, it, expect } from 'vitest'
import { pxToDay, dayToPct, clamp } from '../DualPeriodSlider'

describe('pxToDay', () => {
  it('trackWidth=0 で min を返す（division-by-zero ガード）', () => {
    expect(pxToDay(50, 0, 1, 31)).toBe(1)
  })

  it('trackWidth<=0 で min を返す（負値も保護）', () => {
    expect(pxToDay(50, -100, 1, 31)).toBe(1)
  })

  it('px=0 は min', () => {
    expect(pxToDay(0, 100, 1, 31)).toBe(1)
  })

  it('px=trackWidth は max', () => {
    expect(pxToDay(100, 100, 1, 31)).toBe(31)
  })

  it('中央（px=50%）で min と max の中間値', () => {
    expect(pxToDay(50, 100, 1, 31)).toBe(16)
  })

  it('min=max で常に min', () => {
    expect(pxToDay(50, 100, 5, 5)).toBe(5)
  })

  it('px 範囲外（負）でも線形外挿する', () => {
    expect(pxToDay(-10, 100, 1, 31)).toBeLessThan(1)
  })
})

describe('dayToPct', () => {
  it('min=max で 0（division-by-zero ガード）', () => {
    expect(dayToPct(5, 5, 5)).toBe(0)
  })

  it('day=min で 0%', () => {
    expect(dayToPct(1, 1, 31)).toBe(0)
  })

  it('day=max で 100%', () => {
    expect(dayToPct(31, 1, 31)).toBe(100)
  })

  it('中央で 50%', () => {
    expect(dayToPct(16, 1, 31)).toBe(50)
  })

  it('day が範囲外でも線形外挿', () => {
    expect(dayToPct(0, 1, 31)).toBeCloseTo(-(100 / 30), 10)
    expect(dayToPct(32, 1, 31)).toBeCloseTo(100 + 100 / 30, 10)
  })
})

describe('clamp', () => {
  it('範囲内の値はそのまま', () => {
    expect(clamp(5, 1, 10)).toBe(5)
  })

  it('lo 未満は lo にクランプ', () => {
    expect(clamp(-5, 1, 10)).toBe(1)
  })

  it('hi 超過は hi にクランプ', () => {
    expect(clamp(15, 1, 10)).toBe(10)
  })

  it('境界値は変えない', () => {
    expect(clamp(1, 1, 10)).toBe(1)
    expect(clamp(10, 1, 10)).toBe(10)
  })

  it('lo=hi で常にその値', () => {
    expect(clamp(5, 3, 3)).toBe(3)
    expect(clamp(2, 3, 3)).toBe(3)
  })

  it('小数値もクランプされる', () => {
    expect(clamp(3.7, 1, 3.5)).toBe(3.5)
  })
})
