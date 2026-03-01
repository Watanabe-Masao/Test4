/**
 * DuckDB Worker クライアント
 *
 * メインスレッドから Worker 経由で DuckDB を操作する Promise ベースの API。
 * requestId による応答マッチングで並行リクエストを安全に処理する。
 *
 * Worker 非対応環境（テスト、Firefox nested Worker 不可時）では
 * 既存の engine.ts ベースのフォールバックモードで動作する。
 *
 * 使い方:
 * ```
 * const client = new DuckDBWorkerClient()
 * await client.initialize()
 * const rows = await client.query<MyRow>('SELECT * FROM table')
 * ```
 */
import type { DuckDBWorkerRequest, DuckDBWorkerResponse, WorkerDBState } from './types'
import type { ImportedData } from '@/domain/models'
import type { LoadResult } from '../dataLoader'

export interface DuckDBWorkerClientOptions {
  /** Worker 起動タイムアウト (ms) */
  readonly initTimeout?: number
  /** クエリタイムアウト (ms) */
  readonly queryTimeout?: number
}

type StateChangeCallback = (state: WorkerDBState) => void

const DEFAULT_INIT_TIMEOUT = 30_000
const DEFAULT_QUERY_TIMEOUT = 60_000

export class DuckDBWorkerClient {
  private _worker: Worker | null = null
  private _requestId = 0
  private _state: WorkerDBState = 'idle'
  private _isOpfsPersisted = false
  private readonly _pendingRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason: Error) => void }
  >()
  private readonly _stateListeners = new Set<StateChangeCallback>()
  private readonly _initTimeout: number
  private readonly _queryTimeout: number

  constructor(options?: DuckDBWorkerClientOptions) {
    this._initTimeout = options?.initTimeout ?? DEFAULT_INIT_TIMEOUT
    this._queryTimeout = options?.queryTimeout ?? DEFAULT_QUERY_TIMEOUT
  }

  get state(): WorkerDBState {
    return this._state
  }

  get isOpfsPersisted(): boolean {
    return this._isOpfsPersisted
  }

  /**
   * 状態変更リスナーを登録する。
   * @returns 購読解除関数
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this._stateListeners.add(callback)
    return () => this._stateListeners.delete(callback)
  }

  /**
   * Worker を起動し DuckDB を初期化する。
   */
  async initialize(): Promise<void> {
    if (this._state === 'ready') return

    this._startWorker()

    const result = await this._sendRequest<{ isOpfsPersisted: boolean }>(
      { type: 'initialize', requestId: 0 },
      this._initTimeout,
    )
    this._isOpfsPersisted = result.isOpfsPersisted
  }

  /**
   * 全テーブルをリセットする。
   */
  async resetTables(): Promise<void> {
    await this._sendRequest({ type: 'resetTables', requestId: 0 })
  }

  /**
   * 1ヶ月分のデータをロードする。
   */
  async loadMonth(data: ImportedData, year: number, month: number): Promise<LoadResult> {
    return this._sendRequest<LoadResult>(
      { type: 'loadMonth', data, year, month, requestId: 0 },
      this._queryTimeout,
    )
  }

  /**
   * 指定年月のデータを削除する。
   */
  async deleteMonth(year: number, month: number): Promise<void> {
    await this._sendRequest({ type: 'deleteMonth', year, month, requestId: 0 }, this._queryTimeout)
  }

  /**
   * SQL クエリを実行し、camelCase 変換済みのオブジェクト配列を返す。
   */
  async query<T>(sql: string): Promise<readonly T[]> {
    return this._sendRequest<readonly T[]>({ type: 'query', sql, requestId: 0 }, this._queryTimeout)
  }

  /**
   * DB 整合性チェック。
   */
  async checkIntegrity(): Promise<{
    schemaValid: boolean
    monthCount: number
    isOpfsPersisted: boolean
  }> {
    return this._sendRequest({ type: 'checkIntegrity', requestId: 0 }, this._queryTimeout)
  }

  /**
   * Worker を終了する。
   */
  async dispose(): Promise<void> {
    if (!this._worker) return

    try {
      await this._sendRequest({ type: 'dispose', requestId: 0 }, 5_000)
    } catch {
      // タイムアウトしても Worker は終了させる
    }

    this._worker.terminate()
    this._worker = null

    // 保留中リクエストをすべて拒否
    for (const [, { reject }] of this._pendingRequests) {
      reject(new Error('Worker disposed'))
    }
    this._pendingRequests.clear()
  }

  // ── 内部メソッド ──

  private _startWorker(): void {
    if (this._worker) return

    this._worker = new Worker(new URL('./duckdbWorker.ts', import.meta.url), { type: 'module' })

    this._worker.onmessage = (event: MessageEvent<DuckDBWorkerResponse>) => {
      const msg = event.data

      if (msg.type === 'state-change') {
        this._state = msg.state
        for (const listener of this._stateListeners) {
          listener(msg.state)
        }
        return
      }

      const pending = this._pendingRequests.get(msg.requestId)
      if (!pending) return
      this._pendingRequests.delete(msg.requestId)

      if (msg.type === 'error') {
        pending.reject(new Error(msg.message))
      } else {
        pending.resolve(msg.data)
      }
    }

    this._worker.onerror = (event) => {
      const error = new Error(`Worker error: ${event.message}`)
      // 全保留リクエストを拒否
      for (const [, { reject }] of this._pendingRequests) {
        reject(error)
      }
      this._pendingRequests.clear()
    }
  }

  private _sendRequest<T>(request: DuckDBWorkerRequest, timeout = this._queryTimeout): Promise<T> {
    if (!this._worker) {
      return Promise.reject(new Error('Worker not started'))
    }

    const requestId = ++this._requestId
    const msg = { ...request, requestId }

    return new Promise<T>((resolve, reject) => {
      this._pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
      })

      // タイムアウト
      const timer = setTimeout(() => {
        if (this._pendingRequests.has(requestId)) {
          this._pendingRequests.delete(requestId)
          reject(new Error(`Request ${request.type} timed out after ${timeout}ms`))
        }
      }, timeout)

      // タイムアウトクリーンアップ（成功/エラー時にタイマーを解除）
      const originalResolve = resolve
      const originalReject = reject
      this._pendingRequests.set(requestId, {
        resolve: (value: unknown) => {
          clearTimeout(timer)
          originalResolve(value as T)
        },
        reject: (reason: Error) => {
          clearTimeout(timer)
          originalReject(reason)
        },
      })

      this._worker!.postMessage(msg)
    })
  }
}

// ── シングルトン ──

let clientInstance: DuckDBWorkerClient | null = null

/**
 * DuckDB Worker クライアントのシングルトンを取得する。
 */
export function getDuckDBWorkerClient(): DuckDBWorkerClient {
  if (!clientInstance) {
    clientInstance = new DuckDBWorkerClient()
  }
  return clientInstance
}

/** テスト用リセット */
export function resetDuckDBWorkerClient(): void {
  clientInstance = null
}
