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

    function createImportRepo() {
      return {
        ...createMockRepo(createEmptyImportedData()),
        listStoredMonths: vi.fn().mockResolvedValue([]),
        loadMonthlyData: vi.fn().mockResolvedValue(null),
        saveMonthlyData: vi.fn().mockImplementation(async (data: ImportedData) => {
          savedData = data
        }),
      } as unknown as DataRepository
    }

    it('export → import でストアデータが復元されること', async () => {
      const testData = createTestData()
      const exportRepo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(exportRepo)
      const importRepo = createImportRepo()

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
      const importRepo = createImportRepo()

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
      const importRepo = createImportRepo()

      await backupExporter.importBackup(blob, importRepo)

      expect(savedData!.settings).toBeInstanceOf(Map)
      expect(savedData!.settings.size).toBe(1)
      expect(savedData!.settings.get('1')?.openingInventory).toBe(1000000)
    })

    it('export → import で suppliers が Map として復元されること', async () => {
      const testData = createTestData()
      const exportRepo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(exportRepo)
      const importRepo = createImportRepo()

      await backupExporter.importBackup(blob, importRepo)

      expect(savedData!.suppliers).toBeInstanceOf(Map)
      expect(savedData!.suppliers.size).toBe(1)
      expect(savedData!.suppliers.get('S001')?.name).toBe('仕入先A')
    })

    it('既存データがある場合に overwrite=false でスキップされること', async () => {
      const testData = createTestData()
      const exportRepo = createMockRepo(testData)
      const blob = await backupExporter.exportBackup(exportRepo)

      // import repo: 既存データあり
      const existingRepo = {
        ...createMockRepo(testData),
        saveMonthlyData: vi.fn(),
      } as unknown as DataRepository

      const result = await backupExporter.importBackup(blob, existingRepo, {
        overwriteExisting: false,
      })
      expect(result.monthsImported).toBe(0)
      expect(result.monthsSkipped).toBe(1)
      expect(existingRepo.saveMonthlyData).not.toHaveBeenCalled()
    })

    it('overwrite=true で既存データを上書きすること', async () => {
      const testData = createTestData()
      const exportRepo = createMockRepo(testData)
      const blob = await backupExporter.exportBackup(exportRepo)

      const overwriteRepo = {
        ...createMockRepo(testData),
        saveMonthlyData: vi.fn().mockResolvedValue(undefined),
      } as unknown as DataRepository

      const result = await backupExporter.importBackup(blob, overwriteRepo, {
        overwriteExisting: true,
      })
      expect(result.monthsImported).toBe(1)
      expect(result.monthsSkipped).toBe(0)
      expect(overwriteRepo.saveMonthlyData).toHaveBeenCalled()
    })

    it('不正なバージョンのバックアップはエラーを返すこと', async () => {
      const badBackup = JSON.stringify({
        meta: { formatVersion: 999 },
        months: [],
      })
      const blob = new Blob([badBackup], { type: 'application/json' })
      const importRepo = createImportRepo()

      const result = await backupExporter.importBackup(blob, importRepo)
      expect(result.monthsImported).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('999')
    })
  })

  describe('readMeta', () => {
    it('バックアップファイルのメタデータを読み取れること', async () => {
      const testData = createTestData()
      const repo = createMockRepo(testData)
      const blob = await backupExporter.exportBackup(repo)

      const meta = await backupExporter.readMeta(blob)
      expect(meta).not.toBeNull()
      expect(meta!.formatVersion).toBe(1)
      expect(meta!.months).toHaveLength(1)
      expect(meta!.months[0]).toEqual({ year: 2025, month: 1 })
    })

    it('不正なJSONはnullを返すこと', async () => {
      const blob = new Blob(['not json'], { type: 'application/json' })
      const meta = await backupExporter.readMeta(blob)
      expect(meta).toBeNull()
    })
  })

  describe('往復テスト（全フィールド完全性）', () => {
    it('全Map フィールドの内容が export → import で完全に保存されること', async () => {
      const testData = createTestData()
      const exportRepo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(exportRepo)

      let restoredData: ImportedData | null = null
      const importRepo = {
        ...createMockRepo(createEmptyImportedData()),
        listStoredMonths: vi.fn().mockResolvedValue([]),
        loadMonthlyData: vi.fn().mockResolvedValue(null),
        saveMonthlyData: vi.fn().mockImplementation(async (data: ImportedData) => {
          restoredData = data
        }),
      } as unknown as DataRepository

      await backupExporter.importBackup(blob, importRepo)

      // stores 完全一致
      expect(restoredData!.stores.size).toBe(testData.stores.size)
      for (const [k, v] of testData.stores) {
        expect(restoredData!.stores.get(k)).toEqual(v)
      }

      // suppliers 完全一致
      expect(restoredData!.suppliers.size).toBe(testData.suppliers.size)
      for (const [k, v] of testData.suppliers) {
        expect(restoredData!.suppliers.get(k)).toEqual(v)
      }

      // settings 完全一致
      expect(restoredData!.settings.size).toBe(testData.settings.size)
      for (const [k, v] of testData.settings) {
        expect(restoredData!.settings.get(k)).toEqual(v)
      }

      // budget 完全一致（daily Map 含む）
      expect(restoredData!.budget.size).toBe(testData.budget.size)
      for (const [k, orig] of testData.budget) {
        const restored = restoredData!.budget.get(k)
        expect(restored).toBeDefined()
        expect(restored!.storeId).toBe(orig.storeId)
        expect(restored!.total).toBe(orig.total)
        expect(restored!.daily.size).toBe(orig.daily.size)
        for (const [day, amount] of orig.daily) {
          expect(restored!.daily.get(day)).toBe(amount)
        }
      }
    })
  })
})
