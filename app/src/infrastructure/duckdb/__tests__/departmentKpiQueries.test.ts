/**
 * departmentKpi クエリモジュールのテスト
 *
 * DuckDB 接続をモックして SQL 生成の内容を検証する。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  queryDeptKpiRanked,
  queryDeptKpiSummary,
  queryDeptKpiMonthlyTrend,
} from '@/infrastructure/duckdb/queries/departmentKpi'

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

describe('queryDeptKpiRanked', () => {
  it('department_kpi テーブルに対して RANK() ウィンドウ関数の SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryDeptKpiRanked(conn as never, { year: 2026, month: 2 })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('department_kpi')
    expect(sql).toContain('RANK() OVER')
    expect(sql).toContain('gp_rate_rank')
    expect(sql).toContain('sales_achievement_rank')
  })

  it('年月フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryDeptKpiRanked(conn as never, { year: 2026, month: 2 })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('year = 2026 AND month = 2')
  })

  it('ORDER BY gp_rate_actual DESC が含まれる', async () => {
    const conn = makeMockConn()
    await queryDeptKpiRanked(conn as never, { year: 2026, month: 2 })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY gp_rate_actual DESC')
  })

  it('必要な全列を SELECT する', async () => {
    const conn = makeMockConn()
    await queryDeptKpiRanked(conn as never, { year: 2026, month: 2 })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('dept_code')
    expect(sql).toContain('dept_name')
    expect(sql).toContain('gp_rate_budget')
    expect(sql).toContain('gp_rate_actual')
    expect(sql).toContain('markup_rate')
    expect(sql).toContain('discount_rate')
    expect(sql).toContain('opening_inventory')
    expect(sql).toContain('closing_inventory')
  })

  it('不正な年で例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(queryDeptKpiRanked(conn as never, { year: 1999, month: 1 })).rejects.toThrow(
      'Invalid year',
    )
  })

  it('不正な月で例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(queryDeptKpiRanked(conn as never, { year: 2026, month: 13 })).rejects.toThrow(
      'Invalid month',
    )
  })

  it('結果を正しく返す', async () => {
    const rows = [
      {
        year: 2026,
        month: 2,
        deptCode: 'D01',
        deptName: '青果',
        gpRateBudget: 0.25,
        gpRateActual: 0.28,
        gpRateVariance: 0.03,
        markupRate: 0.3,
        discountRate: 0.02,
        salesBudget: 1000000,
        salesActual: 1100000,
        salesVariance: 100000,
        salesAchievement: 1.1,
        openingInventory: 500000,
        closingInventory: 480000,
        gpRateLanding: 0.27,
        salesLanding: 3300000,
        gpRateRank: 1,
        salesAchievementRank: 2,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryDeptKpiRanked(conn as never, { year: 2026, month: 2 })
    expect(result).toHaveLength(1)
    expect(result[0].deptCode).toBe('D01')
    expect(result[0].gpRateRank).toBe(1)
  })
})

describe('queryDeptKpiSummary', () => {
  it('売上加重平均の SQL を生成する', async () => {
    const conn = makeMockConn([{}])
    await queryDeptKpiSummary(conn as never, { year: 2026, month: 2 })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('department_kpi')
    expect(sql).toContain('COUNT(*) AS dept_count')
    expect(sql).toContain('SUM(sales_budget)')
    expect(sql).toContain('SUM(sales_actual)')
    expect(sql).toContain('weighted_gp_rate_budget')
    expect(sql).toContain('weighted_gp_rate_actual')
    expect(sql).toContain('weighted_discount_rate')
    expect(sql).toContain('weighted_markup_rate')
  })

  it('年月フィルタが SQL に反映される', async () => {
    const conn = makeMockConn([{}])
    await queryDeptKpiSummary(conn as never, { year: 2026, month: 3 })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('year = 2026 AND month = 3')
  })

  it('データなしの場合は null を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryDeptKpiSummary(conn as never, { year: 2026, month: 2 })
    expect(result).toBeNull()
  })

  it('データがある場合は1行目を返す', async () => {
    const rows = [
      {
        deptCount: 5,
        totalSalesBudget: 5000000,
        totalSalesActual: 4800000,
        overallSalesAchievement: 0.96,
        weightedGpRateBudget: 0.25,
        weightedGpRateActual: 0.24,
        weightedDiscountRate: 0.02,
        weightedMarkupRate: 0.28,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryDeptKpiSummary(conn as never, { year: 2026, month: 2 })
    expect(result).not.toBeNull()
    expect(result?.deptCount).toBe(5)
  })

  it('不正な月で例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(queryDeptKpiSummary(conn as never, { year: 2026, month: 0 })).rejects.toThrow(
      'Invalid month',
    )
  })

  it('CASE WHEN SUM(sales_budget) > 0 で safe divide する', async () => {
    const conn = makeMockConn([{}])
    await queryDeptKpiSummary(conn as never, { year: 2026, month: 2 })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('CASE WHEN SUM(sales_budget) > 0')
    expect(sql).toContain('CASE WHEN SUM(sales_actual) > 0')
  })
})

describe('queryDeptKpiMonthlyTrend', () => {
  it('空の yearMonths で早期リターンする', async () => {
    const conn = makeMockConn()
    const result = await queryDeptKpiMonthlyTrend(conn as never, { yearMonths: [] })
    expect(result).toHaveLength(0)
    expect(conn.query).not.toHaveBeenCalled()
  })

  it('VALUES 節で複数年月を指定する SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryDeptKpiMonthlyTrend(conn as never, {
      yearMonths: [
        { year: 2026, month: 1 },
        { year: 2026, month: 2 },
      ],
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('(2026, 1)')
    expect(sql).toContain('(2026, 2)')
    expect(sql).toContain('(year, month) IN (VALUES')
  })

  it('deptCode フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryDeptKpiMonthlyTrend(conn as never, {
      yearMonths: [{ year: 2026, month: 2 }],
      deptCode: 'D01',
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("dept_code = 'D01'")
  })

  it('deptCode 未指定の場合は dept_code 条件なし', async () => {
    const conn = makeMockConn()
    await queryDeptKpiMonthlyTrend(conn as never, {
      yearMonths: [{ year: 2026, month: 2 }],
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('dept_code =')
  })

  it('ORDER BY year, month, dept_code が含まれる', async () => {
    const conn = makeMockConn()
    await queryDeptKpiMonthlyTrend(conn as never, {
      yearMonths: [{ year: 2026, month: 2 }],
    })
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY year, month, dept_code')
  })

  it('不正な年月で例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryDeptKpiMonthlyTrend(conn as never, {
        yearMonths: [{ year: 2026, month: 13 }],
      }),
    ).rejects.toThrow('Invalid month')
  })

  it('不正な deptCode で例外をスローする', async () => {
    const conn = makeMockConn()
    await expect(
      queryDeptKpiMonthlyTrend(conn as never, {
        yearMonths: [{ year: 2026, month: 2 }],
        deptCode: "D01'--",
      }),
    ).rejects.toThrow('Invalid code')
  })
})
