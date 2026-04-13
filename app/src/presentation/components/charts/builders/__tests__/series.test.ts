/**
 * series.ts — series preset builder tests
 */
import { describe, it, expect } from 'vitest'
import {
  verticalGradient,
  barDefaults,
  horizontalBarDefaults,
  lineDefaults,
  areaDefaults,
} from '../series'

describe('verticalGradient', () => {
  it('builds a top→bottom linear gradient', () => {
    const g = verticalGradient('#ff0000', '#00ff00')
    expect(g.type).toBe('linear')
    expect(g.x).toBe(0)
    expect(g.y).toBe(0)
    expect(g.x2).toBe(0)
    expect(g.y2).toBe(1)
    expect(g.colorStops).toHaveLength(2)
    expect(g.colorStops?.[0]).toEqual({ offset: 0, color: '#ff0000' })
    expect(g.colorStops?.[1]).toEqual({ offset: 1, color: '#00ff00' })
  })
})

describe('barDefaults', () => {
  it('returns gradient fill by default', () => {
    const b = barDefaults({ color: '#123456' })
    const color = b.itemStyle.color as { type: string }
    expect(color.type).toBe('linear')
    expect(b.itemStyle.borderRadius).toHaveLength(4)
    expect(typeof b.barMaxWidth).toBe('number')
  })

  it('uses flat color when gradient=false', () => {
    const b = barDefaults({ color: '#abcdef', gradient: false })
    expect(b.itemStyle.color).toBe('#abcdef')
  })

  it('respects custom opacity', () => {
    const b = barDefaults({ color: '#000000', opacity: 0.42 })
    expect(b.itemStyle.opacity).toBe(0.42)
  })
})

describe('horizontalBarDefaults', () => {
  it('always uses gradient fill', () => {
    const b = horizontalBarDefaults({ color: '#123456' })
    const color = b.itemStyle.color as { type: string }
    expect(color.type).toBe('linear')
  })

  it('uses default opacity when not provided', () => {
    const b = horizontalBarDefaults({ color: '#111' })
    expect(typeof b.itemStyle.opacity).toBe('number')
    expect(b.itemStyle.opacity).toBeGreaterThan(0)
  })

  it('respects custom opacity', () => {
    const b = horizontalBarDefaults({ color: '#222', opacity: 0.77 })
    expect(b.itemStyle.opacity).toBe(0.77)
  })
})

describe('lineDefaults', () => {
  it('builds solid line by default, smooth=true', () => {
    const l = lineDefaults({ color: '#123456' })
    expect(l.lineStyle.color).toBe('#123456')
    expect(l.lineStyle.type).toBe('solid')
    expect(l.itemStyle.color).toBe('#123456')
    expect(l.symbol).toBe('none')
    expect(l.smooth).toBe(true)
  })

  it('applies dashed when requested', () => {
    const l = lineDefaults({ color: '#fff', dashed: true })
    expect(l.lineStyle.type).toBe('dashed')
  })

  it('respects custom width and smooth=false', () => {
    const l = lineDefaults({ color: '#000', width: 4, smooth: false })
    expect(l.lineStyle.width).toBe(4)
    expect(l.smooth).toBe(false)
  })
})

describe('areaDefaults', () => {
  it('builds area with gradient fill', () => {
    const a = areaDefaults({ color: '#112233' })
    expect(a.lineStyle.color).toBe('#112233')
    expect(a.itemStyle.color).toBe('#112233')
    expect(a.areaStyle.color.type).toBe('linear')
    expect(a.symbol).toBe('none')
    expect(a.smooth).toBe(true)
  })

  it('gradient stops alpha-encoded based on opacity', () => {
    const a = areaDefaults({ color: '#112233' })
    // top color should include hex-alpha suffix (non-00)
    const stops = a.areaStyle.color.colorStops ?? []
    expect(stops.length).toBe(2)
    expect(stops[0]?.color).toMatch(/^#112233[0-9a-f]{2}$/)
    expect(stops[1]?.color).toBe('#11223300')
  })

  it('subtle variant uses different opacity than default', () => {
    const normal = areaDefaults({ color: '#abcdef' })
    const subtle = areaDefaults({ color: '#abcdef', subtle: true })
    expect(normal.areaStyle.color.colorStops?.[0]?.color).not.toEqual(
      subtle.areaStyle.color.colorStops?.[0]?.color,
    )
  })
})
