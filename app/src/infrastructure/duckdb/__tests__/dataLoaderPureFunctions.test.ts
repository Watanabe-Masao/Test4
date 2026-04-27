/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import { createEmptyMonthlyData } from '@/domain/models/MonthlyData'
import { TABLE_NAMES } from '../schemas'
import { resetTables, deleteMonth, loadMonth } from '../dataLoader'
import type { LoadResult } from '../dataLoader'

// ── Mock DuckDB connection and database ──
//
// bulkInsert は INSERT ... RETURNING 1 の結果に対して `.toArray().length` を取り、
// 行数が入力配列長と一致しないと例外を投げる（7f0cecd: changes() の DuckDB
// native 置き換え）。テストモックはこの契約を満たす必要がある。
//
// `createMockConn()` は `db.registerFileText` 経由で登録された JSON 文字列を
// file名 → 行数 に記録し、INSERT ... RETURNING クエリが来たときに該当する
// 行数のダミー配列を `toArray()` から返す。

interface MockDuckDBHandles {
  readonly conn: AsyncDuckDBConnection
  readonly db: AsyncDuckDB
  readonly fileRowCounts: Map<string, number>
}

function createMockHandles(): MockDuckDBHandles {
  const fileRowCounts = new Map<string, number>()

  const conn = {
    query: vi.fn(async (sql: string) => {
      if (typeof sql === 'string' && sql.includes('INSERT INTO') && sql.includes('RETURNING')) {
        // INSERT INTO <table> SELECT * FROM read_json('<file>', ...) RETURNING 1
        const fileMatch = sql.match(/read_json(?:_auto)?\('([^']+)'/)
        const fileName = fileMatch?.[1]
        const count = fileName ? (fileRowCounts.get(fileName) ?? 0) : 0
        return { toArray: () => Array.from({ length: count }, () => ({ 1: 1 })) }
      }
      // dropStoreDaySummaryByActualType が information_schema.tables を参照するため
      // VIEW として存在することを mock で通知する
      if (
        typeof sql === 'string' &&
        sql.includes('information_schema.tables') &&
        sql.includes('table_type') &&
        sql.includes('store_day_summary')
      ) {
        return { toArray: () => [{ table_type: 'VIEW' }] }
      }
      return { toArray: () => [] }
    }),
  } as unknown as AsyncDuckDBConnection

  const db = {
    registerFileText: vi.fn(async (name: string, json: string) => {
      try {
        const parsed = JSON.parse(json) as unknown
        fileRowCounts.set(name, Array.isArray(parsed) ? parsed.length : 0)
      } catch {
        fileRowCounts.set(name, 0)
      }
    }),
    dropFile: vi.fn(async (name: string) => {
      fileRowCounts.delete(name)
    }),
  } as unknown as AsyncDuckDB

  return { conn, db, fileRowCounts }
}

function createMockConn(): AsyncDuckDBConnection {
  return createMockHandles().conn
}

