/**
 * Tests for deletePolicy.ts — constants + delete query generation with mocked connection
 */
import { describe, it, expect, vi } from 'vitest'
import {
  PERSISTENT_TABLES,
  TABLES_WITH_YEAR_MONTH,
  TABLES_WITH_PREV_YEAR_FLAG,
  PREV_YEAR_INSERT_TABLES,
  resetTables,
  deleteMonth,
  deletePrevYearRowsAt,
  deletePrevYearMonth,
} from '../deletePolicy'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

/** Build a mock connection that records every query */
function createMockConn(): {
  conn: AsyncDuckDBConnection
  queries: string[]
  mock: ReturnType<typeof vi.fn>
} {
  const queries: string[] = []
  const mock = vi.fn(async (sql: string) => {
    queries.push(sql)
    return { toArray: () => [] }
  })
  const conn = {
    query: mock,
  } as unknown as AsyncDuckDBConnection
  return { conn, queries, mock }
}

describe('deletePolicy constants', () => {
  it('PERSISTENT_TABLES includes weather_hourly', () => {
    expect(PERSISTENT_TABLES.has('weather_hourly')).toBe(true)
  })

  it('PERSISTENT_TABLES does not include classified_sales', () => {
    expect(PERSISTENT_TABLES.has('classified_sales')).toBe(false)
  })

  it('TABLES_WITH_YEAR_MONTH excludes app_settings and weather_hourly', () => {
    expect(TABLES_WITH_YEAR_MONTH).not.toContain('app_settings')
    expect(TABLES_WITH_YEAR_MONTH).not.toContain('weather_hourly')
    expect(TABLES_WITH_YEAR_MONTH).toContain('classified_sales')
    expect(TABLES_WITH_YEAR_MONTH).toContain('purchase')
  })

  it('TABLES_WITH_PREV_YEAR_FLAG contains the three classified-style tables', () => {
    expect(TABLES_WITH_PREV_YEAR_FLAG.has('classified_sales')).toBe(true)
    expect(TABLES_WITH_PREV_YEAR_FLAG.has('category_time_sales')).toBe(true)
    expect(TABLES_WITH_PREV_YEAR_FLAG.has('time_slots')).toBe(true)
    expect(TABLES_WITH_PREV_YEAR_FLAG.has('purchase')).toBe(false)
  })

  it('PREV_YEAR_INSERT_TABLES lists tables without is_prev_year column', () => {
    expect(PREV_YEAR_INSERT_TABLES).toEqual(['purchase', 'special_sales', 'transfers'])
  })
})

describe('deleteMonth', () => {
  it('issues DELETE with correct year/month for every year-month table', async () => {
    const { conn, queries } = createMockConn()
    await deleteMonth(conn, 2025, 5)

    // Every issued query should be a DELETE with the correct predicate
    expect(queries.length).toBe(TABLES_WITH_YEAR_MONTH.length)
    for (const q of queries) {
      expect(q).toMatch(/DELETE FROM/)
      expect(q).toContain('year = 2025')
      expect(q).toContain('month = 5')
    }

    // Spot-check: purchase, classified_sales
    expect(queries.some((q) => q.includes('DELETE FROM classified_sales'))).toBe(true)
    expect(queries.some((q) => q.includes('DELETE FROM purchase'))).toBe(true)

    // weather_hourly / app_settings must NOT be touched
    expect(queries.some((q) => q.includes('weather_hourly'))).toBe(false)
    expect(queries.some((q) => q.includes('app_settings'))).toBe(false)
  })
})

describe('deletePrevYearRowsAt', () => {
  it('deletes is_prev_year=true rows for prev-year-flag tables and full rows for others', async () => {
    const { conn, queries } = createMockConn()
    await deletePrevYearRowsAt(conn, 2025, 3)

    // For classified_sales — must include is_prev_year = true
    const classifiedDelete = queries.find((q) => q.includes('DELETE FROM classified_sales'))
    expect(classifiedDelete).toBeTruthy()
    expect(classifiedDelete).toContain('is_prev_year = true')
    expect(classifiedDelete).toContain('year = 2025')
    expect(classifiedDelete).toContain('month = 3')

    // For purchase — must NOT include is_prev_year flag
    const purchaseDelete = queries.find((q) => q.includes('DELETE FROM purchase'))
    expect(purchaseDelete).toBeTruthy()
    expect(purchaseDelete).not.toContain('is_prev_year')
    expect(purchaseDelete).toContain('year = 2025')
    expect(purchaseDelete).toContain('month = 3')
  })
})

describe('deletePrevYearMonth', () => {
  it('shifts year by -1 before calling deletePrevYearRowsAt semantics', async () => {
    const { conn, queries } = createMockConn()
    await deletePrevYearMonth(conn, 2025, 4)

    // Expect all DELETE queries to use year = 2024
    const deleteQueries = queries.filter((q) => q.startsWith('DELETE FROM'))
    expect(deleteQueries.length).toBeGreaterThan(0)
    for (const q of deleteQueries) {
      expect(q).toContain('year = 2024')
      expect(q).toContain('month = 4')
    }
  })
})

describe('resetTables', () => {
  it('drops VIEW and TABLE for store_day_summary, drops non-persistent tables, then recreates', async () => {
    const { conn, queries } = createMockConn()
    await resetTables(conn)

    // Drops store_day_summary as both VIEW and TABLE
    expect(queries.some((q) => q.includes('DROP VIEW IF EXISTS store_day_summary'))).toBe(true)
    expect(queries.some((q) => q.includes('DROP TABLE IF EXISTS store_day_summary'))).toBe(true)

    // weather_hourly must NOT be dropped
    expect(queries.some((q) => q === 'DROP TABLE IF EXISTS weather_hourly')).toBe(false)

    // classified_sales must be dropped
    expect(queries.some((q) => q.includes('DROP TABLE IF EXISTS classified_sales'))).toBe(true)

    // At least one CREATE TABLE statement must be emitted
    expect(queries.some((q) => /CREATE TABLE/.test(q))).toBe(true)

    // At least one CREATE VIEW statement for store_day_summary must be emitted
    expect(queries.some((q) => /CREATE.*VIEW/i.test(q))).toBe(true)
  })

  it('tolerates DROP VIEW/TABLE failures (type mismatch)', async () => {
    const queries: string[] = []
    const mock = vi.fn(async (sql: string) => {
      queries.push(sql)
      if (sql.includes('DROP VIEW IF EXISTS store_day_summary')) {
        throw new Error('type mismatch')
      }
      return { toArray: () => [] }
    })
    const conn = { query: mock } as unknown as AsyncDuckDBConnection

    // Should NOT throw — type mismatch is swallowed
    await expect(resetTables(conn)).resolves.toBeUndefined()
    // The catch block should still emit the TABLE drop
    expect(queries.some((q) => q.includes('DROP TABLE IF EXISTS store_day_summary'))).toBe(true)
  })
})
