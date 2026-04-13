/**
 * YoYVarianceChart.builders.ts — pure ECharts option builder test
 *
 * 検証対象:
 * - maToNull: NaN → null 変換
 * - buildTooltipFormatter: view 分岐 / customer 判定 / null 値 / 正負符号
 * - buildSalesGapOption: series + barColors + yAxis 2 本立て
 * - buildMultiGapOption: customer/discount 系列を含む
 * - buildGrowthRateOption: sub-mode 分岐 (daily/cumulative/ma7)
 * - VIEW_LABELS / GROWTH_SUB_LABELS / allLabels 定数
 */
import { describe, it, expect } from 'vitest'
import {
  maToNull,
  buildTooltipFormatter,
  buildSalesGapOption,
  buildMultiGapOption,
  buildGrowthRateOption,
  VIEW_LABELS,
  GROWTH_SUB_LABELS,
  allLabels,
} from '../YoYVarianceChart.builders'
import { darkTheme } from '@/presentation/theme/theme'
import type { ChartTheme } from '../chartTheme'

// ─── minimum ChartTheme mock (drives coverage without real hook) ─────
function buildMockChartTheme(): ChartTheme {
  return {
    colors: {
      primary: darkTheme.colors.palette.primary,
      success: darkTheme.colors.palette.success,
      successDark: darkTheme.colors.palette.successDark,
      warning: darkTheme.colors.palette.warning,
      warningDark: darkTheme.colors.palette.warningDark,
      danger: darkTheme.colors.palette.danger,
      dangerDark: darkTheme.colors.palette.dangerDark,
      info: darkTheme.colors.palette.info,
      infoDark: darkTheme.colors.palette.infoDark,
      purple: darkTheme.colors.palette.purple,
      cyan: darkTheme.colors.palette.cyan,
      cyanDark: darkTheme.colors.palette.cyanDark,
      pink: darkTheme.colors.palette.pink,
      orange: darkTheme.colors.palette.orange,
      blue: darkTheme.colors.palette.blue,
      lime: darkTheme.colors.palette.lime,
      slate: darkTheme.colors.palette.slate,
      slateDark: darkTheme.colors.palette.slateDark,
    },
    text: darkTheme.colors.text,
    textSecondary: darkTheme.colors.text2,
    textMuted: darkTheme.colors.text3,
    grid: darkTheme.colors.border,
    bg: darkTheme.colors.bg,
    bg2: darkTheme.colors.bg2,
    bg3: darkTheme.colors.bg3,
    fontFamily: darkTheme.typography.fontFamily.primary,
    monoFamily: darkTheme.typography.fontFamily.mono,
    fontSize: { micro: 9, label: 10, body: 11 },
    isDark: true,
    semantic: darkTheme.chart.semantic,
  }
}

const ct = buildMockChartTheme()
const theme = darkTheme

// ─── maToNull ─────────────────────────────────────────

