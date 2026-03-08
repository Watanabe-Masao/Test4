/**
 * rawAggregation — DuckDB SQL 計算の JS 置き換え関数テスト
 *
 * SQL のウィンドウ関数・集約関数と同じ結果を返すことを検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  aggregateByDay,
  cumulativeSum,
  movingAverage,
  dowAggregate,
  hourlyAggregate,
  aggregatePeriodRates,
  stddevPop,
  zScore,
  coefficientOfVariation,
  rankBy,
  yoyMerge,
  categoryShare,
} from './rawAggregation'

// ─── テストデータ ─────────────────────────────────────

const DAILY_RECORDS = [
  { dateKey: '2026-01-01', day: 1, storeId: 'S1', sales: 100 },
  { dateKey: '2026-01-01', day: 1, storeId: 'S2', sales: 200 },
  { dateKey: '2026-01-02', day: 2, storeId: 'S1', sales: 150 },
  { dateKey: '2026-01-02', day: 2, storeId: 'S2', sales: 250 },
  { dateKey: '2026-01-03', day: 3, storeId: 'S1', sales: 120 },
]

// ─── aggregateByDay ───────────────────────────────────

describe('aggregateByDay', () => {
  it('複数店舗を日別にまとめて合算する', () => {
    const result = aggregateByDay(DAILY_RECORDS)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      dateKey: '2026-01-01',
      day: 1,
      totalSales: 300,
      storeCount: 2,
    })
    expect(result[1]).toEqual({
      dateKey: '2026-01-02',
      day: 2,
      totalSales: 400,
      storeCount: 2,
    })
    expect(result[2]).toEqual({
      dateKey: '2026-01-03',
      day: 3,
      totalSales: 120,
      storeCount: 1,
    })
  })

  it('空配列は空を返す', () => {
    expect(aggregateByDay([])).toEqual([])
  })

  it('dateKey 順にソートされる', () => {
    const unordered = [
      { dateKey: '2026-01-03', day: 3, storeId: 'S1', sales: 10 },
      { dateKey: '2026-01-01', day: 1, storeId: 'S1', sales: 20 },
    ]
    const result = aggregateByDay(unordered)
    expect(result[0].dateKey).toBe('2026-01-01')
    expect(result[1].dateKey).toBe('2026-01-03')
  })
})

// ─── cumulativeSum ────────────────────────────────────

describe('cumulativeSum', () => {
  it('日別売上の累積合計を計算する', () => {
    const daily = [
      { dateKey: '2026-01-01', totalSales: 300 },
      { dateKey: '2026-01-02', totalSales: 400 },
      { dateKey: '2026-01-03', totalSales: 120 },
    ]
    const result = cumulativeSum(daily)

    expect(result).toEqual([
      { dateKey: '2026-01-01', dailySales: 300, cumulativeSales: 300 },
      { dateKey: '2026-01-02', dailySales: 400, cumulativeSales: 700 },
      { dateKey: '2026-01-03', dailySales: 120, cumulativeSales: 820 },
    ])
  })

  it('空配列は空を返す', () => {
    expect(cumulativeSum([])).toEqual([])
  })
})

// ─── movingAverage ────────────────────────────────────

describe('movingAverage', () => {
  it('N日移動平均を計算する（先頭はnull）', () => {
    const data = [
      { dateKey: '2026-01-01', value: 100 },
      { dateKey: '2026-01-02', value: 200 },
      { dateKey: '2026-01-03', value: 300 },
      { dateKey: '2026-01-04', value: 400 },
    ]
    const result = movingAverage(data, 3)

    expect(result[0].ma).toBeNull()
    expect(result[1].ma).toBeNull()
    expect(result[2].ma).toBe(200) // (100+200+300)/3
    expect(result[3].ma).toBe(300) // (200+300+400)/3
  })

  it('windowSize=1 は元の値と同じ', () => {
    const data = [
      { dateKey: '2026-01-01', value: 100 },
      { dateKey: '2026-01-02', value: 200 },
    ]
    const result = movingAverage(data, 1)
    expect(result[0].ma).toBe(100)
    expect(result[1].ma).toBe(200)
  })
})

// ─── dowAggregate ─────────────────────────────────────

describe('dowAggregate', () => {
  it('曜日別の平均売上と標準偏差を計算する', () => {
    // 2026-01-01 = 木曜(4), 2026-01-02 = 金曜(5), 2026-01-03 = 土曜(6)
    const daily = [
      { dateKey: '2026-01-01', totalSales: 300 },
      { dateKey: '2026-01-02', totalSales: 400 },
      { dateKey: '2026-01-03', totalSales: 120 },
    ]
    const result = dowAggregate(daily, 2026, 1)

    expect(result).toHaveLength(3)
    // 各曜日1日ずつなので dayCount=1, stddev=0
    for (const r of result) {
      expect(r.dayCount).toBe(1)
      expect(r.stddev).toBe(0)
    }
  })
})

// ─── hourlyAggregate ──────────────────────────────────

describe('hourlyAggregate', () => {
  it('時間帯別に集約する', () => {
    const records = [
      {
        timeSlots: [
          { hour: 9, amount: 100, quantity: 5 },
          { hour: 10, amount: 200, quantity: 10 },
        ],
      },
      {
        timeSlots: [
          { hour: 9, amount: 150, quantity: 7 },
          { hour: 11, amount: 300, quantity: 15 },
        ],
      },
    ]
    const result = hourlyAggregate(records)

    expect(result).toHaveLength(3)
    expect(result.find((r) => r.hour === 9)).toEqual({
      hour: 9,
      totalAmount: 250,
      totalQuantity: 12,
    })
    expect(result.find((r) => r.hour === 10)).toEqual({
      hour: 10,
      totalAmount: 200,
      totalQuantity: 10,
    })
    expect(result.find((r) => r.hour === 11)).toEqual({
      hour: 11,
      totalAmount: 300,
      totalQuantity: 15,
    })
  })
})

// ─── aggregatePeriodRates ─────────────────────────────

describe('aggregatePeriodRates', () => {
  it('期間集約レートを計算する', () => {
    const records = [
      {
        sales: 1000,
        purchaseCost: 600,
        discountAbsolute: 50,
        flowersCost: 10,
        directProduceCost: 20,
        costInclusionCost: 5,
        customers: 100,
      },
      {
        sales: 2000,
        purchaseCost: 1200,
        discountAbsolute: 100,
        flowersCost: 20,
        directProduceCost: 40,
        costInclusionCost: 10,
        customers: 200,
      },
    ]
    const result = aggregatePeriodRates(records)

    expect(result.totalSales).toBe(3000)
    expect(result.totalPurchaseCost).toBe(1800)
    expect(result.totalDiscountAbsolute).toBe(150)
    expect(result.discountRate).toBe(150 / 3000) // 0.05
    expect(result.totalCustomers).toBe(300)
  })

  it('売上0の場合 discountRate は 0', () => {
    const result = aggregatePeriodRates([
      {
        sales: 0,
        purchaseCost: 0,
        discountAbsolute: 0,
        flowersCost: 0,
        directProduceCost: 0,
        costInclusionCost: 0,
        customers: 0,
      },
    ])
    expect(result.discountRate).toBe(0)
  })
})

// ─── 統計量 ───────────────────────────────────────────

describe('stddevPop', () => {
  it('母標準偏差を計算する', () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, stddev=2
    expect(stddevPop([2, 4, 4, 4, 5, 5, 7, 9])).toBe(2)
  })

  it('空配列は0', () => {
    expect(stddevPop([])).toBe(0)
  })

  it('同値配列はstddev=0', () => {
    expect(stddevPop([5, 5, 5])).toBe(0)
  })
})

describe('zScore', () => {
  it('Z-scoreを計算する', () => {
    expect(zScore(7, 5, 2)).toBe(1)
    expect(zScore(3, 5, 2)).toBe(-1)
  })

  it('stddev=0 の場合は 0', () => {
    expect(zScore(7, 5, 0)).toBe(0)
  })
})

describe('coefficientOfVariation', () => {
  it('変動係数を計算する', () => {
    const cv = coefficientOfVariation([2, 4, 4, 4, 5, 5, 7, 9])
    expect(cv).toBe(2 / 5) // stddev=2, mean=5
  })

  it('空配列は0', () => {
    expect(coefficientOfVariation([])).toBe(0)
  })
})

// ─── rankBy ───────────────────────────────────────────

describe('rankBy', () => {
  it('降順でランキングする', () => {
    const items = [
      { name: 'A', score: 80 },
      { name: 'B', score: 100 },
      { name: 'C', score: 90 },
    ]
    const result = rankBy(items, (i) => i.score)

    expect(result[0]).toEqual({ name: 'B', score: 100, rank: 1 })
    expect(result[1]).toEqual({ name: 'C', score: 90, rank: 2 })
    expect(result[2]).toEqual({ name: 'A', score: 80, rank: 3 })
  })

  it('同値は同順位（1, 1, 3 方式）', () => {
    const items = [
      { name: 'A', score: 100 },
      { name: 'B', score: 100 },
      { name: 'C', score: 90 },
    ]
    const result = rankBy(items, (i) => i.score)

    expect(result[0].rank).toBe(1)
    expect(result[1].rank).toBe(1)
    expect(result[2].rank).toBe(3)
  })
})

// ─── yoyMerge ─────────────────────────────────────────

describe('yoyMerge', () => {
  it('当期と前期を FULL OUTER JOIN でマージする', () => {
    const current = [
      { dateKey: '2026-01-01', sales: 100 },
      { dateKey: '2026-01-02', sales: 200 },
    ]
    const previous = [
      { dateKey: '2026-01-01', sales: 80 },
      { dateKey: '2026-01-03', sales: 150 },
    ]
    const result = yoyMerge(current, previous, (r) => r.dateKey)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      key: '2026-01-01',
      current: { dateKey: '2026-01-01', sales: 100 },
      previous: { dateKey: '2026-01-01', sales: 80 },
    })
    expect(result[1].current).not.toBeNull()
    expect(result[1].previous).toBeNull() // 2026-01-02: 前期なし
    expect(result[2].current).toBeNull() // 2026-01-03: 当期なし
    expect(result[2].previous).not.toBeNull()
  })
})

// ─── categoryShare ────────────────────────────────────

describe('categoryShare', () => {
  it('カテゴリ別売上シェアを計算する', () => {
    const records = [
      { code: 'A', name: 'Cat A', amount: 300 },
      { code: 'B', name: 'Cat B', amount: 700 },
    ]
    const result = categoryShare(records)

    expect(result[0].share).toBe(0.3)
    expect(result[1].share).toBe(0.7)
  })

  it('合計0の場合はシェア0', () => {
    const records = [{ code: 'A', name: 'Cat A', amount: 0 }]
    const result = categoryShare(records)
    expect(result[0].share).toBe(0)
  })
})
