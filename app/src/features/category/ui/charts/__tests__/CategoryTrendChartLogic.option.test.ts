/**
 * Tests for CategoryTrendChartLogic.buildCategoryTrendOption
 *
 * Note: buildCategoryTrendData / buildPrevYearTrendData are covered by
 * categoryChartLogicBatch.test.ts. This file targets the ECharts option builder.
 */
import { describe, it, expect } from 'vitest'
import {
  buildCategoryTrendOption,
  PREV_YEAR_SUFFIX,
  type CategoryInfo,
} from '../CategoryTrendChartLogic'
import { lightTheme } from '@/presentation/theme/theme'

const cat = (code: string, name: string, total = 0): CategoryInfo => ({
  code,
  name,
  totalAmount: total,
})

describe('buildCategoryTrendOption', () => {
  it('returns an option whose series length equals categories.length when no prev year', () => {
    const chartData = [
      { date: '04-01', a: 100, b: 50 },
      { date: '04-02', a: 200, b: 80 },
    ]
    const categories = [cat('a', 'A', 300), cat('b', 'B', 130)]
    const option = buildCategoryTrendOption(chartData, categories, lightTheme)
    expect(Array.isArray(option.series)).toBe(true)
    expect((option.series as unknown[]).length).toBe(2)
  })

  it('appends prev-year series when prevYearData is provided and non-empty', () => {
    const chartData = [{ date: '04-01', a: 100 }]
    const categories = [cat('a', 'A', 100)]
    const prevYearData = new Map<string, Record<string, number>>([['04-01', { a: 80 }]])
    const option = buildCategoryTrendOption(chartData, categories, lightTheme, prevYearData)
    const series = option.series as { name: string }[]
    // 1 current + 1 prev
    expect(series).toHaveLength(2)
    expect(series[0].name).toBe('A')
    expect(series[1].name).toBe(`A${PREV_YEAR_SUFFIX}`)
  })

  it('does not append prev series when prevYearData is empty Map', () => {
    const chartData = [{ date: '04-01', a: 100 }]
    const categories = [cat('a', 'A', 100)]
    const option = buildCategoryTrendOption(chartData, categories, lightTheme, new Map())
    const series = option.series as unknown[]
    expect(series).toHaveLength(1)
  })

  it('uses isQuantity flag to switch yAxis name to "点数"', () => {
    const option = buildCategoryTrendOption(
      [{ date: '04-01', a: 10 }],
      [cat('a', 'A', 10)],
      lightTheme,
      undefined,
      true,
    )
    const yAxis = option.yAxis as { name?: string }
    expect(yAxis.name).toBe('点数')
  })

  it('exposes dates from chartData on the xAxis data array', () => {
    const chartData = [
      { date: '04-01', a: 1 },
      { date: '04-15', a: 2 },
      { date: '04-30', a: 3 },
    ]
    const option = buildCategoryTrendOption(chartData, [cat('a', 'A', 6)], lightTheme)
    const xAxis = option.xAxis as { data?: readonly string[] }
    expect(xAxis.data).toEqual(['04-01', '04-15', '04-30'])
  })

  it('handles empty chartData and categories', () => {
    const option = buildCategoryTrendOption([], [], lightTheme)
    const series = option.series as unknown[]
    expect(series).toHaveLength(0)
    const xAxis = option.xAxis as { data?: readonly string[] }
    expect(xAxis.data).toEqual([])
  })
})
