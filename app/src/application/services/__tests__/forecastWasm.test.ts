/**
 * forecastWasm — fast-path tests
 *
 * WASM 未初期化環境では wasm export access が失敗するため、
 * 早期 return する fast-path のみ検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  detectAnomaliesWasm,
  calculateWMAWasm,
  linearRegressionWasm,
  analyzeTrendWasm,
} from '../forecastWasm'

describe('detectAnomaliesWasm (fast path)', () => {
  it('entries < 3 で空配列', () => {
    expect(detectAnomaliesWasm(new Map())).toEqual([])
    expect(detectAnomaliesWasm(new Map([[1, 100]]))).toEqual([])
    expect(
      detectAnomaliesWasm(
        new Map([
          [1, 100],
          [2, 200],
        ]),
      ),
    ).toEqual([])
  })

  it('sales <= 0 のみなら空配列', () => {
    const daily = new Map([
      [1, 0],
      [2, 0],
      [3, 0],
    ])
    expect(detectAnomaliesWasm(daily)).toEqual([])
  })
})

describe('calculateWMAWasm (fast path)', () => {
  it('空 Map で空配列', () => {
    expect(calculateWMAWasm(new Map())).toEqual([])
  })

  it('sales=0 のみなら空配列（filter）', () => {
    expect(
      calculateWMAWasm(
        new Map([
          [1, 0],
          [2, 0],
        ]),
      ),
    ).toEqual([])
  })
})

describe('linearRegressionWasm (fast path)', () => {
  it('entries < 2 で zero result', () => {
    const r = linearRegressionWasm(new Map())
    expect(r).toEqual({ slope: 0, intercept: 0, rSquared: 0 })
  })

  it('sales>0 が 1 件でも zero result', () => {
    const r = linearRegressionWasm(new Map([[1, 100]]))
    expect(r).toEqual({ slope: 0, intercept: 0, rSquared: 0 })
  })
})

describe('analyzeTrendWasm (empty fast path)', () => {
  it('空配列で flat trend / averageMonthlySales=0', () => {
    const r = analyzeTrendWasm([])
    expect(r.overallTrend).toBe('flat')
    expect(r.averageMonthlySales).toBe(0)
    expect(r.dataPoints).toEqual([])
  })

  it('seasonalIndex は 12 要素全て 1', () => {
    const r = analyzeTrendWasm([])
    expect(r.seasonalIndex).toHaveLength(12)
    expect(r.seasonalIndex.every((v) => v === 1)).toBe(true)
  })
})