describe('resetTables', () => {
  it('drops the view and all tables then recreates them', async () => {
    const conn = createMockConn()
    const queryMock = vi.mocked(conn.query)

    await resetTables(conn)

    // Should have been called: DROP VIEW + DROP TABLE for summary_mat + DROP for each table + CREATE for each table + CREATE VIEW
    expect(queryMock).toHaveBeenCalled()

    const calls = queryMock.mock.calls.map((c) => c[0] as string)

    // dropStoreDaySummaryByActualType: information_schema で実型を特定してから
    // 正しい型の DROP を 1 回だけ発行する（mock は VIEW を返す）
    expect(calls[0]).toContain('information_schema.tables')
    expect(calls[0]).toContain('store_day_summary')
    expect(calls).toContain('DROP VIEW IF EXISTS store_day_summary')
    // 実型を判定しているため、反対側の DROP は発行されない
    expect(calls).not.toContain('DROP TABLE IF EXISTS store_day_summary')

    // Verify all tables are dropped (except persistent cache tables like weather_hourly)
    const persistentTables = new Set(['weather_hourly'])
    for (const name of TABLE_NAMES) {
      if (persistentTables.has(name)) {
        expect(calls).not.toContainEqual(`DROP TABLE IF EXISTS ${name}`)
      } else {
        expect(calls).toContainEqual(`DROP TABLE IF EXISTS ${name}`)
      }
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

    // weather_hourly should NOT be in delete calls (persistent cache)
    const weatherDelete = calls.filter((c) => c.includes('weather_hourly'))
    expect(weatherDelete).toHaveLength(0)

    // All other tables (except app_settings and persistent caches) should have DELETE statements
    const persistentCaches = new Set(['weather_hourly'])
    const tablesWithYearMonth = TABLE_NAMES.filter(
      (n) => n !== 'app_settings' && !persistentCaches.has(n),
    )
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
  let data: MonthlyData

  beforeEach(() => {
    // `createMockHandles()` で conn / db を同一 fileRowCounts Map に接続する。
    // これにより bulkInsert の INSERT ... RETURNING 1 検証が通る。
    const handles = createMockHandles()
    conn = handles.conn
    db = handles.db
    data = createEmptyMonthlyData({ year: 2025, month: 1, importedAt: '' })
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

  it('deletes partial month data on error and rethrows', async () => {
    // Make the first query for classified_sales succeed, but we need to
    // make the data trigger a bulk insert that fails
    const failConn = {
      query: vi.fn().mockRejectedValue(new Error('INSERT failed')),
    } as unknown as AsyncDuckDBConnection

    // Add records to trigger the insertClassifiedSales path
    const dataWithRecords: MonthlyData = {
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
    const dataWithPurchase: MonthlyData = {
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
    const dataWithSpecial: MonthlyData = {
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
    const dataWithTransfers: MonthlyData = {
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
    const dataWithConsumables: MonthlyData = {
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

    const dataWithBudget: MonthlyData = { ...data, budget: budgetMap }
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

    const dataWithSettings: MonthlyData = { ...data, settings: settingsMap }
    const result = await loadMonth(conn, db, dataWithSettings, 2025, 1)
    expect(result.rowCounts.inventory_config).toBe(1)
  })

  it('correctly processes department KPI records', async () => {
    const dataWithKpi: MonthlyData = {
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
        weather_hourly: 0,
      },
      durationMs: 100,
    }
    expect(result.rowCounts).toBeDefined()
    expect(result.durationMs).toBe(100)
  })
})

// ── isPrevYear パラメータのテスト ──

describe('loadMonth with isPrevYear=true', () => {
  let conn: AsyncDuckDBConnection
  let db: AsyncDuckDB
  let data: MonthlyData

  beforeEach(() => {
    const handles = createMockHandles()
    conn = handles.conn
    db = handles.db
    data = createEmptyMonthlyData({ year: 2024, month: 1, importedAt: '' })
  })

  it('isPrevYear=true で当年のみテーブル（consumables/departmentKpi/budget/inventoryConfig）が 0 件', async () => {
    const dataWithBudget: MonthlyData = {
      ...data,
      budget: new Map([['s1', { total: 1000 } as never]]),
      consumables: {
        records: [{ year: 2024, month: 1, day: 1, storeId: 's1', cost: 100, items: [] }],
      },
    }
    const result = await loadMonth(conn, db, dataWithBudget, 2024, 1, true)
    expect(result.rowCounts.consumables).toBe(0)
    expect(result.rowCounts.department_kpi).toBe(0)
    expect(result.rowCounts.budget).toBe(0)
    expect(result.rowCounts.inventory_config).toBe(0)
  })

  it('isPrevYear=false（デフォルト）で当年テーブルが投入される', async () => {
    const result = await loadMonth(conn, db, data, 2024, 1)
    // 空データでも 0 件で正常終了
    expect(result.rowCounts.consumables).toBe(0)
    expect(result.rowCounts.budget).toBe(0)
  })
})

// ── 冪等性（replace セマンティクス）のテスト ──
// Phase 3.b: loadMonth を冪等 API として機械的に固定する。
// 契約: loadMonth は対象スコープを内部で削除してから INSERT する。
// 同じ月を何度 loadMonth しても結果は等価である必要がある。
// 関連: references/03-guides/data-load-idempotency-plan.md, #993, #994

describe('loadMonth idempotency contract', () => {
  let conn: AsyncDuckDBConnection
  let db: AsyncDuckDB
  let data: MonthlyData

  beforeEach(() => {
    const handles = createMockHandles()
    conn = handles.conn
    db = handles.db
    data = createEmptyMonthlyData({ year: 2025, month: 4, importedAt: '' })
  })

  /** 特定テーブルに対する `DELETE WHERE year=? AND month=?` 発行回数を数える */
  function countPurgeCalls(
    connection: AsyncDuckDBConnection,
    table: string,
    year: number,
    month: number,
  ): number {
    const queryMock = vi.mocked(connection.query)
    const calls = queryMock.mock.calls.map((c) => c[0] as string)
    return calls.filter(
      (sql) =>
        sql.trimStart().startsWith('DELETE FROM') &&
        sql.includes(table) &&
        sql.includes(`year = ${year}`) &&
        sql.includes(`month = ${month}`),
    ).length
  }

  it('当年 loadMonth は先頭で (year, month) を purge する', async () => {
    await loadMonth(conn, db, data, 2025, 4)
    // 代表テーブル classified_sales に対して head purge が発行される
    expect(countPurgeCalls(conn, 'classified_sales', 2025, 4)).toBeGreaterThanOrEqual(1)
  })

  it('当年 loadMonth を 2 回呼んでも毎回 purge が走る（append モードに戻らない）', async () => {
    await loadMonth(conn, db, data, 2025, 4)
    await loadMonth(conn, db, data, 2025, 4)
    // 2 回の loadMonth で classified_sales への head purge が 2 回以上発行されている
    // （append モードに退行していればここが 1 回になる）
    expect(countPurgeCalls(conn, 'classified_sales', 2025, 4)).toBeGreaterThanOrEqual(2)
  })

  it('当年 loadMonth: INSERT 失敗時に cleanup で対象月を再 purge する', async () => {
    // head purge の DELETE は成功させ、それ以降（bulk INSERT 含む）を失敗させる
    const callLog: string[] = []
    const failConn = {
      query: vi.fn().mockImplementation(async (sql: string) => {
        callLog.push(sql)
        if (sql.trimStart().startsWith('DELETE FROM')) return undefined
        throw new Error('INSERT failed')
      }),
    } as unknown as AsyncDuckDBConnection

    // classified_sales に 1 行だけ入れて bulk insert 経路を駆動する
    const dataWithRecords: MonthlyData = {
      ...data,
      classifiedSales: {
        records: [
          {
            year: 2025,
            month: 4,
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

    await expect(loadMonth(failConn, db, dataWithRecords, 2025, 4)).rejects.toThrow('INSERT failed')

    // 先頭 purge + 失敗時 cleanup で classified_sales への DELETE が 2 回発行される
    const deleteCalls = callLog.filter(
      (sql) =>
        sql.trimStart().startsWith('DELETE FROM') &&
        sql.includes('classified_sales') &&
        sql.includes('year = 2025') &&
        sql.includes('month = 4'),
    )
    expect(deleteCalls.length).toBeGreaterThanOrEqual(2)
  })
})

// ── 前年 loadMonth の purge 契約 ──
// Phase 3.a で `purgeLoadTarget` が `deletePrevYearRowsAt` を呼ぶよう修正され、
// year-shift せずに (year, month) の前年スコープを直接削除するようになった。
// 関連: references/03-guides/data-load-idempotency-plan.md

describe('loadMonth prev-year purge', () => {
  let conn: AsyncDuckDBConnection
  let db: AsyncDuckDB
  let data: MonthlyData

  beforeEach(() => {
    const handles = createMockHandles()
    conn = handles.conn
    db = handles.db
    // prev year context: 2025 年 4 月に対する前年 = 2024 年 4 月
    data = createEmptyMonthlyData({ year: 2024, month: 4, importedAt: '' })
  })

  it('isPrevYear=true で (year, month) 自身の前年行を purge する（year-shift しない）', async () => {
    await loadMonth(conn, db, data, 2024, 4, true)
    const queryMock = vi.mocked(conn.query)
    const calls = queryMock.mock.calls.map((c) => c[0] as string)
    const classifiedDelete = calls.find(
      (sql) =>
        sql.trimStart().startsWith('DELETE FROM') &&
        sql.includes('classified_sales') &&
        sql.includes('is_prev_year'),
    )
    expect(classifiedDelete).toBeDefined()
    // year-shift なしで (2024, 4) を purge する
    expect(classifiedDelete).toContain('year = 2024')
    expect(classifiedDelete).toContain('month = 4')
    // 誤った year-1 シフトに退行していないことも明示的に確認
    expect(classifiedDelete).not.toContain('year = 2023')
  })
})
