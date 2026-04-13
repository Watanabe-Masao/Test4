/**
 * axis.ts — axis builder tests
 */
import { describe, it, expect } from 'vitest'
import { valueYAxis, categoryXAxis, percentYAxis, yenYAxis } from '../axis'
import { darkTheme } from '@/presentation/theme/theme'

describe('valueYAxis', () => {
  it('builds value axis with defaults', () => {
    const y = valueYAxis(darkTheme)
    expect(y.type).toBe('value')
    expect(y.position).toBe('left')
    expect(y.axisLine).toEqual({ show: false })
    expect(y.axisTick).toEqual({ show: false })
    // showSplitLine default true → object with lineStyle
    expect(y.splitLine).toBeTruthy()
    expect((y.splitLine as { show?: boolean }).show).toBeUndefined()
  })

  it('accepts formatter and applies to axisLabel', () => {
    const fmt = (v: number) => `${v}万`
    const y = valueYAxis(darkTheme, { formatter: fmt })
    const label = y.axisLabel as { formatter?: (v: number) => string }
    expect(label.formatter).toBe(fmt)
    expect(label.formatter?.(3)).toBe('3万')
  })

  it('respects position=right', () => {
    const y = valueYAxis(darkTheme, { position: 'right' })
    expect(y.position).toBe('right')
  })

  it('disables splitLine when showSplitLine=false', () => {
    const y = valueYAxis(darkTheme, { showSplitLine: false })
    expect(y.splitLine).toEqual({ show: false })
  })

  it('includes min/max/interval when provided', () => {
    const y = valueYAxis(darkTheme, { min: 0, max: 100, interval: 10 })
    expect(y.min).toBe(0)
    expect(y.max).toBe(100)
    expect((y as unknown as { interval?: number }).interval).toBe(10)
  })

  it('omits interval key when undefined', () => {
    const y = valueYAxis(darkTheme)
    expect('interval' in y).toBe(false)
  })
})

describe('categoryXAxis', () => {
  it('builds category axis with given data', () => {
    const data = ['A', 'B', 'C']
    const x = categoryXAxis(data, darkTheme) as unknown as { type: string; data: string[] }
    expect(x.type).toBe('category')
    expect(x.data).toEqual(['A', 'B', 'C'])
  })

  it('preserves empty data', () => {
    const x = categoryXAxis([], darkTheme) as unknown as { data: string[] }
    expect(x.data).toEqual([])
  })
})

describe('percentYAxis', () => {
  it('formats values as percent', () => {
    const y = percentYAxis(darkTheme)
    const label = y.axisLabel as { formatter?: (v: number) => string }
    expect(label.formatter?.(25)).toBe('25%')
  })

  it('respects position option', () => {
    const y = percentYAxis(darkTheme, { position: 'right' })
    expect(y.position).toBe('right')
  })
})

describe('yenYAxis', () => {
  it('formats values as 万 (ten thousand yen)', () => {
    const y = yenYAxis(darkTheme)
    const label = y.axisLabel as { formatter?: (v: number) => string }
    expect(label.formatter?.(10000)).toBe('1万')
    expect(label.formatter?.(50000)).toBe('5万')
    expect(label.formatter?.(0)).toBe('0万')
  })
})
