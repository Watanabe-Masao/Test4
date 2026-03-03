/**
 * backupExporter テスト
 *
 * Map シリアライズの往復テストを含む。
 * JSON.stringify で Map が {} に化けるバグの再発防止。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { backupExporter } from '../backupExporter'
import type { DataRepository } from '@/domain/repositories'
import type { ImportedData, BudgetData } from '@/domain/models'
import { createEmptyImportedData } from '@/domain/models'

function createTestData(): ImportedData {
  return {
    ...createEmptyImportedData(),
    stores: new Map([
      ['1', { id: '1', code: '0001', name: '本店' }],
      ['2', { id: '2', code: '0002', name: '支店A' }],
    ]),
    suppliers: new Map([['S001', { code: 'S001', name: '仕入先A' }]]),
    settings: new Map([
      [
        '1',
        {
          storeId: '1',
          openingInventory: 1000000,
          closingInventory: 900000,
          grossProfitBudget: 500000,
          productInventory: null,
          consumableInventory: null,
          inventoryDate: null,
          closingInventoryDay: null,
        },
      ],
    ]),
    budget: new Map<string, BudgetData>([
      [
        '1',
        {
          storeId: '1',
          total: 3000000,
          daily: new Map([
            [1, 100000],
            [2, 100000],
            [3, 100000],
          ]),
        },
      ],
      [
        '2',
        {
          storeId: '2',
          total: 2000000,
          daily: new Map([
            [1, 70000],
            [2, 70000],
          ]),
        },
      ],
    ]),
  }
}

function createMockRepo(data: ImportedData): DataRepository {
  return {
    isAvailable: () => true,
    listStoredMonths: vi.fn().mockResolvedValue([{ year: 2025, month: 1 }]),
    loadMonthlyData: vi.fn().mockResolvedValue(data),
    saveMonthlyData: vi.fn().mockResolvedValue(undefined),
    clearMonthData: vi.fn().mockResolvedValue(undefined),
    clearAllData: vi.fn().mockResolvedValue(undefined),
    getDataSummary: vi.fn().mockResolvedValue([]),
    saveImportHistory: vi.fn().mockResolvedValue(undefined),
    loadImportHistory: vi.fn().mockResolvedValue(null),
    saveSummaryCache: vi.fn().mockResolvedValue(undefined),
    loadSummaryCache: vi.fn().mockResolvedValue(null),
  } as unknown as DataRepository
}

describe('backupExporter', () => {
  describe('exportBackup — Map シリアライズ', () => {
    it('Map フィールドが JSON に正しくシリアライズされること', async () => {
      const testData = createTestData()
      const repo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(repo)
      const text = await blob.text()
      const parsed = JSON.parse(text)

      // stores が空オブジェクトではないこと
      const monthData = parsed.months[0].data
      expect(Object.keys(monthData.stores).length).toBe(2)
      expect(monthData.stores['1'].name).toBe('本店')
      expect(monthData.stores['2'].name).toBe('支店A')
    })

    it('budget.daily (Map<number,number>) がシリアライズされること', async () => {
      const testData = createTestData()
      const repo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(repo)
      const text = await blob.text()
      const parsed = JSON.parse(text)

      const budget = parsed.months[0].data.budget
      expect(Object.keys(budget).length).toBe(2)
      expect(budget['1'].total).toBe(3000000)
      expect(budget['1'].daily['1']).toBe(100000)
      expect(budget['1'].daily['2']).toBe(100000)
    })

    it('suppliers と settings がシリアライズされること', async () => {
      const testData = createTestData()
      const repo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(repo)
      const text = await blob.text()
      const parsed = JSON.parse(text)

      const monthData = parsed.months[0].data
      expect(Object.keys(monthData.suppliers).length).toBe(1)
      expect(monthData.suppliers['S001'].name).toBe('仕入先A')
      expect(Object.keys(monthData.settings).length).toBe(1)
      expect(monthData.settings['1'].openingInventory).toBe(1000000)
    })
  })

  describe('importBackup — Map 復元', () => {
    let savedData: ImportedData | null = null

    beforeEach(() => {
      savedData = null
    })

    it('export → import でストアデータが復元されること', async () => {
      const testData = createTestData()
      const exportRepo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(exportRepo)

      // import 用 repo: 既存データなし、saveMonthlyData でキャプチャ
      const importRepo = {
        ...createMockRepo(createEmptyImportedData()),
        listStoredMonths: vi.fn().mockResolvedValue([]),
        loadMonthlyData: vi.fn().mockResolvedValue(null),
        saveMonthlyData: vi.fn().mockImplementation(async (data: ImportedData) => {
          savedData = data
        }),
      } as unknown as DataRepository

      const result = await backupExporter.importBackup(blob, importRepo)
      expect(result.monthsImported).toBe(1)
      expect(result.errors).toHaveLength(0)

      // stores が Map として復元されていること
      expect(savedData).not.toBeNull()
      expect(savedData!.stores).toBeInstanceOf(Map)
      expect(savedData!.stores.size).toBe(2)
      expect(savedData!.stores.get('1')?.name).toBe('本店')
    })

    it('export → import で budget.daily が Map として復元されること', async () => {
      const testData = createTestData()
      const exportRepo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(exportRepo)

      const importRepo = {
        ...createMockRepo(createEmptyImportedData()),
        listStoredMonths: vi.fn().mockResolvedValue([]),
        loadMonthlyData: vi.fn().mockResolvedValue(null),
        saveMonthlyData: vi.fn().mockImplementation(async (data: ImportedData) => {
          savedData = data
        }),
      } as unknown as DataRepository

      await backupExporter.importBackup(blob, importRepo)

      expect(savedData!.budget).toBeInstanceOf(Map)
      expect(savedData!.budget.size).toBe(2)

      const budget1 = savedData!.budget.get('1')
      expect(budget1).toBeDefined()
      expect(budget1!.total).toBe(3000000)
      expect(budget1!.daily).toBeInstanceOf(Map)
      expect(budget1!.daily.get(1)).toBe(100000)
    })

    it('export → import で settings が Map として復元されること', async () => {
      const testData = createTestData()
      const exportRepo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(exportRepo)

      const importRepo = {
        ...createMockRepo(createEmptyImportedData()),
        listStoredMonths: vi.fn().mockResolvedValue([]),
        loadMonthlyData: vi.fn().mockResolvedValue(null),
        saveMonthlyData: vi.fn().mockImplementation(async (data: ImportedData) => {
          savedData = data
        }),
      } as unknown as DataRepository

      await backupExporter.importBackup(blob, importRepo)

      expect(savedData!.settings).toBeInstanceOf(Map)
      expect(savedData!.settings.size).toBe(1)
      expect(savedData!.settings.get('1')?.openingInventory).toBe(1000000)
    })
  })
})
