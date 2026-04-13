/**
 * Third chart logic batch — pure function tests
 *
 * 対象:
 * - DeptTrendChartLogic: buildDeptTrendData (クロス集計 + sorted keys)
 * - StoreHourlyChartLogic: cosineSimilarity, findCoreTime, buildStoreHourlyData
 */
import { describe, it, expect } from 'vitest'
import { buildDeptTrendData } from '../DeptTrendChartLogic'
import {
  cosineSimilarity,
  findCoreTime,
  buildStoreHourlyData,
  CORE_THRESHOLD,
} from '../StoreHourlyChartLogic'
import type { DeptKpiMonthlyTrendRow, StoreAggregationRow } from '@/application/hooks/duckdb'

// ─── DeptTrendChartLogic ─────────────────

describe('buildDeptTrendData', () => {
  function makeRow(
    year: number,
    month: number,
    deptCode: string,
    deptName: string,
    gpRateActual: number,
    salesActual: number,
  ): DeptKpiMonthlyTrendRow {
    return {
      year,
      month,
      deptCode,
      deptName,
      gpRateActual,
      salesActual,
    } as unknown as DeptKpiMonthlyTrendRow
  }

  it('空 → 空 chartData + 空 deptNames', () => {
    const result = buildDeptTrendData([], null)
    expect(result.chartData).toEqual([])
    expect(result.deptNames.size).toBe(0)
  })

  it('label = {year}/{month} zero pad', () => {
    const rows = [makeRow(2026, 4, 'd1', 'Dept A', 0.3, 1000)]
    const result = buildDeptTrendData(rows, null)
    expect(result.chartData[0].label).toBe('2026/04')
  })

  it('deptNames Map を構築', () => {
    const rows = [
      makeRow(2026, 4, 'd1', 'Dept A', 0.3, 1000),
      makeRow(2026, 4, 'd2', 'Dept B', 0.25, 500),
    ]
    const result = buildDeptTrendData(rows, null)
    expect(result.deptNames.get('d1')).toBe('Dept A')
    expect(result.deptNames.get('d2')).toBe('Dept B')
  })

  it('gpRate は 小数2位 percent に変換', () => {
    const rows = [makeRow(2026, 4, 'd1', 'Dept A', 0.3456, 1000)]
    const result = buildDeptTrendData(rows, null)
    expect(result.chartData[0].gpRate_d1).toBe(34.56)
  })

  it('sales は round', () => {
    const rows = [makeRow(2026, 4, 'd1', 'Dept A', 0.3, 999.7)]
    const result = buildDeptTrendData(rows, null)
    expect(result.chartData[0].sales_d1).toBe(1000)
  })

  it('selectedDept: 選択 dept のみ値を設定', () => {
    const rows = [
      makeRow(2026, 4, 'd1', 'Dept A', 0.3, 1000),
      makeRow(2026, 4, 'd2', 'Dept B', 0.25, 500),
    ]
    const result = buildDeptTrendData(rows, 'd1')
    expect(result.chartData[0].gpRate_d1).toBeDefined()
    expect(result.chartData[0].gpRate_d2).toBeUndefined()
  })

  it('label 昇順ソート', () => {
    const rows = [
      makeRow(2026, 4, 'd1', 'Dept A', 0.3, 100),
      makeRow(2026, 2, 'd1', 'Dept A', 0.3, 100),
      makeRow(2026, 3, 'd1', 'Dept A', 0.3, 100),
    ]
    const result = buildDeptTrendData(rows, null)
    expect(result.chartData.map((p) => p.label)).toEqual(['2026/02', '2026/03', '2026/04'])
  })
})

// ─── cosineSimilarity ────────────────────

describe('cosineSimilarity', () => {
  it('同一ベクトル → 1', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5)
  })

  it('直交ベクトル → 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it('ゼロベクトル → 0 (division by zero guard)', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
  })

  it('比例ベクトル → 1', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 5)
  })

  it('逆ベクトル → -1', () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1, 5)
  })
})

// ─── findCoreTime ───────────────────────

