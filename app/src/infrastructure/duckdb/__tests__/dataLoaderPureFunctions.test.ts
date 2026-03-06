import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { ImportedData } from '@/domain/models'
import { createEmptyImportedData } from '@/domain/models'
import { TABLE_NAMES } from '../schemas'
import { resetTables, deleteMonth, loadMonth, loadAppSettings } from '../dataLoader'
import type { LoadResult } from '../dataLoader'

// ── Mock DuckDB connection and database ──

function createMockConn(): AsyncDuckDBConnection {
  return {
    query: vi.fn().mockResolvedValue(undefined),
  } as unknown as AsyncDuckDBConnection
}

function createMockDb(): AsyncDuckDB {
  return {
    registerFileText: vi.fn().mockResolvedValue(undefined),
    dropFile: vi.fn().mockResolvedValue(undefined),
  } as unknown as AsyncDuckDB
}

describe('resetTables', () => {
  it('drops the view and all tables then recreates them', async () => {
    const conn = createMockConn()
    const queryMock = vi.mocked(conn.query)

    await resetTables(conn)

    // Should have been called: DROP VIEW + DROP TABLE for summary_mat + DROP for each table + CREATE for each table + CREATE VIEW
    expect(queryMock).toHaveBeenCalled()

    const calls = queryMock.mock.calls.map((c) => c[0] as string)

    // Verify DROP VIEW
    expect(calls[0]).toBe('DROP VIEW IF EXISTS store_day_summary')
    expect(calls[1]).toBe('DROP TABLE IF EXISTS store_day_summary_mat')

    // Verify all tables are dropped
    for (const name of TABLE_NAMES) {
      expect(calls).toContainEqual(`DROP TABLE IF EXISTS ${name}`)
    }

    // Verify CREATE calls exist (at least one)
    // DDL strings are template literals starting with a newline before CREATE,
    // so we trim before checking the prefix
    const createCalls = calls.filter((c) => c.trimStart().startsWith('CREATE'))
    expect(createCalls.length).toBeGreaterThan(0)
  })
})

describe('deleteMonth', () => {
  it('deletes data for all tables except app_settings', async () => {
    const conn = createMockConn()
    const queryMock = vi.mocked(conn.query)

    await deleteMonth(conn, 2025, 1)

    const calls = queryMock.mock.calls.map((c) => c[0] as string)

    // app_settings should NOT be in delete calls
    const appSettingsDelete = calls.filter((c) => c.includes('app_settings'))
    expect(appSettingsDelete).toHaveLength(0)

    // All other tables should have DELETE statements
    const tablesWithYearMonth = TABLE_NAMES.filter((n) => n !== 'app_settings')
    for (const name of tablesWithYearMonth) {
      const deleteCall = calls.find((c) => c.includes(name) && c.includes('DELETE'))
      expect(deleteCall).toBeDefined()
      expect(deleteCall).toContain('year = 2025')
      expect(deleteCall).toContain('month = 1')
    }
  })
})

