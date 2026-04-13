/**
 * conditionMatrixLogic.ts — pure matrix logic test
 *
 * 検証対象:
 * - avgMetrics: 空 rows → 0 / sum 集約 / discountRate = totalDiscount / (totalSales + totalDiscount)
 * - buildConditionMatrix:
 *   - yoy / wow / trendRatio の基本構造
 *   - trendDirection:
 *     - ratio>=1.02 → 'up'
 *     - ratio<0.98 → 'down'
 *     - その他 → 'flat'
 *     - ratio=null → 'flat'
 *   - trendHalfDays = floor(totalDays/2)
 *   - prev=0 → ratio=null
 */
import { describe, it, expect } from 'vitest'
import { avgMetrics, buildConditionMatrix } from '../conditionMatrixLogic'
import type { ConditionMatrixRow } from '@/infrastructure/duckdb/queries/conditionMatrix'

function makeRow(overrides: Partial<ConditionMatrixRow> = {}): ConditionMatrixRow {
  // 全期間のフィールドを 0 で埋める
  const base: Record<string, number | string> = { storeId: 's1' }
  for (const period of ['cur', 'py', 'pw', 'tr', 'tp']) {
    for (const metric of [
      'Sales',
      'Customers',
      'Discount',
      'GrossSales',
      'DiscountRate',
      'TotalCost',
      'Consumable',
      'ConsumableRate',
      'Quantity',
      'SalesDays',
    ]) {
      base[`${period}${metric}`] = 0
    }
  }
  return { ...base, ...overrides } as unknown as ConditionMatrixRow
}

// ─── avgMetrics ──────────────────────────────────────

describe('avgMetrics', () => {
  it('空 rows → 全フィールド 0', () => {
    const result = avgMetrics([], 'cur')
    expect(result).toEqual({
      sales: 0,
      quantity: 0,
      customers: 0,
      discountRate: 0,
      totalCost: 0,
    })
  })

  it('複数 row を sum 集約', () => {
    const rows = [
      makeRow({ curSales: 100, curCustomers: 10, curQuantity: 5, curTotalCost: 60 }),
      makeRow({ curSales: 200, curCustomers: 20, curQuantity: 10, curTotalCost: 120 }),
    ]
    const result = avgMetrics(rows, 'cur')
    expect(result.sales).toBe(300)
    expect(result.customers).toBe(30)
    expect(result.quantity).toBe(15)
    expect(result.totalCost).toBe(180)
  })

  it('discountRate = totalDiscount / (totalSales + totalDiscount)', () => {
    const rows = [
      makeRow({ curSales: 800, curDiscount: 200 }),
    ]
    const result = avgMetrics(rows, 'cur')
    // grossSales = 800 + 200 = 1000, discountRate = 200/1000 = 0.2
    expect(result.discountRate).toBeCloseTo(0.2, 3)
  })

  it('grossSales=0 → discountRate=0', () => {
    const rows = [makeRow({ curSales: 0, curDiscount: 0 })]
    const result = avgMetrics(rows, 'cur')
    expect(result.discountRate).toBe(0)
  })

  it("period='py' は pyXxx フィールドを使う", () => {
    const rows = [makeRow({ pySales: 500, pyCustomers: 50 })]
    const result = avgMetrics(rows, 'py')
    expect(result.sales).toBe(500)
    expect(result.customers).toBe(50)
  })
})

// ─── buildConditionMatrix ──────────────────────────

describe('buildConditionMatrix', () => {
  it('空 rows + totalDays=0 の基本構造', () => {
    const result = buildConditionMatrix([], 0)
    expect(result.yoy.label).toBe('前年比')
    expect(result.wow.label).toBe('前週比')
    expect(result.trendRatio.label).toBe('トレンド')
    expect(result.trendDirection.label).toBe('トレンド方向')
    expect(result.trendHalfDays).toBe(0)
  })

  it('trendHalfDays = floor(totalDays / 2)', () => {
    expect(buildConditionMatrix([], 30).trendHalfDays).toBe(15)
    expect(buildConditionMatrix([], 31).trendHalfDays).toBe(15)
    expect(buildConditionMatrix([], 7).trendHalfDays).toBe(3)
  })

  it('yoy.sales.ratio: cur=200 / py=100 = 2', () => {
    const rows = [makeRow({ curSales: 200, pySales: 100 })]
    const result = buildConditionMatrix(rows, 30)
    expect(result.yoy.sales.ratio).toBe(2)
    expect(result.yoy.sales.current).toBe(200)
    expect(result.yoy.sales.comparison).toBe(100)
  })

  it('py=0 → ratio=null', () => {
    const rows = [makeRow({ curSales: 200, pySales: 0 })]
    const result = buildConditionMatrix(rows, 30)
    expect(result.yoy.sales.ratio).toBeNull()
  })

  it('trendDirection: ratio >= 1.02 → up', () => {
    const rows = [makeRow({ trSales: 102, tpSales: 100 })]
    const result = buildConditionMatrix(rows, 30)
    expect(result.trendDirection.sales.direction).toBe('up')
  })

  it('trendDirection: ratio < 0.98 → down', () => {
    const rows = [makeRow({ trSales: 95, tpSales: 100 })]
    const result = buildConditionMatrix(rows, 30)
    expect(result.trendDirection.sales.direction).toBe('down')
  })

  it('trendDirection: 0.98 <= ratio < 1.02 → flat', () => {
    const rows = [makeRow({ trSales: 100, tpSales: 100 })]
    const result = buildConditionMatrix(rows, 30)
    expect(result.trendDirection.sales.direction).toBe('flat')
  })

  it('trendDirection: ratio=null → flat', () => {
    const rows = [makeRow({ trSales: 100, tpSales: 0 })]
    const result = buildConditionMatrix(rows, 30)
    expect(result.trendDirection.sales.direction).toBe('flat')
  })

  it('txValue: cur は sales/customers 比率', () => {
    const rows = [
      makeRow({
        curSales: 1000,
        curCustomers: 10,
        pySales: 900,
        pyCustomers: 10,
      }),
    ]
    const result = buildConditionMatrix(rows, 30)
    expect(result.yoy.txValue.current).toBe(100)
    expect(result.yoy.txValue.comparison).toBe(90)
  })
})
