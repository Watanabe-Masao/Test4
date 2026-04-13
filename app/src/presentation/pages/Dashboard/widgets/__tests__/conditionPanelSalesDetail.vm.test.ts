/**
 * conditionPanelSalesDetail.vm — pure helper tests
 *
 * 検証対象:
 * - formatTxValue: 数値 → 日本語ロケール「○円」文字列
 * - buildDailyYoYRenderRows: 行ごとの displayCurrent/displayPrev/yoy 計算
 *
 * Builder 関数 (buildTxValueDetailVm / buildDailySalesDetailVm) は
 * metricSignal / SIGNAL_COLORS / ConditionSummaryConfig に依存するためここではテストしない。
 */
import { describe, it, expect } from 'vitest'
import { formatTxValue, buildDailyYoYRenderRows } from '../conditionPanelSalesDetail.vm'
import type { DailyYoYRow } from '../conditionPanelYoY.vm'

const fmtCurrency = ((v: number | null): string =>
  `¥${(v ?? 0).toLocaleString('ja-JP')}`) as unknown as import('@/presentation/components/charts/chartTheme').CurrencyFormatter

describe('formatTxValue', () => {
  it('formats zero', () => {
    expect(formatTxValue(0)).toBe('0円')
  })

  it('formats integer with thousands separator', () => {
    expect(formatTxValue(1234)).toBe('1,234円')
  })

  it('rounds decimals to integer', () => {
    // maximumFractionDigits: 0 により小数部は切り捨て/四捨五入
    const result = formatTxValue(1234.7)
    // Intl.NumberFormat default rounds half to even; just assert integer + 円 suffix
    expect(result.endsWith('円')).toBe(true)
    expect(result).not.toContain('.')
  })

  it('formats large numbers with separators', () => {
    expect(formatTxValue(1234567)).toBe('1,234,567円')
  })

  it('formats negative values', () => {
    expect(formatTxValue(-500)).toBe('-500円')
  })
})

describe('buildDailyYoYRenderRows', () => {
  const rows: readonly DailyYoYRow[] = [
    {
      day: 1,
      currentSales: 1000,
      prevSales: 800,
      currentCustomers: 10,
      prevCustomers: 8,
    },
    {
      day: 2,
      currentSales: 500,
      prevSales: 0,
      currentCustomers: 5,
      prevCustomers: 0,
    },
    {
      day: 3,
      currentSales: 2000,
      prevSales: 1500,
      currentCustomers: 20,
      prevCustomers: 15,
    },
  ]

  it('returns empty array for empty input', () => {
    expect(buildDailyYoYRenderRows([], 'daily', 'sales', fmtCurrency)).toEqual([])
  })

  it('builds daily sales rows with correct labels', () => {
    const result = buildDailyYoYRenderRows(rows, 'daily', 'sales', fmtCurrency)
    expect(result).toHaveLength(3)
    expect(result[0].day).toBe(1)
    expect(result[0].dayLabel).toBe('1日')
    expect(result[0].currentStr).toBe('¥1,000')
    expect(result[0].prevStr).toBe('¥800')
    expect(result[0].hasPrev).toBe(true)
  })

  it('marks prev as — when displayPrev is 0 in daily mode', () => {
    const result = buildDailyYoYRenderRows(rows, 'daily', 'sales', fmtCurrency)
    expect(result[1].prevStr).toBe('—')
    expect(result[1].yoyStr).toBe('—')
    expect(result[1].hasPrev).toBe(false)
  })

  it('accumulates values correctly in cumulative mode', () => {
    const result = buildDailyYoYRenderRows(rows, 'cumulative', 'sales', fmtCurrency)
    // Day 1 cum: 1000 / 800
    expect(result[0].currentStr).toBe('¥1,000')
    expect(result[0].prevStr).toBe('¥800')
    // Day 2 cum: 1500 / 800 (prev was 0 so stays 800)
    expect(result[1].currentStr).toBe('¥1,500')
    expect(result[1].prevStr).toBe('¥800')
    expect(result[1].hasPrev).toBe(true)
    // Day 3 cum: 3500 / 2300
    expect(result[2].currentStr).toBe('¥3,500')
    expect(result[2].prevStr).toBe('¥2,300')
  })

  it('formats customers with 人 suffix instead of currency', () => {
    const result = buildDailyYoYRenderRows(rows, 'daily', 'customers', fmtCurrency)
    expect(result[0].currentStr).toBe('10人')
    expect(result[0].prevStr).toBe('8人')
    expect(result[0].hasPrev).toBe(true)
  })

  it('handles customers cumulative mode', () => {
    const result = buildDailyYoYRenderRows(rows, 'cumulative', 'customers', fmtCurrency)
    expect(result[2].currentStr).toBe('35人') // 10+5+20
    expect(result[2].prevStr).toBe('23人') // 8+0+15
  })
})
