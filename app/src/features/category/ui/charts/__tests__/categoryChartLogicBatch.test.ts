/**
 * Category chart logic batch — pure function tests
 *
 * 対象:
 * - CategoryMixChartLogic: buildMixChartData
 * - CategoryTrendChartLogic: buildCategoryTrendData, buildPrevYearTrendData
 */
import { describe, it, expect } from 'vitest'
import { buildMixChartData } from '../CategoryMixChartLogic'
import { buildCategoryTrendData, buildPrevYearTrendData } from '../CategoryTrendChartLogic'
import type { CategoryMixWeeklyRow, CategoryDailyTrendRow } from '@/application/hooks/duckdb'

// ─── CategoryMixChartLogic ──────────────

describe('buildMixChartData', () => {
  function makeRow(
    code: string,
    name: string,
    weekStart: string,
    sharePct: number,
    shareShift: number | null = null,
  ): CategoryMixWeeklyRow {
    return {
      code,
      name,
      weekStart,
      sharePct,
      shareShift,
    } as unknown as CategoryMixWeeklyRow
  }

  it('空 → 空 chartData + 空 categories', () => {
    const result = buildMixChartData([])
    expect(result.chartData).toEqual([])
    expect(result.categories).toEqual([])
    expect(result.topGainer).toBeNull()
    expect(result.topLoser).toBeNull()
  })

  it('avgShare でカテゴリをランキング', () => {
    const rows = [
      makeRow('a', 'A', '2026-04-01', 30),
      makeRow('b', 'B', '2026-04-01', 50),
      makeRow('c', 'C', '2026-04-01', 20),
    ]
    const result = buildMixChartData(rows)
    expect(result.categories.map((c) => c.code)).toEqual(['b', 'a', 'c'])
  })

  it('同カテゴリを週で平均', () => {
    const rows = [makeRow('a', 'A', '2026-04-01', 20), makeRow('a', 'A', '2026-04-08', 40)]
    const result = buildMixChartData(rows)
    expect(result.categories[0].avgShare).toBe(30)
  })

  it('week ラベルは MM-DD', () => {
    const rows = [makeRow('a', 'A', '2026-04-15', 30)]
    const result = buildMixChartData(rows)
    expect(result.chartData[0].week).toBe('04-15')
  })

  it('latestShift は最新週の shareShift', () => {
    const rows = [makeRow('a', 'A', '2026-04-01', 30, 2), makeRow('a', 'A', '2026-04-08', 35, 5)]
    const result = buildMixChartData(rows)
    expect(result.categories[0].latestShift).toBe(5)
  })

  it('topGainer / topLoser を検出', () => {
    const rows = [
      makeRow('a', 'A', '2026-04-01', 30, 5),
      makeRow('b', 'B', '2026-04-01', 20, -3),
      makeRow('c', 'C', '2026-04-01', 10, 1),
    ]
    const result = buildMixChartData(rows)
    expect(result.topGainer?.code).toBe('a')
    expect(result.topLoser?.code).toBe('b')
  })

  it('shareShift=null → latestShift=null', () => {
    const rows = [makeRow('a', 'A', '2026-04-01', 30, null)]
    const result = buildMixChartData(rows)
    expect(result.categories[0].latestShift).toBeNull()
  })
})

// ─── buildCategoryTrendData ─────────────

