/**
 * DiscountTrendChartLogic — buildDiscountData テスト
 *
 * 検証対象:
 * - 日別売変総額 + 累計売変率（cumRate = cumDiscount / cumGrossSales）
 * - 売変種別（71/72/73/74）ごとの累計積み上げ
 * - 前年 daily を渡したときの prevCumRate / prevByType 処理
 * - 売上 0 の日の hasSales / 初期区間の prevCumRate=null
 */
import { describe, it, expect } from 'vitest'
import { buildDiscountData } from './DiscountTrendChartLogic'
import type { DailyRecord } from '@/domain/models/record'

const YEAR = 2026
const MONTH = 3

function daily(
  entries: readonly [
    number,
    {
      sales: number
      grossSales: number
      discountAbsolute: number
      discountEntries?: readonly { type: string; amount: number }[]
    },
  ][],
): ReadonlyMap<number, DailyRecord> {
  return new Map(entries.map(([d, v]) => [d, { ...v, day: d } as unknown as DailyRecord]))
}

function prevDaily(
  entries: readonly [
    number,
    { sales: number; discount: number; discountEntries?: Record<string, number> },
  ][],
): ReadonlyMap<
  string,
  { sales: number; discount: number; discountEntries?: Record<string, number> }
> {
  const dd = (d: number) => String(d).padStart(2, '0')
  const mm = String(MONTH).padStart(2, '0')
  return new Map(entries.map(([d, v]) => [`${YEAR}-${mm}-${dd(d)}`, v]))
}

describe('buildDiscountData', () => {
  it('daysInMonth 分の points を生成し、day 番号が昇順', () => {
    const result = buildDiscountData(new Map(), 31, YEAR, MONTH)
    expect(result.points).toHaveLength(31)
    expect(result.points.map((p) => p.day)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1))
  })

  it('当期売変額を日別に累積し、cumRate は grossSales で割った率', () => {
    const cur = daily([
      [1, { sales: 1000, grossSales: 1050, discountAbsolute: 50 }],
      [2, { sales: 2000, grossSales: 2100, discountAbsolute: 100 }],
    ])
    const result = buildDiscountData(cur, 2, YEAR, MONTH)
    // day 1: cumDiscount=50 / cumGross=1050
    expect(result.points[0].cumRate).toBeCloseTo(50 / 1050, 10)
    // day 2: cumDiscount=150 / cumGross=3150
    expect(result.points[1].cumRate).toBeCloseTo(150 / 3150, 10)
  })

  it('売上 0 の日は hasSales=false、値は前日累計を引き継ぐ', () => {
    const cur = daily([
      [1, { sales: 1000, grossSales: 1050, discountAbsolute: 50 }],
      [2, { sales: 0, grossSales: 0, discountAbsolute: 0 }],
    ])
    const result = buildDiscountData(cur, 2, YEAR, MONTH)
    expect(result.points[0].hasSales).toBe(true)
    expect(result.points[1].hasSales).toBe(false)
    // cumRate は変わらず 50/1050
    expect(result.points[1].cumRate).toBeCloseTo(50 / 1050, 10)
  })

  it('種別別 (71/72/73/74) の当日売変額と累計率を構築する', () => {
    const cur = daily([
      [
        1,
        {
          sales: 1000,
          grossSales: 1100,
          discountAbsolute: 100,
          discountEntries: [
            { type: '71', amount: 40 },
            { type: '72', amount: 30 },
            { type: '73', amount: 20 },
            { type: '74', amount: 10 },
          ],
        },
      ],
    ])
    const result = buildDiscountData(cur, 1, YEAR, MONTH)
    const p = result.points[0]
    expect(p.byType['71']).toBe(40)
    expect(p.byType['72']).toBe(30)
    expect(p.byType['73']).toBe(20)
    expect(p.byType['74']).toBe(10)
    expect(p.cumRateByType['71']).toBeCloseTo(40 / 1100, 10)
  })

  it('前年 daily なしの場合 hasComparison=false / prevCumRate=null', () => {
    const cur = daily([[1, { sales: 1000, grossSales: 1050, discountAbsolute: 50 }]])
    const result = buildDiscountData(cur, 1, YEAR, MONTH)
    expect(result.flags?.hasComparison).toBe(false)
    expect(result.points[0].prevCumRate).toBeNull()
  })

  it('前年 daily ありで prevCumRate を算出する', () => {
    const cur = daily([[1, { sales: 1000, grossSales: 1050, discountAbsolute: 50 }]])
    const prev = prevDaily([
      [1, { sales: 800, discount: 40 }],
      [2, { sales: 1200, discount: 80 }],
    ])
    const result = buildDiscountData(cur, 2, YEAR, MONTH, prev)
    expect(result.flags?.hasComparison).toBe(true)
    // day 1: prev 40/800 = 0.05
    expect(result.points[0].prevCumRate).toBeCloseTo(0.05, 10)
    // day 2: cum prev 120/2000 = 0.06
    expect(result.points[1].prevCumRate).toBeCloseTo(0.06, 10)
  })

  it('前年売上累計 0 の間は prevCumRate=null', () => {
    const prev = prevDaily([[3, { sales: 500, discount: 25 }]])
    const result = buildDiscountData(new Map(), 3, YEAR, MONTH, prev)
    expect(result.points[0].prevCumRate).toBeNull()
    expect(result.points[1].prevCumRate).toBeNull()
    expect(result.points[2].prevCumRate).toBeCloseTo(0.05, 10)
  })

  it('前年 discountEntries があれば種別別 prev 累計率も計算', () => {
    const prev = prevDaily([
      [
        1,
        {
          sales: 1000,
          discount: 100,
          discountEntries: { '71': 40, '72': 30, '73': 20, '74': 10 },
        },
      ],
    ])
    const result = buildDiscountData(new Map(), 1, YEAR, MONTH, prev)
    const p = result.points[0] as (typeof result.points)[0] & {
      prevCumRateByType?: Record<string, number | null>
    }
    expect(p.prevCumRateByType?.['71']).toBeCloseTo(40 / 1000, 10)
    expect(p.prevCumRateByType?.['74']).toBeCloseTo(10 / 1000, 10)
  })
})
