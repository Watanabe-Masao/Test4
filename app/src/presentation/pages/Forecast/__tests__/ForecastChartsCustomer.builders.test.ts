/**
 * ForecastChartsCustomer.builders.ts — pure ECharts option builders test
 *
 * 検証対象:
 * - yenValueAxis: position='left' / 'right' 分岐 + label 反映
 * - tooltipFormatter: 空 items / header / rows の生成
 * - buildDowCustomerOption: hasPrev 分岐で 比較期客数 series 追加
 * - buildMovingAvgOption: hasPrev 分岐で 比較期MA series 追加
 * - buildRelationshipOption: viewMode='current'/'prev'/'compare' 分岐
 * - buildCustomerSalesOption: 3 series (売上 bar + 客数 line + 客単価 line)
 * - buildSameDowOption: 4 series (今年 bar/line + 前年 bar/line)
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  yenValueAxis,
  tooltipFormatter,
  buildDowCustomerOption,
  buildMovingAvgOption,
  buildRelationshipOption,
  buildCustomerSalesOption,
  buildSameDowOption,
} from '../ForecastChartsCustomer.builders'
import { darkTheme } from '@/presentation/theme/theme'

const theme = darkTheme

// ─── yenValueAxis ─────────────────────────────────────

describe('yenValueAxis', () => {
  it('default position は left', () => {
    const axis = yenValueAxis(theme) as { position: string }
    expect(axis.position).toBe('left')
  })

  it("position='right' を反映", () => {
    const axis = yenValueAxis(theme, { position: 'right' }) as {
      position: string
      splitLine: { show?: boolean }
    }
    expect(axis.position).toBe('right')
    // right 側は splitLine 非表示
    expect(axis.splitLine.show).toBe(false)
  })

  it('label prop を name に反映', () => {
    const axis = yenValueAxis(theme, { label: '売上' }) as { name?: string }
    expect(axis.name).toBe('売上')
  })
})

// ─── tooltipFormatter ────────────────────────────────

describe('tooltipFormatter', () => {
  it('空配列は空文字列', () => {
    expect(tooltipFormatter([])).toBe('')
  })

  it('非 array は空文字列', () => {
    expect(tooltipFormatter(null as unknown as [])).toBe('')
  })

  it('items の name を header に入れる', () => {
    const html = tooltipFormatter([{ seriesName: '売上', value: 1000, color: '#f00', name: '1日' }])
    expect(html).toContain('1日')
    expect(html).toContain('売上')
  })

  it('複数 items から複数 row を生成', () => {
    const html = tooltipFormatter([
      { seriesName: '売上', value: 1000, color: '#f00', name: '1日' },
      { seriesName: '客数', value: 50, color: '#0f0', name: '1日' },
    ])
    expect(html).toContain('売上')
    expect(html).toContain('客数')
  })
})

// ─── buildDowCustomerOption ──────────────────────────

describe('buildDowCustomerOption', () => {
  it('hasPrev=false: 今年客数 + 今年客単価 + その他 series', () => {
    const data = [{ name: '月', color: '#f00', 今年客数: 100, 今年客単価: 500 }]
    const option = buildDowCustomerOption(data, false, theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('今年客数')
    expect(names).toContain('今年客単価')
    // hasPrev=false: 比較期客数 は含まれない
    expect(names).not.toContain('比較期客数')
  })

  it('hasPrev=true: 比較期客数 / 比較期客単価 series を追加', () => {
    const data = [
      {
        name: '月',
        color: '#f00',
        今年客数: 100,
        今年客単価: 500,
        比較期客数: 80,
        比較期客単価: 450,
      },
    ]
    const option = buildDowCustomerOption(data, true, theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('比較期客数')
  })

  it('xAxis に data.name を入れる', () => {
    const data = [
      { name: '月', color: '#f00', 今年客数: 100, 今年客単価: 500 },
      { name: '火', color: '#0f0', 今年客数: 120, 今年客単価: 550 },
    ]
    const option = buildDowCustomerOption(data, false, theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data).toEqual(['月', '火'])
  })
})

// ─── buildMovingAvgOption ────────────────────────────

describe('buildMovingAvgOption', () => {
  it('hasPrev=false: 客数MA + 客単価MA の 2 series', () => {
    const data = [{ day: '1', 客数MA: 100, 客単価MA: 500 }]
    const option = buildMovingAvgOption(data, false, theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('客数MA')
    expect(names).toContain('客単価MA')
    expect(series.length).toBe(2)
  })

  it('hasPrev=true: 比較期客数MA / 比較期客単価MA を追加 (4 series)', () => {
    const data = [{ day: '1', 客数MA: 100, 客単価MA: 500, 比較期客数MA: 80, 比較期客単価MA: 450 }]
    const option = buildMovingAvgOption(data, true, theme)
    const series = option.series as { name: string }[]
    expect(series.length).toBe(4)
    const names = series.map((s) => s.name)
    expect(names).toContain('比較期客数MA')
    expect(names).toContain('比較期客単価MA')
  })

  it('yAxis が 2 本 (左右両方)', () => {
    const option = buildMovingAvgOption([], false, theme)
    const yAxis = option.yAxis as { position: string }[]
    expect(yAxis.length).toBe(2)
    expect(yAxis[0].position).toBe('left')
    expect(yAxis[1].position).toBe('right')
  })
})

// ─── buildRelationshipOption ─────────────────────────

describe('buildRelationshipOption', () => {
  const data = [
    {
      day: '1',
      売上指数: 100,
      客数指数: 100,
      客単価指数: 100,
      比較期売上指数: 95,
      比較期客数指数: 95,
      比較期客単価指数: 100,
    },
  ]

  it("viewMode='current': 今年 3 指数のみ", () => {
    const option = buildRelationshipOption(data, 'current', theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('売上指数')
    expect(names).toContain('客数指数')
    expect(names).toContain('客単価指数')
    expect(names).not.toContain('比較期売上指数')
  })

  it("viewMode='prev': 比較期 3 指数のみ", () => {
    const option = buildRelationshipOption(data, 'prev', theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('比較期売上指数')
    expect(names).not.toContain('売上指数')
  })

  it("viewMode='compare': 今年 + 比較期 6 系列", () => {
    const option = buildRelationshipOption(data, 'compare', theme)
    const series = option.series as { name: string }[]
    expect(series.length).toBe(6)
  })

  it('xAxis に day を入れる', () => {
    const option = buildRelationshipOption(data, 'current', theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data).toEqual(['1'])
  })
})

// ─── buildCustomerSalesOption ────────────────────────

describe('buildCustomerSalesOption', () => {
  it('3 series (売上 bar + 客数 line + 客単価 line)', () => {
    const data = [{ day: '1', 売上: 10000, 客数: 100, 客単価: 100 }]
    const option = buildCustomerSalesOption(data, theme)
    const series = option.series as { name: string; type: string }[]
    expect(series.length).toBe(3)
    expect(series[0].name).toBe('売上')
    expect(series[0].type).toBe('bar')
    expect(series[1].name).toBe('客数')
    expect(series[1].type).toBe('line')
    expect(series[2].name).toBe('客単価')
  })

  it('xAxis に day 配列', () => {
    const data = [
      { day: '1', 売上: 1000, 客数: 10, 客単価: 100 },
      { day: '2', 売上: 2000, 客数: 20, 客単価: 100 },
    ]
    const option = buildCustomerSalesOption(data, theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data).toEqual(['1', '2'])
  })
})

// ─── buildSameDowOption ──────────────────────────────

describe('buildSameDowOption', () => {
  it('4 series (今年 bar/line + 前年 bar/line)', () => {
    const data = [
      { day: '月', color: '#f00', 今年客数: 100, 前年客数: 80, 今年客単価: 500, 前年客単価: 450 },
    ]
    const option = buildSameDowOption(data, theme)
    const series = option.series as { name: string }[]
    expect(series.length).toBe(4)
    const names = series.map((s) => s.name)
    expect(names).toEqual(['今年客数', '前年客数', '今年客単価', '前年客単価'])
  })

  it('xAxis に day 配列、rotate=45', () => {
    const data = [
      { day: '月', color: '#f00', 今年客数: 100, 前年客数: 80, 今年客単価: 500, 前年客単価: 450 },
    ]
    const option = buildSameDowOption(data, theme)
    const xAxis = option.xAxis as { data: string[]; axisLabel: { rotate: number } }
    expect(xAxis.data).toEqual(['月'])
    expect(xAxis.axisLabel.rotate).toBe(45)
  })

  it('今年客数 bar の itemStyle.color は data.color 由来', () => {
    const data = [
      {
        day: '月',
        color: '#abcdef',
        今年客数: 100,
        前年客数: 80,
        今年客単価: 500,
        前年客単価: 450,
      },
    ]
    const option = buildSameDowOption(data, theme)
    const series = option.series as {
      name: string
      data: { itemStyle: { color: string } }[]
    }[]
    const firstBar = series[0].data[0]
    expect(firstBar.itemStyle.color).toBe('#abcdef')
  })
})
