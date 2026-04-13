/**
 * monthlyDataAdapter.ts — MonthlyData ← → ImportedData adapter
 *
 * 検証対象:
 * - toMonthlyData: ImportedData → MonthlyData (prevYear* を削除、origin を追加)
 * - toAppData: current + (optional) prevYear のペア構築
 * - toLegacyImportedData: AppData + slices → ImportedData
 *   - current=null で throw
 *   - slices 無しで空 slices を使用
 */
import { describe, it, expect } from 'vitest'
import {
  toMonthlyData,
  toAppData,
  toLegacyImportedData,
  type LegacyComparisonSlices,
} from '../monthlyDataAdapter'
import type { ImportedData } from '../ImportedData'
import type { AppData } from '../MonthlyData'
import type { DataOrigin } from '../DataOrigin'

function makeOrigin(overrides: Partial<DataOrigin> = {}): DataOrigin {
  return {
    year: 2026,
    month: 4,
    importedAt: '2026-04-13T00:00:00Z',
    ...overrides,
  }
}

function makeImported(overrides: Partial<ImportedData> = {}): ImportedData {
  return {
    stores: { records: [] },
    suppliers: { records: [] },
    classifiedSales: { records: [] },
    purchase: { records: [] },
    interStoreIn: { records: [] },
    interStoreOut: { records: [] },
    flowers: { records: [] },
    directProduce: { records: [] },
    consumables: { records: [] },
    categoryTimeSales: { records: [] },
    departmentKpi: { records: [] },
    settings: { records: [] },
    budget: { records: [] },
    prevYearClassifiedSales: { records: [] },
    prevYearCategoryTimeSales: { records: [] },
    prevYearFlowers: { records: [] },
    prevYearPurchase: { records: [] },
    prevYearDirectProduce: { records: [] },
    prevYearInterStoreIn: { records: [] },
    prevYearInterStoreOut: { records: [] },
    ...overrides,
  } as unknown as ImportedData
}

// ─── toMonthlyData ──────────────────────────

describe('toMonthlyData', () => {
  it('origin を設定する', () => {
    const imported = makeImported()
    const origin = makeOrigin()
    const result = toMonthlyData(imported, origin)
    expect(result.origin).toBe(origin)
  })

  it('各 slice を伝搬する', () => {
    const imported = makeImported({
      stores: { records: [{ id: 's1' }] } as unknown as ImportedData['stores'],
    })
    const result = toMonthlyData(imported, makeOrigin())
    expect(result.stores).toBe(imported.stores)
  })

  it('prevYear* フィールドは含まれない', () => {
    const imported = makeImported()
    const result = toMonthlyData(imported, makeOrigin())
    expect('prevYearClassifiedSales' in result).toBe(false)
    expect('prevYearFlowers' in result).toBe(false)
  })
})

// ─── toAppData ──────────────────────────────

describe('toAppData', () => {
  it('prevYear=undefined → prevYear=null', () => {
    const imported = makeImported()
    const result = toAppData(imported, makeOrigin())
    expect(result.prevYear).toBeNull()
    expect(result.current).toBeDefined()
  })

  it('prevYear 有 → current + prevYear 両方構築', () => {
    const cur = makeImported()
    const prev = makeImported()
    const curOrigin = makeOrigin()
    const prevOrigin = makeOrigin({ year: 2025 })
    const result = toAppData(cur, curOrigin, prev, prevOrigin)
    expect(result.current.origin).toBe(curOrigin)
    expect(result.prevYear?.origin).toBe(prevOrigin)
  })

  it('prevYearImported 有 + prevYearOrigin 無 → prevYear=null', () => {
    const imported = makeImported()
    const result = toAppData(imported, makeOrigin(), imported)
    expect(result.prevYear).toBeNull()
  })
})

// ─── toLegacyImportedData ─────────────────

describe('toLegacyImportedData', () => {
  it('current=null で throw', () => {
    const appData: AppData = { current: null, prevYear: null }
    expect(() => toLegacyImportedData(appData)).toThrow(/current is null/)
  })

  it('slices 無 → 空 prevYear* を使用', () => {
    const current = toMonthlyData(makeImported(), makeOrigin())
    const appData: AppData = { current, prevYear: null }
    const result = toLegacyImportedData(appData)
    expect(result.prevYearClassifiedSales.records).toEqual([])
    expect(result.prevYearFlowers.records).toEqual([])
  })

  it('slices 有 → prevYear* を伝搬', () => {
    const current = toMonthlyData(makeImported(), makeOrigin())
    const appData: AppData = { current, prevYear: null }
    const slices: LegacyComparisonSlices = {
      prevYearClassifiedSales: {
        records: [{ id: 'x' }],
      } as unknown as LegacyComparisonSlices['prevYearClassifiedSales'],
      prevYearCategoryTimeSales: {
        records: [],
      } as LegacyComparisonSlices['prevYearCategoryTimeSales'],
      prevYearFlowers: { records: [] } as LegacyComparisonSlices['prevYearFlowers'],
      prevYearPurchase: { records: [] } as LegacyComparisonSlices['prevYearPurchase'],
      prevYearDirectProduce: { records: [] } as LegacyComparisonSlices['prevYearDirectProduce'],
      prevYearInterStoreIn: { records: [] } as LegacyComparisonSlices['prevYearInterStoreIn'],
      prevYearInterStoreOut: { records: [] } as LegacyComparisonSlices['prevYearInterStoreOut'],
    }
    const result = toLegacyImportedData(appData, slices)
    expect(result.prevYearClassifiedSales.records).toHaveLength(1)
  })

  it('current の各 slice を伝搬', () => {
    const current = toMonthlyData(makeImported(), makeOrigin())
    const appData: AppData = { current, prevYear: null }
    const result = toLegacyImportedData(appData)
    expect(result.stores).toBe(current.stores)
    expect(result.classifiedSales).toBe(current.classifiedSales)
  })
})
