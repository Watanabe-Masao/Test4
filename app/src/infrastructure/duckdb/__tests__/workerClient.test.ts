/**
 * DuckDBWorkerClient のユニットテスト
 *
 * Worker をモックし、基本的な API テストを行う。
 * リクエスト/レスポンスサイクルを含む全パブリックメソッドをテスト。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DuckDBWorkerResponse } from '../worker/types'
import {
  DuckDBWorkerClient,
  getDuckDBWorkerClient,
  resetDuckDBWorkerClient,
} from '../worker/duckdbWorkerClient'

// ── レスポンス付き Worker モック ──

let workerInstance: {
  onmessage: ((event: MessageEvent<DuckDBWorkerResponse>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
}

vi.stubGlobal(
  'Worker',
  class {
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null
    postMessage = vi.fn()
    terminate = vi.fn()

    constructor() {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      workerInstance = this
    }
  },
)

/** Worker レスポンスをシミュレートする */
function simulateResponse(data: DuckDBWorkerResponse): void {
  workerInstance.onmessage?.({ data } as MessageEvent<DuckDBWorkerResponse>)
}

/** Worker エラーをシミュレートする */
function simulateError(message: string): void {
  workerInstance.onerror?.({ message } as ErrorEvent)
}

describe('DuckDBWorkerClient', () => {
  beforeEach(() => {
    resetDuckDBWorkerClient()
  })

  describe('constructor', () => {
    it('デフォルトオプションで作成できる', () => {
      const client = new DuckDBWorkerClient()
      expect(client.state).toBe('idle')
      expect(client.isOpfsPersisted).toBe(false)
    })

    it('カスタムオプションで作成できる', () => {
      const client = new DuckDBWorkerClient({
        initTimeout: 5000,
        queryTimeout: 10000,
      })
      expect(client.state).toBe('idle')
    })
  })

  describe('onStateChange', () => {
    it('状態変更リスナーの登録と解除', () => {
      const client = new DuckDBWorkerClient()
      const listener = vi.fn()
      const unsubscribe = client.onStateChange(listener)

      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })

  describe('initialize', () => {
    it('Worker を起動し initialize レスポンスで isOpfsPersisted を設定', async () => {
      const client = new DuckDBWorkerClient()

      const initPromise = client.initialize()

      // postMessage が呼ばれたことを確認
      const sentMsg = workerInstance.postMessage.mock.calls[0][0]
      expect(sentMsg.type).toBe('initialize')

      // レスポンスをシミュレート
      simulateResponse({
        type: 'result',
        requestId: sentMsg.requestId,
        data: { isOpfsPersisted: true },
      })

      await initPromise
      expect(client.isOpfsPersisted).toBe(true)
    })

    it('state-change メッセージで状態が更新される', async () => {
      const client = new DuckDBWorkerClient()
      const listener = vi.fn()
      client.onStateChange(listener)

      const initPromise = client.initialize()

      // state-change → ready
      simulateResponse({ type: 'state-change', state: 'ready' })
      expect(client.state).toBe('ready')
      expect(listener).toHaveBeenCalledWith('ready')

      // initialize レスポンス
      const sentMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({
        type: 'result',
        requestId: sentMsg.requestId,
        data: { isOpfsPersisted: false },
      })

      await initPromise
    })

    it('already ready の場合は何もしない', async () => {
      const client = new DuckDBWorkerClient()

      // 1回目の initialize
      const initPromise = client.initialize()
      const sentMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({ type: 'state-change', state: 'ready' })
      simulateResponse({
        type: 'result',
        requestId: sentMsg.requestId,
        data: { isOpfsPersisted: false },
      })
      await initPromise

      // 2回目は即座に return
      workerInstance.postMessage.mockClear()
      await client.initialize()
      expect(workerInstance.postMessage).not.toHaveBeenCalled()
    })
  })

  describe('query', () => {
    it('SQL クエリを Worker に送信し結果を返す', async () => {
      const client = new DuckDBWorkerClient()

      // initialize
      const initP = client.initialize()
      const initMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({
        type: 'result',
        requestId: initMsg.requestId,
        data: { isOpfsPersisted: false },
      })
      await initP

      // query
      const queryPromise = client.query<{ count: number }>('SELECT COUNT(*) as count')
      const queryMsg = workerInstance.postMessage.mock.calls[1][0]
      expect(queryMsg.type).toBe('query')
      expect(queryMsg.sql).toBe('SELECT COUNT(*) as count')

      simulateResponse({
        type: 'result',
        requestId: queryMsg.requestId,
        data: [{ count: 42 }],
      })

      const result = await queryPromise
      expect(result).toEqual([{ count: 42 }])
    })

    it('Worker エラーレスポンスで reject される', async () => {
      const client = new DuckDBWorkerClient()

      const initP = client.initialize()
      const initMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({
        type: 'result',
        requestId: initMsg.requestId,
        data: { isOpfsPersisted: false },
      })
      await initP

      const queryPromise = client.query('INVALID SQL')
      const queryMsg = workerInstance.postMessage.mock.calls[1][0]

      simulateResponse({
        type: 'error',
        requestId: queryMsg.requestId,
        message: 'Parser Error: syntax error',
      })

      await expect(queryPromise).rejects.toThrow('Parser Error: syntax error')
    })
  })

  describe('checkIntegrity', () => {
    it('整合性チェック結果を返す', async () => {
      const client = new DuckDBWorkerClient()
      const initP = client.initialize()
      const initMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({
        type: 'result',
        requestId: initMsg.requestId,
        data: { isOpfsPersisted: true },
      })
      await initP

      const integrityPromise = client.checkIntegrity()
      const msg = workerInstance.postMessage.mock.calls[1][0]
      expect(msg.type).toBe('checkIntegrity')

      simulateResponse({
        type: 'result',
        requestId: msg.requestId,
        data: { schemaValid: true, monthCount: 3, isOpfsPersisted: true, hasParquetCache: true },
      })

      const result = await integrityPromise
      expect(result.schemaValid).toBe(true)
      expect(result.monthCount).toBe(3)
      expect(result.hasParquetCache).toBe(true)
    })
  })

  describe('exportParquet', () => {
    it('Parquet エクスポート結果を返す', async () => {
      const client = new DuckDBWorkerClient()
      const initP = client.initialize()
      const initMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({
        type: 'result',
        requestId: initMsg.requestId,
        data: { isOpfsPersisted: false },
      })
      await initP

      const exportPromise = client.exportParquet()
      const msg = workerInstance.postMessage.mock.calls[1][0]
      expect(msg.type).toBe('exportParquet')

      simulateResponse({
        type: 'result',
        requestId: msg.requestId,
        data: { tablesExported: 10, totalRows: 5000, durationMs: 200 },
      })

      const result = await exportPromise
      expect(result.tablesExported).toBe(10)
      expect(result.totalRows).toBe(5000)
    })
  })

  describe('importParquet', () => {
    it('Parquet インポート結果を返す', async () => {
      const client = new DuckDBWorkerClient()
      const initP = client.initialize()
      const initMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({
        type: 'result',
        requestId: initMsg.requestId,
        data: { isOpfsPersisted: false },
      })
      await initP

      const importPromise = client.importParquet()
      const msg = workerInstance.postMessage.mock.calls[1][0]
      expect(msg.type).toBe('importParquet')

      simulateResponse({
        type: 'result',
        requestId: msg.requestId,
        data: { tablesImported: 8, totalRows: 3000, durationMs: 150 },
      })

      const result = await importPromise
      expect(result.tablesImported).toBe(8)
    })
  })

  describe('generateReport', () => {
    it('レポート生成結果を返す', async () => {
      const client = new DuckDBWorkerClient()
      const initP = client.initialize()
      const initMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({
        type: 'result',
        requestId: initMsg.requestId,
        data: { isOpfsPersisted: false },
      })
      await initP

      const reportPromise = client.generateReport('dailySales', 'SELECT * FROM daily')
      const msg = workerInstance.postMessage.mock.calls[1][0]
      expect(msg.type).toBe('generateReport')
      expect(msg.reportType).toBe('dailySales')
      expect(msg.sql).toBe('SELECT * FROM daily')

      simulateResponse({
        type: 'result',
        requestId: msg.requestId,
        data: { csvContent: 'col1,col2\r\nval1,val2', rowCount: 1 },
      })

      const result = await reportPromise
      expect(result.csvContent).toContain('col1,col2')
      expect(result.rowCount).toBe(1)
    })
  })

  describe('resetTables', () => {
    it('resetTables リクエストを送信する', async () => {
      const client = new DuckDBWorkerClient()
      const initP = client.initialize()
      const initMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({
        type: 'result',
        requestId: initMsg.requestId,
        data: { isOpfsPersisted: false },
      })
      await initP

      const resetPromise = client.resetTables()
      const msg = workerInstance.postMessage.mock.calls[1][0]
      expect(msg.type).toBe('resetTables')

      simulateResponse({ type: 'result', requestId: msg.requestId, data: undefined })
      await resetPromise
    })
  })

  describe('deleteMonth', () => {
    it('deleteMonth リクエストを送信する', async () => {
      const client = new DuckDBWorkerClient()
      const initP = client.initialize()
      const initMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({
        type: 'result',
        requestId: initMsg.requestId,
        data: { isOpfsPersisted: false },
      })
      await initP

      const deletePromise = client.deleteMonth(2025, 3)
      const msg = workerInstance.postMessage.mock.calls[1][0]
      expect(msg.type).toBe('deleteMonth')
      expect(msg.year).toBe(2025)
      expect(msg.month).toBe(3)

      simulateResponse({ type: 'result', requestId: msg.requestId, data: undefined })
      await deletePromise
    })
  })

  describe('dispose', () => {
    it('Worker 未起動時は何もしない', async () => {
      const client = new DuckDBWorkerClient()
      await client.dispose()
    })

    it('Worker 起動後に dispose すると terminate が呼ばれる', async () => {
      const client = new DuckDBWorkerClient()
      const initP = client.initialize()
      const initMsg = workerInstance.postMessage.mock.calls[0][0]
      simulateResponse({
        type: 'result',
        requestId: initMsg.requestId,
        data: { isOpfsPersisted: false },
      })
      await initP

      const disposePromise = client.dispose()
      const disposeMsg = workerInstance.postMessage.mock.calls[1][0]
      expect(disposeMsg.type).toBe('dispose')

      simulateResponse({ type: 'result', requestId: disposeMsg.requestId, data: undefined })
      await disposePromise

      expect(workerInstance.terminate).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('Worker not started でメソッド呼び出しすると reject', async () => {
      const client = new DuckDBWorkerClient()
      await expect(client.query('SELECT 1')).rejects.toThrow('Worker not started')
    })

    it('Worker onerror で保留中リクエストが全て reject される', async () => {
      const client = new DuckDBWorkerClient()
      const initPromise = client.initialize()

      simulateError('Worker crashed')

      await expect(initPromise).rejects.toThrow('Worker error')
    })

    it('不明な requestId のレスポンスは無視される', async () => {
      const client = new DuckDBWorkerClient()
      const initP = client.initialize()
      const initMsg = workerInstance.postMessage.mock.calls[0][0]

      // 存在しない requestId
      simulateResponse({ type: 'result', requestId: 99999, data: undefined })

      // 正しい requestId で完了
      simulateResponse({
        type: 'result',
        requestId: initMsg.requestId,
        data: { isOpfsPersisted: false },
      })
      await initP
    })
  })

  describe('singleton', () => {
    it('getDuckDBWorkerClient は同一インスタンスを返す', () => {
      const client1 = getDuckDBWorkerClient()
      const client2 = getDuckDBWorkerClient()
      expect(client1).toBe(client2)
    })

    it('resetDuckDBWorkerClient で新しいインスタンスになる', () => {
      const client1 = getDuckDBWorkerClient()
      resetDuckDBWorkerClient()
      const client2 = getDuckDBWorkerClient()
      expect(client1).not.toBe(client2)
    })
  })
})
