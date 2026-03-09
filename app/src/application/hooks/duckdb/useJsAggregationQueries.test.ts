/**
 * useJsAggregationQueries — 内部純粋関数のテスト
 *
 * フック自体は React コンテキストが必要なため、
 * ここではフック内部で使う計算ロジック（compute* 関数）をテストする。
 *
 * rawAggregation.ts の関数経由のパイプラインテストも含む。
 */
import { describe, it, expect } from 'vitest'
import {
  aggregateByDay,
  cumulativeSum,
  dowAggregate,
  movingAverage,
  stddevPop,
  zScore,
  coefficientOfVariation,
} from '@/domain/calculations/rawAggregation'
import { safeDivide } from '@/domain/calculations/utils'
import {
  computeDowPattern,
  computeDailyFeatures,
  computeYoyDaily,
  computeHourlyProfile,
} from './useJsAggregationQueries'
import type { StoreDaySummaryRow } from '@/infrastructure/duckdb/queries/storeDaySummary'

// ─── StoreDaySummaryRow テストデータヘルパー ──────────

/** テスト用に最小限のフィールドから StoreDaySummaryRow を作成 */
function mkRow(
  partial: Pick<StoreDaySummaryRow, 'dateKey' | 'day' | 'month' | 'storeId' | 'sales'> &
    Partial<StoreDaySummaryRow>,
): StoreDaySummaryRow {
  return {
    year: 2026,
    coreSales: 0,
    grossSales: 0,
    discount71: 0,
    discount72: 0,
    discount73: 0,
    discount74: 0,
    discountAmount: 0,
    discountAbsolute: 0,
    purchaseCost: 0,
    purchasePrice: 0,
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
    customers: 0,
    isPrevYear: false,
    ...partial,
  }
}

const RAW_ROWS = [
  mkRow({ dateKey: '2026-01-01', day: 1, month: 1, storeId: 'S1', sales: 100, customers: 10 }),
  mkRow({ dateKey: '2026-01-01', day: 1, month: 1, storeId: 'S2', sales: 200, customers: 20 }),
  mkRow({ dateKey: '2026-01-02', day: 2, month: 1, storeId: 'S1', sales: 150, customers: 15 }),
  mkRow({ dateKey: '2026-01-02', day: 2, month: 1, storeId: 'S2', sales: 250, customers: 25 }),
  mkRow({ dateKey: '2026-01-03', day: 3, month: 1, storeId: 'S1', sales: 120, customers: 12 }),
  mkRow({ dateKey: '2026-01-03', day: 3, month: 1, storeId: 'S2', sales: 180, customers: 18 }),
]

// ─── 累積売上パイプライン ──────────────────────────────

describe('累積売上パイプライン (aggregateByDay → cumulativeSum)', () => {
  it('SQL の SUM(sales) OVER (ORDER BY date_key) と同等の結果を返す', () => {
    const daily = aggregateByDay(RAW_ROWS)
    const cumulative = cumulativeSum(daily)

    expect(cumulative).toHaveLength(3)
    expect(cumulative[0]).toEqual({
      dateKey: '2026-01-01',
      dailySales: 300,
      cumulativeSales: 300,
    })
    expect(cumulative[1]).toEqual({
      dateKey: '2026-01-02',
      dailySales: 400,
      cumulativeSales: 700,
    })
    expect(cumulative[2]).toEqual({
      dateKey: '2026-01-03',
      dailySales: 300,
      cumulativeSales: 1000,
    })
  })
})

// ─── 曜日パターンパイプライン ──────────────────────────

