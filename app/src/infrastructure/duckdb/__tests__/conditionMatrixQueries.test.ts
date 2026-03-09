/**
 * conditionMatrix クエリモジュールのテスト
 *
 * DuckDB 接続をモックして SQL 生成の内容を検証する。
 * 最適化後: 5 CTE → 条件付き集計（1回のテーブルスキャン）
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
  it('store_day_summary に対して1回のスキャンで条件付き集計を行う', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    // 1回のテーブルスキャン（FROM 句に直接 store_day_summary）
    expect(sql).toContain('FROM store_day_summary s')
    // GROUP BY で店舗別に集約
    expect(sql).toContain('GROUP BY s.store_id')
  })

  it('5期間分の条件付き集計列を含む（CASE WHEN パターン）', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    // 各期間のプレフィックス付きカラムが存在する
    expect(sql).toContain('cur_sales')
    expect(sql).toContain('py_sales')
    expect(sql).toContain('pw_sales')
    expect(sql).toContain('tr_sales')
    expect(sql).toContain('tp_sales')
    // CASE WHEN パターンで条件分岐
    expect(sql).toContain('CASE WHEN')
  })

  it('当期の条件（is_prev_year = FALSE, 指定範囲）が含まれる', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain('s.is_prev_year = FALSE')
  })

  it('前年同期の条件（is_prev_year = TRUE）が含まれる', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('s.is_prev_year = TRUE')
  })

  it('前週同期のために日付を -7日シフトした範囲が含まれる', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    // JS で事前計算された前週範囲（2026-01-25 〜 2026-02-21）
    expect(sql).toContain("'2026-01-25'")
    expect(sql).toContain("'2026-02-21'")
  })

  it('総仕入原価を算出するための原価カラムを含む', async () => {
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

  it('消耗品・消耗品率を算出する列を含む', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('cost_inclusion_cost')
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

  it('WHERE 句で当期範囲と前週シフト範囲を OR で結合する', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    // 幅広い WHERE で必要な全行を1回でフェッチ
    expect(sql).toContain('WHERE')
    expect(sql).toContain('OR')
    // JS で事前計算された前週範囲が含まれる
    expect(sql).toContain("'2026-01-25'")
  })

  it('ORDER BY store_id が含まれる', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY s.store_id')
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

  it('1回のクエリ実行のみ（CTE × 5 ではない）', async () => {
    const conn = makeMockConn()
    await queryConditionMatrix(conn as never, feb2026)
    // クエリは1回だけ実行される
    expect(conn.query).toHaveBeenCalledTimes(1)
    const sql = conn.getCapturedSql()[0]
    // 旧 CTE パターン（alias AS (...)）が存在しないことを確認
    expect(sql).not.toMatch(/\bcur AS\s*\(/)
    expect(sql).not.toMatch(/\bpy AS\s*\(/)
    expect(sql).not.toMatch(/\bpw AS\s*\(/)
  })
})
