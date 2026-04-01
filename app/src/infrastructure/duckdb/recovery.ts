/**
 * DuckDB リカバリーモード
 *
 * OPFS 永続 DB の整合性チェック・再構築・削除を行う。
 * DB 破損時や スキーマバージョン不一致時の復旧に使用する。
 *
 * 使い方:
 * ```
 * import { checkDatabaseIntegrity, rebuildFromIndexedDB, deleteDatabaseFile } from './recovery'
 *
 * // 整合性チェック
 * const ok = await checkDatabaseIntegrity(conn)
 *
 * // IndexedDB から全月データを再ロード
 * await rebuildFromIndexedDB(conn, db, repo)
 *
 * // OPFS DB ファイルを削除（次回起動時にインメモリで再構築）
 * await deleteDatabaseFile()
 * ```
 */
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DataRepository } from '@/domain/repositories'
import { resetTables, loadMonth } from './dataLoader'
import { SCHEMA_VERSION, SCHEMA_META_DDL } from './schemas'
/** DB ファイル名（engine.ts の OPFS_DB_PATH 'opfs://shiire-arari.duckdb' に対応） */
const OPFS_DB_FILENAME = 'shiire-arari.duckdb'

export interface IntegrityResult {
  /** 整合性チェック通過 */
  readonly ok: boolean
  /** エラー詳細（ok=false 時） */
  readonly errors: readonly string[]
}

export interface RebuildResult {
  /** 再構築した月数 */
  readonly monthCount: number
  /** 処理時間 (ms) */
  readonly durationMs: number
  /** 再構築中にスキップした月（エラー発生） */
  readonly skippedMonths: readonly { year: number; month: number; error: string }[]
}

/**
 * OPFS 永続 DB の整合性をチェックする。
 *
 * DuckDB の PRAGMA integrity_check を実行し、テーブル構造の妥当性も確認する。
 */
export async function checkDatabaseIntegrity(
  conn: AsyncDuckDBConnection,
): Promise<IntegrityResult> {
  const errors: string[] = []

  try {
    // DuckDB の整合性チェック
    const result = await conn.query(`PRAGMA integrity_check`)
    const rows = result.toArray()
    if (rows.length > 0) {
      const firstRow = rows[0]
      const value = String(firstRow.integrity_check ?? firstRow[Object.keys(firstRow)[0]] ?? '')
      if (value !== 'ok' && value !== '') {
        errors.push(`integrity_check: ${value}`)
      }
    }
  } catch (err) {
    errors.push(`integrity_check failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // schema_meta テーブルの存在とバージョン確認
  try {
    const metaResult = await conn.query(`SELECT version FROM schema_meta LIMIT 1`)
    const metaRows = metaResult.toArray()
    if (metaRows.length === 0) {
      errors.push('schema_meta: no version record')
    } else {
      const version = Number(metaRows[0].version)
      if (version !== SCHEMA_VERSION) {
        errors.push(`schema_meta: version mismatch (db=${version}, expected=${SCHEMA_VERSION})`)
      }
    }
  } catch {
    errors.push('schema_meta: table not found or unreadable')
  }

  // 主要テーブルの存在確認
  const requiredTables = ['classified_sales', 'category_time_sales', 'time_slots', 'purchase']
  for (const table of requiredTables) {
    try {
      await conn.query(`SELECT 1 FROM ${table} LIMIT 0`)
    } catch {
      errors.push(`table missing: ${table}`)
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

/**
 * IndexedDB から全月データを再ロードして DuckDB を再構築する。
 *
 * 全テーブルを DROP → CREATE し、IndexedDB に保存された全月分のデータを投入する。
 * OPFS 永続化されている場合、再構築後の DB は自動的に OPFS に保存される。
 */
export async function rebuildFromIndexedDB(
  conn: AsyncDuckDBConnection,
  db: AsyncDuckDB,
  repo: DataRepository,
): Promise<RebuildResult> {
  const start = performance.now()
  const skippedMonths: { year: number; month: number; error: string }[] = []
  let monthCount = 0

  // 全テーブルリセット
  await resetTables(conn)

  // IndexedDB から全月一覧を取得
  const storedMonths = await repo.listStoredMonths()

  for (const { year, month } of storedMonths) {
    try {
      const monthlyData = await repo.loadMonthlyData(year, month)
      if (monthlyData) {
        await loadMonth(conn, db, monthlyData, year, month)
        monthCount += 1
      }
    } catch (err) {
      skippedMonths.push({
        year,
        month,
        error: err instanceof Error ? err.message : String(err),
      })
      console.warn(`DuckDB recovery: ${year}-${month} のロードに失敗（スキップ）`)
    }
  }

  // schema_meta を書き込み
  await conn.query(SCHEMA_META_DDL)
  const now = new Date().toISOString()
  await conn.query(`DELETE FROM schema_meta`)
  await conn.query(`INSERT INTO schema_meta VALUES (${SCHEMA_VERSION}, '${now}', '${now}')`)

  return {
    monthCount,
    durationMs: performance.now() - start,
    skippedMonths,
  }
}

/**
 * OPFS から DuckDB ファイルを削除する。
 *
 * 次回起動時にインメモリで再構築される。
 * エンジンが dispose 済みの状態で呼ぶこと。
 *
 * @returns true=削除成功, false=OPFS未対応または削除失敗
 */
export async function deleteDatabaseFile(): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory()
    await root.removeEntry(OPFS_DB_FILENAME)
    return true
  } catch {
    // OPFS 未対応、ファイル不存在、またはロック中
    return false
  }
}