describe('曜日パターンパイプライン (aggregateByDay → dowAggregate)', () => {
  it('SQL の AVG/STDDEV_POP per dow と同等の結果を返す', () => {
    const daily = aggregateByDay(RAW_ROWS)
    const dowResult = dowAggregate(daily)

    // 2026-01-01 = 木(4), 01-02 = 金(5), 01-03 = 土(6)
    expect(dowResult).toHaveLength(3)
    expect(dowResult[0].dow).toBe(4) // 木
    expect(dowResult[0].avgSales).toBe(300)
    expect(dowResult[0].dayCount).toBe(1)
    expect(dowResult[1].dow).toBe(5) // 金
    expect(dowResult[1].avgSales).toBe(400)
    expect(dowResult[2].dow).toBe(6) // 土
    expect(dowResult[2].avgSales).toBe(300)
  })

  it('同一曜日が複数ある場合の平均と標準偏差を正しく計算する', () => {
    const daily = [
      { dateKey: '2026-01-01', totalSales: 300 }, // 木
      { dateKey: '2026-01-08', totalSales: 500 }, // 木
    ]
    const dowResult = dowAggregate(daily)

    const thu = dowResult.find((d) => d.dow === 4)!
    expect(thu.avgSales).toBe(400) // (300+500)/2
    expect(thu.dayCount).toBe(2)
    expect(thu.stddev).toBeCloseTo(100) // sqrt(((300-400)^2+(500-400)^2)/2) = 100
  })
})

// ─── 日別特徴量パイプライン ────────────────────────────

describe('日別特徴量パイプライン (移動平均 + 統計量)', () => {
  const dailyValues = [100, 200, 300, 400, 500, 600, 700]
  const dailyData = dailyValues.map((v, i) => ({
    dateKey: `2026-01-${String(i + 1).padStart(2, '0')}`,
    value: v,
  }))

  it('3日移動平均を正しく計算する', () => {
    const ma3 = movingAverage(dailyData, 3)
    expect(ma3[0].ma).toBeNull()
    expect(ma3[1].ma).toBeNull()
    expect(ma3[2].ma).toBe(200) // (100+200+300)/3
    expect(ma3[6].ma).toBe(600) // (500+600+700)/3
  })

  it('7日移動平均を正しく計算する', () => {
    const ma7 = movingAverage(dailyData, 7)
    // 最初の6つは null
    for (let i = 0; i < 6; i++) {
      expect(ma7[i].ma).toBeNull()
    }
    expect(ma7[6].ma).toBe(400) // (100+200+...+700)/7
  })

  it('CV (変動係数) を正しく計算する', () => {
    const cv = coefficientOfVariation(dailyValues)
    const mean = 400
    const sd = stddevPop(dailyValues)
    expect(cv).toBeCloseTo(safeDivide(sd, mean, 0))
  })

  it('Z-score を正しく計算する', () => {
    const mean = 400
    const sd = stddevPop(dailyValues)
    // 700 の Z-score
    const z = zScore(700, mean, sd)
    expect(z).toBeCloseTo((700 - mean) / sd)
  })
})

// ─── computeDowPattern ────────────────────────────────

describe('computeDowPattern', () => {
  it('店舗別曜日パターンを正しく計算する', () => {
    const result = computeDowPattern(RAW_ROWS)

    // S1 と S2 それぞれ 3曜日 = 6行
    expect(result).toHaveLength(6)

    // S1 の木曜日（2026-01-01 = 木曜日）
    const s1Thu = result.find((r) => r.storeId === 'S1' && r.dow === 4)!
    expect(s1Thu.avgSales).toBe(100)
    expect(s1Thu.dayCount).toBe(1)

    // S2 の木曜日
    const s2Thu = result.find((r) => r.storeId === 'S2' && r.dow === 4)!
    expect(s2Thu.avgSales).toBe(200)
    expect(s2Thu.dayCount).toBe(1)
  })

  it('同一曜日の複数データで平均と標準偏差を計算する', () => {
    const rows = [
      mkRow({ dateKey: '2026-01-01', day: 1, month: 1, storeId: 'S1', sales: 100 }),
      mkRow({ dateKey: '2026-01-08', day: 8, month: 1, storeId: 'S1', sales: 300 }),
    ]

    const result = computeDowPattern(rows)
    expect(result).toHaveLength(1) // 同じ店舗、同じ曜日

    const thu = result[0]
    expect(thu.avgSales).toBe(200) // (100+300)/2
    expect(thu.dayCount).toBe(2)
    expect(thu.salesStddev).toBeCloseTo(100) // sqrt(((100-200)^2+(300-200)^2)/2)
  })

  it('結果が storeId → dow 順にソートされる', () => {
    const result = computeDowPattern(RAW_ROWS)
    for (let i = 1; i < result.length; i++) {
      if (result[i].storeId === result[i - 1].storeId) {
        expect(result[i].dow).toBeGreaterThanOrEqual(result[i - 1].dow)
      } else {
        expect(result[i].storeId > result[i - 1].storeId).toBe(true)
      }
    }
  })

  it('空配列を渡すと空配列を返す', () => {
    expect(computeDowPattern([])).toEqual([])
  })
})

