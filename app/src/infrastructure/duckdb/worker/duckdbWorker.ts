/**
 * DuckDB Worker
 *
 * DuckDB-WASM の初期化・クエリ実行・データロードを Worker スレッドで処理する。
 * Arrow → JS オブジェクト変換もこの Worker 内で行い、メインスレッドの負荷を最小化する。
 *
 * AsyncDuckDB は内部でさらに WASM 実行用 Worker を生成する（ネスト Worker）。
 * Chrome/Edge ではネスト Worker がサポートされるため動作する。
 * Firefox/Safari では Worker 非対応フォールバック（メインスレッド直接実行）を使用する。
 *
 * メッセージプロトコル: types.ts の DuckDBWorkerRequest / DuckDBWorkerResponse を参照。
 */
import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import type {
  DuckDBWorkerRequest,
  DuckDBWorkerResponse,
  WorkerDBState,
  IntegrityCheckResult,
  ParquetExportResult,
  ParquetImportResult,
  ReportGenerateResult,
} from './types'
import { resetTables, loadMonth, deleteMonth } from '../dataLoader'
import { SCHEMA_VERSION, TABLE_NAMES } from '../schemas'

// ── Worker 内部状態 ──

let db: duckdb.AsyncDuckDB | null = null
let conn: duckdb.AsyncDuckDBConnection | null = null
let state: WorkerDBState = 'idle'
let isOpfsPersisted = false

const OPFS_DB_PATH = 'opfs://shiire-arari.duckdb'

/**
 * Parquet キャッシュ用 OPFS パス。
 * テーブルごとに `opfs://parquet-cache/<table>.parquet` に保存する。
 */
const PARQUET_CACHE_DIR = 'parquet-cache'
function parquetPath(tableName: string): string {
  return `opfs://${PARQUET_CACHE_DIR}/${tableName}.parquet`
}

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
}

function setState(newState: WorkerDBState): void {
  state = newState
  const notification: DuckDBWorkerResponse = { type: 'state-change', state }
  self.postMessage(notification)
}

function sendResult(requestId: number, data: unknown): void {
  const response: DuckDBWorkerResponse = { type: 'result', data, requestId }
  self.postMessage(response)
}

function sendError(requestId: number, message: string): void {
  const response: DuckDBWorkerResponse = { type: 'error', message, requestId }
  self.postMessage(response)
}

/**
 * snake_case → camelCase 変換
 */
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

/**
 * Arrow StructRow → plain JS object（BigInt → number 変換含む）
 */
function structRowToObject(row: Record<string, unknown>): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const key of Object.keys(row)) {
    const val = row[key]
    obj[snakeToCamel(key)] = typeof val === 'bigint' ? Number(val) : val
  }
  return obj
}

// ── OPFS 可用性チェック ──

async function checkOpfsAvailable(): Promise<boolean> {
  try {
    await navigator.storage.getDirectory()
    return true
  } catch {
    return false
  }
}

// ── メッセージハンドラ ──

async function handleInitialize(requestId: number): Promise<void> {
  if (state === 'ready' && db && conn) {
    sendResult(requestId, { isOpfsPersisted })
    return
  }

  setState('initializing')
  try {
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)
    const worker = new Worker(bundle.mainWorker!)
    const logger = new duckdb.ConsoleLogger()
    db = new duckdb.AsyncDuckDB(logger, worker)
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker)

    // OPFS 永続化を試行
    const opfsSupported = await checkOpfsAvailable()
    if (opfsSupported) {
      try {
        await db.open({
          path: OPFS_DB_PATH,
          accessMode: duckdb.DuckDBAccessMode.READ_WRITE,
        })
        isOpfsPersisted = true
      } catch {
        isOpfsPersisted = false
      }
    }

    conn = await db.connect()
    setState('ready')
    sendResult(requestId, { isOpfsPersisted })
  } catch (err) {
    setState('error')
    sendError(requestId, err instanceof Error ? err.message : String(err))
  }
}

async function handleResetTables(requestId: number): Promise<void> {
  if (!conn) {
    sendError(requestId, 'Not initialized')
    return
  }
  try {
    await resetTables(conn)
    sendResult(requestId, null)
  } catch (err) {
    sendError(requestId, err instanceof Error ? err.message : String(err))
  }
}

async function handleLoadMonth(
  requestId: number,
  data: import('@/domain/models').ImportedData,
  year: number,
  month: number,
): Promise<void> {
  if (!conn || !db) {
    sendError(requestId, 'Not initialized')
    return
  }
  try {
    const result = await loadMonth(conn, db, data, year, month)
    sendResult(requestId, result)
  } catch (err) {
    sendError(requestId, err instanceof Error ? err.message : String(err))
  }
}

async function handleDeleteMonth(requestId: number, year: number, month: number): Promise<void> {
  if (!conn) {
    sendError(requestId, 'Not initialized')
    return
  }
  try {
    await deleteMonth(conn, year, month)
    sendResult(requestId, null)
  } catch (err) {
    sendError(requestId, err instanceof Error ? err.message : String(err))
  }
}

async function handleQuery(requestId: number, sql: string): Promise<void> {
  if (!conn) {
    sendError(requestId, 'Not initialized')
    return
  }
  try {
    const result = await conn.query(sql)
    const rows = result.toArray()
    const objects = rows.map((row) => structRowToObject(row as Record<string, unknown>))
    sendResult(requestId, objects)
  } catch (err) {
    sendError(requestId, err instanceof Error ? err.message : String(err))
  }
}

