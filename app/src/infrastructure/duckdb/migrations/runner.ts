/**
 * マイグレーション実行エンジン
 *
 * schema_meta テーブルの version と SCHEMA_VERSION を比較し、
 * 必要なマイグレーションを順次適用する。
 *
 * 使い方:
 * ```
 * const result = await runMigrations(conn)
 * // result.migrationsApplied === 0 なら変更なし
 * ```
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { SCHEMA_VERSION, SCHEMA_META_DDL } from '../schemas'
import { migrations } from './registry'
import type { MigrationResult } from './types'

/**
 * 現在の DB バージョンを取得する。
 * schema_meta テーブルが存在しない場合は 0 を返す。
 */
export async function getCurrentVersion(conn: AsyncDuckDBConnection): Promise<number> {
  try {
    const result = await conn.query(`SELECT version FROM schema_meta LIMIT 1`)
    const rows = result.toArray()
    if (rows.length === 0) return 0
    return Number(rows[0].version)
  } catch {
    return 0
  }
}

/**
 * schema_meta のバージョンを更新する。
 */
async function updateVersion(conn: AsyncDuckDBConnection, version: number): Promise<void> {
  await conn.query(SCHEMA_META_DDL)
  const now = new Date().toISOString()
  await conn.query(`DELETE FROM schema_meta`)
  await conn.query(
    `INSERT INTO schema_meta VALUES (${version}, '${now}', '${now}')`,
  )
}

/**
 * マイグレーションを実行する。
 *
 * 現在のバージョンから SCHEMA_VERSION まで、登録済みマイグレーションを順次適用する。
 * バージョンが一致していれば何もしない。
 * バージョンが SCHEMA_VERSION より大きい場合（ダウングレード）は対応しない
 * （データ再構築を推奨）。
 */
export async function runMigrations(conn: AsyncDuckDBConnection): Promise<MigrationResult> {
  const start = performance.now()
  const fromVersion = await getCurrentVersion(conn)

  if (fromVersion === SCHEMA_VERSION) {
    return {
      fromVersion,
      toVersion: SCHEMA_VERSION,
      migrationsApplied: 0,
      durationMs: performance.now() - start,
    }
  }

  if (fromVersion > SCHEMA_VERSION) {
    // ダウングレードは再構築で対応
    throw new Error(
      `DB version (${fromVersion}) is newer than app schema (${SCHEMA_VERSION}). Rebuild required.`,
    )
  }

  // fromVersion → SCHEMA_VERSION まで順次適用
  let applied = 0
  for (const migration of migrations) {
    if (migration.version <= fromVersion) continue
    if (migration.version > SCHEMA_VERSION) break

    try {
      await migration.up(conn)
      await updateVersion(conn, migration.version)
      applied += 1
    } catch (err) {
      throw new Error(
        `Migration to version ${migration.version} failed: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // マイグレーション登録がないバージョンの場合（初期スキーマ相当）
  // schema_meta を最新バージョンに更新
  if (applied === 0 && fromVersion < SCHEMA_VERSION) {
    await updateVersion(conn, SCHEMA_VERSION)
  }

  return {
    fromVersion,
    toVersion: SCHEMA_VERSION,
    migrationsApplied: applied,
    durationMs: performance.now() - start,
  }
}
