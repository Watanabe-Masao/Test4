/**
 * recovery モジュールのユニットテスト
 *
 * DuckDB 接続をモックし、整合性チェック・再構築ロジックをテストする。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkDatabaseIntegrity, rebuildFromIndexedDB, deleteDatabaseFile } from '../recovery'
import type { IntegrityResult, RebuildResult } from '../recovery'
import { SCHEMA_VERSION } from '../schemas'

// dataLoader をモック
vi.mock('../dataLoader', () => ({
  resetTables: vi.fn().mockResolvedValue(undefined),
  loadMonth: vi.fn().mockResolvedValue({ rowCounts: {}, durationMs: 10 }),
}))

/** モック DuckDB コネクション */
function createMockConn(queryResponses: Map<string, unknown[]> = new Map()) {
  return {
    query: vi.fn(async (sql: string) => {
      // パターンマッチでレスポンスを返す
      for (const [pattern, rows] of queryResponses) {
        if (sql.includes(pattern)) {
          return { toArray: () => rows }
        }
      }
      return { toArray: () => [] }
    }),
  } as unknown as import('@duckdb/duckdb-wasm').AsyncDuckDBConnection
}

describe('checkDatabaseIntegrity', () => {
  it('全チェック通過で ok: true', async () => {
    const responses = new Map<string, unknown[]>([
      ['integrity_check', [{ integrity_check: 'ok' }]],
      ['schema_meta', [{ version: SCHEMA_VERSION }]],
      ['classified_sales', []],
      ['category_time_sales', []],
      ['time_slots', []],
      ['purchase', []],
    ])
    const conn = createMockConn(responses)

    const result: IntegrityResult = await checkDatabaseIntegrity(conn)
    expect(result.ok).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('integrity_check が失敗した場合', async () => {
    const conn = createMockConn(
      new Map([
        ['integrity_check', [{ integrity_check: 'corruption detected' }]],
        ['schema_meta', [{ version: SCHEMA_VERSION }]],
        ['classified_sales', []],
        ['category_time_sales', []],
        ['time_slots', []],
        ['purchase', []],
      ]),
    )

    const result = await checkDatabaseIntegrity(conn)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('integrity_check'))).toBe(true)
  })

  it('schema_meta のバージョン不一致', async () => {
    const conn = createMockConn(
      new Map([
        ['integrity_check', [{ integrity_check: 'ok' }]],
        ['schema_meta', [{ version: 999 }]],
        ['classified_sales', []],
        ['category_time_sales', []],
        ['time_slots', []],
        ['purchase', []],
      ]),
    )

    const result = await checkDatabaseIntegrity(conn)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('version mismatch'))).toBe(true)
  })

  it('schema_meta にレコードが無い場合', async () => {
    const conn = createMockConn(
      new Map([
        ['integrity_check', [{ integrity_check: 'ok' }]],
        ['classified_sales', []],
        ['category_time_sales', []],
        ['time_slots', []],
        ['purchase', []],
      ]),
    )

    const result = await checkDatabaseIntegrity(conn)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('no version record'))).toBe(true)
  })

  it('テーブルが存在しない場合', async () => {
    const conn = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('integrity_check')) {
          return { toArray: () => [{ integrity_check: 'ok' }] }
        }
        if (sql.includes('schema_meta')) {
          return { toArray: () => [{ version: SCHEMA_VERSION }] }
        }
        if (sql.includes('classified_sales')) {
          throw new Error('Table not found')
        }
        return { toArray: () => [] }
      }),
    } as unknown as import('@duckdb/duckdb-wasm').AsyncDuckDBConnection

    const result = await checkDatabaseIntegrity(conn)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('table missing'))).toBe(true)
  })

  it('integrity_check で例外が発生した場合', async () => {
    const conn = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('integrity_check')) {
          throw new Error('DB crashed')
        }
        if (sql.includes('schema_meta')) {
          return { toArray: () => [{ version: SCHEMA_VERSION }] }
        }
        return { toArray: () => [] }
      }),
    } as unknown as import('@duckdb/duckdb-wasm').AsyncDuckDBConnection

    const result = await checkDatabaseIntegrity(conn)
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('integrity_check failed'))).toBe(true)
  })
})

describe('rebuildFromIndexedDB', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('全月のデータを再構築する', async () => {
    const conn = createMockConn()
    const db = {} as import('@duckdb/duckdb-wasm').AsyncDuckDB
    const repo = {
      listStoredMonths: vi.fn().mockResolvedValue([
        { year: 2025, month: 1 },
        { year: 2025, month: 2 },
      ]),
      loadMonthlyData: vi.fn().mockResolvedValue({ records: [] }),
    } as unknown as import('@/domain/repositories').DataRepository

    const result: RebuildResult = await rebuildFromIndexedDB(conn, db, repo)
    expect(result.monthCount).toBe(2)
    expect(result.skippedMonths).toHaveLength(0)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('ロード失敗月はスキップされる', async () => {
    const conn = createMockConn()
    const db = {} as import('@duckdb/duckdb-wasm').AsyncDuckDB
    const { loadMonth } = await import('../dataLoader')
    vi.mocked(loadMonth).mockRejectedValueOnce(new Error('corrupt data'))

    const repo = {
      listStoredMonths: vi.fn().mockResolvedValue([
        { year: 2025, month: 1 },
        { year: 2025, month: 2 },
      ]),
      loadMonthlyData: vi.fn().mockResolvedValue({ records: [] }),
    } as unknown as import('@/domain/repositories').DataRepository

    const result = await rebuildFromIndexedDB(conn, db, repo)
    expect(result.monthCount).toBe(1)
    expect(result.skippedMonths).toHaveLength(1)
    expect(result.skippedMonths[0].year).toBe(2025)
    expect(result.skippedMonths[0].month).toBe(1)
    expect(result.skippedMonths[0].error).toBe('corrupt data')
  })

  it('loadMonthlyData が null を返す月はスキップ', async () => {
    const conn = createMockConn()
    const db = {} as import('@duckdb/duckdb-wasm').AsyncDuckDB
    const repo = {
      listStoredMonths: vi.fn().mockResolvedValue([{ year: 2025, month: 1 }]),
      loadMonthlyData: vi.fn().mockResolvedValue(null),
    } as unknown as import('@/domain/repositories').DataRepository

    const result = await rebuildFromIndexedDB(conn, db, repo)
    expect(result.monthCount).toBe(0)
    expect(result.skippedMonths).toHaveLength(0)
  })
})

describe('deleteDatabaseFile', () => {
  it('OPFS 非対応で false を返す', async () => {
    // navigator.storage.getDirectory が存在しない環境
    const originalStorage = globalThis.navigator?.storage
    Object.defineProperty(globalThis, 'navigator', {
      value: { storage: { getDirectory: () => Promise.reject(new Error('not supported')) } },
      writable: true,
      configurable: true,
    })

    const result = await deleteDatabaseFile()
    expect(result).toBe(false)

    // 復元
    if (originalStorage) {
      Object.defineProperty(globalThis.navigator, 'storage', {
        value: originalStorage,
        writable: true,
        configurable: true,
      })
    }
  })
})
