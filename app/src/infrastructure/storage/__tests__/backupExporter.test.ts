/**
 * backupExporter テスト
 *
 * Map シリアライズの往復テストを含む。
 * JSON.stringify で Map が {} に化けるバグの再発防止。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { backupExporter } from '../backupExporter'
import type { DataRepository } from '@/domain/repositories'
import type { ImportedData, BudgetData, AppSettings, ImportHistoryEntry } from '@/domain/models'
import { createEmptyImportedData } from '@/domain/models'
import { createDefaultSettings } from '@/domain/constants/defaults'

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
    loadImportHistory: vi.fn().mockResolvedValue([]),
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
      expect(meta!.formatVersion).toBe(2)
      expect(meta!.months).toHaveLength(1)
      expect(meta!.months[0]).toEqual({ year: 2025, month: 1 })
    })

    it('不正なJSONはnullを返すこと', async () => {
      const blob = new Blob(['not json'], { type: 'application/json' })
      const meta = await backupExporter.readMeta(blob)
      expect(meta).toBeNull()
    })
  })

  describe('v2: AppSettings', () => {
    it('AppSettings がバックアップに含まれること', async () => {
      const testData = createTestData()
      const repo = createMockRepo(testData)
      const appSettings: AppSettings = {
        ...createDefaultSettings(),
        targetGrossProfitRate: 0.3,
        flowerCostRate: 0.75,
      }

      const blob = await backupExporter.exportBackup(repo, appSettings)
      const text = await blob.text()
      const parsed = JSON.parse(text)

      expect(parsed.appSettings).toBeDefined()
      expect(parsed.appSettings.targetGrossProfitRate).toBe(0.3)
      expect(parsed.appSettings.flowerCostRate).toBe(0.75)
    })

    it('import で AppSettings が復元されること', async () => {
      const testData = createTestData()
      const exportRepo = createMockRepo(testData)
      const appSettings: AppSettings = {
        ...createDefaultSettings(),
        directProduceCostRate: 0.9,
      }

      const blob = await backupExporter.exportBackup(exportRepo, appSettings)

      const importRepo = {
        ...createMockRepo(createEmptyImportedData()),
        listStoredMonths: vi.fn().mockResolvedValue([]),
        loadMonthlyData: vi.fn().mockResolvedValue(null),
        saveMonthlyData: vi.fn().mockResolvedValue(undefined),
      } as unknown as DataRepository

      const result = await backupExporter.importBackup(blob, importRepo)
      expect(result.restoredAppSettings).toBeDefined()
      expect(result.restoredAppSettings!.directProduceCostRate).toBe(0.9)
    })

    it('AppSettings なしの v1 バックアップは restoredAppSettings が undefined', async () => {
      // v1 形式: appSettings フィールドなし
      const v1Backup = JSON.stringify({
        meta: {
          formatVersion: 1,
          createdAt: new Date().toISOString(),
          appVersion: '1.0.0',
          months: [],
        },
        months: [],
      })
      const blob = new Blob([v1Backup], { type: 'application/json' })

      const importRepo = createMockRepo(createEmptyImportedData())
      const result = await backupExporter.importBackup(blob, importRepo)
      expect(result.restoredAppSettings).toBeUndefined()
    })
  })

  describe('v2: SHA-256 チェックサム', () => {
    it('v2 バックアップにチェックサムが含まれること', async () => {
      const testData = createTestData()
      const repo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(repo)
      const text = await blob.text()
      const parsed = JSON.parse(text)

      expect(parsed.meta.formatVersion).toBe(2)
      expect(parsed.meta.checksum).toBeDefined()
      expect(parsed.meta.checksum).toHaveLength(64) // SHA-256 hex = 64 chars
    })

    it('改ざんされたバックアップはチェックサムエラーになること', async () => {
      const testData = createTestData()
      const repo = createMockRepo(testData)

      const blob = await backupExporter.exportBackup(repo)
      const text = await blob.text()
      const parsed = JSON.parse(text)

      // months データを改ざん
      parsed.months[0].data.stores['1'].name = 'TAMPERED'
      const tampered = new Blob([JSON.stringify(parsed)], { type: 'application/json' })

      const importRepo = {
        ...createMockRepo(createEmptyImportedData()),
        saveMonthlyData: vi.fn(),
      } as unknown as DataRepository

      const result = await backupExporter.importBackup(tampered, importRepo)
      expect(result.monthsImported).toBe(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Checksum mismatch')
    })

    it('チェックサムなしの v1 バックアップは検証をスキップすること', async () => {
      const v1Backup = JSON.stringify({
        meta: {
          formatVersion: 1,
          createdAt: new Date().toISOString(),
          appVersion: '1.0.0',
          months: [{ year: 2025, month: 1 }],
        },
        months: [
          {
            year: 2025,
            month: 1,
            data: {
              ...createEmptyImportedData(),
              stores: {},
              suppliers: {},
              settings: {},
              budget: {},
            },
          },
        ],
      })
      const blob = new Blob([v1Backup], { type: 'application/json' })

      const importRepo = {
        ...createMockRepo(createEmptyImportedData()),
        listStoredMonths: vi.fn().mockResolvedValue([]),
        loadMonthlyData: vi.fn().mockResolvedValue(null),
        saveMonthlyData: vi.fn().mockResolvedValue(undefined),
      } as unknown as DataRepository

      const result = await backupExporter.importBackup(blob, importRepo)
      expect(result.monthsImported).toBe(1)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('v2: readMeta', () => {
    it('v2 バックアップの meta にチェックサムが含まれること', async () => {
      const testData = createTestData()
      const repo = createMockRepo(testData)
      const blob = await backupExporter.exportBackup(repo)

      const meta = await backupExporter.readMeta(blob)
      expect(meta).not.toBeNull()
      expect(meta!.formatVersion).toBe(2)
      expect(meta!.checksum).toBeDefined()
    })
  })

  describe('v2: ImportHistory', () => {
    const testHistory: ImportHistoryEntry[] = [
      {
        importedAt: '2025-01-15T10:30:00.000Z',
        files: [
          {
            filename: 'sales.xlsx',
            type: 'classifiedSales',
            typeName: '部門別売上',
            rowCount: 100,
          },
          { filename: 'purchase.csv', type: 'purchase', typeName: '仕入', rowCount: 50 },
        ],
        successCount: 2,
        failureCount: 0,
      },
    ]

    it('インポート履歴がバックアップに含まれること', async () => {
      const testData = createTestData()
      const repo = {
        ...createMockRepo(testData),
        loadImportHistory: vi.fn().mockResolvedValue(testHistory),
      } as unknown as DataRepository

      const blob = await backupExporter.exportBackup(repo)
      const text = await blob.text()
      const parsed = JSON.parse(text)

      expect(parsed.months[0].importHistory).toBeDefined()
      expect(parsed.months[0].importHistory).toHaveLength(1)
      expect(parsed.months[0].importHistory[0].files).toHaveLength(2)
      expect(parsed.months[0].importHistory[0].files[0].filename).toBe('sales.xlsx')
    })

    it('import でインポート履歴が復元されること', async () => {
      const testData = createTestData()
      const exportRepo = {
        ...createMockRepo(testData),
        loadImportHistory: vi.fn().mockResolvedValue(testHistory),
      } as unknown as DataRepository

      const blob = await backupExporter.exportBackup(exportRepo)

      const saveHistoryMock = vi.fn().mockResolvedValue(undefined)
      const importRepo = {
        ...createMockRepo(createEmptyImportedData()),
        listStoredMonths: vi.fn().mockResolvedValue([]),
        loadMonthlyData: vi.fn().mockResolvedValue(null),
        saveMonthlyData: vi.fn().mockResolvedValue(undefined),
        saveImportHistory: saveHistoryMock,
      } as unknown as DataRepository

      const result = await backupExporter.importBackup(blob, importRepo)
      expect(result.importHistoryRestored).toBe(1)
      expect(saveHistoryMock).toHaveBeenCalledTimes(1)
      expect(saveHistoryMock).toHaveBeenCalledWith(2025, 1, testHistory[0])
    })

    it('履歴なしの月は importHistoryRestored が 0', async () => {
      const testData = createTestData()
      const exportRepo = createMockRepo(testData) // loadImportHistory returns []

      const blob = await backupExporter.exportBackup(exportRepo)

      const importRepo = {
        ...createMockRepo(createEmptyImportedData()),
        listStoredMonths: vi.fn().mockResolvedValue([]),
        loadMonthlyData: vi.fn().mockResolvedValue(null),
        saveMonthlyData: vi.fn().mockResolvedValue(undefined),
      } as unknown as DataRepository

      const result = await backupExporter.importBackup(blob, importRepo)
      expect(result.importHistoryRestored).toBe(0)
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
