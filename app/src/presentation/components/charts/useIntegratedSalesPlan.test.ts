/**
 * useIntegratedSalesPlan — buildQtyPairInput の純粋関数テスト
 *
 * @guard H1 Screen Plan 経由のみ
 */
import { describe, it, expect } from 'vitest'
import { buildQtyPairInput } from './useIntegratedSalesPlan'
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/CalendarDate'

const currentDateRange: DateRange = {
  from: { year: 2025, month: 3, day: 1 },
  to: { year: 2025, month: 3, day: 31 },
}

describe('buildQtyPairInput', () => {
  it('current-only: prevDateFrom/To は設定されない', () => {
    const result = buildQtyPairInput(currentDateRange, undefined, undefined)
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    expect(result.dateFrom).toBe(fromKey)
    expect(result.dateTo).toBe(toKey)
    expect(result.storeIds).toBeUndefined()
    expect(result.prevDateFrom).toBeUndefined()
    expect(result.prevDateTo).toBeUndefined()
  })

  it('storeIds を渡すとそのまま設定される', () => {
    const result = buildQtyPairInput(currentDateRange, ['S1', 'S2'], undefined)
    expect(result.storeIds).toEqual(['S1', 'S2'])
  })

  it('prevYearDateRange を渡すと prevDateFrom/To が設定される', () => {
    const prevDateRange: DateRange = {
      from: { year: 2024, month: 3, day: 1 },
      to: { year: 2024, month: 3, day: 31 },
    }
    const result = buildQtyPairInput(currentDateRange, undefined, prevDateRange)
    const { fromKey: pFrom, toKey: pTo } = dateRangeToKeys(prevDateRange)
    expect(result.prevDateFrom).toBe(pFrom)
    expect(result.prevDateTo).toBe(pTo)
  })

  it('storeIds + prevYearDateRange を同時に渡す', () => {
    const prevDateRange: DateRange = {
      from: { year: 2024, month: 3, day: 1 },
      to: { year: 2024, month: 3, day: 31 },
    }
    const result = buildQtyPairInput(currentDateRange, ['S1'], prevDateRange)
    expect(result.storeIds).toEqual(['S1'])
    expect(result.prevDateFrom).toBeDefined()
  })
})