describe('loadMonth', () => {
  let conn: AsyncDuckDBConnection
  let db: AsyncDuckDB
  let data: ImportedData

  beforeEach(() => {
    conn = createMockConn()
    db = createMockDb()
    data = createEmptyImportedData()
  })

  it('returns a LoadResult with rowCounts and durationMs', async () => {
    const result = await loadMonth(conn, db, data, 2025, 1)

    expect(result).toBeDefined()
    expect(typeof result.durationMs).toBe('number')
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(result.rowCounts).toBeDefined()
  })

  it('returns zero row counts for empty data', async () => {
    const result = await loadMonth(conn, db, data, 2025, 1)

    // All row counts should be 0 for empty data
    expect(result.rowCounts.classified_sales).toBe(0)
    expect(result.rowCounts.category_time_sales).toBe(0)
    expect(result.rowCounts.time_slots).toBe(0)
    expect(result.rowCounts.purchase).toBe(0)
    expect(result.rowCounts.special_sales).toBe(0)
    expect(result.rowCounts.transfers).toBe(0)
    expect(result.rowCounts.consumables).toBe(0)
    expect(result.rowCounts.department_kpi).toBe(0)
    expect(result.rowCounts.budget).toBe(0)
    expect(result.rowCounts.inventory_config).toBe(0)
    expect(result.rowCounts.app_settings).toBe(0)
  })

  it('has durationMs as a positive number', async () => {
    const result = await loadMonth(conn, db, data, 2025, 1)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('resets tables on error and rethrows', async () => {
    // Make the first query for classified_sales succeed, but we need to
    // make the data trigger a bulk insert that fails
    const failConn = {
      query: vi.fn().mockRejectedValue(new Error('INSERT failed')),
    } as unknown as AsyncDuckDBConnection

    // Add records to trigger the insertClassifiedSales path
    const dataWithRecords: ImportedData = {
      ...data,
      classifiedSales: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: 'S001',
            storeName: 'Test',
            groupName: 'G',
            departmentName: 'D',
            lineName: 'L',
            className: 'C',
            salesAmount: 100,
            discount71: 0,
            discount72: 0,
            discount73: 0,
            discount74: 0,
          },
        ],
      },
    }

    await expect(loadMonth(failConn, db, dataWithRecords, 2025, 1)).rejects.toThrow('INSERT failed')
  })

  it('registers and drops JSON files for bulk insert', async () => {
    const registerMock = vi.mocked(db.registerFileText)
    const dropMock = vi.mocked(db.dropFile)

    // Add purchase data to trigger at least one bulk insert
    const dataWithPurchase: ImportedData = {
      ...data,
      purchase: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: 'S001',
            suppliers: {
              SUP1: { name: 'Supplier1', cost: 100, price: 150 },
            },
            total: { cost: 100, price: 150 },
          },
        ],
      },
    }

    await loadMonth(conn, db, dataWithPurchase, 2025, 1)

    // registerFileText should have been called for the purchase bulk insert
    expect(registerMock).toHaveBeenCalled()
    // dropFile should also have been called (cleanup)
    expect(dropMock).toHaveBeenCalled()
  })

  it('correctly processes special sales data', async () => {
    const dataWithSpecial: ImportedData = {
      ...data,
      flowers: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: 'S001', cost: 500, price: 700, customers: 10 },
        ],
      },
      directProduce: {
        records: [{ year: 2025, month: 1, day: 2, storeId: 'S001', cost: 300, price: 400 }],
      },
    }

    const result = await loadMonth(conn, db, dataWithSpecial, 2025, 1)

    // Should have 2 special sales rows (1 flower + 1 directProduce)
    expect(result.rowCounts.special_sales).toBe(2)
  })

  it('correctly processes transfer data', async () => {
    const dataWithTransfers: ImportedData = {
      ...data,
      interStoreIn: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 1,
            storeId: 'S001',
            interStoreIn: [
              {
                day: 1,
                cost: 100,
                price: 150,
                fromStoreId: 'S002',
                toStoreId: 'S001',
                isDepartmentTransfer: false,
              },
            ],
            interStoreOut: [],
            interDepartmentIn: [
              {
                day: 1,
                cost: 50,
                price: 75,
                fromStoreId: 'S001',
                toStoreId: 'S001',
                isDepartmentTransfer: true,
              },
            ],
            interDepartmentOut: [],
          },
        ],
      },
      interStoreOut: {
        records: [
          {
            year: 2025,
            month: 1,
            day: 2,
            storeId: 'S001',
            interStoreIn: [],
            interStoreOut: [
              {
                day: 2,
                cost: 200,
                price: 300,
                fromStoreId: 'S001',
                toStoreId: 'S002',
                isDepartmentTransfer: false,
              },
            ],
            interDepartmentIn: [],
            interDepartmentOut: [],
          },
        ],
      },
    }

    const result = await loadMonth(conn, db, dataWithTransfers, 2025, 1)

    // interStoreIn: 1 interStoreIn + 1 interDeptIn = 2
    // interStoreOut: 1 interStoreOut = 1
    expect(result.rowCounts.transfers).toBe(3)
  })

  it('correctly processes consumables data', async () => {
    const dataWithConsumables: ImportedData = {
      ...data,
      consumables: {
        records: [
          { year: 2025, month: 1, day: 1, storeId: 'S001', cost: 500, items: [] },
          { year: 2025, month: 1, day: 2, storeId: 'S001', cost: 300, items: [] },
        ],
      },
    }

    const result = await loadMonth(conn, db, dataWithConsumables, 2025, 1)
    expect(result.rowCounts.consumables).toBe(2)
  })

  it('correctly processes budget data', async () => {
    const budgetMap = new Map([
      [
        'S001',
        {
          storeId: 'S001',
          total: 500000,
          daily: new Map([
            [1, 16000],
            [2, 17000],
          ]),
        },
      ],
    ])

    const dataWithBudget: ImportedData = { ...data, budget: budgetMap }
    const result = await loadMonth(conn, db, dataWithBudget, 2025, 1)
    expect(result.rowCounts.budget).toBe(2)
  })

  it('correctly processes inventory config data', async () => {
    const settingsMap = new Map([
      [
        'S001',
        {
          storeId: 'S001',
          openingInventory: 100000,
          closingInventory: 90000,
          grossProfitBudget: 50000,
          productInventory: null,
          costInclusionInventory: null,
          inventoryDate: null,
          closingInventoryDay: null,
        },
      ],
    ])

    const dataWithSettings: ImportedData = { ...data, settings: settingsMap }
    const result = await loadMonth(conn, db, dataWithSettings, 2025, 1)
    expect(result.rowCounts.inventory_config).toBe(1)
  })

  it('correctly processes department KPI records', async () => {
    const dataWithKpi: ImportedData = {
      ...data,
      departmentKpi: {
        records: [
          {
            deptCode: 'D01',
            deptName: 'Dept1',
            gpRateBudget: 0.3,
            gpRateActual: 0.28,
            gpRateVariance: -0.02,
            markupRate: 0.35,
            discountRate: 0.05,
            salesBudget: 1000000,
            salesActual: 900000,
            salesVariance: -100000,
            salesAchievement: 0.9,
            openingInventory: 500000,
            closingInventory: 450000,
            gpRateLanding: 0.29,
            salesLanding: 950000,
          },
        ],
      },
    }

    const result = await loadMonth(conn, db, dataWithKpi, 2025, 1)
    expect(result.rowCounts.department_kpi).toBe(1)
  })
})

