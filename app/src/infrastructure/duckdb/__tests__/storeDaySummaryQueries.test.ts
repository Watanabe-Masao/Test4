/**
 * storeDaySummary クエリモジュールのテスト
 *
 * DuckDB 接続をモックして SQL 生成の内容を検証する。
 * materializeSummary は DDL 実行のため、SQL 文字列の送信回数のみ確認する。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  queryStoreDaySummary,
  queryAggregatedRates,
  queryDailyCumulative,
  materializeSummary,
} from '@/infrastructure/duckdb/queries/storeDaySummary'

function makeMockConn(returnRows: Record<string, unknown>[] = []) {
  const capturedSql: string[] = []
  const conn = {
    query: vi.fn((sql: string) => {
      capturedSql.push(sql)
      return Promise.resolve({ toArray: () => returnRows })
    }),
    getCapturedSql: () => capturedSql,
  }
  return conn
}

const baseParams = {
  dateFrom: '2026-02-01',
  dateTo: '2026-02-28',
}

describe('queryStoreDaySummary', () => {
  it('store_day_summary から全データを取得する SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryStoreDaySummary(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('SELECT * FROM store_day_summary')
    expect(sql).toContain('ORDER BY store_id, date_key')
  })

  it('日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryStoreDaySummary(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("date_key BETWEEN '2026-02-01' AND '2026-02-28'")
  })

  it('is_prev_year = FALSE（デフォルト当年）が含まれる', async () => {
    const conn = makeMockConn()
    await queryStoreDaySummary(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('is_prev_year = FALSE')
  })

  it('isPrevYear = true で前年データを取得する', async () => {
    const conn = makeMockConn()
    await queryStoreDaySummary(conn as never, { ...baseParams, isPrevYear: true })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('is_prev_year = TRUE')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryStoreDaySummary(conn as never, { ...baseParams, storeIds: ['1', '2'] })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("store_id IN ('1', '2')")
  })

  it('storeIds 未指定の場合は store_id 条件なし', async () => {
    const conn = makeMockConn()
    await queryStoreDaySummary(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('store_id IN')
  })

  it('空の場合は空配列を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryStoreDaySummary(conn as never, baseParams)
    expect(result).toHaveLength(0)
  })

  it('不正な日付形式は例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryStoreDaySummary(conn as never, { ...baseParams, dateFrom: '2026/02/01' }),
    ).rejects.toThrow('Invalid date key')
  })
})

describe('queryAggregatedRates', () => {
  it('期間集約レートの SQL を生成する', async () => {
    const conn = makeMockConn([{}])
    await queryAggregatedRates(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('store_day_summary')
    expect(sql).toContain('SUM(sales)')
    expect(sql).toContain('SUM(purchase_cost)')
    expect(sql).toContain('SUM(discount_absolute)')
    expect(sql).toContain('discount_rate')
    expect(sql).toContain('SUM(flowers_cost)')
    expect(sql).toContain('SUM(direct_produce_cost)')
    expect(sql).toContain('SUM(customers)')
  })

  it('COALESCE で null を 0 に変換する', async () => {
    const conn = makeMockConn([{}])
    await queryAggregatedRates(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('COALESCE(SUM(sales), 0)')
  })

  it('safe divide で売変率を算出する', async () => {
    const conn = makeMockConn([{}])
    await queryAggregatedRates(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('CASE WHEN SUM(sales) > 0')
  })

  it('データなしの場合は null を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryAggregatedRates(conn as never, baseParams)
    expect(result).toBeNull()
  })

  it('データがある場合は1行目を返す', async () => {
    const rows = [
      {
        totalSales: 1000000,
        totalPurchaseCost: 600000,
        totalDiscountAbsolute: 50000,
        discountRate: 0.05,
        totalFlowersCost: 10000,
        totalDirectProduceCost: 8000,
        totalCostInclusionAmount: 5000,
        totalCustomers: 3000,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryAggregatedRates(conn as never, baseParams)
    expect(result).not.toBeNull()
    expect(result?.totalSales).toBe(1000000)
  })

  it('日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn([{}])
    await queryAggregatedRates(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("date_key BETWEEN '2026-02-01' AND '2026-02-28'")
  })
})

describe('queryDailyCumulative', () => {
  it('日別累積売上 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryDailyCumulative(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('store_day_summary')
    expect(sql).toContain('SUM(sales) AS daily_sales')
    expect(sql).toContain('SUM(SUM(sales)) OVER')
    expect(sql).toContain('cumulative_sales')
  })

  it('ORDER BY date_key で日付順に並ぶ', async () => {
    const conn = makeMockConn()
    await queryDailyCumulative(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY date_key')
    expect(sql).toContain('GROUP BY date_key')
  })

  it('日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryDailyCumulative(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("date_key BETWEEN '2026-02-01' AND '2026-02-28'")
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryDailyCumulative(conn as never, { ...baseParams, storeIds: ['1'] })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("store_id IN ('1')")
  })

  it('月跨ぎの日付範囲を正しく処理する', async () => {
    const conn = makeMockConn()
    await queryDailyCumulative(conn as never, {
      dateFrom: '2025-12-01',
      dateTo: '2026-01-31',
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("date_key BETWEEN '2025-12-01' AND '2026-01-31'")
  })
})

describe('materializeSummary', () => {
  it('VIEW/TABLE 両対応で DROP してからマテリアライズする', async () => {
    const capturedSql: string[] = []
    const conn = {
      query: vi.fn((sql: string) => {
        capturedSql.push(sql)
        return Promise.resolve({ toArray: () => [] })
      }),
    }
    await materializeSummary(conn as never)
    expect(capturedSql[0]).toContain('CREATE TABLE store_day_summary_mat')
    expect(capturedSql).toEqual(
      expect.arrayContaining([
        expect.stringContaining('DROP VIEW IF EXISTS store_day_summary'),
        expect.stringContaining('DROP TABLE IF EXISTS store_day_summary'),
        expect.stringContaining('RENAME TO store_day_summary'),
      ]),
    )
  })

  it('DROP VIEW が型不一致エラーでも続行する', async () => {
    const conn = {
      query: vi.fn((sql: string) => {
        if (sql.includes('DROP VIEW')) {
          return Promise.reject(new Error('Catalog Error: Existing object is of type Table'))
        }
        return Promise.resolve({ toArray: () => [] })
      }),
    }
    await expect(materializeSummary(conn as never)).resolves.toBeUndefined()
  })
})
