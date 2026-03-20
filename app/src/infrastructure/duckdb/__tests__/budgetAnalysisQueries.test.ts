/**
 * budgetAnalysis クエリモジュールのテスト
 *
 * DuckDB 接続をモックして SQL 生成の内容を検証する。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  queryDailyCumulativeBudget,
  queryBudgetAnalysisSummary,
} from '@/infrastructure/duckdb/queries/budgetAnalysis'
import type { DateRange } from '@/domain/models/calendar'

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

function makeRange(
  fromYear: number,
  fromMonth: number,
  fromDay: number,
  toYear: number,
  toMonth: number,
  toDay: number,
): DateRange {
  return {
    from: { year: fromYear, month: fromMonth, day: fromDay },
    to: { year: toYear, month: toMonth, day: toDay },
  }
}

const feb2026 = makeRange(2026, 2, 1, 2026, 2, 28)

describe('queryDailyCumulativeBudget', () => {
  it('store_day_summary と budget の LEFT JOIN SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryDailyCumulativeBudget(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('store_day_summary s')
    expect(sql).toContain('LEFT JOIN budget b')
    expect(sql).toContain('COALESCE(b.amount, 0) AS daily_budget')
  })

  it('日別累積売上・累積予算のウィンドウ関数を含む', async () => {
    const conn = makeMockConn()
    await queryDailyCumulativeBudget(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cumulative_sales')
    expect(sql).toContain('cumulative_budget')
    expect(sql).toContain('SUM(daily_sales) OVER')
    expect(sql).toContain('SUM(daily_budget) OVER')
    expect(sql).toContain('PARTITION BY store_id ORDER BY date_key')
  })

  it('WITH daily AS CTE 構造を含む', async () => {
    const conn = makeMockConn()
    await queryDailyCumulativeBudget(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('WITH daily AS')
    expect(sql).toContain('daily_sales')
  })

  it('日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryDailyCumulativeBudget(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain('s.is_prev_year = FALSE')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryDailyCumulativeBudget(conn as never, feb2026, new Set(['1', '2']))
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.store_id IN ('1', '2')")
  })

  it('storeIds 未指定の場合は store_id 条件なし', async () => {
    const conn = makeMockConn()
    await queryDailyCumulativeBudget(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('store_id IN')
  })

  it('ORDER BY store_id, date_key が含まれる', async () => {
    const conn = makeMockConn()
    await queryDailyCumulativeBudget(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY store_id, date_key')
  })

  it('月跨ぎの日付範囲を正しく処理する', async () => {
    const crossMonth = makeRange(2025, 12, 15, 2026, 1, 15)
    const conn = makeMockConn()
    await queryDailyCumulativeBudget(conn as never, crossMonth)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.date_key BETWEEN '2025-12-15' AND '2026-01-15'")
  })

  it('空の場合は空配列を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryDailyCumulativeBudget(conn as never, feb2026)
    expect(result).toHaveLength(0)
  })

  it('モックデータを正しく返す', async () => {
    const rows = [
      {
        storeId: '1',
        dateKey: '2026-02-01',
        day: 1,
        dailySales: 100000,
        dailyBudget: 120000,
        cumulativeSales: 100000,
        cumulativeBudget: 120000,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryDailyCumulativeBudget(conn as never, feb2026)
    expect(result).toHaveLength(1)
    expect(result[0].storeId).toBe('1')
    expect(result[0].cumulativeSales).toBe(100000)
  })
})

describe('queryBudgetAnalysisSummary', () => {
  it('店舗別予算分析 SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryBudgetAnalysisSummary(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('store_day_summary s')
    expect(sql).toContain('LEFT JOIN budget b')
    expect(sql).toContain('SUM(s.sales)')
    expect(sql).toContain('SUM(b.amount)')
    expect(sql).toContain('budget_achievement_rate')
    expect(sql).toContain('average_daily_sales')
    expect(sql).toContain('sales_days')
    expect(sql).toContain('total_days')
  })

  it('予算達成率の safe divide を含む', async () => {
    const conn = makeMockConn()
    await queryBudgetAnalysisSummary(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('CASE WHEN COALESCE(SUM(b.amount), 0) > 0')
  })

  it('売上日数のカウント（sales_days）を含む', async () => {
    const conn = makeMockConn()
    await queryBudgetAnalysisSummary(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('COUNT(DISTINCT CASE WHEN s.sales > 0 THEN s.date_key END) AS sales_days')
    expect(sql).toContain('COUNT(DISTINCT s.date_key) AS total_days')
  })

  it('GROUP BY s.store_id で店舗別集約する', async () => {
    const conn = makeMockConn()
    await queryBudgetAnalysisSummary(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('GROUP BY s.store_id')
    expect(sql).toContain('ORDER BY s.store_id')
  })

  it('日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryBudgetAnalysisSummary(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain('s.is_prev_year = FALSE')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryBudgetAnalysisSummary(conn as never, feb2026, new Set(['10']))
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.store_id IN ('10')")
  })

  it('空の場合は空配列を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryBudgetAnalysisSummary(conn as never, feb2026)
    expect(result).toHaveLength(0)
  })

  it('モックデータを正しく返す', async () => {
    const rows = [
      {
        storeId: '1',
        totalSales: 3000000,
        totalBudget: 3500000,
        budgetAchievementRate: 0.857,
        averageDailySales: 100000,
        salesDays: 30,
        totalDays: 28,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryBudgetAnalysisSummary(conn as never, feb2026)
    expect(result).toHaveLength(1)
    expect(result[0].storeId).toBe('1')
    expect(result[0].budgetAchievementRate).toBeCloseTo(0.857)
  })
})
