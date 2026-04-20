/**
 * trendAnalysisWasm — analyzeTrendWasm empty-input fast-path tests
 *
 * WASM 未初期化環境では getTrendAnalysisWasmExports()! が失敗するため、
 * 空配列の fast-path のみ検証する。
 */
import { describe, it, expect } from 'vitest'
import { analyzeTrendWasm } from '../trendAnalysisWasm'

describe('analyzeTrendWasm (empty fast path)', () => {
  it('空配列で dataPoints=[] / averageMonthlySales=0', () => {
    const r = analyzeTrendWasm([])
    expect(r.dataPoints).toEqual([])
    expect(r.averageMonthlySales).toBe(0)
  })

  it("空入力で overallTrend='flat'", () => {
    const r = analyzeTrendWasm([])
    expect(r.overallTrend).toBe('flat')
  })

  it('seasonalIndex は 12 要素全て 1（fast-path）', () => {
    const r = analyzeTrendWasm([])
    expect(r.seasonalIndex).toHaveLength(12)
    expect(r.seasonalIndex.every((v) => v === 1)).toBe(true)
  })

  it('momChanges / yoyChanges は空配列', () => {
    const r = analyzeTrendWasm([])
    expect(r.momChanges).toEqual([])
    expect(r.yoyChanges).toEqual([])
  })

  it('movingAvg3 / movingAvg6 は空配列', () => {
    const r = analyzeTrendWasm([])
    expect(r.movingAvg3).toEqual([])
    expect(r.movingAvg6).toEqual([])
  })
})
