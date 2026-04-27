/**
 * DuckDB クエリモジュールの SQL 生成テスト
 *
 * 実際の DuckDB 接続は不要。CtsFilterParams → WHERE 句の生成と
 * 型インターフェースの整合性を検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildTypedWhere } from '../queryRunner'
import type { WhereCondition } from '../queryRunner'
import type { CtsFilterParams } from '../queries/categoryTimeSales'
import type {
  HourlyAggregationRow,
  LevelAggregationRow,
  StoreAggregationRow,
  HourDowMatrixRow,
  CategoryDailyTrendRow,
  CategoryHourlyRow,
} from '../queries/categoryTimeSales'
import type { StoreDaySummaryRow, DailyCumulativeRow } from '../queries/storeDaySummary'
import type { DeptKpiRankedRow, DeptKpiSummaryRow } from '../queries/departmentKpi'
import type { YoyDailyRow, YoyCategoryRow } from '../queries/yoyComparison'
import type { DailyFeatureRow, HourlyProfileRow, DowPatternRow } from '../queries/features'
import type { CategoryMixWeeklyRow, CategoryBenchmarkRow } from '../queries/advancedAnalytics'

// ── CtsFilterParams → WHERE 生成のテスト ──

describe('CTS フィルタ条件生成', () => {
  function buildCtsWhereForTest(params: CtsFilterParams): string {
    const conditions: WhereCondition[] = [
      { type: 'dateRange', column: 'date_key', from: params.dateFrom, to: params.dateTo },
      { type: 'boolean', column: 'is_prev_year', value: params.isPrevYear ?? false },
      { type: 'storeIds', storeIds: params.storeIds },
    ]
    if (params.deptCode)
      conditions.push({ type: 'code', column: 'dept_code', value: params.deptCode })
    if (params.lineCode)
      conditions.push({ type: 'code', column: 'line_code', value: params.lineCode })
    if (params.klassCode)
      conditions.push({ type: 'code', column: 'klass_code', value: params.klassCode })
    if (params.dow && params.dow.length > 0)
      conditions.push({ type: 'in', column: 'dow', values: params.dow })
    return buildTypedWhere(conditions)
  }

  it('最小フィルタ（日付範囲のみ）', () => {
    const result = buildCtsWhereForTest({
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
    })
    expect(result).toBe(
      "WHERE date_key BETWEEN '2026-02-01' AND '2026-02-28' AND is_prev_year = FALSE",
    )
  })

  it('全フィルタ指定', () => {
    const result = buildCtsWhereForTest({
      dateFrom: '2026-02-01',
      dateTo: '2026-02-28',
      storeIds: ['1', '2'],
      deptCode: 'D01',
      lineCode: 'L01',
      klassCode: 'K01',
      dow: [1, 3, 5],
      isPrevYear: true,
    })
    expect(result).toContain("date_key BETWEEN '2026-02-01' AND '2026-02-28'")
    expect(result).toContain('is_prev_year = TRUE')
    expect(result).toContain("store_id IN ('1', '2')")
    expect(result).toContain("dept_code = 'D01'")
    expect(result).toContain("line_code = 'L01'")
    expect(result).toContain("klass_code = 'K01'")
    expect(result).toContain('dow IN (1, 3, 5)')
  })

  it('storeIds が空の場合は店舗条件なし', () => {
    const result = buildCtsWhereForTest({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      storeIds: [],
    })
    expect(result).not.toContain('store_id')
  })

  it('月跨ぎの日付範囲', () => {
    const result = buildCtsWhereForTest({
      dateFrom: '2025-12-15',
      dateTo: '2026-01-15',
    })
    expect(result).toContain("date_key BETWEEN '2025-12-15' AND '2026-01-15'")
  })
})

// ── 結果型の互換性テスト ──
// 型が期待するプロパティを持つことを静的に検証

describe('クエリ結果型の構造', () => {
  it('HourlyAggregationRow の必須プロパティ', () => {
    const row: HourlyAggregationRow = { hour: 10, totalAmount: 50000, totalQuantity: 100 }
    expect(row.hour).toBe(10)
    expect(row.totalAmount).toBe(50000)
    expect(row.totalQuantity).toBe(100)
  })

  it('LevelAggregationRow の必須プロパティ', () => {
    const row: LevelAggregationRow = {
      code: 'D01',
      name: '青果',
      amount: 100000,
      quantity: 500,
      childCount: 3,
      handledDayCount: 20,
      totalDayCount: 25,
    }
    expect(row.code).toBe('D01')
    expect(row.childCount).toBe(3)
    expect(row.handledDayCount).toBeLessThanOrEqual(row.totalDayCount)
  })

  it('StoreAggregationRow の必須プロパティ', () => {
    const row: StoreAggregationRow = { storeId: '1', hour: 10, amount: 30000, quantity: 12 }
    expect(row.storeId).toBe('1')
  })

  it('HourDowMatrixRow の必須プロパティ', () => {
    const row: HourDowMatrixRow = { hour: 10, dow: 1, amount: 20000, dayCount: 4 }
    expect(row.dow).toBe(1)
    expect(row.dayCount).toBe(4)
  })

  it('StoreDaySummaryRow の必須プロパティ', () => {
    const row: StoreDaySummaryRow = {
      year: 2026,
      month: 2,
      day: 1,
      dateKey: '2026-02-01',
      storeId: '1',
      sales: 100000,
      coreSales: 90000,
      grossSales: 110000,
      discount71: -5000,
      discount72: -3000,
      discount73: -1000,
      discount74: -1000,
      discountAmount: -10000,
      discountAbsolute: 10000,
      purchaseCost: 70000,
      purchasePrice: 100000,
      interStoreInCost: 0,
      interStoreInPrice: 0,
      interStoreOutCost: 0,
      interStoreOutPrice: 0,
      interDeptInCost: 0,
      interDeptInPrice: 0,
      interDeptOutCost: 0,
      interDeptOutPrice: 0,
      flowersCost: 0,
      flowersPrice: 0,
      directProduceCost: 0,
      directProducePrice: 0,
      costInclusionCost: 0,
      customers: 200,
      totalQuantity: 500,
      isPrevYear: false,
    }
    expect(row.sales).toBe(100000)
    expect(row.isPrevYear).toBe(false)
  })

  it('DailyCumulativeRow の必須プロパティ', () => {
    const row: DailyCumulativeRow = {
      dateKey: '2026-02-01',
      dailySales: 100000,
      cumulativeSales: 100000,
    }
    expect(row.cumulativeSales).toBe(100000)
  })

  it('DeptKpiRankedRow の必須プロパティ', () => {
    const row: DeptKpiRankedRow = {
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
    }
    expect(row.gpRateRank).toBe(1)
  })

  it('DeptKpiSummaryRow の必須プロパティ', () => {
    const row: DeptKpiSummaryRow = {
      deptCount: 5,
      totalSalesBudget: 5000000,
      totalSalesActual: 4800000,
      overallSalesAchievement: 0.96,
      gpBudgetWeightedSum: 1200000,
      gpActualWeightedSum: 1152000,
      discountWeightedSum: 96000,
      markupWeightedSum: 1344000,
    }
    expect(row.deptCount).toBe(5)
  })

  it('YoyDailyRow の必須プロパティ', () => {
    const row: YoyDailyRow = {
      curDateKey: '2026-02-01',
      prevDateKey: '2025-02-01',
      storeId: '1',
      curSales: 100000,
      prevSales: 90000,
      salesDiff: 10000,
      curCustomers: 200,
      prevCustomers: 180,
    }
    expect(row.salesDiff).toBe(10000)
  })

  it('YoyCategoryRow の必須プロパティ', () => {
    const row: YoyCategoryRow = {
      code: 'D01',
      name: '青果',
      curAmount: 100000,
      prevAmount: 90000,
      amountDiff: 10000,
      curQuantity: 500,
      prevQuantity: 450,
    }
    expect(row.amountDiff).toBe(10000)
  })

  it('DailyFeatureRow の必須プロパティ', () => {
    const row: DailyFeatureRow = {
      storeId: '1',
      dateKey: '2026-02-01',
      sales: 100000,
      salesMa3: 98000,
      salesMa7: 97000,
      salesMa28: 96000,
      salesDiff1d: 2000,
      salesDiff7d: 5000,
      cumulativeSales: 500000,
      cv7day: 0.05,
      cv28day: 0.08,
      zScore: 1.2,
      spikeRatio: 1.03,
    }
    expect(row.zScore).toBe(1.2)
  })

  it('HourlyProfileRow の必須プロパティ', () => {
    const row: HourlyProfileRow = {
      storeId: '1',
      hour: 12,
      totalAmount: 50000,
      hourShare: 0.15,
      hourRank: 1,
    }
    expect(row.hourShare).toBe(0.15)
  })

  it('DowPatternRow の必須プロパティ', () => {
    const row: DowPatternRow = {
      storeId: '1',
      dow: 0,
      avgSales: 80000,
      dayCount: 4,
      salesStddev: 5000,
    }
    expect(row.avgSales).toBe(80000)
  })

  // ── Phase 2 追加型 ──

  it('CategoryDailyTrendRow の必須プロパティ', () => {
    const row: CategoryDailyTrendRow = {
      code: 'D01',
      name: '青果',
      dateKey: '2026-02-01',
      amount: 50000,
      quantity: 300,
    }
    expect(row.code).toBe('D01')
    expect(row.dateKey).toBe('2026-02-01')
    expect(row.amount).toBe(50000)
  })

  it('CategoryHourlyRow の必須プロパティ', () => {
    const row: CategoryHourlyRow = {
      code: 'D01',
      name: '青果',
      hour: 12,
      amount: 30000,
      quantity: 150,
    }
    expect(row.code).toBe('D01')
    expect(row.hour).toBe(12)
    expect(row.amount).toBe(30000)
  })

  it('CategoryMixWeeklyRow の必須プロパティ', () => {
    const row: CategoryMixWeeklyRow = {
      weekStart: '2026-02-02',
      code: 'D01',
      name: '青果',
      weekSales: 500000,
      totalWeekSales: 2000000,
      sharePct: 25.0,
      prevWeekShare: 23.5,
      shareShift: 1.5,
    }
    expect(row.weekStart).toBe('2026-02-02')
    expect(row.sharePct).toBe(25.0)
    expect(row.shareShift).toBe(1.5)
  })

  it('CategoryMixWeeklyRow で prevWeekShare が null（初週）', () => {
    const row: CategoryMixWeeklyRow = {
      weekStart: '2026-02-02',
      code: 'D01',
      name: '青果',
      weekSales: 500000,
      totalWeekSales: 2000000,
      sharePct: 25.0,
      prevWeekShare: null,
      shareShift: null,
    }
    expect(row.prevWeekShare).toBeNull()
    expect(row.shareShift).toBeNull()
  })

  it('CategoryBenchmarkRow の必須プロパティ', () => {
    const row: CategoryBenchmarkRow = {
      code: 'D01',
      name: '青果',
      storeId: '1',
      totalSales: 700000,
      totalQuantity: 350,
      storeCustomers: 1200,
      share: 0.35,
      salesRank: 1,
      storeCount: 3,
    }
    expect(row.code).toBe('D01')
    expect(row.salesRank).toBe(1)
    expect(row.storeCount).toBe(3)
  })
})
