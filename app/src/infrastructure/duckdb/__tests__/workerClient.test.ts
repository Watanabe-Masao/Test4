/**
 * DuckDBWorkerClient のユニットテスト
 *
 * Worker をモックし、基本的な API テストを行う。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DuckDBWorkerClient,
  getDuckDBWorkerClient,
  resetDuckDBWorkerClient,
} from '../worker/duckdbWorkerClient'

// Worker コンストラクタをシンプルにモック
vi.stubGlobal(
  'Worker',
  class {
    onmessage: ((event: MessageEvent) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null
    postMessage(msg: unknown): void {
      // no-op: テスト時は応答しない
      void msg
    }
    terminate(): void {
      // no-op
    }
  },
)

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

  describe('dispose', () => {
    it('Worker 未起動時は何もしない', async () => {
      const client = new DuckDBWorkerClient()
      await client.dispose()
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
