/**
 * engine.ts — 追加テスト
 *
 * DuckDBEngineImpl のライフサイクル管理をモックして検証する。
 * 実際の WASM バンドルは不要 - duckdb モジュール全体をモックする。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── DuckDB モジュールをモックする ─────────────────────────────────
// vi.mock はホイストされるため、factory 内で定義する必要がある

vi.mock('@duckdb/duckdb-wasm', () => {
  class MockConsoleLogger {
    constructor(_level?: unknown) {}
  }
  class MockVoidLogger {}

  class MockAsyncDuckDB {
    private mockConn = {
      close: () => Promise.resolve(),
      query: () => Promise.resolve({ toArray: () => [] }),
    }
    instantiate() {
      return Promise.resolve()
    }
    connect() {
      return Promise.resolve(this.mockConn)
    }
    terminate() {
      return Promise.resolve()
    }
  }

  return {
    selectBundle: vi.fn().mockResolvedValue({
      mainModule: 'mock-module',
      mainWorker: 'mock-worker-url',
      pthreadWorker: null,
    }),
    ConsoleLogger: MockConsoleLogger,
    VoidLogger: MockVoidLogger,
    LogLevel: { NONE: 0, DEBUG: 1, INFO: 2, WARNING: 3, ERROR: 4 },
    AsyncDuckDB: MockAsyncDuckDB,
    DuckDBBundles: {},
  }
})

// Vite ?url imports のモック
vi.mock('@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url', () => ({ default: 'mvp.wasm' }))
vi.mock('@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url', () => ({
  default: 'mvp-worker.js',
}))
vi.mock('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url', () => ({ default: 'eh.wasm' }))
vi.mock('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url', () => ({
  default: 'eh-worker.js',
}))

// Worker のモック（コンストラクタとして使えるよう class で定義）
class MockWorker {
  postMessage = vi.fn()
  terminate = vi.fn()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_url: string) {}
}
vi.stubGlobal('Worker', MockWorker)

import { getDuckDBEngine, resetDuckDBEngine } from '../engine'

beforeEach(() => {
  resetDuckDBEngine()
})

afterEach(() => {
  resetDuckDBEngine()
  vi.restoreAllMocks()
})

// ── getDuckDBEngine ────────────────────────────────────────────────

describe('getDuckDBEngine', () => {
  it('シングルトンを返す（同一インスタンス）', () => {
    const e1 = getDuckDBEngine()
    const e2 = getDuckDBEngine()
    expect(e1).toBe(e2)
  })

  it('resetDuckDBEngine 後は新しいインスタンスを返す', () => {
    const e1 = getDuckDBEngine()
    resetDuckDBEngine()
    const e2 = getDuckDBEngine()
    expect(e1).not.toBe(e2)
  })
})

// ── 初期状態 ────────────────────────────────────────────────────────

describe('DuckDBEngine 初期状態', () => {
  it('初期状態は idle', () => {
    const engine = getDuckDBEngine()
    expect(engine.state).toBe('idle')
  })

  it('初期エラーは null', () => {
    const engine = getDuckDBEngine()
    expect(engine.error).toBeNull()
  })

  it('getDB() は初期状態で null を返す', () => {
    const engine = getDuckDBEngine()
    expect(engine.getDB()).toBeNull()
  })
})

// ── getConnection — 未初期化時のエラー ─────────────────────────────

describe('getConnection — 未初期化時', () => {
  it('idle 状態で getConnection を呼ぶとエラーを投げる', async () => {
    const engine = getDuckDBEngine()
    await expect(engine.getConnection()).rejects.toThrow('not ready')
  })
})

// ── initialize ─────────────────────────────────────────────────────

describe('initialize', () => {
  it('initialize を呼ぶと state が ready になる', async () => {
    const engine = getDuckDBEngine()
    await engine.initialize()
    expect(engine.state).toBe('ready')
  })

  it('ready 後に再度 initialize を呼んでも冪等', async () => {
    const engine = getDuckDBEngine()
    await engine.initialize()
    await engine.initialize() // 2回目
    expect(engine.state).toBe('ready')
  })

  it('ready 後は getConnection が接続を返す', async () => {
    const engine = getDuckDBEngine()
    await engine.initialize()
    const conn = await engine.getConnection()
    expect(conn).not.toBeNull()
  })

  it('ready 後は getDB() が AsyncDuckDB を返す', async () => {
    const engine = getDuckDBEngine()
    await engine.initialize()
    expect(engine.getDB()).not.toBeNull()
  })

  it('複数の同時 initialize 呼び出しは同一 Promise を共有する', async () => {
    const engine = getDuckDBEngine()
    // 並列呼び出し
    const [p1, p2] = [engine.initialize(), engine.initialize()]
    await Promise.all([p1, p2])
    expect(engine.state).toBe('ready')
  })
})

// ── onStateChange ─────────────────────────────────────────────────

describe('onStateChange', () => {
  it('状態変化リスナーが呼ばれる', async () => {
    const engine = getDuckDBEngine()
    const states: string[] = []
    const unsubscribe = engine.onStateChange((s) => states.push(s))

    await engine.initialize()

    // initializing → ready の順で通知されるはず
    expect(states).toContain('initializing')
    expect(states).toContain('ready')

    unsubscribe()
  })

  it('unsubscribe 後はリスナーが呼ばれない', async () => {
    const engine = getDuckDBEngine()
    const states: string[] = []
    const unsubscribe = engine.onStateChange((s) => states.push(s))
    unsubscribe() // 即時解除

    await engine.initialize()

    expect(states).toHaveLength(0)
  })

  it('複数リスナーが全て呼ばれる', async () => {
    const engine = getDuckDBEngine()
    const calls1: string[] = []
    const calls2: string[] = []

    const u1 = engine.onStateChange((s) => calls1.push(s))
    const u2 = engine.onStateChange((s) => calls2.push(s))

    await engine.initialize()

    expect(calls1.length).toBeGreaterThan(0)
    expect(calls2.length).toBeGreaterThan(0)

    u1()
    u2()
  })
})

// ── dispose ─────────────────────────────────────────────────────────

describe('dispose', () => {
  it('dispose 後の状態は disposed', async () => {
    const engine = getDuckDBEngine()
    await engine.initialize()
    await engine.dispose()
    expect(engine.state).toBe('disposed')
  })

  it('dispose を2回呼んでも例外が起きない', async () => {
    const engine = getDuckDBEngine()
    await engine.initialize()
    await engine.dispose()
    await expect(engine.dispose()).resolves.not.toThrow()
  })

  it('disposed 後に initialize を呼ぶとエラーを投げる', async () => {
    const engine = getDuckDBEngine()
    await engine.initialize()
    await engine.dispose()
    await expect(engine.initialize()).rejects.toThrow('disposed')
  })

  it('dispose 前に getDB() が非 null で、dispose 後は null', async () => {
    const engine = getDuckDBEngine()
    await engine.initialize()
    expect(engine.getDB()).not.toBeNull()
    await engine.dispose()
    // dispose 後は DB が解放される
    expect(engine.getDB()).toBeNull()
  })

  it('未初期化のエンジンを dispose しても正常に completed になる', async () => {
    const engine = getDuckDBEngine()
    // idle 状態から直接 dispose
    await engine.dispose()
    expect(engine.state).toBe('disposed')
  })

  it('dispose 後に resetDuckDBEngine → 新エンジンで再初期化が可能', async () => {
    const engine1 = getDuckDBEngine()
    await engine1.initialize()
    await engine1.dispose()
    expect(engine1.state).toBe('disposed')

    // リセット後に新しいエンジンで再初期化
    resetDuckDBEngine()
    const engine2 = getDuckDBEngine()
    expect(engine2).not.toBe(engine1)
    expect(engine2.state).toBe('idle')
    await engine2.initialize()
    expect(engine2.state).toBe('ready')
  })

  it('disposed 後に getConnection を呼ぶとエラーを投げる', async () => {
    const engine = getDuckDBEngine()
    await engine.initialize()
    await engine.dispose()
    await expect(engine.getConnection()).rejects.toThrow()
  })

  it('dispose 時に state listener が disposed を通知する', async () => {
    const engine = getDuckDBEngine()
    await engine.initialize()

    const states: string[] = []
    const unsub = engine.onStateChange((s) => states.push(s))
    await engine.dispose()
    unsub()

    expect(states).toContain('disposed')
  })
})

// ── initialize 失敗ケース ─────────────────────────────────────────

describe('initialize — 失敗ケース', () => {
  it('selectBundle がワーカー URL を返さない場合はエラー状態になる', async () => {
    // selectBundle のレスポンスを上書き
    const duckdb = await import('@duckdb/duckdb-wasm')
    vi.mocked(duckdb.selectBundle).mockResolvedValueOnce({
      mainModule: 'mock',
      mainWorker: null, // workerなし
      pthreadWorker: null,
    })

    const engine = getDuckDBEngine()
    await expect(engine.initialize()).rejects.toThrow()
    expect(engine.state).toBe('error')
    expect(engine.error).not.toBeNull()
  })

  it('エラー後の error プロパティが Error オブジェクト', async () => {
    const duckdb = await import('@duckdb/duckdb-wasm')
    vi.mocked(duckdb.selectBundle).mockRejectedValueOnce(new Error('Network failure'))

    const engine = getDuckDBEngine()
    await expect(engine.initialize()).rejects.toThrow('Network failure')
    expect(engine.error).toBeInstanceOf(Error)
    expect(engine.error?.message).toBe('Network failure')
  })

  it('非 Error がスローされた場合も Error に変換する', async () => {
    const duckdb = await import('@duckdb/duckdb-wasm')
    vi.mocked(duckdb.selectBundle).mockRejectedValueOnce('string error')

    const engine = getDuckDBEngine()
    await expect(engine.initialize()).rejects.toThrow()
    expect(engine.error).toBeInstanceOf(Error)
  })
})
