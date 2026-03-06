import { describe, it, expect } from 'vitest'
import { createEmptyMonthlyData } from './MonthlyData'

describe('MonthlyData', () => {
  describe('createEmptyMonthlyData', () => {
    it('should create empty MonthlyData with correct origin', () => {
      const origin = { year: 2026, month: 3, importedAt: '2026-03-01T00:00:00Z' }
      const result = createEmptyMonthlyData(origin)

      expect(result.origin).toEqual(origin)
      expect(result.stores).toBeInstanceOf(Map)
      expect(result.stores.size).toBe(0)
      expect(result.suppliers).toBeInstanceOf(Map)
      expect(result.suppliers.size).toBe(0)
    })

    it('should create empty collections for all data types', () => {
      const origin = { year: 2025, month: 12, importedAt: '2025-12-01T00:00:00Z' }
      const result = createEmptyMonthlyData(origin)

      expect(result.purchase).toEqual({ records: [] })
      expect(result.interStoreIn).toEqual({ records: [] })
      expect(result.interStoreOut).toEqual({ records: [] })
      expect(result.flowers).toEqual({ records: [] })
      expect(result.directProduce).toEqual({ records: [] })
      expect(result.consumables).toEqual({ records: [] })
      expect(result.categoryTimeSales).toEqual({ records: [] })
      expect(result.departmentKpi).toEqual({ records: [] })
      expect(result.settings).toBeInstanceOf(Map)
      expect(result.settings.size).toBe(0)
      expect(result.budget).toBeInstanceOf(Map)
      expect(result.budget.size).toBe(0)
    })
  })
})
