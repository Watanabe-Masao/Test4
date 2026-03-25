/**
 * マイグレーション実行エンジンのユニットテスト
 *
 * getCurrentVersion / runMigrations のロジックをモック DB でテストする。
 */
import { describe, it, expect, vi } from 'vitest'
import { getCurrentVersion, runMigrations } from '../migrations/runner'
import { migrations } from '../migrations/registry'
import { SCHEMA_VERSION } from '../schemas'

/** モック DuckDB コネクション */
function createMockConn(currentVersion: number | null = null) {
  const executedQueries: string[] = []

  const conn = {
    query: vi.fn(async (sql: string) => {
      executedQueries.push(sql)

      if (sql.includes('SELECT version FROM schema_meta')) {
        if (currentVersion === null) {
          throw new Error('Table not found')
        }
        return { toArray: () => (currentVersion !== null ? [{ version: currentVersion }] : []) }
      }

      return { toArray: () => [] }
    }),
  } as unknown as import('@duckdb/duckdb-wasm').AsyncDuckDBConnection

  return { conn, executedQueries }
}

describe('getCurrentVersion', () => {
  it('schema_meta が存在しない場合は 0', async () => {
    const { conn } = createMockConn(null)
    const version = await getCurrentVersion(conn)
    expect(version).toBe(0)
  })

  it('schema_meta にバージョンがある場合はその値', async () => {
    const { conn } = createMockConn(2)
    const version = await getCurrentVersion(conn)
    expect(version).toBe(2)
  })
})

describe('runMigrations', () => {
  it('バージョンが一致していれば何もしない', async () => {
    const { conn } = createMockConn(SCHEMA_VERSION)
    const result = await runMigrations(conn)

    expect(result.fromVersion).toBe(SCHEMA_VERSION)
    expect(result.toVersion).toBe(SCHEMA_VERSION)
    expect(result.migrationsApplied).toBe(0)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('DB バージョンが大きい場合はエラー', async () => {
    const { conn } = createMockConn(SCHEMA_VERSION + 1)

    await expect(runMigrations(conn)).rejects.toThrow('newer than app schema')
  })

  it('schema_meta が無い場合（バージョン 0）からマイグレーション実行', async () => {
    const { conn } = createMockConn(0)

    const result = await runMigrations(conn)
    expect(result.fromVersion).toBe(0)
    expect(result.toVersion).toBe(SCHEMA_VERSION)
  })
})

describe('migrations registry', () => {
  it('マイグレーションが version 昇順で登録されている', () => {
    for (let i = 1; i < migrations.length; i++) {
      expect(migrations[i].version).toBeGreaterThan(migrations[i - 1].version)
    }
  })

  it('各マイグレーションに description がある', () => {
    for (const m of migrations) {
      expect(m.description).toBeTruthy()
      expect(m.description.length).toBeGreaterThan(0)
    }
  })

  it('各マイグレーションに up/down 関数がある', () => {
    for (const m of migrations) {
      expect(typeof m.up).toBe('function')
      expect(typeof m.down).toBe('function')
    }
  })

  it('最新マイグレーションの version が SCHEMA_VERSION を超えない', () => {
    const lastMigration = migrations[migrations.length - 1]
    expect(
      lastMigration.version,
      `最新マイグレーション version (${lastMigration.version}) が SCHEMA_VERSION (${SCHEMA_VERSION}) を超えています。\n` +
        'schemas.ts の SCHEMA_VERSION を更新してください。',
    ).toBeLessThanOrEqual(SCHEMA_VERSION)
  })
})
