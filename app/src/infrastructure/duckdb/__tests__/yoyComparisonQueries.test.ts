/**
 * yoyComparison クエリモジュールのテスト
 *
 * DuckDB 接続をモックして SQL 生成の内容を検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import {
  queryYoyDailyComparison,
  queryYoyCategoryComparison,
} from '@/infrastructure/duckdb/queries/yoyComparison'

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

const baseYoyParams = {
  curDateFrom: '2026-02-01',
  curDateTo: '2026-02-28',
  prevDateFrom: '2025-02-01',
  prevDateTo: '2025-02-28',
}

describe('queryYoyDailyComparison', () => {
  it('当年・前年それぞれの CTE を含む SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryYoyDailyComparison(conn as never, baseYoyParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('current_data AS')
    expect(sql).toContain('prev_data AS')
  })

  it('当年の日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryYoyDailyComparison(conn as never, baseYoyParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain('is_prev_year = FALSE')
  })

  it('前年の日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryYoyDailyComparison(conn as never, baseYoyParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("date_key BETWEEN '2025-02-01' AND '2025-02-28'")
    expect(sql).toContain('is_prev_year = TRUE')
  })

  it('FULL OUTER JOIN で当年・前年を結合する', async () => {
    const conn = makeMockConn()
    await queryYoyDailyComparison(conn as never, baseYoyParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FULL OUTER JOIN prev_data p')
    expect(sql).toContain('c.store_id = p.store_id AND c.month = p.month AND c.day = p.day')
  })

  it('COALESCE で差分を計算する', async () => {
    const conn = makeMockConn()
    await queryYoyDailyComparison(conn as never, baseYoyParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('COALESCE(c.sales, 0) - COALESCE(p.sales, 0) AS sales_diff')
    expect(sql).toContain('c.date_key AS cur_date_key')
    expect(sql).toContain('p.date_key AS prev_date_key')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryYoyDailyComparison(conn as never, {
      ...baseYoyParams,
      storeIds: ['1', '2'],
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("store_id IN ('1', '2')")
  })

  it('storeIds 未指定の場合は store_id 条件なし', async () => {
    const conn = makeMockConn()
    await queryYoyDailyComparison(conn as never, baseYoyParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('store_id IN')
  })

  it('不正な日付形式は例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryYoyDailyComparison(conn as never, {
        ...baseYoyParams,
        curDateFrom: '2026/02/01',
      }),
    ).rejects.toThrow('Invalid date key')
  })

  it('結果を正しく返す', async () => {
    const rows = [
      {
        curDateKey: '2026-02-01',
        prevDateKey: '2025-02-01',
        storeId: '1',
        curSales: 100000,
        prevSales: 90000,
        salesDiff: 10000,
        curCustomers: 200,
        prevCustomers: 180,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryYoyDailyComparison(conn as never, baseYoyParams)
    expect(result).toHaveLength(1)
    expect(result[0].storeId).toBe('1')
    expect(result[0].salesDiff).toBe(10000)
  })
})

describe('queryYoyCategoryComparison', () => {
  const baseCategoryParams = {
    ...baseYoyParams,
    level: 'department' as const,
  }

  it('department レベルの集約 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryYoyCategoryComparison(conn as never, baseCategoryParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('dept_code AS code')
    expect(sql).toContain('dept_name AS name')
    expect(sql).toContain('category_time_sales')
  })

  it('line レベルの集約 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryYoyCategoryComparison(conn as never, { ...baseCategoryParams, level: 'line' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('line_code AS code')
    expect(sql).toContain('line_name AS name')
  })

  it('klass レベルの集約 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryYoyCategoryComparison(conn as never, { ...baseCategoryParams, level: 'klass' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('klass_code AS code')
    expect(sql).toContain('klass_name AS name')
  })

  it('当年・前年の CTE を含む', async () => {
    const conn = makeMockConn()
    await queryYoyCategoryComparison(conn as never, baseCategoryParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('current_agg AS')
    expect(sql).toContain('prev_agg AS')
    expect(sql).toContain('is_prev_year = FALSE')
    expect(sql).toContain('is_prev_year = TRUE')
  })

  it('FULL OUTER JOIN で当年・前年を結合する', async () => {
    const conn = makeMockConn()
    await queryYoyCategoryComparison(conn as never, baseCategoryParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FULL OUTER JOIN prev_agg p ON c.code = p.code')
  })

  it('金額差と数量の列を含む', async () => {
    const conn = makeMockConn()
    await queryYoyCategoryComparison(conn as never, baseCategoryParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cur_amount')
    expect(sql).toContain('prev_amount')
    expect(sql).toContain('amount_diff')
    expect(sql).toContain('cur_quantity')
    expect(sql).toContain('prev_quantity')
  })

  it('ORDER BY 当年金額降順', async () => {
    const conn = makeMockConn()
    await queryYoyCategoryComparison(conn as never, baseCategoryParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY COALESCE(c.amount, 0) DESC')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryYoyCategoryComparison(conn as never, {
      ...baseCategoryParams,
      storeIds: ['3'],
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("store_id IN ('3')")
  })

  it('storeIds 未指定の場合は 1=1 フォールバックが使われる', async () => {
    const conn = makeMockConn()
    await queryYoyCategoryComparison(conn as never, baseCategoryParams)
    const sql = conn.getCapturedSql()[0]
    // storeIds なしの場合、storeIdFilter は null を返し "1=1" にフォールバック
    expect(sql).toContain('1=1')
  })
})
