/**
 * Tests for dataConversions.ts — TABLE_COLUMNS schema and bulkInsert behavior
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { TABLE_COLUMNS, bulkInsert } from '../dataConversions'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

describe('TABLE_COLUMNS', () => {
  it('defines schemas (object with columns) for all core tables', () => {
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
      const schema = TABLE_COLUMNS[tableName]
      // Each schema should be a non-empty object of columnName → duckdb type string
      expect(typeof schema, `missing schema for ${tableName}`).toBe('object')
      expect(Object.keys(schema).length, `empty schema for ${tableName}`).toBeGreaterThan(0)
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
      /**
       * INSERT ... RETURNING 1 で返す行数。未指定時は rows.length を返す（成功シナリオ）。
       * INSERT 失敗（rows との不一致）をシミュレートするときだけ明示する。
       */
      returningRows?: number
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
      if (sql.includes('INSERT INTO') && sql.includes('RETURNING')) {
        const count = opts.returningRows ?? 0
        return { toArray: () => Array.from({ length: count }, () => ({})) }
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
    const { db, conn, queries, registered, dropped } = createMocks({ returningRows: 2 })

    const inserted = await bulkInsert(conn, db, 'classified_sales', rows)
    expect(inserted).toBe(2)
    expect(registered.length).toBe(1)
    // file name pattern: classified_sales_<timestamp>.json
    expect(registered[0]).toMatch(/^classified_sales_\d+\.json$/)
    // Same file dropped
    expect(dropped).toEqual(registered)

    // INSERT query must reference read_json with columns parameter and RETURNING
    const insertQuery = queries.find((q) => q.startsWith('INSERT INTO classified_sales'))
    expect(insertQuery).toBeTruthy()
    expect(insertQuery).toContain('read_json')
    expect(insertQuery).toContain('columns=')
    expect(insertQuery).toContain("'year': 'INTEGER'")
    expect(insertQuery).toContain('RETURNING 1')
  })

  it('throws when RETURNING row count does not match input length', async () => {
    const rows = [{ year: 2025, month: 5, day: 1, store_id: 's1', sales_amount: 100 }]
    const { db, conn, dropped } = createMocks({ returningRows: 0 })

    await expect(bulkInsert(conn, db, 'classified_sales', rows)).rejects.toThrow(
      /expected 1 rows, but 0 were inserted/,
    )
    // File should still be cleaned up via finally
    expect(dropped.length).toBe(1)
  })

  it('does not call SQLite-only changes() function (DuckDB incompatible)', async () => {
    const rows = [{ year: 2025, month: 5, day: 1, store_id: 's1' }]
    const { db, conn, queries } = createMocks({ returningRows: 1 })
    await bulkInsert(conn, db, 'classified_sales', rows)
    // changes() is a SQLite-only scalar function; DuckDB raises Catalog Error
    // when invoked. The verification path must use RETURNING instead.
    expect(queries.some((q) => q.includes('changes()'))).toBe(false)
  })

  it('uses read_json_auto fallback for unknown tables', async () => {
    const rows = [{ a: 1 }]
    const { db, conn, queries } = createMocks({ returningRows: 1 })
    await bulkInsert(conn, db, 'unknown_table_xyz', rows)
    const insertQuery = queries.find((q) => q.startsWith('INSERT INTO unknown_table_xyz'))
    expect(insertQuery).toBeTruthy()
    expect(insertQuery).toContain('read_json_auto')
    expect(insertQuery).toContain('RETURNING 1')
  })
})
