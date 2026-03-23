/**
 * 右軸モード ← → データフィールド対応ガードテスト
 *
 * ボタン名（RightAxisMode）と、シリーズが参照するデータフィールドが
 * 意味的に一致していることを機械的に保証する。
 *
 * 「点数」ボタンが customers を参照するような不整合を防ぐ。
 *
 * @guard D2 引数を無視して再計算しない — モード名とデータソースの対応を検証
 */
import { describe, it, expect } from 'vitest'
import {
  buildQuantitySeries,
  buildCustomerCountSeries,
  buildRightAxisSeries,
  RIGHT_AXIS_OPTIONS,
  type RightAxisColors,
} from '../DailySalesChartBodyLogic'

const COLORS: RightAxisColors = {
  cyan: '#0ff',
  orange: '#f90',
  danger: '#f00',
  primary: '#00f',
}

/** pluck で参照するフィールド名をシリーズ定義から抽出する */
function extractFieldNames(series: readonly { name?: string; data?: unknown[] }[]): string[] {
  return series.map((s) => s.name ?? '').filter(Boolean)
}

describe('右軸モード ← → データフィールド対応ガード', () => {
  const sampleRows: Record<string, unknown>[] = [
    { day: 1, quantity: 100, prevQuantity: 90, customers: 50, prevCustomers: 45 },
    { day: 2, quantity: 120, prevQuantity: 95, customers: 55, prevCustomers: 48 },
  ]

  it('quantity モード（点数）は quantity/prevQuantity フィールドを参照する', () => {
    const series = buildQuantitySeries(sampleRows, true, COLORS)
    const names = extractFieldNames(series)

    // 「点数」ボタンは quantity フィールドを参照すべき
    expect(names).toContain('quantity')
    expect(names).toContain('prevQuantity')
    // customers を参照してはならない
    expect(names).not.toContain('customers')
    expect(names).not.toContain('prevCustomers')
  })

  it('customers モード（客数）は customerCount/prevCustomerCount フィールドを参照する', () => {
    const series = buildCustomerCountSeries(sampleRows, true, COLORS)
    const names = extractFieldNames(series)

    // 「客数」ボタンは customers 系フィールドを参照すべき
    expect(names).toContain('customerCount')
    expect(names).toContain('prevCustomerCount')
    // quantity を参照してはならない
    expect(names).not.toContain('quantity')
    expect(names).not.toContain('prevQuantity')
  })

  it('quantity モードと customers モードは異なるデータを返す', () => {
    const qtySeries = buildRightAxisSeries('quantity', sampleRows, [1, 2], true, COLORS, new Map())
    const custSeries = buildRightAxisSeries(
      'customers',
      sampleRows,
      [1, 2],
      true,
      COLORS,
      new Map(),
    )

    const qtyNames = extractFieldNames(qtySeries)
    const custNames = extractFieldNames(custSeries)

    // 両モードが同一のフィールド名セットを持たないことを保証
    const qtySet = new Set(qtyNames)
    const custSet = new Set(custNames)
    const intersection = [...qtySet].filter((n) => custSet.has(n))
    expect(intersection).toEqual([])
  })

  it('RIGHT_AXIS_OPTIONS の全モードが buildRightAxisSeries で処理される', () => {
    for (const opt of RIGHT_AXIS_OPTIONS) {
      // 各モードが例外なく実行できること（switch の漏れ検出）
      expect(() =>
        buildRightAxisSeries(opt.mode, sampleRows, [1, 2], false, COLORS, new Map()),
      ).not.toThrow()
    }
  })

  it('quantity シリーズの data は sampleRows の quantity 値を含む', () => {
    const series = buildQuantitySeries(sampleRows, false, COLORS)
    const data = series[0].data as (number | null)[]
    // quantity フィールドの値（100, 120）が含まれること
    expect(data).toEqual([100, 120])
  })

  it('customers シリーズの data は sampleRows の customers 値を含む', () => {
    const series = buildCustomerCountSeries(sampleRows, false, COLORS)
    const data = series[0].data as (number | null)[]
    // customers フィールドの値（50, 55）が含まれること
    expect(data).toEqual([50, 55])
  })
})
