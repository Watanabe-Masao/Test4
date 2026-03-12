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
import type { AsyncDuckDB, AsyncDuckDBConnection, DuckDBBundles } from '@duckdb/duckdb-wasm'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import type { DuckDBWorkerRequest, DuckDBWorkerResponse, WorkerDBState } from './types'
import {
  initializeDb,
  disposeDb,
  executeResetTables,
  executeLoadMonth,
  executeDeleteMonth,
  executeQuery,
  executeCheckIntegrity,
  executeExportParquet,
  executeImportParquet,
  executeGenerateReport,
} from './workerHandlers'

// ── Worker 内部状態 ──

let db: AsyncDuckDB | null = null
let conn: AsyncDuckDBConnection | null = null
let state: WorkerDBState = 'idle'
let isOpfsPersisted = false

const MANUAL_BUNDLES: DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
}

// ── 通信ヘルパー ──

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
 * conn が初期化済みであることを前提にハンドラを実行する共通ラッパー。
 * 未初期化なら sendError、成功なら sendResult、例外なら sendError を送る。
 */
async function withConn<T>(
  requestId: number,
  handler: (c: AsyncDuckDBConnection, d: AsyncDuckDB) => Promise<T>,
): Promise<void> {
  if (!conn) {
    sendError(requestId, 'Not initialized')
    return
  }
  try {
    const result = await handler(conn, db!)
    sendResult(requestId, result)
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
    case 'initialize': {
      if (state === 'ready' && db && conn) {
        sendResult(msg.requestId, { isOpfsPersisted })
        return
      }
      setState('initializing')
      try {
        const result = await initializeDb(MANUAL_BUNDLES)
        db = result.db
        conn = result.conn
        isOpfsPersisted = result.isOpfsPersisted
        setState('ready')
        sendResult(msg.requestId, { isOpfsPersisted })
      } catch (err) {
        setState('error')
        sendError(msg.requestId, err instanceof Error ? err.message : String(err))
      }
      break
    }
    case 'resetTables':
      await withConn(msg.requestId, (c) => executeResetTables(c))
      break
    case 'loadMonth':
      await withConn(msg.requestId, (c, d) => executeLoadMonth(c, d, msg.data, msg.year, msg.month))
      break
    case 'deleteMonth':
      await withConn(msg.requestId, (c) => executeDeleteMonth(c, msg.year, msg.month))
      break
    case 'query':
      await withConn(msg.requestId, (c) => executeQuery(c, msg.sql))
      break
    case 'checkIntegrity':
      await withConn(msg.requestId, (c) => executeCheckIntegrity(c, isOpfsPersisted))
      break
    case 'exportParquet':
      await withConn(msg.requestId, (c) => executeExportParquet(c))
      break
    case 'importParquet':
      await withConn(msg.requestId, (c) => executeImportParquet(c))
      break
    case 'generateReport':
      await withConn(msg.requestId, (c) => executeGenerateReport(c, msg.sql))
      break
    case 'dispose': {
      try {
        await disposeDb(conn, db)
        conn = null
        db = null
        setState('disposed')
        sendResult(msg.requestId, null)
      } catch (err) {
        sendError(msg.requestId, err instanceof Error ? err.message : String(err))
      }
      break
    }
  }
}

// ── Worker エントリポイント ──

self.onmessage = (event: MessageEvent<DuckDBWorkerRequest>) => {
  messageQueue.push(event.data)
  void processNext()
}

// Worker がロードされたことを通知
self.postMessage({ type: 'state-change', state: 'idle' } satisfies DuckDBWorkerResponse)
