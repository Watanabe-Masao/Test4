/**
 * temporalMetricResolvers — TEMPORAL_METRIC_RESOLVERS / resolveAllMetrics tests
 *
 * 検証対象:
 * - 6 メトリクス（sales / customers / transactionValue / grossProfitRate / quantity / discount）
 * - 0 除算ガード（customers=0 / coreSales=0）
 * - resolveAllMetrics: 全 metric を一括 Record 化
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  TEMPORAL_METRIC_RESOLVERS,
  resolveAllMetrics,
  type StoreDaySummaryTemporalRow,
} from '../temporalMetricResolvers'

const baseRow: StoreDaySummaryTemporalRow = {
  sales: 1000,
  customers: 100,
  coreSales: 800,
  totalQuantity: 50,
  discountAbsolute: 30,
}

describe('TEMPORAL_METRIC_RESOLVERS', () => {
  it('sales / customers / quantity / discount は値そのまま', () => {
    expect(TEMPORAL_METRIC_RESOLVERS.sales(baseRow)).toBe(1000)
    expect(TEMPORAL_METRIC_RESOLVERS.customers(baseRow)).toBe(100)
    expect(TEMPORAL_METRIC_RESOLVERS.quantity(baseRow)).toBe(50)
    expect(TEMPORAL_METRIC_RESOLVERS.discount(baseRow)).toBe(30)
  })

  it('transactionValue = sales / customers', () => {
    expect(TEMPORAL_METRIC_RESOLVERS.transactionValue(baseRow)).toBe(10) // 1000/100
  })

  it('transactionValue: customers=0 で null（0 除算ガード）', () => {
    expect(TEMPORAL_METRIC_RESOLVERS.transactionValue({ ...baseRow, customers: 0 })).toBeNull()
  })

  it('grossProfitRate = (sales - coreSales) / sales（売変率扱い）', () => {
    expect(TEMPORAL_METRIC_RESOLVERS.grossProfitRate(baseRow)).toBeCloseTo((1000 - 800) / 1000, 10) // 0.2
  })

  it('grossProfitRate: coreSales=0 で null（売上はあるが core 0）', () => {
    expect(TEMPORAL_METRIC_RESOLVERS.grossProfitRate({ ...baseRow, coreSales: 0 })).toBeNull()
  })

  it('全 6 メトリクスが定義されている', () => {
    expect(Object.keys(TEMPORAL_METRIC_RESOLVERS).sort()).toEqual([
      'customers',
      'discount',
      'grossProfitRate',
      'quantity',
      'sales',
      'transactionValue',
    ])
  })
})

describe('resolveAllMetrics', () => {
  it('全 metric を Record で返す', () => {
    const result = resolveAllMetrics(baseRow)
    expect(result).toEqual({
      sales: 1000,
      customers: 100,
      transactionValue: 10,
      grossProfitRate: 0.2,
      quantity: 50,
      discount: 30,
    })
  })

  it('null 値も保持（resolver が null 返す）', () => {
    const result = resolveAllMetrics({ ...baseRow, customers: 0, coreSales: 0 })
    expect(result.transactionValue).toBeNull()
    expect(result.grossProfitRate).toBeNull()
    expect(result.sales).toBe(1000) // null じゃない方は値が入る
  })

  it('全フィールド 0 でも結果オブジェクトを返す', () => {
    const zero: StoreDaySummaryTemporalRow = {
      sales: 0,
      customers: 0,
      coreSales: 0,
      totalQuantity: 0,
      discountAbsolute: 0,
    }
    const result = resolveAllMetrics(zero)
    expect(result.sales).toBe(0)
    expect(result.transactionValue).toBeNull()
    expect(result.grossProfitRate).toBeNull()
  })
})