// ─── computeDailyFeatures ─────────────────────────────

describe('computeDailyFeatures', () => {
  // 28日以上のデータを作成（Zスコア・CV28日の計算に必要）
  const thirtyDays = Array.from({ length: 30 }, (_, i) =>
    mkRow({
      dateKey: `2026-01-${String(i + 1).padStart(2, '0')}`,
      day: i + 1,
      month: 1,
      storeId: 'S1',
      sales: 100 + i * 10,
    }),
  )

  it('全日分の特徴量行を返す', () => {
    const result = computeDailyFeatures(thirtyDays)
    expect(result).toHaveLength(30)
  })

  it('移動平均が正しく計算される', () => {
    const result = computeDailyFeatures(thirtyDays)

    // 最初の2日は ma3 = null
    expect(result[0].salesMa3).toBeNull()
    expect(result[1].salesMa3).toBeNull()
    // 3日目は ma3 = (100+110+120)/3 = 110
    expect(result[2].salesMa3).toBe(110)

    // 7日目は ma7 = (100+110+...+160)/7 = 130
    expect(result[6].salesMa7).toBe(130)
  })

  it('累積売上が正しく計算される', () => {
    const result = computeDailyFeatures(thirtyDays)
    expect(result[0].cumulativeSales).toBe(100)
    expect(result[1].cumulativeSales).toBe(210) // 100+110
    expect(result[2].cumulativeSales).toBe(330) // 100+110+120
  })

  it('前日比が正しく計算される', () => {
    const result = computeDailyFeatures(thirtyDays)
    expect(result[0].salesDiff1d).toBeNull() // 初日はnull
    expect(result[1].salesDiff1d).toBe(10) // 110-100
  })

  it('前週同曜日比が正しく計算される', () => {
    const result = computeDailyFeatures(thirtyDays)
    expect(result[6].salesDiff7d).toBeNull() // 7日目はまだnull
    expect(result[7].salesDiff7d).toBe(70) // 180-100 = 70 (day8-day1: 170-100=70)
  })

  it('28日目以降で Zスコアが計算される', () => {
    const result = computeDailyFeatures(thirtyDays)
    // 27日目以前は null
    expect(result[26].zScore).toBeNull()
    // 28日目以降は数値
    expect(result[27].zScore).toBeTypeOf('number')
  })

  it('7日目以降で CV7day が計算される', () => {
    const result = computeDailyFeatures(thirtyDays)
    expect(result[5].cv7day).toBeNull()
    expect(result[6].cv7day).toBeTypeOf('number')
  })

  it('28日目以降で CV28day が計算される', () => {
    const result = computeDailyFeatures(thirtyDays)
    expect(result[26].cv28day).toBeNull()
    expect(result[27].cv28day).toBeTypeOf('number')
  })

  it('スパイク比率が7日目以降で計算される', () => {
    const result = computeDailyFeatures(thirtyDays)
    expect(result[5].spikeRatio).toBeNull()
    expect(result[6].spikeRatio).toBeTypeOf('number')
  })

  it('複数店舗のデータを店舗別に処理する', () => {
    const multiStore = [
      ...thirtyDays,
      ...thirtyDays.map((r) => ({ ...r, storeId: 'S2', sales: r.sales * 2 })),
    ]
    const result = computeDailyFeatures(multiStore)
    expect(result).toHaveLength(60) // 30日 × 2店舗

    const s1 = result.filter((r) => r.storeId === 'S1')
    const s2 = result.filter((r) => r.storeId === 'S2')
    expect(s1).toHaveLength(30)
    expect(s2).toHaveLength(30)
  })

  it('空配列を渡すと空配列を返す', () => {
    expect(computeDailyFeatures([])).toEqual([])
  })

  it('trimFromDateKey 指定で先行データを除外する', () => {
    // 12月のデータ（先行データ）+ 1月のデータ
    const decRows = Array.from({ length: 27 }, (_, i) =>
      mkRow({
        dateKey: `2025-12-${String(i + 5).padStart(2, '0')}`,
        day: i + 5,
        month: 12,
        storeId: 'S1',
        sales: 100,
      }),
    )
    const janRows = Array.from({ length: 10 }, (_, i) =>
      mkRow({
        dateKey: `2026-01-${String(i + 1).padStart(2, '0')}`,
        day: i + 1,
        month: 1,
        storeId: 'S1',
        sales: 200,
      }),
    )
    const result = computeDailyFeatures([...decRows, ...janRows], '2026-01-01')
    // 12月のデータは除外される
    expect(result.every((r) => r.dateKey >= '2026-01-01')).toBe(true)
    expect(result).toHaveLength(10)
    // 1月1日でも MA-28 が計算される（先行27日分のデータがあるため）
    expect(result[0].salesMa28).toBeTypeOf('number')
  })
})