describe('maToNull', () => {
  it('通常の数値は変換せず返す', () => {
    expect(maToNull([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('NaN を null に変換する', () => {
    expect(maToNull([1, NaN, 3])).toEqual([1, null, 3])
  })

  it('空配列は空配列', () => {
    expect(maToNull([])).toEqual([])
  })

  it('全 NaN は全 null', () => {
    expect(maToNull([NaN, NaN])).toEqual([null, null])
  })
})

// ─── buildTooltipFormatter ────────────────────────────

describe('buildTooltipFormatter', () => {
  it('空配列は空文字列を返す', () => {
    const fmt = buildTooltipFormatter('salesGap')
    expect(fmt([])).toBe('')
  })

  it('非 array params は空文字列', () => {
    const fmt = buildTooltipFormatter('salesGap')
    expect(fmt(null)).toBe('')
  })

  it('salesGap view: 通常の売上差異を + 符号付きで表示', () => {
    const fmt = buildTooltipFormatter('salesGap')
    const html = fmt([
      {
        seriesName: 'salesDiff',
        value: 1000,
        marker: '●',
        axisValue: '1',
      },
    ])
    expect(html).toContain('1日')
    expect(html).toContain('+')
    expect(html).toContain('salesDiff')
  })

  it('salesGap view: マイナス差異は 符号なし (符号が値に含まれる)', () => {
    const fmt = buildTooltipFormatter('salesGap')
    const html = fmt([
      {
        seriesName: 'salesDiff',
        value: -500,
        marker: '●',
        axisValue: '2',
      },
    ])
    expect(html).toContain('-500')
  })

  it('customer 系列は 人 単位', () => {
    const fmt = buildTooltipFormatter('salesGap')
    const html = fmt([
      {
        seriesName: 'customerDiff',
        value: 5,
        marker: '●',
        axisValue: '1',
      },
    ])
    expect(html).toContain('人')
  })

  it('null value は - を表示', () => {
    const fmt = buildTooltipFormatter('salesGap')
    const html = fmt([
      {
        seriesName: 'salesDiff',
        value: null,
        marker: '●',
        axisValue: '1',
      },
    ])
    expect(html).toContain('-')
  })

  it('growthRate view: % フォーマット', () => {
    const fmt = buildTooltipFormatter('growthRate')
    const html = fmt([
      {
        seriesName: 'salesGrowth',
        value: 0.1,
        marker: '●',
        axisValue: '1',
      },
    ])
    expect(html).toContain('salesGrowth')
  })

  it('複数 series は全て表示される', () => {
    const fmt = buildTooltipFormatter('salesGap')
    const html = fmt([
      { seriesName: 'salesDiff', value: 100, marker: '●', axisValue: '1' },
      { seriesName: 'cumSalesDiff', value: 500, marker: '●', axisValue: '1' },
    ])
    expect(html).toContain('salesDiff')
    expect(html).toContain('cumSalesDiff')
  })
})

// ─── buildSalesGapOption ──────────────────────────────

describe('buildSalesGapOption', () => {
  it('空 data: xAxis.data は空、series は定義される', () => {
    const option = buildSalesGapOption([], ct, theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data).toEqual([])
    // series は空ではない（markLine 等の装飾 series が含まれる）
    expect(Array.isArray(option.series)).toBe(true)
  })

  it('正の売上差異で itemStyle が positive 色', () => {
    const data = [{ day: 1, salesDiff: 1000, cumSalesDiff: 1000 }]
    const option = buildSalesGapOption(data, ct, theme)
    // xAxis に日付が含まれる
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data).toEqual(['1'])
    // 正の差異なので barColors の先頭は positive 色
    const seriesArr = option.series as {
      data: { itemStyle: { color: string } }[]
    }[]
    const firstBar = seriesArr[0].data[0]
    expect(firstBar.itemStyle.color).toBe(ct.semantic.positive)
  })

  it('負の売上差異で itemStyle が negative 色', () => {
    const data = [{ day: 1, salesDiff: -500, cumSalesDiff: -500 }]
    const option = buildSalesGapOption(data, ct, theme)
    const seriesArr = option.series as {
      data: { itemStyle: { color: string } }[]
    }[]
    const firstBar = seriesArr[0].data[0]
    expect(firstBar.itemStyle.color).toBe(ct.semantic.negative)
  })

  it('複数日データを処理する', () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      salesDiff: (i % 2 === 0 ? 1 : -1) * 1000,
      cumSalesDiff: i * 100,
    }))
    const option = buildSalesGapOption(data, ct, theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data.length).toBe(30)
  })

  it('yAxis が 2 本立て (左: 売上差異 / 右: 累計)', () => {
    const option = buildSalesGapOption([{ day: 1, salesDiff: 0, cumSalesDiff: 0 }], ct, theme)
    expect(Array.isArray(option.yAxis)).toBe(true)
    expect((option.yAxis as unknown[]).length).toBe(2)
  })
})

// ─── buildMultiGapOption ──────────────────────────────

describe('buildMultiGapOption', () => {
  it('空 data: xAxis.data は空、series は array', () => {
    const option = buildMultiGapOption([], ct, theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data).toEqual([])
    expect(Array.isArray(option.series)).toBe(true)
  })

  it('sales/discount/customer の複合差異を処理 (複数 series を含む)', () => {
    const data = [
      {
        day: 1,
        salesDiff: 100,
        discountDiff: -50,
        customerDiff: 5,
        cumSalesDiff: 100,
        cumDiscountDiff: -50,
        cumCustomerDiff: 5,
      },
    ]
    const option = buildMultiGapOption(data, ct, theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data).toEqual(['1'])
    // multi gap なので sales/discount/customer 3 種の差異 series + 累計系列
    expect((option.series as unknown[]).length).toBeGreaterThanOrEqual(3)
  })

  it('複数日の multi gap を処理', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({
      day: i + 1,
      salesDiff: i * 100,
      discountDiff: i * -10,
      customerDiff: i * 2,
      cumSalesDiff: i * 100,
      cumDiscountDiff: i * -10,
      cumCustomerDiff: i * 2,
    }))
    const option = buildMultiGapOption(data, ct, theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data.length).toBe(10)
  })
})

