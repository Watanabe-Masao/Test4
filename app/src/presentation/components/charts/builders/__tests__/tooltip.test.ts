/**
 * tooltip.ts — tooltip builder tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  tooltipBase,
  standardTooltip,
  standardLegend,
  currencyTooltip,
  percentTooltip,
  multiSeriesTooltip,
} from '../tooltip'
import { darkTheme } from '@/presentation/theme/theme'

type TooltipParam = {
  seriesName: string
  value: number | null | undefined
  marker: string
  axisValue?: string
  name?: string
}

describe('tooltipBase / standardTooltip', () => {
  it('uses axis trigger and includes blur extraCssText', () => {
    const t = tooltipBase(darkTheme)
    expect(t.trigger).toBe('axis')
    expect(t.borderWidth).toBe(0.5)
    expect(String(t.extraCssText)).toContain('backdrop-filter')
  })

  it('standardTooltip matches tooltipBase (backwards compat alias)', () => {
    expect(standardTooltip(darkTheme)).toEqual(tooltipBase(darkTheme))
  })
})

describe('standardLegend', () => {
  it('puts legend at bottom with theme font styling', () => {
    const l = standardLegend(darkTheme)
    expect(l.bottom).toBe(0)
    expect(l.textStyle.color).toBe(darkTheme.colors.text3)
  })
})

describe('currencyTooltip', () => {
  it('formats value with default yen formatter', () => {
    const t = currencyTooltip(darkTheme, { sales: '売上' })
    const fn = t.formatter as (p: unknown) => string
    const html = fn([
      { seriesName: 'sales', value: 1500, marker: 'M', axisValue: '1日' },
    ] as TooltipParam[])
    expect(html).toContain('1日')
    expect(html).toContain('売上')
    expect(html).toContain('1,500')
    expect(html).toContain('円')
  })

  it('respects custom formatter', () => {
    const t = currencyTooltip(darkTheme, {}, (v) => `[${v}]`)
    const fn = t.formatter as (p: unknown) => string
    const html = fn([{ seriesName: 'x', value: 99, marker: '•', name: 'N' }] as TooltipParam[])
    expect(html).toContain('[99]')
    expect(html).toContain('N')
  })

  it('renders "-" for null value', () => {
    const t = currencyTooltip(darkTheme, {})
    const fn = t.formatter as (p: unknown) => string
    const html = fn([
      { seriesName: 'x', value: null, marker: '•', axisValue: 't' },
    ] as TooltipParam[])
    expect(html).toContain('-')
  })

  it('returns empty string for empty params', () => {
    const t = currencyTooltip(darkTheme, {})
    const fn = t.formatter as (p: unknown) => string
    expect(fn([] as TooltipParam[])).toBe('')
    expect(fn(null)).toBe('')
  })

  it('falls back to seriesName when not in labelMap', () => {
    const t = currencyTooltip(darkTheme, {})
    const fn = t.formatter as (p: unknown) => string
    const html = fn([
      { seriesName: 'foo', value: 1, marker: 'M', axisValue: 'x' },
    ] as TooltipParam[])
    expect(html).toContain('foo')
  })
})

describe('percentTooltip', () => {
  it('formats with default decimals=1', () => {
    const t = percentTooltip(darkTheme, { rate: '率' })
    const fn = t.formatter as (p: unknown) => string
    const html = fn([
      { seriesName: 'rate', value: 12.345, marker: 'M', axisValue: 'd' },
    ] as TooltipParam[])
    expect(html).toContain('率')
    expect(html).toContain('12.3%')
  })

  it('respects custom decimals', () => {
    const t = percentTooltip(darkTheme, {}, 2)
    const fn = t.formatter as (p: unknown) => string
    const html = fn([
      { seriesName: 's', value: 0.1234, marker: 'M', axisValue: 'd' },
    ] as TooltipParam[])
    expect(html).toContain('0.12%')
  })

  it('handles null value as "-"', () => {
    const t = percentTooltip(darkTheme, {})
    const fn = t.formatter as (p: unknown) => string
    const html = fn([
      { seriesName: 's', value: null, marker: 'M', axisValue: 'd' },
    ] as TooltipParam[])
    expect(html).toContain('-')
  })
})

describe('multiSeriesTooltip', () => {
  it('applies per-series custom formatter', () => {
    const t = multiSeriesTooltip(
      darkTheme,
      { a: 'A', b: 'B' },
      (series, value) => `${series}=${value}`,
    )
    const fn = t.formatter as (p: unknown) => string
    const html = fn([
      { seriesName: 'a', value: 1, marker: 'M', axisValue: 'd' },
      { seriesName: 'b', value: 2, marker: 'M' },
    ] as TooltipParam[])
    expect(html).toContain('a=1')
    expect(html).toContain('b=2')
    expect(html).toContain('A')
    expect(html).toContain('B')
  })

  it('returns empty string for empty params', () => {
    const t = multiSeriesTooltip(darkTheme, {}, () => '')
    const fn = t.formatter as (p: unknown) => string
    expect(fn([] as TooltipParam[])).toBe('')
  })
})
