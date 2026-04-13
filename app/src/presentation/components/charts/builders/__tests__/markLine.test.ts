/**
 * markLine.ts — markLine builder tests
 */
import { describe, it, expect } from 'vitest'
import { zeroBaseline, budgetLine, thresholdLine } from '../markLine'
import { darkTheme } from '@/presentation/theme/theme'

describe('zeroBaseline', () => {
  it('builds silent horizontal line at y=0', () => {
    const ml = zeroBaseline(darkTheme)
    expect(ml.silent).toBe(true)
    expect(ml.symbol).toBe('none')
    expect(ml.data).toHaveLength(1)
    expect(ml.data[0]).toEqual({ yAxis: 0 })
  })

  it('uses border color with low opacity', () => {
    const ml = zeroBaseline(darkTheme)
    expect((ml.lineStyle as { color: string }).color).toBe(darkTheme.colors.border)
    expect((ml.lineStyle as { opacity: number }).opacity).toBe(0.5)
    expect((ml.lineStyle as { type: string }).type).toBe('solid')
  })

  it('hides label', () => {
    const ml = zeroBaseline(darkTheme)
    expect((ml.label as { show: boolean }).show).toBe(false)
  })
})

describe('budgetLine', () => {
  it('builds dashed line at the budget value', () => {
    const ml = budgetLine(darkTheme, 1500)
    expect(ml.silent).toBe(true)
    expect(ml.data[0]).toEqual({ yAxis: 1500 })
    expect((ml.lineStyle as { type: string }).type).toBe('dashed')
    expect((ml.lineStyle as { color: string }).color).toBe(darkTheme.chart.budget)
  })

  it('hides label when no label provided', () => {
    const ml = budgetLine(darkTheme, 100)
    expect((ml.label as { show: boolean }).show).toBe(false)
  })

  it('shows label when provided', () => {
    const ml = budgetLine(darkTheme, 200, '予算')
    const label = ml.label as { formatter: string; position: string }
    expect(label.formatter).toBe('予算')
    expect(label.position).toBe('end')
  })
})

describe('thresholdLine', () => {
  it('defaults to yAxis when axis not provided', () => {
    const ml = thresholdLine(darkTheme, 50, { label: 'warn', color: '#f00' })
    expect(ml.data[0]).toEqual({ yAxis: 50 })
    expect((ml.lineStyle as { color: string }).color).toBe('#f00')
    expect((ml.lineStyle as { type: string }).type).toBe('dashed')
  })

  it('uses xAxis when specified', () => {
    const ml = thresholdLine(darkTheme, 10, { label: 't', color: '#00f', axis: 'xAxis' })
    expect(ml.data[0]).toEqual({ xAxis: 10 })
  })

  it('formatter label matches provided label', () => {
    const ml = thresholdLine(darkTheme, 0, { label: '閾値', color: '#0f0' })
    const label = ml.label as { formatter: string; position: string }
    expect(label.formatter).toBe('閾値')
    expect(label.position).toBe('end')
  })
})
