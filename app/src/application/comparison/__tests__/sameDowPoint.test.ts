/**
 * SameDowPoint 不変条件テスト
 *
 * 同曜日比較の UI 入力モデル（SameDowPoint）が
 * DayMappingRow の sourceDate を保持することを保証する。
 *
 * ## 防ぐバグ
 *
 * - currentDay → number に劣化させ、sourceDate を失う再発
 * - 月跨ぎ時に sourceDate.month が currentDay の月と異なるケースを見落とす
 */
import { describe, it, expect } from 'vitest'
import type { DayMappingRow } from '@/application/comparison/comparisonTypes'
import { buildSameDowPoints } from '@/application/comparison/comparisonTypes'

/** テスト用: 最小の DayMappingRow を構築 */
function row(
  currentDay: number,
  prevYear: number,
  prevMonth: number,
  prevDay: number,
  prevSales: number,
  prevCustomers: number,
): DayMappingRow {
  return { currentDay, prevYear, prevMonth, prevDay, prevSales, prevCustomers }
}

describe('buildSameDowPoints', () => {
  it('空の dailyMapping で空 Map を返す', () => {
    const result = buildSameDowPoints([])
    expect(result.size).toBe(0)
  })

  it('sourceDate を保持する（月跨ぎなし）', () => {
    const mapping: DayMappingRow[] = [row(1, 2025, 2, 2, 1000, 50), row(2, 2025, 2, 3, 1200, 60)]
    const points = buildSameDowPoints(mapping)

    expect(points.size).toBe(2)
    const p1 = points.get(1)!
    expect(p1.sourceDate).toEqual({ year: 2025, month: 2, day: 2 })
    expect(p1.sales).toBe(1000)
    expect(p1.customers).toBe(50)
    expect(p1.currentDay).toBe(1)
  })

  it('月跨ぎ: 2026/2/28 → 2025/3/1 で sourceDate.month=3 を保持する', () => {
    // 2026/2 の prevYearSameDow: 28日（土曜）は 2025/3/1（土曜）にマッピング
    const mapping: DayMappingRow[] = [
      row(27, 2025, 2, 28, 1500, 70),
      row(28, 2025, 3, 1, 1722, 80), // 月跨ぎ
    ]
    const points = buildSameDowPoints(mapping)

    const p28 = points.get(28)!
    expect(p28.sourceDate).toEqual({ year: 2025, month: 3, day: 1 })
    expect(p28.sales).toBe(1722)
    expect(p28.customers).toBe(80)
  })

  it('Σ(points.sales) === Σ(dailyMapping.prevSales)', () => {
    const mapping: DayMappingRow[] = [
      row(1, 2025, 2, 2, 1000, 50),
      row(2, 2025, 2, 3, 1200, 60),
      row(28, 2025, 3, 1, 1722, 80),
    ]
    const points = buildSameDowPoints(mapping)

    const totalFromPoints = [...points.values()].reduce((sum, p) => sum + p.sales, 0)
    const totalFromMapping = mapping.reduce((sum, r) => sum + r.prevSales, 0)
    expect(totalFromPoints).toBe(totalFromMapping)
  })

  it('Σ(points.customers) === Σ(dailyMapping.prevCustomers)', () => {
    const mapping: DayMappingRow[] = [
      row(1, 2025, 2, 2, 1000, 50),
      row(2, 2025, 2, 3, 1200, 60),
      row(28, 2025, 3, 1, 1722, 80),
    ]
    const points = buildSameDowPoints(mapping)

    const totalFromPoints = [...points.values()].reduce((sum, p) => sum + p.customers, 0)
    const totalFromMapping = mapping.reduce((sum, r) => sum + r.prevCustomers, 0)
    expect(totalFromPoints).toBe(totalFromMapping)
  })

  it('全 point の currentDay が dailyMapping の currentDay と一致する', () => {
    const mapping: DayMappingRow[] = [
      row(1, 2025, 2, 2, 1000, 50),
      row(15, 2025, 2, 16, 1200, 60),
      row(28, 2025, 3, 1, 1722, 80),
    ]
    const points = buildSameDowPoints(mapping)

    const pointDays = [...points.keys()].sort((a, b) => a - b)
    const mappingDays = mapping.map((r) => r.currentDay).sort((a, b) => a - b)
    expect(pointDays).toEqual(mappingDays)
  })

  it('年跨ぎ: 2026/1/1 → 2024/12/27 で sourceDate を保持する', () => {
    const mapping: DayMappingRow[] = [row(1, 2024, 12, 27, 900, 40)]
    const points = buildSameDowPoints(mapping)

    const p1 = points.get(1)!
    expect(p1.sourceDate).toEqual({ year: 2024, month: 12, day: 27 })
  })
})
