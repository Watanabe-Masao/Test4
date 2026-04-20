/**
 * PrevYearComparisonChartLogic — buildCumulativeData テスト
 *
 * 検証対象（純粋関数）:
 * - 累計売上の日別逐次積み上げ
 * - 前年データなし日の prevYearCum = null 処理
 * - 最新データ日（latestDay）特定と summary の算出
 * - flags.hasComparison / extras.prevTotal の境界条件
 */
import { describe, it, expect } from 'vitest'
import { buildCumulativeData } from './PrevYearComparisonChartLogic'

const YEAR = 2026
const MONTH = 3

function currentMap(entries: readonly [number, number][]): ReadonlyMap<number, { sales: number }> {
  return new Map(entries.map(([d, sales]) => [d, { sales }]))
}

function prevMap(entries: readonly [number, number][]): ReadonlyMap<string, { sales: number }> {
  // prev year data is keyed by dateKey = YYYY-MM-DD
  const dd = (d: number) => String(d).padStart(2, '0')
  return new Map(
    entries.map(([d, sales]) => [`${YEAR}-${String(MONTH).padStart(2, '0')}-${dd(d)}`, { sales }]),
  )
}

describe('buildCumulativeData', () => {
  it('daysInMonth 分の points を昇順で生成する', () => {
    const result = buildCumulativeData(new Map(), new Map(), YEAR, MONTH, 31)
    expect(result.points).toHaveLength(31)
    expect(result.points.map((p) => p.day)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1))
  })

  it('当期売上を日別に累積する', () => {
    const cur = currentMap([
      [1, 100],
      [2, 200],
      [3, 300],
    ])
    const result = buildCumulativeData(cur, new Map(), YEAR, MONTH, 3)
    expect(result.points.map((p) => p.currentCum)).toEqual([100, 300, 600])
  })

  it('前年売上は dateKey 経由で累積し、累計 0 の日は prevYearCum=null', () => {
    const prev = prevMap([
      [1, 80],
      [2, 120],
    ])
    const result = buildCumulativeData(new Map(), prev, YEAR, MONTH, 3)
    expect(result.points[0].prevYearCum).toBe(80) // day 1: 累計 80
    expect(result.points[1].prevYearCum).toBe(200) // day 2: 累計 200
    expect(result.points[2].prevYearCum).toBe(200) // day 3: 累計は据え置き（> 0 なので値保持）
  })

  it('前年累計が 0 の間は prevYearCum=null（初期区間の欠損）', () => {
    const prev = prevMap([[3, 100]])
    const result = buildCumulativeData(new Map(), prev, YEAR, MONTH, 3)
    expect(result.points[0].prevYearCum).toBeNull()
    expect(result.points[1].prevYearCum).toBeNull()
    expect(result.points[2].prevYearCum).toBe(100)
  })

  it('latestDay = 当期で売上>0 の最後の日を採用する（sales=0 の後続日は無視）', () => {
    const cur = currentMap([
      [1, 100],
      [2, 200],
      [3, 0], // 売上なし
      [4, 0], // 売上なし
    ])
    const prev = prevMap([
      [1, 50],
      [2, 100],
      [3, 999], // latest=2 なので累計に含まれない
    ])
    const result = buildCumulativeData(cur, prev, YEAR, MONTH, 4)
    // latest=2 → primary (当期累計) = 100+200=300, secondary (前年 day1-2 累計) = 50+100=150
    expect(result.summary?.primary).toBe(300)
    expect(result.summary?.secondary).toBe(150)
  })

  it('summary.delta = primary - secondary、summary.ratio = primary / secondary', () => {
    const cur = currentMap([
      [1, 200],
      [2, 300],
    ])
    const prev = prevMap([
      [1, 100],
      [2, 150],
    ])
    const result = buildCumulativeData(cur, prev, YEAR, MONTH, 2)
    expect(result.summary?.primary).toBe(500)
    expect(result.summary?.secondary).toBe(250)
    expect(result.summary?.delta).toBe(250)
    expect(result.summary?.ratio).toBe(2)
  })

  it('前年累計=0 のとき summary.ratio=0（division-by-zero ガード）', () => {
    const cur = currentMap([[1, 100]])
    const result = buildCumulativeData(cur, new Map(), YEAR, MONTH, 1)
    expect(result.summary?.secondary).toBe(0)
    expect(result.summary?.ratio).toBe(0)
    expect(result.summary?.delta).toBe(100)
  })

  it('当期に売上データが1つもない場合 latestDay=0 / primary=0', () => {
    const result = buildCumulativeData(new Map(), new Map(), YEAR, MONTH, 3)
    expect(result.summary?.primary).toBe(0)
    expect(result.summary?.secondary).toBe(0)
    expect(result.summary?.ratio).toBe(0)
    expect(result.summary?.delta).toBe(0)
  })

  it('flags.hasComparison = 月末までの前年累計 > 0', () => {
    // 前年データあり
    const result1 = buildCumulativeData(new Map(), prevMap([[1, 100]]), YEAR, MONTH, 3)
    expect(result1.flags?.hasComparison).toBe(true)
    // 前年データなし
    const result2 = buildCumulativeData(new Map(), new Map(), YEAR, MONTH, 3)
    expect(result2.flags?.hasComparison).toBe(false)
  })

  it('extras.prevTotal = 月末までの前年累計（latestDay に影響されない）', () => {
    const cur = currentMap([[1, 100]]) // latestDay=1
    const prev = prevMap([
      [1, 50],
      [2, 80],
      [3, 120],
    ])
    const result = buildCumulativeData(cur, prev, YEAR, MONTH, 3)
    // latestDay=1 → secondary=50、一方 extras.prevTotal は月末累計=250
    expect(result.summary?.secondary).toBe(50)
    expect(result.extras.prevTotal).toBe(250)
  })

  it('当期売上=0 の日があっても累計は前日値を引き継ぐ', () => {
    const cur = currentMap([
      [1, 100],
      [3, 300],
    ])
    const result = buildCumulativeData(cur, new Map(), YEAR, MONTH, 3)
    expect(result.points.map((p) => p.currentCum)).toEqual([100, 100, 400])
  })
})
