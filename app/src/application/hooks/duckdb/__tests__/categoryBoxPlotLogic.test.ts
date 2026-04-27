/**
 * categoryBoxPlotLogic.ts — pure function test
 *
 * 検証対象:
 * - quantile: 四分位数補間 (空/単一/複数)
 * - buildBoxPlotData: 集約 + 統計 (topN フィルタ / metric 分岐 / 0 埋め)
 * - buildStoreBreakdown: 指定カテゴリの店舗別値 + 降順ソート
 * - buildBoxPlotDataByDate: 日別の統計
 * - buildDateBreakdown: 日別合計 + 日付順ソート
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  quantile,
  buildBoxPlotData,
  buildStoreBreakdown,
  buildBoxPlotDataByDate,
  buildDateBreakdown,
} from '../categoryBoxPlotLogic'
import type {
  CategoryBenchmarkRow,
  CategoryBenchmarkTrendRow,
} from '@/infrastructure/duckdb/queries/advancedAnalytics'

function makeRow(
  code: string,
  storeId: string,
  totalSales: number,
  totalQuantity = 0,
): CategoryBenchmarkRow {
  return {
    code,
    name: `Cat${code}`,
    storeId,
    totalSales,
    totalQuantity,
    storeCustomers: 100,
    share: 0.1,
    salesRank: 1,
    storeCount: 3,
  }
}

function makeTrendRow(
  code: string,
  dateKey: string,
  totalSales: number,
): CategoryBenchmarkTrendRow {
  return {
    code,
    name: `Cat${code}`,
    dateKey,
    totalSales,
  } as unknown as CategoryBenchmarkTrendRow
}

// ─── quantile ────────────────────────────────────────

describe('quantile', () => {
  it('空配列は 0', () => {
    expect(quantile([], 0.5)).toBe(0)
  })

  it('単一値は その値', () => {
    expect(quantile([42], 0.5)).toBe(42)
  })

  it('median (0.5) = 真ん中', () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3)
  })

  it('q1 (0.25) と q3 (0.75) を補間する', () => {
    // [1,2,3,4,5]: pos=1.0 for q1, pos=3.0 for q3
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2)
    expect(quantile([1, 2, 3, 4, 5], 0.75)).toBe(4)
  })

  it('補間が必要な位置では線形補間される', () => {
    // [10,20,30,40]: q=0.5 → pos=1.5 → (20+30)/2 = 25
    expect(quantile([10, 20, 30, 40], 0.5)).toBe(25)
  })
})

// ─── buildBoxPlotData ────────────────────────────────

describe('buildBoxPlotData', () => {
  it('空 rows → 空配列', () => {
    expect(buildBoxPlotData([], 'sales')).toEqual([])
  })

  it("metric='sales': totalSales 値を集約", () => {
    const rows = [makeRow('A', 's1', 100), makeRow('A', 's2', 200), makeRow('A', 's3', 300)]
    const result = buildBoxPlotData(rows, 'sales', 20, 1, 0)
    expect(result).toHaveLength(1)
    expect(result[0].code).toBe('A')
    expect(result[0].count).toBe(3)
    expect(result[0].min).toBe(100)
    expect(result[0].max).toBe(300)
    expect(result[0].median).toBe(200)
    expect(result[0].mean).toBeCloseTo(200, 2)
  })

  it("metric='quantity': totalQuantity 値を集約", () => {
    const rows = [makeRow('A', 's1', 0, 10), makeRow('A', 's2', 0, 20), makeRow('A', 's3', 0, 30)]
    const result = buildBoxPlotData(rows, 'quantity', 20, 1, 0)
    expect(result[0].median).toBe(20)
    expect(result[0].mean).toBeCloseTo(20, 2)
  })

  it('totalStoreCount>0 で販売 0 店舗を 0 埋め', () => {
    const rows = [makeRow('A', 's1', 100), makeRow('A', 's2', 200)]
    // totalStoreCount=4 なら 2 店舗分 0 値を追加
    const result = buildBoxPlotData(rows, 'sales', 20, 1, 4)
    expect(result[0].count).toBe(4)
    expect(result[0].min).toBe(0)
    expect(result[0].max).toBe(200)
  })
})

// ─── buildStoreBreakdown ─────────────────────────────

describe('buildStoreBreakdown', () => {
  it('指定カテゴリの店舗別値を抽出', () => {
    const rows = [
      makeRow('A', 's1', 100),
      makeRow('A', 's2', 300),
      makeRow('B', 's1', 50), // 除外
    ]
    const result = buildStoreBreakdown(rows, 'A', 'sales')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ storeId: 's2', value: 300 })
    expect(result[1]).toEqual({ storeId: 's1', value: 100 })
  })

  it("metric='quantity' で quantity を使う", () => {
    const rows = [makeRow('A', 's1', 0, 50), makeRow('A', 's2', 0, 100)]
    const result = buildStoreBreakdown(rows, 'A', 'quantity')
    expect(result[0].value).toBe(100)
  })

  it('降順ソートされる', () => {
    const rows = [makeRow('A', 's1', 50), makeRow('A', 's2', 500), makeRow('A', 's3', 200)]
    const result = buildStoreBreakdown(rows, 'A', 'sales')
    expect(result.map((r) => r.value)).toEqual([500, 200, 50])
  })

  it('該当カテゴリ無で空配列', () => {
    const rows = [makeRow('A', 's1', 100)]
    expect(buildStoreBreakdown(rows, 'UNKNOWN', 'sales')).toEqual([])
  })
})

// ─── buildBoxPlotDataByDate ──────────────────────────

describe('buildBoxPlotDataByDate', () => {
  it('空 trendRows → 空配列', () => {
    const benchmarkRows = [makeRow('A', 's1', 100)]
    const result = buildBoxPlotDataByDate([], benchmarkRows, 'sales')
    expect(result).toEqual([])
  })

  it('dateKey ごとに値を集約し統計を計算', () => {
    const benchmarkRows = [makeRow('A', 's1', 100)]
    const trendRows = [
      makeTrendRow('A', '2026-04-01', 100),
      makeTrendRow('A', '2026-04-02', 200),
      makeTrendRow('A', '2026-04-03', 300),
    ]
    const result = buildBoxPlotDataByDate(trendRows, benchmarkRows, 'sales', 20, 1, 0)
    expect(result).toHaveLength(1)
    expect(result[0].count).toBe(3)
    expect(result[0].median).toBe(200)
  })

  it('同日の row を加算する', () => {
    const benchmarkRows = [makeRow('A', 's1', 100)]
    const trendRows = [
      makeTrendRow('A', '2026-04-01', 100),
      makeTrendRow('A', '2026-04-01', 50), // 同日 → 合算 = 150
      makeTrendRow('A', '2026-04-02', 200),
    ]
    const result = buildBoxPlotDataByDate(trendRows, benchmarkRows, 'sales', 20, 1, 0)
    expect(result[0].count).toBe(2)
    expect(result[0].max).toBe(200)
    expect(result[0].min).toBe(150)
  })
})

// ─── buildDateBreakdown ──────────────────────────────

describe('buildDateBreakdown', () => {
  it('指定カテゴリの日別合計を抽出', () => {
    const rows = [
      makeTrendRow('A', '2026-04-01', 100),
      makeTrendRow('A', '2026-04-02', 200),
      makeTrendRow('B', '2026-04-01', 50), // 除外
    ]
    const result = buildDateBreakdown(rows, 'A')
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ dateKey: '2026-04-01', value: 100 })
    expect(result[1]).toEqual({ dateKey: '2026-04-02', value: 200 })
  })

  it('同日の row を加算する', () => {
    const rows = [makeTrendRow('A', '2026-04-01', 100), makeTrendRow('A', '2026-04-01', 50)]
    const result = buildDateBreakdown(rows, 'A')
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(150)
  })

  it('日付順にソートされる (ascending)', () => {
    const rows = [
      makeTrendRow('A', '2026-04-03', 30),
      makeTrendRow('A', '2026-04-01', 10),
      makeTrendRow('A', '2026-04-02', 20),
    ]
    const result = buildDateBreakdown(rows, 'A')
    expect(result.map((r) => r.dateKey)).toEqual(['2026-04-01', '2026-04-02', '2026-04-03'])
  })
})
