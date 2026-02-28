/**
 * DuckDB-WASM エンジン初期化・ライフサイクル管理
 *
 * シングルトンパターンで DuckDB インスタンスを管理する。
 * ブラウザの Web Worker 上で WASM を実行し、メインスレッドから
 * 非同期APIでアクセスする。
 *
 * Vite の ?url サフィックスで静的アセットURLを取得し、
 * selectBundle() で EH 対応ブラウザを自動判定する。
 */
import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'

export type DuckDBEngineState = 'idle' | 'initializing' | 'ready' | 'error' | 'disposed'

type StateListener = (state: DuckDBEngineState) => void

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

class DuckDBEngineImpl {
  private _state: DuckDBEngineState = 'idle'
  private _error: Error | null = null
  private _db: duckdb.AsyncDuckDB | null = null
  private _conn: duckdb.AsyncDuckDBConnection | null = null
  private _initPromise: Promise<void> | null = null
  private readonly _listeners = new Set<StateListener>()

  get state(): DuckDBEngineState {
    return this._state
  }

  get error(): Error | null {
    return this._error
  }

  private setState(state: DuckDBEngineState): void {
    this._state = state
    for (const listener of this._listeners) {
      listener(state)
    }
  }

  /**
   * DuckDB を初期化する。複数回呼んでも安全（冪等）。
   * 'idle' 状態からのみ初期化を開始する。
   */
  async initialize(): Promise<void> {
    if (this._state === 'ready') return
    if (this._state === 'initializing' && this._initPromise) {
      return this._initPromise
    }
    if (this._state === 'disposed') {
      throw new Error('DuckDB engine has been disposed')
    }

    this._initPromise = this._doInitialize()
    return this._initPromise
  }

  private async _doInitialize(): Promise<void> {
    this.setState('initializing')
    try {
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)

      const worker_url = bundle.mainWorker
      if (!worker_url) {
        throw new Error('No compatible DuckDB-WASM worker bundle found for this browser')
      }
      const worker = new Worker(worker_url)
      const logger = new duckdb.ConsoleLogger()
      const db = new duckdb.AsyncDuckDB(logger, worker)
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker)

      const conn = await db.connect()

      this._db = db
      this._conn = conn
      this._error = null
      this.setState('ready')
    } catch (err) {
      this._error = err instanceof Error ? err : new Error(String(err))
      this.setState('error')
      throw this._error
    }
  }

  /**
   * 共有コネクションを返す。初期化未完了ならエラー。
   */
  async getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
    if (this._state !== 'ready' || !this._conn) {
      throw new Error(`DuckDB is not ready (state: ${this._state})`)
    }
    return this._conn
  }

  getDB(): duckdb.AsyncDuckDB | null {
    return this._db
  }

  async dispose(): Promise<void> {
    if (this._state === 'disposed') return

    try {
      if (this._conn) {
        await this._conn.close()
        this._conn = null
      }
      if (this._db) {
        await this._db.terminate()
        this._db = null
      }
    } finally {
      this._initPromise = null
      this._error = null
      this.setState('disposed')
    }
  }

  onStateChange(listener: StateListener): () => void {
    this._listeners.add(listener)
    return () => {
      this._listeners.delete(listener)
    }
  }
}

// ── グローバルシングルトン ──

let engine: DuckDBEngineImpl | null = null

export function getDuckDBEngine(): DuckDBEngineImpl {
  if (!engine) {
    engine = new DuckDBEngineImpl()
  }
  return engine
}

/** テスト用: エンジンをリセットする */
export function resetDuckDBEngine(): void {
  engine = null
}
