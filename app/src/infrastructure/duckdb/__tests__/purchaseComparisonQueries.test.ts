/**
 * purchaseComparison クエリモジュールのテスト（SQL 生成の検証）
 *
 * 正本関連クエリ（queryPurchaseDailyBySupplier, querySpecialSalesDaily,
 * queryTransfersDaily）は readPurchaseCost 経由で使用される。
 * 廃止済み: queryPurchaseTotal, queryPurchaseBySupplier,
 * querySpecialSalesTotal, queryTransfersTotal
 */
import { describe, it, expect, vi } from 'vitest'
import {
  querySupplierNames,
  queryPurchaseDaily,
  queryPurchaseDailyBySupplier,
  queryPurchaseByStore,
  querySalesDaily,
  querySpecialSalesDaily,
  queryTransfersDaily,
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

// ── 名前解決 ──

describe('querySupplierNames', () => {
  it('purchase テーブルから取引先コード・名前の DISTINCT を取得する SQL を生成する', async () => {
    const conn = makeMockConn()
    await querySupplierNames(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM purchase')
    expect(sql).toContain('DISTINCT')
    expect(sql).toContain("date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain("store_id IN ('S001', 'S002')")
    expect(sql).not.toContain('SUM(cost)')
  })
})

// ── 正本の基盤クエリ（readPurchaseCost 経由で使用） ──

describe('queryPurchaseDailyBySupplier', () => {
  it('日別×取引先別の SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryPurchaseDailyBySupplier(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM purchase')
    expect(sql).toContain('GROUP BY day, supplier_code')
  })
})

describe('querySpecialSalesDaily', () => {
  it('special_sales テーブルから日別×カテゴリ別に集約する SQL を生成する', async () => {
    const conn = makeMockConn()
    await querySpecialSalesDaily(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM special_sales')
    expect(sql).toContain('type AS category_key')
    expect(sql).toContain('GROUP BY day, type')
  })
})

describe('queryTransfersDaily', () => {
  it('transfers テーブルから日別×方向別に集約する SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryTransfersDaily(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM transfers')
    expect(sql).toContain('direction AS category_key')
    expect(sql).toContain('GROUP BY day, direction')
  })
})

// ── 補助クエリ（仕入原価正本ではない） ──

describe('queryPurchaseDaily', () => {
  it('日別仕入集計の SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryPurchaseDaily(conn as never, dateFrom, dateTo, storeIds)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM purchase')
    expect(sql).toContain('GROUP BY day')
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
})

describe('querySalesTotal', () => {
  it('classified_sales から売上合計を取得する（当年）', async () => {
    const conn = makeMockConn([{ total_sales: 5000000 }])
    const result = await querySalesTotal(conn as never, dateFrom, dateTo, storeIds, false)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('FROM classified_sales')
    expect(sql).toContain('SUM(sales_amount)')
    expect(result).toBe(5000000)
  })

  it('結果が空の場合はゼロを返す', async () => {
    const conn = makeMockConn([])
    const result = await querySalesTotal(conn as never, dateFrom, dateTo)
    expect(result).toBe(0)
  })
})