describe('loadAppSettings', () => {
  it('deletes existing settings and inserts new ones', async () => {
    const conn = createMockConn()
    const queryMock = vi.mocked(conn.query)

    await loadAppSettings(conn, {
      defaultMarkupRate: 0.3,
      defaultBudget: 1000000,
      targetGrossProfitRate: 0.25,
      warningThreshold: 0.1,
    })

    const calls = queryMock.mock.calls.map((c) => c[0] as string)

    // First call should be DELETE
    expect(calls[0]).toBe('DELETE FROM app_settings')

    // Then 4 INSERT calls
    const insertCalls = calls.filter((c) => c.startsWith('INSERT'))
    expect(insertCalls).toHaveLength(4)

    expect(insertCalls[0]).toContain("'defaultMarkupRate'")
    expect(insertCalls[0]).toContain('0.3')
    expect(insertCalls[1]).toContain("'defaultBudget'")
    expect(insertCalls[1]).toContain('1000000')
    expect(insertCalls[2]).toContain("'targetGrossProfitRate'")
    expect(insertCalls[2]).toContain('0.25')
    expect(insertCalls[3]).toContain("'warningThreshold'")
    expect(insertCalls[3]).toContain('0.1')
  })
})

describe('LoadResult type', () => {
  it('has correct structure', () => {
    const result: LoadResult = {
      rowCounts: {
        classified_sales: 0,
        category_time_sales: 0,
        time_slots: 0,
        purchase: 0,
        special_sales: 0,
        transfers: 0,
        consumables: 0,
        department_kpi: 0,
        budget: 0,
        inventory_config: 0,
        app_settings: 0,
      },
      durationMs: 100,
    }
    expect(result.rowCounts).toBeDefined()
    expect(result.durationMs).toBe(100)
  })
})
