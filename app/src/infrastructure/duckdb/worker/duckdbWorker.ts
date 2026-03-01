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
import type { DuckDBWorkerRequest, DuckDBWorkerResponse, WorkerDBState } from './types'
import { resetTables, loadMonth, deleteMonth } from '../dataLoader'
import { SCHEMA_VERSION } from '../schemas'

// ── Worker 内部状態 ──

let db: duckdb.AsyncDuckDB | null = null
let conn: duckdb.AsyncDuckDBConnection | null = null
let state: WorkerDBState = 'idle'
let isOpfsPersisted = false

const OPFS_DB_PATH = 'opfs://shiire-arari.duckdb'

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

    // データ存在チェック
    let monthCount = 0
    try {
      const countResult = await conn.query(
        `SELECT COUNT(DISTINCT year || '-' || month) AS cnt FROM classified_sales`,
      )
      const countRows = countResult.toArray()
      if (countRows.length > 0) {
        monthCount = Number(countRows[0].cnt)
      }
    } catch {
      // テーブルなし
    }

    sendResult(requestId, { schemaValid, monthCount, isOpfsPersisted })
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

// ── Worker エントリポイント ──

self.onmessage = (event: MessageEvent<DuckDBWorkerRequest>) => {
  const msg = event.data

  switch (msg.type) {
    case 'initialize':
      handleInitialize(msg.requestId)
      break
    case 'resetTables':
      handleResetTables(msg.requestId)
      break
    case 'loadMonth':
      handleLoadMonth(msg.requestId, msg.data, msg.year, msg.month)
      break
    case 'deleteMonth':
      handleDeleteMonth(msg.requestId, msg.year, msg.month)
      break
    case 'query':
      handleQuery(msg.requestId, msg.sql)
      break
    case 'checkIntegrity':
      handleCheckIntegrity(msg.requestId)
      break
    case 'dispose':
      handleDispose(msg.requestId)
      break
  }
}

// Worker がロードされたことを通知
self.postMessage({ type: 'state-change', state: 'idle' } satisfies DuckDBWorkerResponse)
