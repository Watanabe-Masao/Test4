/**
 * DuckDB Worker ハンドラ
 *
 * Worker メッセージに対する各コマンドの実行ロジック。
 * duckdbWorker.ts から呼び出され、結果を返すかエラーを throw する。
 * 副作用（sendResult/sendError/setState）は呼び出し側で処理する。
 */
import * as duckdb from '@duckdb/duckdb-wasm'
import type {
  IntegrityCheckResult,
  ParquetExportResult,
  ParquetImportResult,
  ReportGenerateResult,
} from './types'
import { resetTables, loadMonth, deleteMonth, deletePrevYearMonth } from '../dataLoader'
import type { LoadResult } from '../dataLoader'
import { SCHEMA_VERSION, TABLE_NAMES } from '../schemas'
import type { ImportedData } from '@/domain/models/storeTypes'

// ── 定数・ユーティリティ ──

/**
 * Parquet キャッシュ用 OPFS パス。
 * テーブルごとに `opfs://parquet-cache/<table>.parquet` に保存する。
 */
const PARQUET_CACHE_DIR = 'parquet-cache'
function parquetPath(tableName: string): string {
  return `opfs://${PARQUET_CACHE_DIR}/${tableName}.parquet`
}

import { structRowToObject } from '../rowConversion'

export async function checkOpfsAvailable(): Promise<boolean> {
  try {
    await navigator.storage.getDirectory()
    return true
  } catch {
    return false
  }
}

/**
 * OPFS 上に Parquet キャッシュディレクトリが存在し、
 * 少なくとも classified_sales.parquet があるか確認する。
 */
async function checkParquetCacheExists(): Promise<boolean> {
  try {
    const root = await navigator.storage.getDirectory()
    const cacheDir = await root.getDirectoryHandle(PARQUET_CACHE_DIR)
    // classified_sales が存在すればキャッシュありと判定
    await cacheDir.getFileHandle('classified_sales.parquet')
    return true
  } catch {
    return false
  }
}

// ── 初期化・破棄 ──

export interface InitializeResult {
  readonly db: duckdb.AsyncDuckDB
  readonly conn: duckdb.AsyncDuckDBConnection
  readonly isOpfsPersisted: boolean
}

/**
 * DuckDB を初期化し、接続を確立する。
 * OPFS 永続化を試行し、結果を返す。
 */
export async function initializeDb(bundles: duckdb.DuckDBBundles): Promise<InitializeResult> {
  const OPFS_DB_PATH = 'opfs://shiire-arari.duckdb'

  const bundle = await duckdb.selectBundle(bundles)
  const worker = new Worker(bundle.mainWorker!)
  const logger = new duckdb.ConsoleLogger()
  const newDb = new duckdb.AsyncDuckDB(logger, worker)
  await newDb.instantiate(bundle.mainModule, bundle.pthreadWorker)

  // OPFS 永続化を試行
  let isOpfsPersisted = false
  const opfsSupported = await checkOpfsAvailable()
  if (opfsSupported) {
    try {
      await newDb.open({
        path: OPFS_DB_PATH,
        accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
      })
      isOpfsPersisted = true
    } catch {
      isOpfsPersisted = false
    }
  }

  const conn = await newDb.connect()
  return { db: newDb, conn, isOpfsPersisted }
}

/**
 * DuckDB 接続とインスタンスを破棄する。
 */
export async function disposeDb(
  conn: duckdb.AsyncDuckDBConnection | null,
  currentDb: duckdb.AsyncDuckDB | null,
): Promise<void> {
  if (conn) {
    await conn.close()
  }
  if (currentDb) {
    await currentDb.terminate()
  }
}

// ── データ操作 ──

export async function executeResetTables(conn: duckdb.AsyncDuckDBConnection): Promise<null> {
  await resetTables(conn)
  return null
}

export async function executeLoadMonth(
  conn: duckdb.AsyncDuckDBConnection,
  currentDb: duckdb.AsyncDuckDB,
  data: ImportedData,
  year: number,
  month: number,
): Promise<LoadResult> {
  return loadMonth(conn, currentDb, data, year, month)
}

export async function executeDeleteMonth(
  conn: duckdb.AsyncDuckDBConnection,
  year: number,
  month: number,
): Promise<null> {
  await deleteMonth(conn, year, month)
  await deletePrevYearMonth(conn, year, month)
  return null
}

// ── クエリ実行 ──

export async function executeQuery(
  conn: duckdb.AsyncDuckDBConnection,
  sql: string,
): Promise<Record<string, unknown>[]> {
  const result = await conn.query(sql)
  const rows = result.toArray()
  return rows.map((row) => structRowToObject(row as Record<string, unknown>))
}

// ── 整合性チェック ──

