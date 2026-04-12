/**
 * helpers/duplicateInjectedMockConn.ts のセルフテスト
 *
 * 本 helper は read-path 重複耐性 spot audit の FRAGILE 6 件回帰テストの
 * 共有基盤になるため、helper 自身の振る舞いを最初に固定する。FRAGILE クエリ
 * への適用は別 PR で行う（plan §8 Done 定義 step 1）。
 */
import { describe, it, expect } from 'vitest'
import {
  createCapturingMockConn,
  createDuplicateInjectingMockConn,
  expectSqlPreAggregatesSource,
} from './duplicateInjectedMockConn'

describe('createCapturingMockConn', () => {
  it('発火した SQL を順序通りに記録する', async () => {
    const conn = createCapturingMockConn()
    await conn.query('SELECT 1')
    await conn.query('SELECT 2')
    expect(conn.getCapturedSql()).toEqual(['SELECT 1', 'SELECT 2'])
  })

  it('rule に一致する SQL に対してのみ rows を返す', async () => {
    const conn = createCapturingMockConn([
      { matches: (s) => s.includes('purchase'), rows: [{ store_id: 'A', cost: 100 }] },
    ])
    const matched = await conn.query('SELECT * FROM purchase')
    const unmatched = await conn.query('SELECT * FROM other')
    expect(matched.toArray()).toEqual([{ store_id: 'A', cost: 100 }])
    expect(unmatched.toArray()).toEqual([])
  })
})

describe('createDuplicateInjectingMockConn', () => {
  it('rule の rows を 2 回繰り返した結果を返す', async () => {
    const conn = createDuplicateInjectingMockConn([
      {
        matches: (s) => s.includes('special_sales'),
        rows: [
          { store_id: 'A', day: 1, cost: 100, price: 150 },
          { store_id: 'B', day: 1, cost: 200, price: 300 },
        ],
      },
    ])
    const result = await conn.query('SELECT * FROM special_sales')
    expect(result.toArray()).toHaveLength(4)
  })
})

describe('expectSqlPreAggregatesSource', () => {
  it('SAFE: subquery で事前集約された SQL を ok と判定する', () => {
    const safeSql = `
      SELECT store_id, SUM(cost) AS total
      FROM (
        SELECT store_id, SUM(cost) AS cost
        FROM special_sales
        WHERE date_key BETWEEN '2026-02-01' AND '2026-02-28'
        GROUP BY store_id
      ) sub
      GROUP BY store_id`
    expect(expectSqlPreAggregatesSource(safeSql, 'special_sales').ok).toBe(true)
  })

  it('FRAGILE: source を直接 SUM するだけの SQL を ng と判定する', () => {
    const fragileSql = `
      SELECT store_id, SUM(cost) AS total
      FROM special_sales
      WHERE date_key BETWEEN '2026-02-01' AND '2026-02-28'
      GROUP BY store_id`
    const result = expectSqlPreAggregatesSource(fragileSql, 'special_sales')
    expect(result.ok).toBe(false)
    expect(result.reason).toContain('special_sales')
  })

  it('SAFE: source を一切参照しない SQL（VIEW 経由）を ok と判定する', () => {
    const viewSql = `SELECT day, SUM(sales) FROM store_day_summary GROUP BY day`
    expect(expectSqlPreAggregatesSource(viewSql, 'classified_sales').ok).toBe(true)
  })

  it('FRAGILE: UNION ALL + 外側 SUM パターンを ng と判定する', () => {
    const unionSql = `
      SELECT store_id, SUM(cost) AS total_cost
      FROM (
        SELECT store_id, cost FROM purchase
        UNION ALL
        SELECT store_id, cost FROM special_sales
      ) combined
      GROUP BY store_id`
    expect(expectSqlPreAggregatesSource(unionSql, 'purchase').ok).toBe(false)
    expect(expectSqlPreAggregatesSource(unionSql, 'special_sales').ok).toBe(false)
  })
})
