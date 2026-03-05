import { describe, it, expect, vi } from 'vitest'

// Mock the infrastructure layer
vi.mock('@/infrastructure/export', () => ({
  exportDailySalesReport: vi.fn(),
  exportMonthlyPLReport: vi.fn(),
  exportStoreKpiReport: vi.fn(),
  exportExplanationReport: vi.fn(),
  exportTextSummaryReport: vi.fn(),
}))

import { exportService } from '../ExportService'
import {
  exportDailySalesReport,
  exportMonthlyPLReport,
  exportStoreKpiReport,
  exportExplanationReport,
  exportTextSummaryReport,
} from '@/infrastructure/export'
import type { StoreResult, Store } from '@/domain/models'
import type { StoreExplanations } from '@/domain/models/Explanation'

describe('ExportService', () => {
  it('delegates exportDailySalesReport', () => {
    const result = {} as StoreResult
    const store = { id: 'S1', name: 'Store1' } as Store
    exportService.exportDailySalesReport(result, store, 2026, 3)
    expect(exportDailySalesReport).toHaveBeenCalledWith(result, store, 2026, 3)
  })

  it('delegates exportMonthlyPLReport', () => {
    const result = {} as StoreResult
    const store = { id: 'S1', name: 'Store1' } as Store
    exportService.exportMonthlyPLReport(result, store, 2026, 3)
    expect(exportMonthlyPLReport).toHaveBeenCalledWith(result, store, 2026, 3)
  })

  it('delegates exportStoreKpiReport', () => {
    const results = new Map<string, StoreResult>()
    const stores = new Map<string, Store>()
    exportService.exportStoreKpiReport(results, stores, 2026, 3)
    expect(exportStoreKpiReport).toHaveBeenCalledWith(results, stores, 2026, 3)
  })

  it('delegates exportExplanationReport', () => {
    const explanations = new Map() as StoreExplanations
    exportService.exportExplanationReport(explanations, 'TestStore', 2026, 3)
    expect(exportExplanationReport).toHaveBeenCalledWith(explanations, 'TestStore', 2026, 3)
  })

  it('delegates exportTextSummaryReport', () => {
    exportService.exportTextSummaryReport('summary text', 'TestStore', 2026, 3)
    expect(exportTextSummaryReport).toHaveBeenCalledWith('summary text', 'TestStore', 2026, 3)
  })
})