// ─── computeYoyDaily ──────────────────────────────────

describe('computeYoyDaily', () => {
  const curRows = [
    mkRow({ dateKey: '2026-01-01', day: 1, month: 1, storeId: 'S1', sales: 100, customers: 10 }),
    mkRow({ dateKey: '2026-01-02', day: 2, month: 1, storeId: 'S1', sales: 150, customers: 15 }),
  ]

  const prevRows = [
    mkRow({
      dateKey: '2025-01-01',
      day: 1,
      month: 1,
      storeId: 'S1',
      sales: 80,
      customers: 8,
      isPrevYear: true,
    }),
    mkRow({
      dateKey: '2025-01-02',
      day: 2,
      month: 1,
      storeId: 'S1',
      sales: 120,
      customers: 12,
      isPrevYear: true,
    }),
  ]

  it('当期と前期のデータを month+day でマッチングする', () => {
    const result = computeYoyDaily(curRows, prevRows)
    expect(result).toHaveLength(2)

    const day1 = result.find((r) => r.curDateKey === '2026-01-01')!
    expect(day1.prevDateKey).toBe('2025-01-01')
    expect(day1.curSales).toBe(100)
    expect(day1.prevSales).toBe(80)
    expect(day1.salesDiff).toBe(20)
    expect(day1.curCustomers).toBe(10)
    expect(day1.prevCustomers).toBe(8)
  })

  it('当期にのみ存在するデータでは prevSales が null', () => {
    const result = computeYoyDaily(curRows, [])
    expect(result).toHaveLength(2)
    expect(result[0].prevSales).toBeNull()
    expect(result[0].prevDateKey).toBeNull()
    expect(result[0].curSales).toBe(100)
  })

  it('前期にのみ存在するデータでは curSales が 0', () => {
    const result = computeYoyDaily([], prevRows)
    expect(result).toHaveLength(2)
    expect(result[0].curSales).toBe(0)
    expect(result[0].curDateKey).toBeNull()
    expect(result[0].prevSales).toBe(80)
  })

  it('同一 store×month×day のレコードが複数ある場合は合算する', () => {
    const dupCur = [
      ...curRows,
      mkRow({ dateKey: '2026-01-01', day: 1, month: 1, storeId: 'S1', sales: 50, customers: 5 }),
    ]
    const result = computeYoyDaily(dupCur, prevRows)
    const day1 = result.find((r) => r.curDateKey === '2026-01-01')!
    expect(day1.curSales).toBe(150) // 100+50
    expect(day1.curCustomers).toBe(15) // 10+5
  })

  it('結果が storeId → dateKey 順にソートされる', () => {
    const multiStore = [
      ...curRows,
      ...curRows.map((r) => ({ ...r, storeId: 'S2', sales: r.sales * 2 })),
    ]
    const multiStorePrev = [
      ...prevRows,
      ...prevRows.map((r) => ({ ...r, storeId: 'S2', sales: r.sales * 2 })),
    ]
    const result = computeYoyDaily(multiStore, multiStorePrev)

    for (let i = 1; i < result.length; i++) {
      if (result[i].storeId === result[i - 1].storeId) {
        const curKey = result[i].curDateKey ?? result[i].prevDateKey ?? ''
        const prevKey = result[i - 1].curDateKey ?? result[i - 1].prevDateKey ?? ''
        expect(curKey >= prevKey).toBe(true)
      } else {
        expect(result[i].storeId > result[i - 1].storeId).toBe(true)
      }
    }
  })

  it('空配列同士を渡すと空配列を返す', () => {
    expect(computeYoyDaily([], [])).toEqual([])
  })
})

