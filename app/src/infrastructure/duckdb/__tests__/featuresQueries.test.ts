/**
 * features クエリモジュールのテスト
 *
 * DuckDB 接続をモックして SQL 生成の内容を検証する。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  queryDailyFeatures,
  queryHourlyProfile,
  queryDowPattern,
  queryDeptDailyTrend,
} from '@/infrastructure/duckdb/queries/features'

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
  dateFrom: '2026-01-01',
  dateTo: '2026-02-28',
}

describe('queryDailyFeatures', () => {
  it('store_day_summary に対してウィンドウ関数 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryDailyFeatures(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('store_day_summary')
    expect(sql).toContain('AVG(sales) OVER w3')
    expect(sql).toContain('AVG(sales) OVER w7')
    expect(sql).toContain('AVG(sales) OVER w28')
  })

  it('移動平均ウィンドウ定義を含む', async () => {
    const conn = makeMockConn()
    await queryDailyFeatures(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('WINDOW')
    expect(sql).toContain('ROWS BETWEEN 2 PRECEDING AND CURRENT ROW')
    expect(sql).toContain('ROWS BETWEEN 6 PRECEDING AND CURRENT ROW')
    expect(sql).toContain('ROWS BETWEEN 27 PRECEDING AND CURRENT ROW')
  })

  it('前日比・前週比の LAG 関数を含む', async () => {
    const conn = makeMockConn()
    await queryDailyFeatures(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('LAG(sales, 1)')
    expect(sql).toContain('LAG(sales, 7)')
    expect(sql).toContain('sales_diff_1d')
    expect(sql).toContain('sales_diff_7d')
  })

  it('変動係数（cv_7day, cv_28day）と Z スコアを含む', async () => {
    const conn = makeMockConn()
    await queryDailyFeatures(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('STDDEV_POP(sales)')
    expect(sql).toContain('cv_7day')
    expect(sql).toContain('cv_28day')
    expect(sql).toContain('z_score')
    expect(sql).toContain('spike_ratio')
  })

  it('累積売上の SUM ウィンドウ関数を含む', async () => {
    const conn = makeMockConn()
    await queryDailyFeatures(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cumulative_sales')
    expect(sql).toContain('SUM(sales) OVER')
    expect(sql).toContain('ROWS UNBOUNDED PRECEDING')
  })

  it('日付範囲と is_prev_year フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryDailyFeatures(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("date_key BETWEEN '2026-01-01' AND '2026-02-28'")
    expect(sql).toContain('is_prev_year = FALSE')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryDailyFeatures(conn as never, { ...baseParams, storeIds: ['1', '2'] })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("store_id IN ('1', '2')")
  })

  it('ORDER BY store_id, date_key が含まれる', async () => {
    const conn = makeMockConn()
    await queryDailyFeatures(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY store_id, date_key')
  })

  it('不正な日付形式は例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryDailyFeatures(conn as never, { ...baseParams, dateFrom: '20260101' }),
    ).rejects.toThrow('Invalid date key')
  })
})

describe('queryHourlyProfile', () => {
  it('time_slots から時間帯別構成比 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryHourlyProfile(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('time_slots')
    expect(sql).toContain('SUM(amount) AS total_amount')
    expect(sql).toContain('hour_share')
    expect(sql).toContain('hour_rank')
  })

  it('RANK() と NULLIF を含む', async () => {
    const conn = makeMockConn()
    await queryHourlyProfile(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('RANK() OVER')
    expect(sql).toContain('NULLIF')
    expect(sql).toContain('PARTITION BY store_id')
  })

  it('GROUP BY store_id, hour が含まれる', async () => {
    const conn = makeMockConn()
    await queryHourlyProfile(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('GROUP BY store_id, hour')
    expect(sql).toContain('ORDER BY store_id, hour')
  })

  it('日付範囲と is_prev_year フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryHourlyProfile(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("date_key BETWEEN '2026-01-01' AND '2026-02-28'")
    expect(sql).toContain('is_prev_year = FALSE')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryHourlyProfile(conn as never, { ...baseParams, storeIds: ['10'] })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("store_id IN ('10')")
  })
})

describe('queryDowPattern', () => {
  it('曜日パターン集約 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryDowPattern(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('store_day_summary')
    expect(sql).toContain('EXTRACT(dow')
    expect(sql).toContain('make_date(year, month, day)')
    expect(sql).toContain('AVG(daily_sales) AS avg_sales')
    expect(sql).toContain('STDDEV_POP(daily_sales)')
  })

  it('CTE 構造を含む', async () => {
    const conn = makeMockConn()
    await queryDowPattern(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('WITH daily AS')
    expect(sql).toContain('GROUP BY store_id, dow')
    expect(sql).toContain('ORDER BY store_id, dow')
  })

  it('日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryDowPattern(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("date_key BETWEEN '2026-01-01' AND '2026-02-28'")
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryDowPattern(conn as never, { ...baseParams, storeIds: ['5', '6'] })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("store_id IN ('5', '6')")
  })

  it('R-8: CTE 内で非営業日（SUM(sales) = 0）が除外される', async () => {
    const conn = makeMockConn()
    await queryDowPattern(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('HAVING SUM(sales) > 0')
  })
})

describe('queryDeptDailyTrend', () => {
  it('category_time_sales から部門×日の売上トレンド SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryDeptDailyTrend(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('category_time_sales')
    expect(sql).toContain('dept_code')
    expect(sql).toContain('dept_name')
    expect(sql).toContain('SUM(total_amount) AS daily_amount')
  })

  it('7日移動平均ウィンドウ関数を含む', async () => {
    const conn = makeMockConn()
    await queryDeptDailyTrend(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('dept_ma_7day')
    expect(sql).toContain('ROWS BETWEEN 6 PRECEDING AND CURRENT ROW')
    expect(sql).toContain('PARTITION BY store_id, dept_code')
  })

  it('deptCode フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryDeptDailyTrend(conn as never, { ...baseParams, deptCode: 'D01' })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("dept_code = 'D01'")
  })

  it('deptCode 未指定の場合は dept_code 条件なし', async () => {
    const conn = makeMockConn()
    await queryDeptDailyTrend(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('AND dept_code =')
  })

  it('ORDER BY store_id, dept_code, date_key が含まれる', async () => {
    const conn = makeMockConn()
    await queryDeptDailyTrend(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY store_id, dept_code, date_key')
  })

  it('不正な deptCode で例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryDeptDailyTrend(conn as never, { ...baseParams, deptCode: "D01'--" }),
    ).rejects.toThrow('Invalid code')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryDeptDailyTrend(conn as never, { ...baseParams, storeIds: ['1'] })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("store_id IN ('1')")
  })

  it('R-8: 非取扱日（SUM(total_amount) = 0）が除外される', async () => {
    const conn = makeMockConn()
    await queryDeptDailyTrend(conn as never, baseParams)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('HAVING SUM(total_amount) > 0')
  })
})
