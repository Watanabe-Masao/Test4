/**
 * conditionMatrix クエリモジュールのテスト
 *
 * DuckDB 接続をモックして SQL 生成の内容を検証する。
 */
import { describe, it, expect, vi } from 'vitest'
import { queryConditionMatrix } from '@/infrastructure/duckdb/queries/conditionMatrix'
import type { DateRange } from '@/domain/models'

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

describe('queryConditionMatrix', () => {
  it('store_day_summary に対して CTE ベースの SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('store_day_summary s')
    expect(sql).toContain('WITH')
  })

  it('当期・前年同期・前週同期の3つの CTE を含む', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    // 当期 (cur), 前年 (py), 前週 (pw) の3 CTE
    expect(sql).toContain('cur AS')
    expect(sql).toContain('py AS')
    expect(sql).toContain('pw AS')
  })

  it('当期の WHERE 条件（is_prev_year = FALSE, 指定範囲）が含まれる', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain('s.is_prev_year = FALSE')
  })

  it('前年同期の WHERE 条件（is_prev_year = TRUE）が含まれる', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('s.is_prev_year = TRUE')
  })

  it('前週同期のために日付を -7日シフトする SQL が含まれる', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("INTERVAL '7' DAY")
  })

  it('各 CTE で総仕入原価を算出する列を含む', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('total_cost')
    expect(sql).toContain('purchase_cost')
    expect(sql).toContain('flowers_cost')
    expect(sql).toContain('direct_produce_cost')
    expect(sql).toContain('inter_store_in_cost')
    expect(sql).toContain('inter_dept_in_cost')
  })

  it('各 CTE で消耗品・消耗品率を算出する列を含む', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('total_cost_inclusion')
    expect(sql).toContain('cost_inclusion_rate')
  })

  it('SELECT 句に当期・前年・前週のプレフィックス列を含む', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cur_sales')
    expect(sql).toContain('py_sales')
    expect(sql).toContain('pw_sales')
    expect(sql).toContain('cur_customers')
    expect(sql).toContain('py_customers')
    expect(sql).toContain('pw_customers')
  })

  it('cur LEFT JOIN py と LEFT JOIN pw を含む', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM cur c')
    expect(sql).toContain('LEFT JOIN py p ON c.store_id = p.store_id')
    expect(sql).toContain('LEFT JOIN pw w ON c.store_id = w.store_id')
  })

  it('ORDER BY c.store_id が含まれる', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY c.store_id')
  })

  it('storeIds フィルタが SQL に反映される（エイリアス付き）', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026, new Set(['1', '2']))
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.store_id IN ('1', '2')")
  })

  it('storeIds 未指定の場合は store_id 条件なし', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    // storeIds なしの場合、storeCondition が null → storeWhere が空文字
    expect(sql).not.toContain('store_id IN')
  })

  it('空の場合は空配列を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryConditionMatrix(conn as never, feb2026)
    expect(result).toHaveLength(0)
  })

  it('モックデータを正しく返す', async () => {
    const rows = [
      {
        storeId: '1',
        curSales: 3000000,
        curCustomers: 9000,
        curDiscount: 150000,
        curGrossSales: 3150000,
        curDiscountRate: 0.05,
        curTotalCost: 2100000,
        curConsumable: 15000,
        curConsumableRate: 0.005,
        curSalesDays: 28,
        pySales: 2800000,
        pyCustomers: 8500,
        pyDiscount: 140000,
        pyGrossSales: 2940000,
        pyDiscountRate: 0.05,
        pyTotalCost: 1960000,
        pyConsumable: 14000,
        pyConsumableRate: 0.005,
        pySalesDays: 28,
        pwSales: 2950000,
        pwCustomers: 8800,
        pwDiscount: 147500,
        pwGrossSales: 3097500,
        pwDiscountRate: 0.05,
        pwTotalCost: 2065000,
        pwConsumable: 14750,
        pwConsumableRate: 0.005,
        pwSalesDays: 7,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryConditionMatrix(conn as never, feb2026)
    expect(result).toHaveLength(1)
    expect(result[0].storeId).toBe('1')
    expect(result[0].curSales).toBe(3000000)
    expect(result[0].pySales).toBe(2800000)
    expect(result[0].pwSales).toBe(2950000)
  })

  it('月跨ぎの日付範囲を正しく処理する', async () => {
    const crossMonth = makeRange(2025, 12, 15, 2026, 1, 15)
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, crossMonth)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("'2025-12-15'")
    expect(sql).toContain("'2026-01-15'")
  })

  it('売変率の safe divide を含む', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    // discount_rate は (sales + discount) > 0 の CASE WHEN で safe divide
    expect(sql).toContain('discount_rate')
    expect(sql).toContain('CASE WHEN')
  })

  it('GROUP BY s.store_id で店舗ごとに集約する', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('GROUP BY s.store_id')
  })
})
