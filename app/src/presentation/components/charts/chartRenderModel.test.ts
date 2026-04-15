// ChartRenderModel — 共通契約 + テストヘルパ unit test
import { describe, it, expect } from 'vitest'
import {
  emptyChartRenderModel,
  expectChartRenderModel,
  type ChartRenderModel,
} from './chartRenderModel'

interface Point {
  readonly x: number
  readonly y: number
}

describe('emptyChartRenderModel', () => {
  it('default: no-data reason で空 points を返す', () => {
    const m = emptyChartRenderModel<Point>()
    expect(m.points).toEqual([])
    expect(m.emptyReason).toBe('no-data')
  })

  it('reason 指定: no-scope / not-ready を透過する', () => {
    expect(emptyChartRenderModel<Point>('no-scope').emptyReason).toBe('no-scope')
    expect(emptyChartRenderModel<Point>('not-ready').emptyReason).toBe('not-ready')
  })
})

describe('expectChartRenderModel', () => {
  const sample: ChartRenderModel<Point> = {
    points: [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ],
    summary: { primary: 60, delta: 5 },
    flags: { hasComparison: true },
    annotations: ['note-1', 'note-2'],
  }

  it('全項目一致: throw しない', () => {
    expect(() =>
      expectChartRenderModel(sample, {
        exactPoints: 3,
        expectSummary: { primary: 60, delta: 5 },
        expectFlags: { hasComparison: true },
        expectAnnotations: ['note-1', 'note-2'],
      }),
    ).not.toThrow()
  })

  it('exactPoints 不一致: throw', () => {
    expect(() => expectChartRenderModel(sample, { exactPoints: 2 })).toThrow()
  })

  it('minPoints 不一致: throw', () => {
    expect(() => expectChartRenderModel(sample, { minPoints: 10 })).toThrow()
  })

  it('maxPoints 不一致: throw', () => {
    expect(() => expectChartRenderModel(sample, { maxPoints: 2 })).toThrow()
  })

  it('summary 部分一致: 指定キーだけチェック、他は無視', () => {
    expect(() => expectChartRenderModel(sample, { expectSummary: { primary: 60 } })).not.toThrow()
    expect(() => expectChartRenderModel(sample, { expectSummary: { primary: 99 } })).toThrow()
  })

  it('flags 部分一致', () => {
    expect(() =>
      expectChartRenderModel(sample, { expectFlags: { hasComparison: true } }),
    ).not.toThrow()
    expect(() => expectChartRenderModel(sample, { expectFlags: { hasGap: true } })).toThrow()
  })

  it('annotations exact 不一致 (長さ違い): throw', () => {
    expect(() => expectChartRenderModel(sample, { expectAnnotations: ['note-1'] })).toThrow()
  })

  it('annotations exact 不一致 (内容違い): throw', () => {
    expect(() =>
      expectChartRenderModel(sample, { expectAnnotations: ['note-1', 'note-9'] }),
    ).toThrow()
  })

  it('emptyReason 一致: empty model の検査に使える', () => {
    const empty = emptyChartRenderModel<Point>('no-scope')
    expect(() =>
      expectChartRenderModel(empty, { exactPoints: 0, emptyReason: 'no-scope' }),
    ).not.toThrow()
    expect(() => expectChartRenderModel(empty, { emptyReason: 'no-data' })).toThrow()
  })

  it('expectations 省略: 任意の model を通す', () => {
    expect(() => expectChartRenderModel(sample)).not.toThrow()
    expect(() => expectChartRenderModel(emptyChartRenderModel<Point>())).not.toThrow()
  })
})
