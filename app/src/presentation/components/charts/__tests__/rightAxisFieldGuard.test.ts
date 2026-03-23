/**
 * モード切替 ← → データフィールド対応ガードテスト（静的解析版）
 *
 * 全チャートの「ボタン名（モード名）」と「シリーズが参照するデータフィールド」が
 * 意味的に一致していることをソースコード解析で機械的に保証する。
 *
 * 「点数」ボタンが customers を参照するような不整合を防ぐ。
 *
 * 対象チャート:
 * 1. DailySalesChart — rightAxisMode: quantity/customers/discount/temperature
 * 2. TimeSlotChart — lineMode: quantity/temperature/precipitation
 * 3. CategoryTimeHeatmap — heatmapMetric: amount/quantity
 *
 * @guard D2 引数を無視して再計算しない — モード名とデータソースの対応を検証
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const CHARTS_DIR = path.resolve(__dirname, '..')

function readChart(filename: string): string {
  return fs.readFileSync(path.join(CHARTS_DIR, filename), 'utf-8')
}

// ── 1. DailySalesChart — buildQuantitySeries / buildCustomerCountSeries ──

describe('DailySalesChart — 右軸モード ← → データフィールド対応', () => {
  const src = readChart('DailySalesChartBodyLogic.ts')

  it('buildQuantitySeries は quantity フィールドを参照し、customers を参照しない', () => {
    // buildQuantitySeries の関数本体を抽出
    const fnMatch = src.match(/function buildQuantitySeries[\s\S]*?^}/m)
    expect(fnMatch).not.toBeNull()
    const fnBody = fnMatch![0]

    // pluck(rows, 'quantity') を参照すること
    expect(fnBody).toContain("pluck(rows, 'quantity')")
    expect(fnBody).toContain("pluck(rows, 'prevQuantity')")
    // pluck(rows, 'customers') を参照してはならない
    expect(fnBody).not.toContain("pluck(rows, 'customers')")
    expect(fnBody).not.toContain("pluck(rows, 'prevCustomers')")
  })

  it('buildCustomerCountSeries は customers フィールドを参照し、quantity を参照しない', () => {
    const fnMatch = src.match(/function buildCustomerCountSeries[\s\S]*?^}/m)
    expect(fnMatch).not.toBeNull()
    const fnBody = fnMatch![0]

    expect(fnBody).toContain("pluck(rows, 'customers')")
    expect(fnBody).toContain("pluck(rows, 'prevCustomers')")
    expect(fnBody).not.toContain("pluck(rows, 'quantity')")
    expect(fnBody).not.toContain("pluck(rows, 'prevQuantity')")
  })

  it('buildDiscountSeries は discount フィールドを参照する', () => {
    const fnMatch = src.match(/function buildDiscountSeries[\s\S]*?^}/m)
    expect(fnMatch).not.toBeNull()
    const fnBody = fnMatch![0]

    expect(fnBody).toContain("pluck(rows, 'discount')")
    expect(fnBody).toContain("pluck(rows, 'prevYearDiscount')")
  })

  it('buildQuantitySeries と buildCustomerCountSeries は異なるシリーズ name を使う', () => {
    const qtyMatch = src.match(/function buildQuantitySeries[\s\S]*?^}/m)
    const custMatch = src.match(/function buildCustomerCountSeries[\s\S]*?^}/m)
    expect(qtyMatch).not.toBeNull()
    expect(custMatch).not.toBeNull()

    // quantity シリーズの name
    const qtyNames = [...qtyMatch![0].matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1])
    // customers シリーズの name
    const custNames = [...custMatch![0].matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1])

    // 名前が被らないこと
    const intersection = qtyNames.filter((n) => custNames.includes(n))
    expect(intersection).toEqual([])
  })

  it('RIGHT_AXIS_OPTIONS の全モードに対応する buildRightAxisSeries の case がある', () => {
    // RIGHT_AXIS_OPTIONS からモード値を抽出
    const modeMatches = [...src.matchAll(/mode:\s*'(\w+)'/g)].map((m) => m[1])
    // buildRightAxisSeries の switch case を抽出
    const switchMatch = src.match(/function buildRightAxisSeries[\s\S]*?^}/m)
    expect(switchMatch).not.toBeNull()
    const switchBody = switchMatch![0]

    for (const mode of modeMatches) {
      expect(switchBody).toContain(`case '${mode}'`)
    }
  })
})

// ── 2. TimeSlotChart — lineMode ← → データフィールド対応 ──

describe('TimeSlotChart — lineMode ← → データフィールド対応', () => {
  const src = readChart('TimeSlotChartOptionBuilder.ts')

  it('quantity モードは r.quantity を参照し、r.customers を参照しない', () => {
    // lineMode === 'quantity' ブロックを抽出
    const qtyBlock = src.match(/if\s*\(lineMode === 'quantity'\)\s*\{[\s\S]*?\n {2}\}/m)
    expect(qtyBlock).not.toBeNull()
    const block = qtyBlock![0]

    expect(block).toContain('r.quantity')
    expect(block).toContain('r.prevQuantity')
    expect(block).not.toContain('r.customers')
    // シリーズ名に「点数」が含まれること
    expect(block).toContain('点数')
  })

  it('temperature モードは weatherMap の temp を参照する', () => {
    // lineMode === 'temperature' ブロック
    const tempBlock = src.match(/lineMode === 'temperature'\)\s*\{[\s\S]*?\n {2}\}/m)
    expect(tempBlock).not.toBeNull()
    const block = tempBlock![0]

    expect(block).toContain('?.temp')
    expect(block).toContain('気温')
    expect(block).not.toContain('r.quantity')
  })

  it('precipitation モードは weatherMap の precip を参照する', () => {
    // 降水量文字列が含まれること
    expect(src).toContain('降水量')
    expect(src).toContain('?.precip')
  })

  it('quantity モードのシリーズ名に気温・降水量が混入しない', () => {
    const qtyBlock = src.match(/if\s*\(lineMode === 'quantity'\)\s*\{[\s\S]*?\n {2}\}/m)
    expect(qtyBlock).not.toBeNull()
    const block = qtyBlock![0]

    expect(block).not.toContain('気温')
    expect(block).not.toContain('降水量')
  })
})

// ── 3. CategoryTimeHeatmap — heatmapMetric ← → データフィールド対応 ──

describe('CategoryTimeHeatmap — heatmapMetric ← → データフィールド対応', () => {
  const src = readChart('CategoryTimeHeatmap.tsx')

  it('metric === "amount" のとき d.amount を参照する', () => {
    expect(src).toContain("metric === 'amount'")
    // isAmount ? d.amount : d.quantity パターンが存在すること
    expect(src).toMatch(/isAmount\s*\?\s*d\.amount\s*:\s*d\.quantity/)
  })

  it('amount と quantity で異なるフィールドを参照する', () => {
    // d.amount と d.quantity が別々に存在すること
    expect(src).toContain('d.amount')
    expect(src).toContain('d.quantity')
  })
})
