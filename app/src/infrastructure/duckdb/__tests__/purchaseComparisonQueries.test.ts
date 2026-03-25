/**
 * purchaseComparison クエリモジュールのテスト（SQL 生成の検証）
 *
 * 新規追加された querySpecialSalesDaily / querySpecialSalesTotal /
 * queryTransfersDaily / queryTransfersTotal / querySalesTotal の
 * SQL 生成内容を DuckDB モックで検証する。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  queryPurchaseBySupplier,
  queryPurchaseTotal,
  queryPurchaseDaily,
  queryPurchaseDailyBySupplier,
  queryPurchaseByStore,
  querySalesDaily,
  querySpecialSalesDaily,
  querySpecialSalesTotal,
  queryTransfersDaily,
  queryTransfersTotal,
  querySalesTotal,
} from '@/infrastructure/duckdb/queries/purchaseComparison'

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

const dateFrom = '2026-02-01'
const dateTo = '2026-02-28'
const storeIds = ['S001', 'S002']

// ── 既存クエリ ──

describe('queryPurchaseBySupplier', () => {
  it('purchase テーブルから取引先別に集約する SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryPurchaseBySupplier(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM purchase')
    expect(sql).toContain("date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain('GROUP BY supplier_code, supplier_name')
    expect(sql).toContain("store_id IN ('S001', 'S002')")
  })

  it('storeIds なしでも動作する', async () => {
    const conn = makeMockConn()
    await queryPurchaseBySupplier(conn as never, dateFrom, dateTo)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM purchase')
    expect(sql).not.toContain('store_id IN')
  })
})

describe('queryPurchaseTotal', () => {
  it('purchase テーブルの合計を取得する SQL を生成する', async () => {
    const conn = makeMockConn([{ total_cost: 1000, total_price: 1500 }])
    const result = await queryPurchaseTotal(conn as never, dateFrom, dateTo)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM purchase')
    expect(sql).toContain('SUM(cost)')
    expect(sql).toContain('SUM(price)')
    expect(result.totalCost).toBe(1000)
    expect(result.totalPrice).toBe(1500)
  })

  it('結果が空の場合はゼロを返す', async () => {
    const conn = makeMockConn([])
    const result = await queryPurchaseTotal(conn as never, dateFrom, dateTo)
    expect(result.totalCost).toBe(0)
    expect(result.totalPrice).toBe(0)
  })
})

describe('queryPurchaseDaily', () => {
  it('日別仕入集計の SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryPurchaseDaily(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM purchase')
    expect(sql).toContain('GROUP BY day')
    expect(sql).toContain('ORDER BY day')
  })
})

describe('queryPurchaseDailyBySupplier', () => {
  it('日別×取引先別の SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryPurchaseDailyBySupplier(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM purchase')
    expect(sql).toContain('GROUP BY day, supplier_code')
  })
})

describe('queryPurchaseByStore', () => {
  it('店舗別仕入集計の SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryPurchaseByStore(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM purchase')
    expect(sql).toContain('GROUP BY store_id')
  })
})

describe('querySalesDaily', () => {
  it('当年の日別売上を store_day_summary から取得する', async () => {
    const conn = makeMockConn()
    await querySalesDaily(conn as never, dateFrom, dateTo, storeIds, false)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM store_day_summary')
    expect(sql).toContain('is_prev_year = FALSE')
    expect(sql).toContain('GROUP BY day')
  })

  it('前年の日別売上を取得する', async () => {
    const conn = makeMockConn()
    await querySalesDaily(conn as never, '2025-02-01', '2025-02-28', storeIds, true)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('is_prev_year = TRUE')
    expect(sql).toContain("date_key BETWEEN '2025-02-01' AND '2025-02-28'")
  })
})

// ── 新規クエリ ──

describe('querySpecialSalesDaily', () => {
  it('special_sales テーブルから日別×カテゴリ別に集約する SQL を生成する', async () => {
    const conn = makeMockConn()
    await querySpecialSalesDaily(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM special_sales')
    expect(sql).toContain("date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain('type AS category_key')
    expect(sql).toContain('GROUP BY day, type')
    expect(sql).toContain("store_id IN ('S001', 'S002')")
  })

  it('storeIds なしでも動作する', async () => {
    const conn = makeMockConn()
    await querySpecialSalesDaily(conn as never, dateFrom, dateTo)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM special_sales')
    expect(sql).not.toContain('store_id IN')
  })
})

describe('querySpecialSalesTotal', () => {
  it('special_sales テーブルからカテゴリ別合計を取得する SQL を生成する', async () => {
    const conn = makeMockConn([
      { category_key: 'flowers', total_cost: 500, total_price: 800 },
      { category_key: 'directProduce', total_cost: 300, total_price: 450 },
    ])
    const result = await querySpecialSalesTotal(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM special_sales')
    expect(sql).toContain('type AS category_key')
    expect(sql).toContain('GROUP BY type')
    expect(result).toHaveLength(2)
    expect(result[0].categoryKey).toBe('flowers')
    expect(result[0].totalCost).toBe(500)
    expect(result[1].categoryKey).toBe('directProduce')
  })
})

describe('queryTransfersDaily', () => {
  it('transfers テーブルから日別×方向別に集約する SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryTransfersDaily(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM transfers')
    expect(sql).toContain("date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain('direction AS category_key')
    expect(sql).toContain('GROUP BY day, direction')
    expect(sql).toContain("store_id IN ('S001', 'S002')")
  })

  it('storeIds なしでも動作する', async () => {
    const conn = makeMockConn()
    await queryTransfersDaily(conn as never, dateFrom, dateTo)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM transfers')
    expect(sql).not.toContain('store_id IN')
  })
})

describe('queryTransfersTotal', () => {
  it('transfers テーブルから方向別合計を取得する SQL を生成する', async () => {
    const conn = makeMockConn([
      { category_key: 'interStoreIn', total_cost: 200, total_price: 300 },
      { category_key: 'interDeptIn', total_cost: 100, total_price: 150 },
    ])
    const result = await queryTransfersTotal(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM transfers')
    expect(sql).toContain('direction AS category_key')
    expect(sql).toContain('GROUP BY direction')
    expect(result).toHaveLength(2)
    expect(result[0].categoryKey).toBe('interStoreIn')
    expect(result[0].totalCost).toBe(200)
  })
})

describe('querySalesTotal', () => {
  it('classified_sales から売上合計を取得する SQL を生成する（当年）', async () => {
    const conn = makeMockConn([{ total_sales: 5000000 }])
    const result = await querySalesTotal(conn as never, dateFrom, dateTo, storeIds, false)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM classified_sales')
    expect(sql).toContain('SUM(sales_amount)')
    expect(sql).toContain('is_prev_year = FALSE')
    expect(sql).toContain("date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(result).toBe(5000000)
  })

  it('前年データを取得する', async () => {
    const conn = makeMockConn([{ total_sales: 4800000 }])
    const result = await querySalesTotal(conn as never, '2025-02-01', '2025-02-28', storeIds, true)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM classified_sales')
    expect(sql).toContain('is_prev_year = TRUE')
    expect(result).toBe(4800000)
  })

  it('結果が空の場合はゼロを返す', async () => {
    const conn = makeMockConn([])
    const result = await querySalesTotal(conn as never, dateFrom, dateTo)
    expect(result).toBe(0)
  })

  it('storeIds なしでも動作する', async () => {
    const conn = makeMockConn([{ total_sales: 1000 }])
    await querySalesTotal(conn as never, dateFrom, dateTo)
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('store_id IN')
  })
})