async function handleCheckIntegrity(requestId: number): Promise<void> {
  if (!conn) {
    sendError(requestId, 'Not initialized')
    return
  }
  try {
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

    const result: IntegrityCheckResult = {
      schemaValid,
      monthCount,
      isOpfsPersisted,
      hasParquetCache,
    }
    sendResult(requestId, result)
  } catch (err) {
    sendError(requestId, err instanceof Error ? err.message : String(err))
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

/**
 * 全テーブルを Parquet 形式で OPFS にエクスポートする。
 * データロード完了後に呼び出し、次回起動時の高速リロードに使用する。
 */
async function handleExportParquet(requestId: number): Promise<void> {
  if (!conn || !db) {
    sendError(requestId, 'Not initialized')
    return
  }
  try {
    const start = performance.now()
    let tablesExported = 0
    let totalRows = 0

    // OPFS キャッシュディレクトリを確保
    try {
      const root = await navigator.storage.getDirectory()
      await root.getDirectoryHandle(PARQUET_CACHE_DIR, { create: true })
    } catch {
      // OPFS 未対応の場合はスキップ
      const result: ParquetExportResult = { tablesExported: 0, totalRows: 0, durationMs: 0 }
      sendResult(requestId, result)
      return
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

    const result: ParquetExportResult = {
      tablesExported,
      totalRows,
      durationMs: performance.now() - start,
    }
    sendResult(requestId, result)
  } catch (err) {
    sendError(requestId, err instanceof Error ? err.message : String(err))
  }
}

/**
 * OPFS 上の Parquet ファイルからテーブルにデータをインポートする。
 * OPFS 永続 DB のデータが空で Parquet キャッシュが存在する場合に使用する。
 * JSON ロードより大幅に高速（列指向 + ZSTD 圧縮）。
 */
async function handleImportParquet(requestId: number): Promise<void> {
  if (!conn) {
    sendError(requestId, 'Not initialized')
    return
  }
  try {
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

    const result: ParquetImportResult = {
      tablesImported,
      totalRows,
      durationMs: performance.now() - start,
    }
    sendResult(requestId, result)
  } catch (err) {
    sendError(requestId, err instanceof Error ? err.message : String(err))
  }
}

/**
 * Worker 内で SQL クエリを実行し CSV 文字列を生成する。
 * メインスレッドのブロックを回避してレポートエクスポートを行う。
 */
async function handleGenerateReport(requestId: number, sql: string): Promise<void> {
  if (!conn) {
    sendError(requestId, 'Not initialized')
    return
  }
  try {
    const queryResult = await conn.query(sql)
    const rows = queryResult.toArray()
    const objects = rows.map((row) => structRowToObject(row as Record<string, unknown>))

    if (objects.length === 0) {
      const result: ReportGenerateResult = { csvContent: '', rowCount: 0 }
      sendResult(requestId, result)
      return
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

    const result: ReportGenerateResult = {
      csvContent: csvRows.join('\r\n'),
      rowCount: objects.length,
    }
    sendResult(requestId, result)
  } catch (err) {
    sendError(requestId, err instanceof Error ? err.message : String(err))
  }
}

async function handleDispose(requestId: number): Promise<void> {
  try {
    if (conn) {
      await conn.close()
      conn = null
    }
    if (db) {
      await db.terminate()
      db = null
    }
    setState('disposed')
    sendResult(requestId, null)
  } catch (err) {
    sendError(requestId, err instanceof Error ? err.message : String(err))
  }
}

// ── メッセージキュー（直列化） ──
// async ハンドラを await せずに並行起動すると、resetTables の DROP → CREATE 間に
// 別のクエリが割り込み「Table does not exist」エラーを引き起こす。
// 全メッセージを直列処理することでこの競合を防止する。

let processing = false
const messageQueue: DuckDBWorkerRequest[] = []

async function processNext(): Promise<void> {
  if (processing || messageQueue.length === 0) return
  processing = true
  const msg = messageQueue.shift()!
  try {
    await dispatch(msg)
  } finally {
    processing = false
    void processNext()
  }
}

async function dispatch(msg: DuckDBWorkerRequest): Promise<void> {
  switch (msg.type) {
    case 'initialize':
      await handleInitialize(msg.requestId)
      break
    case 'resetTables':
      await handleResetTables(msg.requestId)
      break
    case 'loadMonth':
      await handleLoadMonth(msg.requestId, msg.data, msg.year, msg.month)
      break
    case 'deleteMonth':
      await handleDeleteMonth(msg.requestId, msg.year, msg.month)
      break
    case 'query':
      await handleQuery(msg.requestId, msg.sql)
      break
    case 'checkIntegrity':
      await handleCheckIntegrity(msg.requestId)
      break
    case 'exportParquet':
      await handleExportParquet(msg.requestId)
      break
    case 'importParquet':
      await handleImportParquet(msg.requestId)
      break
    case 'generateReport':
      await handleGenerateReport(msg.requestId, msg.sql)
      break
    case 'dispose':
      await handleDispose(msg.requestId)
      break
  }
}

// ── Worker エントリポイント ──

self.onmessage = (event: MessageEvent<DuckDBWorkerRequest>) => {
  messageQueue.push(event.data)
  void processNext()
}

// Worker がロードされたことを通知
self.postMessage({ type: 'state-change', state: 'idle' } satisfies DuckDBWorkerResponse)
