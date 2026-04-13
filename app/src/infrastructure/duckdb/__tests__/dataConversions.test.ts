/**
 * Tests for dataConversions.ts — TABLE_COLUMNS schema and bulkInsert behavior
 */
import { describe, it, expect, vi } from 'vitest'
import { TABLE_COLUMNS, bulkInsert } from '../dataConversions'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

describe('TABLE_COLUMNS', () => {
  it('defines schemas for all core tables', () => {
    const expectedTables = [
      'classified_sales',
      'category_time_sales',
      'time_slots',
      'purchase',
      'special_sales',
      'transfers',
      'consumables',
      'department_kpi',
      'budget',
      'inventory_config',
      'weather_hourly',
    ]
    for (const tableName of expectedTables) {
      expect(TABLE_COLUMNS[tableName], `missing schema for ${tableName}`).toBeTruthy()
    }
  })

  it('all column type values are non-empty strings', () => {
    for (const [tableName, cols] of Object.entries(TABLE_COLUMNS)) {
      for (const [colName, type] of Object.entries(cols)) {
        expect(typeof type, `${tableName}.${colName}`).toBe('string')
        expect(type.length, `${tableName}.${colName}`).toBeGreaterThan(0)
      }
    }
  })

  it('uses DuckDB-compatible types (INTEGER, VARCHAR, DOUBLE, BOOLEAN)', () => {
    const allowedTypes = new Set(['INTEGER', 'VARCHAR', 'DOUBLE', 'BOOLEAN'])
    for (const [tableName, cols] of Object.entries(TABLE_COLUMNS)) {
      for (const [colName, type] of Object.entries(cols)) {
        expect(allowedTypes.has(type), `${tableName}.${colName}: ${type}`).toBe(true)
      }
    }
  })

  it('classified_sales defines expected columns', () => {
    const cs = TABLE_COLUMNS.classified_sales
    expect(cs.year).toBe('INTEGER')
    expect(cs.month).toBe('INTEGER')
    expect(cs.store_id).toBe('VARCHAR')
    expect(cs.sales_amount).toBe('DOUBLE')
    expect(cs.is_prev_year).toBe('BOOLEAN')
  })

  it('weather_hourly defines weather measurement columns', () => {
    const wh = TABLE_COLUMNS.weather_hourly
    expect(wh.temperature).toBe('DOUBLE')
    expect(wh.humidity).toBe('DOUBLE')
    expect(wh.precipitation).toBe('DOUBLE')
    expect(wh.weather_code).toBe('INTEGER')
    expect(wh.hour).toBe('INTEGER')
  })
})

describe('bulkInsert', () => {
  function createMocks(
    opts: {
      changesResult?: number
      throwOnChanges?: boolean
    } = {},
  ): {
    db: AsyncDuckDB
    conn: AsyncDuckDBConnection
    queries: string[]
    registered: string[]
    dropped: string[]
  } {
    const queries: string[] = []
    const registered: string[] = []
    const dropped: string[] = []

    const queryMock = vi.fn(async (sql: string) => {
      queries.push(sql)
      if (sql.includes('changes()')) {
        if (opts.throwOnChanges) throw new Error('changes() not supported')
        return {
          toArray: () => [{ affected: opts.changesResult ?? 0 }],
        }
      }
      return { toArray: () => [] }
    })

    const conn = { query: queryMock } as unknown as AsyncDuckDBConnection
    const db = {
      registerFileText: vi.fn(async (name: string) => {
        registered.push(name)
      }),
      dropFile: vi.fn(async (name: string) => {
        dropped.push(name)
      }),
    } as unknown as AsyncDuckDB

    return { db, conn, queries, registered, dropped }
  }

  it('returns 0 immediately when rows are empty', async () => {
    const { db, conn } = createMocks()
    const result = await bulkInsert(conn, db, 'classified_sales', [])
    expect(result).toBe(0)
  })

  it('inserts rows and returns the row count', async () => {
    const rows = [
      { year: 2025, month: 5, day: 1, store_id: 's1', sales_amount: 100 },
      { year: 2025, month: 5, day: 2, store_id: 's1', sales_amount: 200 },
    ]
    const { db, conn, queries, registered, dropped } = createMocks({ changesResult: 2 })

    const inserted = await bulkInsert(conn, db, 'classified_sales', rows)
    expect(inserted).toBe(2)
    expect(registered.length).toBe(1)
    // file name pattern: classified_sales_<timestamp>.json
    expect(registered[0]).toMatch(/^classified_sales_\d+\.json$/)
    // Same file dropped
    expect(dropped).toEqual(registered)

    // INSERT query must reference read_json with columns parameter
    const insertQuery = queries.find((q) => q.startsWith('INSERT INTO classified_sales'))
    expect(insertQuery).toBeTruthy()
    expect(insertQuery).toContain('read_json')
    expect(insertQuery).toContain('columns=')
    expect(insertQuery).toContain("'year': 'INTEGER'")
  })

  it('throws when affected row count does not match input length', async () => {
    const rows = [{ year: 2025, month: 5, day: 1, store_id: 's1', sales_amount: 100 }]
    const { db, conn, dropped } = createMocks({ changesResult: 0 })

    await expect(bulkInsert(conn, db, 'classified_sales', rows)).rejects.toThrow(
      /expected 1 rows, but 0 were inserted/,
    )
    // File should still be cleaned up via finally
    expect(dropped.length).toBe(1)
  })

  it('tolerates changes() verification failure but still completes', async () => {
    const rows = [{ year: 2025, month: 5, day: 1, store_id: 's1' }]
    const { db, conn, dropped } = createMocks({ throwOnChanges: true })
    const inserted = await bulkInsert(conn, db, 'classified_sales', rows)
    expect(inserted).toBe(1)
    expect(dropped.length).toBe(1)
  })

  it('uses read_json_auto fallback for unknown tables', async () => {
    const rows = [{ a: 1 }]
    const { db, conn, queries } = createMocks({ changesResult: 1 })
    await bulkInsert(conn, db, 'unknown_table_xyz', rows)
    const insertQuery = queries.find((q) => q.startsWith('INSERT INTO unknown_table_xyz'))
    expect(insertQuery).toBeTruthy()
    expect(insertQuery).toContain('read_json_auto')
  })
})