// ─── buildGrowthRateOption ────────────────────────────

describe('buildGrowthRateOption', () => {
  const dailyKeys = {
    sales: 'salesGrowth',
    customer: 'customerGrowth',
    txValue: 'txValueGrowth',
  }
  const cumulativeKeys = {
    sales: 'cumSalesGrowth',
    customer: 'cumCustomerGrowth',
    txValue: 'cumTxValueGrowth',
  }
  const ma7Keys = {
    sales: 'salesGrowthMa7',
    customer: 'customerGrowthMa7',
    txValue: 'txValueGrowthMa7',
  }

  it('空 data: xAxis.data は空、series は 3 本', () => {
    const option = buildGrowthRateOption([], dailyKeys, ct, theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data).toEqual([])
    // sales / customer / txValue の 3 系列
    expect((option.series as unknown[]).length).toBe(3)
  })

  it('daily keys: 3 series (sales/customer/txValue growth) を構築', () => {
    const data = [
      {
        day: 1,
        salesGrowth: 0.1,
        customerGrowth: 0.05,
        txValueGrowth: 0.05,
      },
    ]
    const option = buildGrowthRateOption(data, dailyKeys, ct, theme)
    const seriesArr = option.series as { name: string }[]
    const names = seriesArr.map((s) => s.name)
    expect(names).toContain(allLabels.salesGrowth)
    expect(names).toContain(allLabels.customerGrowth)
    expect(names).toContain(allLabels.txValueGrowth)
  })

  it('cumulative keys: 累計系列名を使用', () => {
    const data = [
      {
        day: 1,
        cumSalesGrowth: 0.1,
        cumCustomerGrowth: 0.05,
        cumTxValueGrowth: 0.05,
      },
    ]
    const option = buildGrowthRateOption(data, cumulativeKeys, ct, theme)
    const seriesArr = option.series as { name: string }[]
    const names = seriesArr.map((s) => s.name)
    expect(names).toContain(allLabels.cumSalesGrowth)
    expect(names).toContain(allLabels.cumCustomerGrowth)
    expect(names).toContain(allLabels.cumTxValueGrowth)
  })

  it('ma7 keys: MA7 系列名と 10 日分のデータを処理', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({
      day: i + 1,
      salesGrowthMa7: 0.1,
      customerGrowthMa7: 0.05,
      txValueGrowthMa7: 0.05,
    }))
    const option = buildGrowthRateOption(data, ma7Keys, ct, theme)
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data.length).toBe(10)
    const seriesArr = option.series as { name: string }[]
    const names = seriesArr.map((s) => s.name)
    expect(names).toContain(allLabels.salesGrowthMa7)
  })
})

// ─── 定数 ─────────────────────────────────────────────

describe('VIEW_LABELS / GROWTH_SUB_LABELS / allLabels 定数', () => {
  it('VIEW_LABELS: 3 view を定義', () => {
    expect(VIEW_LABELS.salesGap).toBe('売上差異')
    expect(VIEW_LABELS.multiGap).toBe('複合差異')
    expect(VIEW_LABELS.growthRate).toBe('成長率')
  })

  it('GROWTH_SUB_LABELS: 3 sub mode を定義', () => {
    expect(GROWTH_SUB_LABELS.daily).toBe('日別')
    expect(GROWTH_SUB_LABELS.cumulative).toBe('累計')
    expect(GROWTH_SUB_LABELS.ma7).toBe('7日移動平均')
  })

  it('allLabels: salesDiff / customerDiff 等の日本語ラベル', () => {
    expect(allLabels.salesDiff).toBe('売上差異')
    expect(allLabels.customerDiff).toBe('客数差異')
    expect(allLabels.salesGrowth).toBe('売上成長率')
  })
})
