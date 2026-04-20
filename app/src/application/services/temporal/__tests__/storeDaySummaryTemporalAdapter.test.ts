/**
 * storeDaySummaryTemporalAdapter — adaptStoreDaySummaryRow tests
 */
import { describe, it, expect } from 'vitest'
import {
  adaptStoreDaySummaryRow,
  type StoreDaySummaryRowForTemporal,
} from '../storeDaySummaryTemporalAdapter'

const sampleRow: StoreDaySummaryRowForTemporal = {
  dateKey: '2026-03-15',
  year: 2026,
  month: 3,
  day: 15,
  sales: 1500,
  customers: 120,
  coreSales: 1300,
  totalQuantity: 75,
  discountAbsolute: 50,
}

describe('adaptStoreDaySummaryRow', () => {
  it('date を CalendarDate object に変換する', () => {
    const result = adaptStoreDaySummaryRow(sampleRow)
    expect(result.date).toEqual({ year: 2026, month: 3, day: 15 })
  })

  it('dateKey をそのまま保持', () => {
    const result = adaptStoreDaySummaryRow(sampleRow)
    expect(result.dateKey).toBe('2026-03-15')
  })

  it('sourceMonthKey は year-month 形式（YYYY-MM）', () => {
    const result = adaptStoreDaySummaryRow(sampleRow)
    expect(result.sourceMonthKey).toMatch(/^2026-03$|^2026-3$/) // 表記は実装依存
  })

  it('values に 6 metric が解決済みで入る', () => {
    const result = adaptStoreDaySummaryRow(sampleRow)
    expect(result.values.sales).toBe(1500)
    expect(result.values.customers).toBe(120)
    expect(result.values.quantity).toBe(75)
    expect(result.values.discount).toBe(50)
    expect(result.values.transactionValue).toBeCloseTo(1500 / 120, 10)
    expect(result.values.grossProfitRate).toBeCloseTo((1500 - 1300) / 1500, 10)
  })

  it('customers=0 の row も grossProfitRate / transactionValue は null で構築される', () => {
    const result = adaptStoreDaySummaryRow({
      ...sampleRow,
      customers: 0,
      coreSales: 0,
    })
    expect(result.values.transactionValue).toBeNull()
    expect(result.values.grossProfitRate).toBeNull()
  })
})