describe('buildCategoryTrendData', () => {
  function makeRow(
    code: string,
    name: string,
    dateKey: string,
    amount: number,
    quantity: number = 0,
  ): CategoryDailyTrendRow {
    return { code, name, dateKey, amount, quantity } as unknown as CategoryDailyTrendRow
  }

  it('空 → 空 chartData + 空 categories', () => {
    const result = buildCategoryTrendData([], new Set())
    expect(result.chartData).toEqual([])
    expect(result.categories).toEqual([])
  })

  it('カテゴリ別合計額ランキング', () => {
    const rows = [
      makeRow('a', 'A', '2026-04-01', 100),
      makeRow('b', 'B', '2026-04-01', 500),
      makeRow('c', 'C', '2026-04-01', 200),
    ]
    const result = buildCategoryTrendData(rows, new Set())
    expect(result.categories.map((c) => c.code)).toEqual(['b', 'c', 'a'])
  })

  it('excludedCodes はスキップされる (chartData のみ)', () => {
    const rows = [makeRow('a', 'A', '2026-04-01', 100), makeRow('b', 'B', '2026-04-01', 200)]
    const result = buildCategoryTrendData(rows, new Set(['b']))
    // categories には残るが chartData に含まれない
    expect(result.chartData[0].b).toBeUndefined()
    expect(result.chartData[0].a).toBe(100)
  })

  it('同日を合算', () => {
    const rows = [makeRow('a', 'A', '2026-04-01', 100), makeRow('a', 'A', '2026-04-01', 50)]
    const result = buildCategoryTrendData(rows, new Set())
    expect(result.chartData[0].a).toBe(150)
  })

  it("metric='quantity' は quantity を使う", () => {
    const rows = [makeRow('a', 'A', '2026-04-01', 1000, 50)]
    const result = buildCategoryTrendData(rows, new Set(), 'quantity')
    expect(result.categories[0].totalAmount).toBe(50)
    expect(result.chartData[0].a).toBe(50)
  })

  it('date は MM-DD 昇順', () => {
    const rows = [makeRow('a', 'A', '2026-04-03', 100), makeRow('a', 'A', '2026-04-01', 100)]
    const result = buildCategoryTrendData(rows, new Set())
    expect(result.chartData.map((p) => p.date)).toEqual(['04-01', '04-03'])
  })
})

// ─── buildPrevYearTrendData ─────────────

describe('buildPrevYearTrendData', () => {
  function makeRow(
    code: string,
    name: string,
    dateKey: string,
    amount: number,
    quantity: number = 0,
  ): CategoryDailyTrendRow {
    return { code, name, dateKey, amount, quantity } as unknown as CategoryDailyTrendRow
  }

  it('空 prevRows → 空 Map', () => {
    const result = buildPrevYearTrendData([], ['04-01'], [])
    expect(result.size).toBe(0)
  })

  it('空 currentDates → 空 Map', () => {
    const rows = [makeRow('a', 'A', '2025-04-01', 100)]
    const result = buildPrevYearTrendData(rows, [], [])
    expect(result.size).toBe(0)
  })

  it('前年→当年 日付を 1:1 マッピング', () => {
    const rows = [makeRow('a', 'A', '2025-04-01', 100), makeRow('a', 'A', '2025-04-02', 200)]
    const categories = [{ code: 'a', name: 'A', totalAmount: 100 }]
    const result = buildPrevYearTrendData(rows, ['04-01', '04-02'], categories)
    expect(result.get('04-01')?.a).toBe(100)
    expect(result.get('04-02')?.a).toBe(200)
  })

  it('現在カテゴリに無いコードは除外', () => {
    const rows = [makeRow('unknown', 'X', '2025-04-01', 100)]
    const categories = [{ code: 'a', name: 'A', totalAmount: 100 }]
    const result = buildPrevYearTrendData(rows, ['04-01'], categories)
    expect(result.size).toBe(0)
  })

  it('currentDates より prev 日付が多い場合は不要分を破棄', () => {
    const rows = [
      makeRow('a', 'A', '2025-04-01', 100),
      makeRow('a', 'A', '2025-04-02', 200),
      makeRow('a', 'A', '2025-04-03', 300),
    ]
    const categories = [{ code: 'a', name: 'A', totalAmount: 600 }]
    const result = buildPrevYearTrendData(rows, ['04-01', '04-02'], categories)
    // 3 days in prev, 2 in current -> third day dropped
    expect(result.size).toBe(2)
  })
})
