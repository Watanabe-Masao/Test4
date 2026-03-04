/**
 * storePeriodMetrics クエリモジュールのテスト
 *
 * DuckDB 接続をモックして SQL 生成の内容と
 * queryStorePeriodMetricsSingle の動作を検証する。
 */
import { describe, it, expect, vi } from 'vitest'
import {
  queryStorePeriodMetrics,
  queryStorePeriodMetricsSingle,
  type StorePeriodMetricsRow,
} from '@/infrastructure/duckdb/queries/storePeriodMetrics'
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

function makeDateRange(
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

const singleMonthRange = makeDateRange(2026, 2, 1, 2026, 2, 28)

describe('queryStorePeriodMetrics', () => {
  it('store_day_summary に対して WITH ... CTE 構造の SQL を生成する', async () => {
    const conn = makeMockConn()
    await queryStorePeriodMetrics(conn as never, singleMonthRange)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('WITH raw AS')
    expect(sql).toContain('store_day_summary s')
    expect(sql).toContain("s.date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(sql).toContain('s.is_prev_year = FALSE')
    expect(sql).toContain('GROUP BY s.store_id')
  })

  it('costs / rates / est / est_calc / est_final CTE を含む', async () => {
    const conn = makeMockConn()
    await queryStorePeriodMetrics(conn as never, singleMonthRange)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('costs AS')
    expect(sql).toContain('rates AS')
    expect(sql).toContain('est AS')
    expect(sql).toContain('est_calc AS')
    expect(sql).toContain('est_final AS')
  })

  it('inventory_config との LEFT JOIN で在庫法の計算を含む', async () => {
    const conn = makeMockConn()
    await queryStorePeriodMetrics(conn as never, singleMonthRange)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('LEFT JOIN inventory_config ic')
    expect(sql).toContain('ic.opening_inventory')
    expect(sql).toContain('ic.closing_inventory')
    expect(sql).toContain('inv_method_cogs')
    expect(sql).toContain('inv_method_gross_profit')
  })

  it('推定法の計算列を含む', async () => {
    const conn = makeMockConn()
    await queryStorePeriodMetrics(conn as never, singleMonthRange)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('est_method_cogs')
    expect(sql).toContain('est_method_margin')
    expect(sql).toContain('discount_rate')
    expect(sql).toContain('average_markup_rate')
  })

  it('開始年月が inventory_config の JOIN 条件に使われる', async () => {
    const conn = makeMockConn()
    await queryStorePeriodMetrics(conn as never, singleMonthRange)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ic.year = 2026 AND ic.month = 2')
  })

  it('月跨ぎの場合は from 月を inventory_config の年月に使う', async () => {
    const crossMonthRange = makeDateRange(2025, 12, 15, 2026, 1, 15)
    const conn = makeMockConn()
    await queryStorePeriodMetrics(conn as never, crossMonthRange)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ic.year = 2025 AND ic.month = 12')
    expect(sql).toContain("s.date_key BETWEEN '2025-12-15' AND '2026-01-15'")
  })

  it('storeIds フィルタが SQL に反映される', async () => {
    const conn = makeMockConn()
    await queryStorePeriodMetrics(conn as never, singleMonthRange, new Set(['10', '20']))
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.store_id IN ('10', '20')")
  })

  it('storeIds 未指定の場合は store_id 条件なし', async () => {
    const conn = makeMockConn()
    await queryStorePeriodMetrics(conn as never, singleMonthRange)
    const sql = conn.getCapturedSql()[0]
    expect(sql).not.toContain('store_id IN')
  })

  it('ORDER BY ef.store_id が含まれる', async () => {
    const conn = makeMockConn()
    await queryStorePeriodMetrics(conn as never, singleMonthRange)
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain('ORDER BY ef.store_id')
  })

  it('空の場合は空配列を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryStorePeriodMetrics(conn as never, singleMonthRange)
    expect(result).toHaveLength(0)
  })

  it('モックデータを返す', async () => {
    const rows = [
      {
        storeId: '1',
        totalSales: 1000000,
        totalCoreSales: 900000,
        grossSales: 1050000,
        deliverySalesPrice: 50000,
        deliverySalesCost: 40000,
        totalFlowersPrice: 20000,
        totalFlowersCost: 16000,
        totalDirectProducePrice: 30000,
        totalDirectProduceCost: 24000,
        totalCost: 700000,
        inventoryCost: 680000,
        totalPurchaseCost: 600000,
        totalPurchasePrice: 700000,
        interStoreInCost: 10000,
        interStoreInPrice: 11000,
        interStoreOutCost: 5000,
        interStoreOutPrice: 5500,
        interDeptInCost: 3000,
        interDeptInPrice: 3300,
        interDeptOutCost: 2000,
        interDeptOutPrice: 2200,
        totalTransferCost: 20000,
        totalTransferPrice: 22000,
        totalDiscount: 50000,
        discountRate: 0.05,
        discountLossCost: 2500,
        averageMarkupRate: 0.3,
        coreMarkupRate: 0.28,
        totalCostInclusion: 5000,
        costInclusionRate: 0.005,
        totalCustomers: 3000,
        averageCustomersPerDay: 100,
        openingInventory: null,
        closingInventory: null,
        invMethodCogs: null,
        invMethodGrossProfit: null,
        invMethodGrossProfitRate: null,
        estMethodCogs: 630000,
        estMethodMargin: 270000,
        estMethodMarginRate: 0.3,
        estMethodClosingInventory: null,
        grossProfitBudget: 280000,
        salesDays: 30,
        totalDays: 30,
        purchaseMaxDay: 28,
        hasDiscountData: true,
      },
    ]
    const conn = makeMockConn(rows)
    const result = await queryStorePeriodMetrics(conn as never, singleMonthRange)
    expect(result).toHaveLength(1)
    expect(result[0].storeId).toBe('1')
    expect(result[0].totalSales).toBe(1000000)
  })
})

describe('queryStorePeriodMetricsSingle', () => {
  it('指定した storeId のデータを返す', async () => {
    const row: Partial<StorePeriodMetricsRow> = { storeId: '5' }
    const conn = makeMockConn([row as Record<string, unknown>])
    const result = await queryStorePeriodMetricsSingle(conn as never, singleMonthRange, '5')
    expect(result).not.toBeNull()
    expect(result?.storeId).toBe('5')
  })

  it('データがない場合は null を返す', async () => {
    const conn = makeMockConn([])
    const result = await queryStorePeriodMetricsSingle(conn as never, singleMonthRange, '99')
    expect(result).toBeNull()
  })

  it('storeId をセットとして渡して queryStorePeriodMetrics を呼ぶ', async () => {
    const conn = makeMockConn([])
    await queryStorePeriodMetricsSingle(conn as never, singleMonthRange, '7')
    const sql = conn.getCapturedSql()[0]
    expect(sql).toContain("s.store_id IN ('7')")
  })
})
