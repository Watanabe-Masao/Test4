/**
 * QueryPort — createQueryExecutor tests
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { createQueryExecutor } from '../QueryPort'
import type { QueryHandler } from '../QueryContract'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

describe('createQueryExecutor', () => {
  const mockConn = {} as AsyncDuckDBConnection

  it('conn=null で isReady=false', () => {
    const ex = createQueryExecutor(null)
    expect(ex.isReady).toBe(false)
  })

  it('conn 指定で isReady=true', () => {
    const ex = createQueryExecutor(mockConn)
    expect(ex.isReady).toBe(true)
  })

  it('dataVersion デフォルト=0', () => {
    const ex = createQueryExecutor(null)
    expect(ex.dataVersion).toBe(0)
  })

  it('dataVersion 指定で反映', () => {
    const ex = createQueryExecutor(mockConn, 5)
    expect(ex.dataVersion).toBe(5)
  })

  it('execute: conn=null で null を返す（handler 非実行）', async () => {
    const execute = vi.fn()
    const handler: QueryHandler<unknown, unknown> = { name: 'h', execute }
    const ex = createQueryExecutor(null)
    const r = await ex.execute(handler, {})
    expect(r).toBeNull()
    expect(execute).not.toHaveBeenCalled()
  })

  it('execute: conn ありで handler を呼ぶ', async () => {
    const execute = vi.fn(async () => ({ rows: [1, 2, 3] }))
    const handler: QueryHandler<{ q: string }, { rows: number[] }> = { name: 'h', execute }
    const ex = createQueryExecutor(mockConn)
    const r = await ex.execute(handler, { q: 'test' })
    expect(r).toEqual({ rows: [1, 2, 3] })
    expect(execute).toHaveBeenCalledWith(mockConn, { q: 'test' })
  })

  it('dataVersion 違いで異なる executor 参照', () => {
    const a = createQueryExecutor(mockConn, 1)
    const b = createQueryExecutor(mockConn, 2)
    // 新しいオブジェクトを毎回返す
    expect(a).not.toBe(b)
    expect(a.dataVersion).toBe(1)
    expect(b.dataVersion).toBe(2)
  })
})