export async function executeCheckIntegrity(
  conn: duckdb.AsyncDuckDBConnection,
  isOpfsPersisted: boolean,
): Promise<IntegrityCheckResult> {
  // schema_meta チェック
  let schemaValid = false
  try {
    const metaResult = await conn.query(`SELECT version FROM schema_meta LIMIT 1`)
    const metaRows = metaResult.toArray()
    if (metaRows.length > 0) {
      schemaValid = Number(metaRows[0].version) === SCHEMA_VERSION
    }
  } catch {
    // テーブルなし
  }

  // データ存在チェック（テーブル存在を先に確認してエラーログ抑止）
  let monthCount = 0
  try {
    const tableCheck = await conn.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_name = 'classified_sales'`,
    )
    const tableExists = Number(tableCheck.toArray()[0].cnt) > 0
    if (tableExists) {
      const countResult = await conn.query(
        `SELECT COUNT(DISTINCT year || '-' || month) AS cnt FROM classified_sales`,
      )
      const countRows = countResult.toArray()
      if (countRows.length > 0) {
        monthCount = Number(countRows[0].cnt)
      }
    }
  } catch {
    // テーブルなし
  }

  // Parquet キャッシュ存在チェック
  const hasParquetCache = await checkParquetCacheExists()

  return { schemaValid, monthCount, isOpfsPersisted, hasParquetCache }
}

// ── Parquet エクスポート／インポート ──

export async function executeExportParquet(
  conn: duckdb.AsyncDuckDBConnection,
): Promise<ParquetExportResult> {
  const start = performance.now()
  let tablesExported = 0
  let totalRows = 0

  // OPFS キャッシュディレクトリを確保
  try {
    const root = await navigator.storage.getDirectory()
    await root.getDirectoryHandle(PARQUET_CACHE_DIR, { create: true })
  } catch {
    // OPFS 未対応の場合はスキップ
    return { tablesExported: 0, totalRows: 0, durationMs: 0 }
  }

  // app_settings 以外の全テーブルを Parquet にエクスポート
  const exportTargets = TABLE_NAMES.filter((n) => n !== 'app_settings')
  for (const tableName of exportTargets) {
    try {
      const countResult = await conn.query(`SELECT COUNT(*) AS cnt FROM ${tableName}`)
      const countRows = countResult.toArray()
      const rowCount = Number(countRows[0].cnt)
      if (rowCount === 0) continue

      const path = parquetPath(tableName)
      await conn.query(`COPY ${tableName} TO '${path}' (FORMAT PARQUET, COMPRESSION ZSTD)`)
      tablesExported += 1
      totalRows += rowCount
    } catch {
      // 個別テーブルの失敗は無視して続行
      console.warn(`Parquet export skipped: ${tableName}`)
    }
  }

  return {
    tablesExported,
    totalRows,
    durationMs: performance.now() - start,
  }
}

export async function executeImportParquet(
  conn: duckdb.AsyncDuckDBConnection,
): Promise<ParquetImportResult> {
  const start = performance.now()
  let tablesImported = 0
  let totalRows = 0

  // テーブルをリセットしてからインポート
  await resetTables(conn)

  const importTargets = TABLE_NAMES.filter((n) => n !== 'app_settings')
  for (const tableName of importTargets) {
    try {
      const path = parquetPath(tableName)
      await conn.query(`INSERT INTO ${tableName} SELECT * FROM read_parquet('${path}')`)
      const countResult = await conn.query(`SELECT COUNT(*) AS cnt FROM ${tableName}`)
      const countRows = countResult.toArray()
      const rowCount = Number(countRows[0].cnt)
      if (rowCount > 0) {
        tablesImported += 1
        totalRows += rowCount
      }
    } catch {
      // Parquet ファイルが存在しないテーブルはスキップ
    }
  }

  return {
    tablesImported,
    totalRows,
    durationMs: performance.now() - start,
  }
}

// ── レポート生成 ──

export async function executeGenerateReport(
  conn: duckdb.AsyncDuckDBConnection,
  sql: string,
): Promise<ReportGenerateResult> {
  const queryResult = await conn.query(sql)
  const rows = queryResult.toArray()
  const objects = rows.map((row) => structRowToObject(row as Record<string, unknown>))

  if (objects.length === 0) {
    return { csvContent: '', rowCount: 0 }
  }

  // ヘッダー行を生成
  const headers = Object.keys(objects[0])
  const csvRows: string[] = [headers.join(',')]

  // データ行を生成
  for (const obj of objects) {
    const values = headers.map((h) => {
      const val = obj[h]
      if (val == null) return ''
      const s = String(val)
      if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    })
    csvRows.push(values.join(','))
  }

  return {
    csvContent: csvRows.join('\r\n'),
    rowCount: objects.length,
  }
}
