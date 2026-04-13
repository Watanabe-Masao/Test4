/**
 * buildMixChartData のユニットテスト
 *
 * カテゴリ構成比推移データの構築・ランキング・上昇/下落判定を検証する。
 */
import { describe, it, expect } from 'vitest'
import { buildMixChartData } from '@/features/category/ui/charts/CategoryMixChartLogic'
import type { CategoryMixWeeklyRow } from '@/infrastructure/duckdb/queries/advancedAnalytics'

const row = (overrides: Partial<CategoryMixWeeklyRow>): CategoryMixWeeklyRow => ({
  weekStart: '2026-03-01',
  code: 'A',
  name: 'Cat A',
  weekSales: 1000,
  totalWeekSales: 10000,
  sharePct: 10,
  prevWeekShare: null,
  shareShift: null,
  ...overrides,
})

describe('buildMixChartData', () => {
  it('空配列は空結果を返す', () => {
    const r = buildMixChartData([])
    expect(r.chartData).toEqual([])
    expect(r.categories).toEqual([])
    expect(r.topGainer).toBeNull()
    expect(r.topLoser).toBeNull()
  })

  it('単一週・単一カテゴリを処理する', () => {
    const rows: CategoryMixWeeklyRow[] = [
      row({ weekStart: '2026-03-01', code: 'A', name: 'Alpha', sharePct: 25, shareShift: 5 }),
    ]
    const r = buildMixChartData(rows)
    expect(r.chartData).toHaveLength(1)
    expect(r.chartData[0].week).toBe('03-01')
    expect(r.chartData[0].A).toBe(25)
    expect(r.categories).toHaveLength(1)
    expect(r.categories[0].code).toBe('A')
    expect(r.categories[0].name).toBe('Alpha')
    expect(r.categories[0].avgShare).toBe(25)
    expect(r.categories[0].latestShift).toBe(5)
    expect(r.topGainer?.code).toBe('A')
    expect(r.topLoser?.code).toBe('A')
  })

  it('カテゴリを avgShare 降順でソートする', () => {
    const rows: CategoryMixWeeklyRow[] = [
      row({ code: 'A', name: 'A', sharePct: 10 }),
      row({ code: 'B', name: 'B', sharePct: 30 }),
      row({ code: 'C', name: 'C', sharePct: 20 }),
    ]
    const r = buildMixChartData(rows)
    expect(r.categories.map((c) => c.code)).toEqual(['B', 'C', 'A'])
  })

  it('複数週の平均構成比を計算する', () => {
    const rows: CategoryMixWeeklyRow[] = [
      row({ weekStart: '2026-03-01', code: 'A', sharePct: 20 }),
      row({ weekStart: '2026-03-08', code: 'A', sharePct: 40 }),
    ]
    const r = buildMixChartData(rows)
    const a = r.categories.find((c) => c.code === 'A')
    expect(a?.avgShare).toBe(30)
    expect(r.chartData).toHaveLength(2)
    expect(r.chartData.map((d) => d.week)).toEqual(['03-01', '03-08'])
  })

  it('最新週の shareShift のみ latestShift に反映する', () => {
    const rows: CategoryMixWeeklyRow[] = [
      row({ weekStart: '2026-03-01', code: 'A', sharePct: 10, shareShift: null }),
      row({ weekStart: '2026-03-08', code: 'A', sharePct: 15, shareShift: 5 }),
    ]
    const r = buildMixChartData(rows)
    expect(r.categories[0].latestShift).toBe(5)
  })

  it('topGainer/topLoser を正しく判定する', () => {
    const rows: CategoryMixWeeklyRow[] = [
      row({ weekStart: '2026-03-08', code: 'A', name: 'A', sharePct: 20, shareShift: 5 }),
      row({ weekStart: '2026-03-08', code: 'B', name: 'B', sharePct: 30, shareShift: -3 }),
      row({ weekStart: '2026-03-08', code: 'C', name: 'C', sharePct: 15, shareShift: 2 }),
    ]
    const r = buildMixChartData(rows)
    expect(r.topGainer?.code).toBe('A') // +5
    expect(r.topLoser?.code).toBe('B') // -3
  })

  it('shareShift が全て null のとき gainer/loser は null', () => {
    const rows: CategoryMixWeeklyRow[] = [
      row({ weekStart: '2026-03-08', code: 'A', sharePct: 20, shareShift: null }),
      row({ weekStart: '2026-03-08', code: 'B', sharePct: 30, shareShift: null }),
    ]
    const r = buildMixChartData(rows)
    expect(r.topGainer).toBeNull()
    expect(r.topLoser).toBeNull()
  })

  it('weekStart から year を削除して week ラベルを作る (slice(5))', () => {
    const rows: CategoryMixWeeklyRow[] = [row({ weekStart: '2026-12-25', code: 'A', sharePct: 10 })]
    const r = buildMixChartData(rows)
    expect(r.chartData[0].week).toBe('12-25')
  })

  it('chartData の各ポイントに全カテゴリを含める（欠損は 0）', () => {
    const rows: CategoryMixWeeklyRow[] = [
      row({ weekStart: '2026-03-01', code: 'A', sharePct: 50 }),
      row({ weekStart: '2026-03-08', code: 'B', sharePct: 30 }),
    ]
    const r = buildMixChartData(rows)
    // week1 A=50, B=0 (B 未出現); week2 A=0, B=30
    expect(r.chartData).toHaveLength(2)
    expect(r.chartData[0].A).toBe(50)
    expect(r.chartData[0].B).toBe(0)
    expect(r.chartData[1].A).toBe(0)
    expect(r.chartData[1].B).toBe(30)
  })
})