describe('findCoreTime', () => {
  it('全て 0 → start=min, end=max, turnover=12', () => {
    const hourMap = new Map<number, number>()
    const result = findCoreTime(hourMap, 8, 22)
    expect(result.start).toBe(8)
    expect(result.end).toBe(22)
    expect(result.turnover).toBe(12)
  })

  it('単一ピーク: start=end=peak', () => {
    const hourMap = new Map([
      [8, 0],
      [10, 1000],
      [14, 0],
    ])
    const result = findCoreTime(hourMap, 8, 22)
    expect(result.start).toBe(10)
    expect(result.end).toBe(10)
  })

  it('コアタイム: 売上 80% を占める時間帯', () => {
    const hourMap = new Map([
      [10, 100],
      [12, 500],
      [14, 400],
    ])
    const result = findCoreTime(hourMap, 8, 22)
    // sorted: [12:500, 14:400, 10:100]; threshold=1000*0.8=800
    // 500 -> 900 >= 800 stop. coreHours = [12,14] sorted = [12,14]
    expect(result.start).toBe(12)
    expect(result.end).toBe(14)
  })

  it('CORE_THRESHOLD は 0.8', () => {
    expect(CORE_THRESHOLD).toBe(0.8)
  })
})

// ─── buildStoreHourlyData ────────────────

describe('buildStoreHourlyData', () => {
  function makeRow(storeId: string, hour: number, amount: number): StoreAggregationRow {
    return { storeId, hour, amount } as unknown as StoreAggregationRow
  }

  it('空 → 空 chartData + 空 storeInfos', () => {
    const result = buildStoreHourlyData([], new Map(), 'amount', 8, 22)
    expect(result.storeInfos).toEqual([])
    expect(result.similarities).toEqual([])
  })

  it('単一店舗: storeInfo 1 つ', () => {
    const rows = [makeRow('s1', 10, 100), makeRow('s1', 12, 500), makeRow('s1', 18, 200)]
    const stores = new Map([['s1', { name: 'Store A' }]])
    const result = buildStoreHourlyData(rows, stores, 'amount', 8, 22)
    expect(result.storeInfos).toHaveLength(1)
    expect(result.storeInfos[0].name).toBe('Store A')
    expect(result.storeInfos[0].peakHour).toBe(12)
    expect(result.storeInfos[0].peakAmount).toBe(500)
    expect(result.storeInfos[0].totalAmount).toBe(800)
  })

  it('2 店舗: pairwise similarity 1 つ', () => {
    const rows = [
      makeRow('s1', 10, 100),
      makeRow('s1', 12, 500),
      makeRow('s2', 10, 200),
      makeRow('s2', 12, 1000),
    ]
    const result = buildStoreHourlyData(rows, new Map(), 'amount', 8, 22)
    expect(result.similarities).toHaveLength(1)
    // 比例ベクトル → 類似度 ≒ 1
    expect(result.similarities[0].similarity).toBeCloseTo(1, 3)
  })

  it("mode='amount': 店舗の時間帯売上 (丸め)", () => {
    const rows = [makeRow('s1', 10, 100.7)]
    const result = buildStoreHourlyData(rows, new Map(), 'amount', 8, 22)
    expect(result.chartData.find((p) => p.hourNum === 10)?.store_s1).toBe(101)
  })

  it("mode='ratio': 時間帯合計に対する percent (小数2位)", () => {
    const rows = [makeRow('s1', 10, 300), makeRow('s2', 10, 100)]
    const result = buildStoreHourlyData(rows, new Map(), 'ratio', 8, 22)
    const point = result.chartData.find((p) => p.hourNum === 10)!
    // 300/400 = 0.75 → 75
    expect(point.store_s1).toBe(75)
    expect(point.store_s2).toBe(25)
  })

  it('hourMin/hourMax 範囲外はスキップ', () => {
    const rows = [
      makeRow('s1', 5, 100), // out
      makeRow('s1', 10, 200), // in
    ]
    const result = buildStoreHourlyData(rows, new Map(), 'amount', 8, 22)
    expect(result.storeInfos[0].totalAmount).toBe(200)
  })

  it('store 名未登録 → storeId をそのまま', () => {
    const rows = [makeRow('unknown', 10, 100)]
    const result = buildStoreHourlyData(rows, new Map(), 'amount', 8, 22)
    expect(result.storeInfos[0].name).toBe('unknown')
  })
})