// ─── computeHourlyProfile ─────────────────────────────

describe('computeHourlyProfile', () => {
  const storeHourData = [
    { storeId: 'S1', hour: 9, amount: 100 },
    { storeId: 'S1', hour: 10, amount: 200 },
    { storeId: 'S1', hour: 11, amount: 300 },
    { storeId: 'S1', hour: 12, amount: 400 },
  ]

  it('時間帯別の share を正しく計算する', () => {
    const result = computeHourlyProfile(storeHourData)
    expect(result).toHaveLength(4)

    const total = 100 + 200 + 300 + 400 // 1000
    const h9 = result.find((r) => r.hour === 9)!
    expect(h9.totalAmount).toBe(100)
    expect(h9.hourShare).toBeCloseTo(100 / total)

    const h12 = result.find((r) => r.hour === 12)!
    expect(h12.totalAmount).toBe(400)
    expect(h12.hourShare).toBeCloseTo(400 / total)
  })

  it('amount 降順で RANK を付与する（同値同順位）', () => {
    const result = computeHourlyProfile(storeHourData)

    const h12 = result.find((r) => r.hour === 12)!
    expect(h12.hourRank).toBe(1) // 400 = 最大

    const h9 = result.find((r) => r.hour === 9)!
    expect(h9.hourRank).toBe(4) // 100 = 最小
  })

  it('同値の amount に対して同順位を付与する', () => {
    const tiedData = [
      { storeId: 'S1', hour: 9, amount: 200 },
      { storeId: 'S1', hour: 10, amount: 200 },
      { storeId: 'S1', hour: 11, amount: 100 },
    ]
    const result = computeHourlyProfile(tiedData)

    const h9 = result.find((r) => r.hour === 9)!
    const h10 = result.find((r) => r.hour === 10)!
    const h11 = result.find((r) => r.hour === 11)!
    expect(h9.hourRank).toBe(1)
    expect(h10.hourRank).toBe(1) // 同値なので同順位
    expect(h11.hourRank).toBe(3) // 次は3位（RANK方式）
  })

  it('複数店舗のデータを店舗別に処理する', () => {
    const multiStore = [
      ...storeHourData,
      { storeId: 'S2', hour: 9, amount: 500 },
      { storeId: 'S2', hour: 10, amount: 300 },
    ]
    const result = computeHourlyProfile(multiStore)

    const s1 = result.filter((r) => r.storeId === 'S1')
    const s2 = result.filter((r) => r.storeId === 'S2')
    expect(s1).toHaveLength(4)
    expect(s2).toHaveLength(2)

    // S2 の share は S2 合計 (800) に対して計算
    const s2h9 = s2.find((r) => r.hour === 9)!
    expect(s2h9.hourShare).toBeCloseTo(500 / 800)
  })

  it('結果が storeId → hour 順にソートされる', () => {
    const multiStore = [
      ...storeHourData,
      { storeId: 'S2', hour: 10, amount: 300 },
      { storeId: 'S2', hour: 9, amount: 500 },
    ]
    const result = computeHourlyProfile(multiStore)

    for (let i = 1; i < result.length; i++) {
      if (result[i].storeId === result[i - 1].storeId) {
        expect(result[i].hour).toBeGreaterThanOrEqual(result[i - 1].hour)
      } else {
        expect(result[i].storeId > result[i - 1].storeId).toBe(true)
      }
    }
  })

  it('同一 store×hour のレコードが複数ある場合は合算する', () => {
    const dupData = [
      { storeId: 'S1', hour: 9, amount: 100 },
      { storeId: 'S1', hour: 9, amount: 50 },
      { storeId: 'S1', hour: 10, amount: 200 },
    ]
    const result = computeHourlyProfile(dupData)

    const h9 = result.find((r) => r.hour === 9)!
    expect(h9.totalAmount).toBe(150) // 100+50
  })

  it('空配列を渡すと空配列を返す', () => {
    expect(computeHourlyProfile([])).toEqual([])
  })
})
