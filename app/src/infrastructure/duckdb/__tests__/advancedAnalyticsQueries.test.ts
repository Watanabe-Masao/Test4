/**
 * advancedAnalytics クエリモジュールのテスト
 *
 * DuckDB 接続をモックして SQL 生成の内容を検証する。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  queryCategoryMixWeekly,
  queryCategoryBenchmark,
  type CategoryMixParams,
  type CategoryBenchmarkParams,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'

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

const baseMixParams: CategoryMixParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-02-28',
  level: 'department',
}

const baseBenchmarkParams: CategoryBenchmarkParams = {
  dateFrom: '2026-01-01',
  dateTo: '2026-02-28',
  level: 'department',
}

describe('queryCategoryMixWeekly', () => {
  it('category_time_sales に対して週次集約 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryCategoryMixWeekly(conn as never, baseMixParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('category_time_sales cts')
    expect(sql).toContain("DATE_TRUNC('week'")
    expect(sql).toContain('week_start')
    expect(sql).toContain('SUM(cts.total_amount) AS week_sales')
  })

  it('department レベルの列を使用する', async () => {
    const conn = makeMockConn()
    await queryCategoryMixWeekly(conn as never, baseMixParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.dept_code AS code')
    expect(sql).toContain('cts.dept_name AS name')
  })

  it('line レベルの列を使用する', async () => {
    const conn = makeMockConn()
    await queryCategoryMixWeekly(conn as never, { ...baseMixParams, level: 'line' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.line_code AS code')
    expect(sql).toContain('cts.line_name AS name')
  })

  it('klass レベルの列を使用する', async () => {
    const conn = makeMockConn()
    await queryCategoryMixWeekly(conn as never, { ...baseMixParams, level: 'klass' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.klass_code AS code')
    expect(sql).toContain('cts.klass_name AS name')
  })

  it('構成比（share_pct）と LAG によるシフト量を含む', async () => {
    const conn = makeMockConn()
    await queryCategoryMixWeekly(conn as never, baseMixParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('share_pct')
    expect(sql).toContain('LAG(share_pct)')
    expect(sql).toContain('share_shift')
    expect(sql).toContain('prev_week_share')
  })

  it('with_total CTE で週合計を算出する', async () => {
    const conn = makeMockConn()
    await queryCategoryMixWeekly(conn as never, baseMixParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('with_total AS')
    expect(sql).toContain('total_week_sales')
    expect(sql).toContain('SUM(week_sales) OVER (PARTITION BY week_start)')
  })

  it('日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryCategoryMixWeekly(conn as never, baseMixParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("cts.date_key BETWEEN '2026-01-01' AND '2026-02-28'")
    expect(sql).toContain('cts.is_prev_year = FALSE')
  })

  it('isPrevYear = true で前年データを取得する', async () => {
    const conn = makeMockConn()
    await queryCategoryMixWeekly(conn as never, { ...baseMixParams, isPrevYear: true })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.is_prev_year = TRUE')
  })

  it('storeIds フィルタが SQL に反映される（エイリアス付き）', async () => {
    const conn = makeMockConn()
    await queryCategoryMixWeekly(conn as never, { ...baseMixParams, storeIds: ['1', '2'] })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("cts.store_id IN ('1', '2')")
  })

  it('ORDER BY week_start, week_sales DESC が含まれる', async () => {
    const conn = makeMockConn()
    await queryCategoryMixWeekly(conn as never, baseMixParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY week_start, week_sales DESC')
  })

  it('不正な日付形式は例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryCategoryMixWeekly(conn as never, { ...baseMixParams, dateFrom: '2026/01/01' }),
    ).rejects.toThrow('Invalid date key')
  })

  it('空の場合は空配列を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryCategoryMixWeekly(conn as never, baseMixParams)
    expect(result).toHaveLength(0)
  })

  it('モックデータを正しく返す', async () => {
    const rows = [
      {
        weekStart: '2026-01-26',
        code: 'D01',
        name: '青果',
        weekSales: 500000,
        totalWeekSales: 2000000,
        sharePct: 25.0,
        prevWeekShare: null,
        shareShift: null,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryCategoryMixWeekly(conn as never, baseMixParams)
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('D01')
    expect(result[0].sharePct).toBe(25.0)
    expect(result[0].prevWeekShare).toBeNull()
  })
})

describe('queryCategoryBenchmark', () => {
  it('category_time_sales からカテゴリ×店舗ランキング SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryCategoryBenchmark(conn as never, baseBenchmarkParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('category_time_sales cts')
    expect(sql).toContain('SUM(cts.total_amount) AS total_sales')
    expect(sql).toContain('cts.store_id')
  })

  it('構成比ベースの RANK() ウィンドウ関数でカテゴリ内ランキングを算出する', async () => {
    const conn = makeMockConn()
    await queryCategoryBenchmark(conn as never, baseBenchmarkParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('RANK() OVER')
    expect(sql).toContain('PARTITION BY code')
    expect(sql).toContain('ORDER BY share DESC')
    expect(sql).toContain('sales_rank')
    expect(sql).toContain('store_count')
  })

  it('department レベルの列を使用する', async () => {
    const conn = makeMockConn()
    await queryCategoryBenchmark(conn as never, baseBenchmarkParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.dept_code AS code')
    expect(sql).toContain('cts.dept_name AS name')
  })

  it('line レベルの列を使用する', async () => {
    const conn = makeMockConn()
    await queryCategoryBenchmark(conn as never, { ...baseBenchmarkParams, level: 'line' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.line_code AS code')
    expect(sql).toContain('cts.line_name AS name')
  })

  it('klass レベルの列を使用する', async () => {
    const conn = makeMockConn()
    await queryCategoryBenchmark(conn as never, { ...baseBenchmarkParams, level: 'klass' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cts.klass_code AS code')
    expect(sql).toContain('cts.klass_name AS name')
  })

  it('日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryCategoryBenchmark(conn as never, baseBenchmarkParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("cts.date_key BETWEEN '2026-01-01' AND '2026-02-28'")
    expect(sql).toContain('cts.is_prev_year = FALSE')
  })

  it('storeIds フィルタが SQL に反映される（エイリアス付き）', async () => {
    const conn = makeMockConn()
    await queryCategoryBenchmark(conn as never, { ...baseBenchmarkParams, storeIds: ['3', '4'] })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("cts.store_id IN ('3', '4')")
  })

  it('ORDER BY code, sales_rank が含まれる', async () => {
    const conn = makeMockConn()
    await queryCategoryBenchmark(conn as never, baseBenchmarkParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY code, sales_rank')
  })

  it('不正な日付形式は例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryCategoryBenchmark(conn as never, { ...baseBenchmarkParams, dateTo: '20260228' }),
    ).rejects.toThrow('Invalid date key')
  })

  it('構成比の計算 CTE（store_total, cat_share）が含まれる', async () => {
    const conn = makeMockConn()
    await queryCategoryBenchmark(conn as never, baseBenchmarkParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('store_total')
    expect(sql).toContain('cat_share')
    expect(sql).toContain('share')
  })

  it('モックデータを正しく返す', async () => {
    const rows = [
      {
        code: 'D01',
        name: '青果',
        storeId: '1',
        totalSales: 700000,
        share: 0.35,
        salesRank: 1,
        storeCount: 3,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryCategoryBenchmark(conn as never, baseBenchmarkParams)
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('D01')
    expect(result[0].salesRank).toBe(1)
    expect(result[0].storeCount).toBe(3)
    expect(result[0].share).toBe(0.35)
  })
})
