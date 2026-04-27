/**
 * queryRunner — 追加テスト
 *
 * storeIdFilterWithAlias と mocked queryToObjects/queryScalar の内部ロジックを
 * カバーするための補足テスト。
 * structRowToObject / snakeToCamel は export されていないため、
 * queryToObjects / queryScalar をモック接続経由で検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { storeIdFilter, storeIdFilterWithAlias, queryToObjects, queryScalar } from '../queryRunner'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

// ── storeIdFilterWithAlias ──────────────────────────────────────

describe('storeIdFilterWithAlias', () => {
  it('storeIds が undefined のとき null を返す', () => {
    expect(storeIdFilterWithAlias(undefined, 's')).toBeNull()
  })

  it('storeIds が空配列のとき null を返す', () => {
    expect(storeIdFilterWithAlias([], 's')).toBeNull()
  })

  it('単一 storeId でエイリアス付き IN 条件を生成する', () => {
    expect(storeIdFilterWithAlias(['1'], 's')).toBe("s.store_id IN ('1')")
  })

  it('複数 storeIds でエイリアス付き IN 条件を生成する', () => {
    expect(storeIdFilterWithAlias(['1', '2', '3'], 'tbl')).toBe("tbl.store_id IN ('1', '2', '3')")
  })

  it('不正な storeId はバリデーションエラーを投げる', () => {
    expect(() => storeIdFilterWithAlias(["O'Brien"], 's')).toThrow('Invalid store ID')
  })
})

// ── mock helpers ────────────────────────────────────────────────

/** AsyncDuckDBConnection のモックを生成する */
function makeMockConn(rows: Record<string, unknown>[]): AsyncDuckDBConnection {
  const mockResult = {
    toArray: () => rows,
  }
  return {
    query: vi.fn().mockResolvedValue(mockResult),
  } as unknown as AsyncDuckDBConnection
}

// ── queryToObjects ──────────────────────────────────────────────

describe('queryToObjects', () => {
  it('snake_case キーを camelCase に変換する', async () => {
    const conn = makeMockConn([{ total_amount: 1000, store_id: '1' }])
    const result = await queryToObjects<{ totalAmount: number; storeId: string }>(conn, 'SELECT 1')
    expect(result).toHaveLength(1)
    expect(result[0].totalAmount).toBe(1000)
    expect(result[0].storeId).toBe('1')
  })

  it('BigInt 値を number に変換する', async () => {
    const conn = makeMockConn([{ count_val: BigInt(42) }])
    const result = await queryToObjects<{ countVal: number }>(conn, 'SELECT 1')
    expect(result[0].countVal).toBe(42)
    expect(typeof result[0].countVal).toBe('number')
  })

  it('結果が空のとき空配列を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryToObjects(conn, 'SELECT 1')
    expect(result).toEqual([])
  })

  it('複数行をすべて変換する', async () => {
    const conn = makeMockConn([
      { store_id: '1', sales_amount: 500 },
      { store_id: '2', sales_amount: 800 },
    ])
    const result = await queryToObjects<{ storeId: string; salesAmount: number }>(conn, 'SELECT 1')
    expect(result).toHaveLength(2)
    expect(result[0].storeId).toBe('1')
    expect(result[1].salesAmount).toBe(800)
  })

  it('snake_case が無いキーはそのまま保持する', async () => {
    const conn = makeMockConn([{ name: 'test', value: 99 }])
    const result = await queryToObjects<{ name: string; value: number }>(conn, 'SELECT 1')
    expect(result[0].name).toBe('test')
    expect(result[0].value).toBe(99)
  })
})

// ── queryScalar ─────────────────────────────────────────────────

describe('queryScalar', () => {
  it('行がないとき null を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryScalar<number>(conn, 'SELECT 1')
    expect(result).toBeNull()
  })

  it('キーがないとき null を返す', async () => {
    const mockResult = { toArray: () => [{}] }
    const conn = {
      query: vi.fn().mockResolvedValue(mockResult),
    } as unknown as AsyncDuckDBConnection
    const result = await queryScalar<number>(conn, 'SELECT 1')
    expect(result).toBeNull()
  })

  it('通常の数値スカラーを返す', async () => {
    const conn = makeMockConn([{ total: 12345 }])
    const result = await queryScalar<number>(conn, 'SELECT 1')
    expect(result).toBe(12345)
  })

  it('BigInt スカラーを number に変換して返す', async () => {
    const conn = makeMockConn([{ cnt: BigInt(999) }])
    const result = await queryScalar<number>(conn, 'SELECT 1')
    expect(result).toBe(999)
    expect(typeof result).toBe('number')
  })

  it('文字列スカラーを返す', async () => {
    const conn = makeMockConn([{ label: 'hello' }])
    const result = await queryScalar<string>(conn, 'SELECT 1')
    expect(result).toBe('hello')
  })
})

// ── storeIdFilter の追加ケース ────────────────────────────────────

describe('storeIdFilter (additional)', () => {
  it('store_id の値にシングルクォートが来ると例外', () => {
    expect(() => storeIdFilter(["test'val"])).toThrow()
  })
})
