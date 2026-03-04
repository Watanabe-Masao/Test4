/**
 * dailyRecords クエリモジュールのテスト（SQL 生成の検証）
 *
 * queryDailyRecords / queryPrevYearDailyRecords / queryAggregatedDailyRecords の
 * SQL 生成内容を DuckDB モックで検証する。
 * dailyRecordTotalCost は既存の dailyRecords.test.ts でカバー済み。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  queryDailyRecords,
  queryPrevYearDailyRecords,
  queryAggregatedDailyRecords,
} from '@/infrastructure/duckdb/queries/dailyRecords'
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

describe('queryDailyRecords', () => {
  it('store_day_summary から全カラムを SELECT する SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('store_day_summary s')
    expect(sql).toContain('s.store_id')
    expect(sql).toContain('s.date_key')
    expect(sql).toContain('s.sales')
    expect(sql).toContain('s.purchase_cost')
    expect(sql).toContain('s.customers')
  })

  it('budget テーブルとの LEFT JOIN を含む', async () => {
    const conn = makeMockConn()
    await queryDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('LEFT JOIN budget b')
    expect(sql).toContain('COALESCE(b.amount, 0) AS budget_amount')
  })

  it('日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
  })

  it('is_prev_year = false を指定する（当年データ）', async () => {
    const conn = makeMockConn()
    await queryDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('s.is_prev_year = false')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryDailyRecords(conn as never, feb2026, new Set(['1', '2']))
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.store_id IN ('1', '2')")
  })

  it('storeIds 未指定の場合は store_id 条件なし', async () => {
    const conn = makeMockConn()
    await queryDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('store_id IN')
  })

  it('ORDER BY s.store_id, s.date_key が含まれる', async () => {
    const conn = makeMockConn()
    await queryDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY s.store_id, s.date_key')
  })

  it('月跨ぎの日付範囲を正しく処理する', async () => {
    const crossMonth = makeRange(2025, 12, 15, 2026, 1, 15)
    const conn = makeMockConn()
    await queryDailyRecords(conn as never, crossMonth)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.date_key BETWEEN '2025-12-15' AND '2026-01-15'")
  })

  it('売変の個別列（discount_71〜74）が含まれる', async () => {
    const conn = makeMockConn()
    await queryDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('s.discount_71')
    expect(sql).toContain('s.discount_72')
    expect(sql).toContain('s.discount_73')
    expect(sql).toContain('s.discount_74')
    expect(sql).toContain('s.discount_amount')
    expect(sql).toContain('s.discount_absolute')
  })

  it('移動・花・産直の列が含まれる', async () => {
    const conn = makeMockConn()
    await queryDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('s.inter_store_in_cost')
    expect(sql).toContain('s.flowers_cost')
    expect(sql).toContain('s.direct_produce_cost')
    expect(sql).toContain('s.cost_inclusion_cost')
  })
})

describe('queryPrevYearDailyRecords', () => {
  it('is_prev_year = true を指定する（前年データ）', async () => {
    const conn = makeMockConn()
    await queryPrevYearDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('s.is_prev_year = true')
  })

  it('budget JOIN を含まず budget_amount = 0 を固定で返す', async () => {
    const conn = makeMockConn()
    await queryPrevYearDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('0 AS budget_amount')
    // budget テーブルとの JOIN は不要
    expect(sql).not.toContain('LEFT JOIN budget')
  })

  it('日付範囲フィルタが含まれる', async () => {
    const conn = makeMockConn()
    await queryPrevYearDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryPrevYearDailyRecords(conn as never, feb2026, new Set(['5']))
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.store_id IN ('5')")
  })

  it('ORDER BY s.store_id, s.date_key が含まれる', async () => {
    const conn = makeMockConn()
    await queryPrevYearDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY s.store_id, s.date_key')
  })
})

describe('queryAggregatedDailyRecords', () => {
  it('複数店舗合算のため store_id を ALL として SELECT する', async () => {
    const conn = makeMockConn()
    await queryAggregatedDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("'ALL' AS store_id")
  })

  it('SUM による集約クエリを含む', async () => {
    const conn = makeMockConn()
    await queryAggregatedDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('SUM(s.sales) AS sales')
    expect(sql).toContain('SUM(s.purchase_cost) AS purchase_cost')
    expect(sql).toContain('SUM(s.customers) AS customers')
  })

  it('budget テーブルとの LEFT JOIN を含む', async () => {
    const conn = makeMockConn()
    await queryAggregatedDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('LEFT JOIN budget b')
    expect(sql).toContain('SUM(COALESCE(b.amount, 0)) AS budget_amount')
  })

  it('is_prev_year = FALSE（当年のみ）', async () => {
    const conn = makeMockConn()
    await queryAggregatedDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('s.is_prev_year = FALSE')
  })

  it('GROUP BY date_key で日別に集約する', async () => {
    const conn = makeMockConn()
    await queryAggregatedDailyRecords(conn as never, feb2026)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('GROUP BY s.date_key, s.year, s.month, s.day')
    expect(sql).toContain('ORDER BY s.date_key')
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryAggregatedDailyRecords(conn as never, feb2026, new Set(['1', '3']))
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.store_id IN ('1', '3')")
  })

  it('storeIds が空 Set の場合は store_id 条件なし', async () => {
    const conn = makeMockConn()
    await queryAggregatedDailyRecords(conn as never, feb2026, new Set())
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('store_id IN')
  })
})
