/**
 * BudgetVsActualChart.builders.ts — buildOption pure function test
 *
 * 検証対象 branch:
 * - view='line' (実績 / 予算 / 比較期) + markLine (予算 line)
 * - view='diff' (予算差異 bar, 正/負 itemStyle 分岐)
 * - view='rate' (達成率 line, percentYAxis, 100% markLine)
 * - view='area' (面 chart)
 * - view='prevYearDiff' (budgetDiff bar + prevYearDiff line 条件分岐)
 * - allLabels / formatter null 値処理
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildOption, allLabels } from '../BudgetVsActualChart.builders'
import type { ChartDataPoint } from '../BudgetVsActualChart.builders'
import { darkTheme } from '@/presentation/theme/theme'

const theme = darkTheme
const fmt = (v: number) => `${v}円`

function makeRow(overrides: Partial<ChartDataPoint> = {}): ChartDataPoint {
  return {
    day: 1,
    actualCum: 1000,
    budgetCum: 900,
    prevYearCum: 800,
    diff: 100,
    achieveRate: 111.1,
    budgetDiff: 100,
    prevYearDiff: 200,
    ...overrides,
  }
}

describe('allLabels 定数', () => {
  it('actualCum / budgetCum / prevYearCum / diff / achieveRate の日本語ラベル', () => {
    expect(allLabels.actualCum).toBe('実績累計')
    expect(allLabels.budgetCum).toBe('予算累計')
    expect(allLabels.prevYearCum).toBe('比較期累計')
    expect(allLabels.diff).toBe('予算差異')
    expect(allLabels.achieveRate).toBe('達成率(%)')
  })
})

describe("buildOption view='line'", () => {
  it('actualCum series が最初に含まれる', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'line', false, false, false, 0, fmt, theme)
    const series = option.series as { name: string }[]
    expect(series[0].name).toBe('actualCum')
  })

  it('showBudget=true で budgetCum series を追加', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'line', true, false, false, 0, fmt, theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('budgetCum')
  })

  it('showPrevYearSeries=true で prevYearCum series を追加', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'line', false, true, false, 0, fmt, theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('prevYearCum')
  })

  it('showBudget + budget>0 で actualCum に markLine が yAxis 値を持つ', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'line', true, false, false, 1000000, fmt, theme)
    const series = option.series as { markLine?: { data: { yAxis: number }[] } }[]
    // markLine の data は budget 値を yAxis に指定
    expect(series[0].markLine?.data[0].yAxis).toBe(1000000)
  })

  it('showBudget=false なら markLine なし (== undefined)', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'line', false, false, false, 1000000, fmt, theme)
    const series = option.series as { markLine?: unknown }[]
    expect(series[0].markLine).toBe(undefined)
  })

  it('xAxis に day が入る', () => {
    const data = [makeRow({ day: 5 }), makeRow({ day: 6 })]
    const option = buildOption(data, 'line', false, false, false, 0, fmt, theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data).toEqual(['5', '6'])
  })
})

describe("buildOption view='diff'", () => {
  it('正の diff で barPositive 色', () => {
    const data = [makeRow({ diff: 500 })]
    const option = buildOption(data, 'diff', false, false, false, 0, fmt, theme)
    const series = option.series as {
      data: { itemStyle: { color: string } }[]
    }[]
    expect(series[0].data[0].itemStyle.color).toBe(theme.chart.barPositive)
  })

  it('負の diff で barNegative 色', () => {
    const data = [makeRow({ diff: -300 })]
    const option = buildOption(data, 'diff', false, false, false, 0, fmt, theme)
    const series = option.series as {
      data: { itemStyle: { color: string } }[]
    }[]
    expect(series[0].data[0].itemStyle.color).toBe(theme.chart.barNegative)
  })

  it('diff=null で transparent 色 + opacity 0', () => {
    const data = [makeRow({ diff: null })]
    const option = buildOption(data, 'diff', false, false, false, 0, fmt, theme)
    const series = option.series as {
      data: { itemStyle: { color: string; opacity: number } }[]
    }[]
    expect(series[0].data[0].itemStyle.color).toBe('transparent')
  })
})

describe("buildOption view='rate'", () => {
  it('achieveRate line series を構築', () => {
    const data = [makeRow({ achieveRate: 95.5 })]
    const option = buildOption(data, 'rate', false, false, false, 0, fmt, theme)
    const series = option.series as { name: string; data: (number | null)[] }[]
    expect(series[0].name).toBe('achieveRate')
    expect(series[0].data).toEqual([95.5])
  })

  it('achieveRate=null でも series に null 値が入る', () => {
    const data = [makeRow({ achieveRate: null })]
    const option = buildOption(data, 'rate', false, false, false, 0, fmt, theme)
    const series = option.series as { data: (number | null)[] }[]
    expect(series[0].data).toEqual([null])
  })

  it('markLine yAxis=100 が設定される', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'rate', false, false, false, 0, fmt, theme)
    const series = option.series as { markLine: { data: { yAxis: number }[] } }[]
    expect(series[0].markLine.data[0].yAxis).toBe(100)
  })
})

describe("buildOption view='area'", () => {
  it('actualCum series が含まれる (showBudget=false)', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'area', false, false, false, 0, fmt, theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('actualCum')
  })

  it('showBudget=true で budgetCum を actualCum の前に追加', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'area', true, false, false, 0, fmt, theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names[0]).toBe('budgetCum')
    expect(names).toContain('actualCum')
  })

  it('showPrevYearSeries=true で prevYearCum を末尾に追加', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'area', false, true, false, 0, fmt, theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('prevYearCum')
  })
})

describe("buildOption view='prevYearDiff'", () => {
  it('budgetDiff bar series を構築', () => {
    const data = [makeRow({ budgetDiff: 100 })]
    const option = buildOption(data, 'prevYearDiff', false, false, false, 0, fmt, theme)
    const series = option.series as { name: string }[]
    expect(series[0].name).toBe('budgetDiff')
  })

  it('hasPrevYearDiff=false なら prevYearDiff line なし', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'prevYearDiff', false, false, false, 0, fmt, theme)
    const series = option.series as { name: string }[]
    expect(series.length).toBe(1)
  })

  it('hasPrevYearDiff=true で prevYearDiff line を追加', () => {
    const data = [makeRow()]
    const option = buildOption(data, 'prevYearDiff', false, false, true, 0, fmt, theme)
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('prevYearDiff')
    expect(series.length).toBe(2)
  })

  it('正の budgetDiff で barPositive 色 (opacity 0.7)', () => {
    const data = [makeRow({ budgetDiff: 500 })]
    const option = buildOption(data, 'prevYearDiff', false, false, false, 0, fmt, theme)
    const series = option.series as {
      data: { itemStyle: { color: string; opacity: number } }[]
    }[]
    expect(series[0].data[0].itemStyle.color).toBe(theme.chart.barPositive)
    expect(series[0].data[0].itemStyle.opacity).toBe(0.7)
  })

  it('負の budgetDiff で barNegative 色', () => {
    const data = [makeRow({ budgetDiff: -100 })]
    const option = buildOption(data, 'prevYearDiff', false, false, false, 0, fmt, theme)
    const series = option.series as {
      data: { itemStyle: { color: string } }[]
    }[]
    expect(series[0].data[0].itemStyle.color).toBe(theme.chart.barNegative)
  })

  it('budgetDiff=null で transparent + opacity 0', () => {
    const data = [makeRow({ budgetDiff: null })]
    const option = buildOption(data, 'prevYearDiff', false, false, false, 0, fmt, theme)
    const series = option.series as {
      data: { itemStyle: { color: string; opacity: number } }[]
    }[]
    expect(series[0].data[0].itemStyle.color).toBe('transparent')
    expect(series[0].data[0].itemStyle.opacity).toBe(0)
  })
})
