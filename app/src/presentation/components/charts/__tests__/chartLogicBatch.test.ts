/**
 * Multiple chart logic files — pure function batch test
 *
 * 対象:
 * - CumulativeChartLogic: buildCumulativeChartData, computeCumulativeSummary
 * - YoYChartLogic: buildYoYChartData, buildYoYWaterfallData, computeYoYSummary
 */
import { describe, it, expect } from 'vitest'
import { buildCumulativeChartData, computeCumulativeSummary } from '../CumulativeChartLogic'
import { buildYoYChartData, buildYoYWaterfallData, computeYoYSummary } from '../YoYChartLogic'
import type { DailyCumulativeRow, YoyDailyRow } from '@/application/hooks/duckdb'

// ─── CumulativeChartLogic ────────────────────

describe('buildCumulativeChartData', () => {
  function makeRow(dateKey: string, daily: number, cumulative: number): DailyCumulativeRow {
    return {
      dateKey,
      dailySales: daily,
      cumulativeSales: cumulative,
    } as unknown as DailyCumulativeRow
  }

  it('空配列 → 空配列', () => {
    expect(buildCumulativeChartData([])).toEqual([])
  })

  it('dateKey → MM-DD, 丸め', () => {
    const result = buildCumulativeChartData([makeRow('2026-04-15', 1000.7, 5000.3)])
    expect(result[0].date).toBe('04-15')
    expect(result[0].daily).toBe(1001)
    expect(result[0].cumulative).toBe(5000)
  })
})

describe('computeCumulativeSummary', () => {
  it('空 → dayCount=0 / totalSales=0', () => {
    const result = computeCumulativeSummary([])
    expect(result.dayCount).toBe(0)
    expect(result.totalSales).toBe(0)
    expect(result.avgDaily).toBe(0)
  })

  it('totalSales は最後の cumulative', () => {
    const data = [
      { date: '04-01', daily: 100, cumulative: 100 },
      { date: '04-02', daily: 200, cumulative: 300 },
    ]
    const result = computeCumulativeSummary(data)
    expect(result.totalSales).toBe(300)
    expect(result.dayCount).toBe(2)
    expect(result.avgDaily).toBe(150)
  })
})

// ─── YoYChartLogic ──────────────────────────

describe('buildYoYChartData', () => {
  function makeRow(curDateKey: string, curSales: number, prevSales: number | null): YoyDailyRow {
    return { curDateKey, curSales, prevSales } as unknown as YoyDailyRow
  }

  it('curDateKey 無しの行はスキップ', () => {
    const rows = [{ curDateKey: null, curSales: 100, prevSales: 50 } as unknown as YoyDailyRow]
    expect(buildYoYChartData(rows)).toEqual([])
  })

  it('日別で集約 + date=MM-DD', () => {
    const rows = [makeRow('2026-04-01', 1000, 800)]
    const result = buildYoYChartData(rows)
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('04-01')
    expect(result[0].curSales).toBe(1000)
    expect(result[0].prevSales).toBe(800)
    expect(result[0].diff).toBe(200)
  })

  it('同日の行を合算', () => {
    const rows = [makeRow('2026-04-01', 500, 300), makeRow('2026-04-01', 500, 200)]
    const result = buildYoYChartData(rows)
    expect(result[0].curSales).toBe(1000)
    expect(result[0].prevSales).toBe(500)
  })

  it('prevSales=null → prevSales=null (hasPrev=false)', () => {
    const rows = [makeRow('2026-04-01', 1000, null)]
    const result = buildYoYChartData(rows)
    expect(result[0].prevSales).toBeNull()
  })

  it('dateKey 昇順ソート', () => {
    const rows = [makeRow('2026-04-03', 300, 200), makeRow('2026-04-01', 100, 80)]
    const result = buildYoYChartData(rows)
    expect(result.map((r) => r.date)).toEqual(['04-01', '04-03'])
  })
})

describe('buildYoYWaterfallData', () => {
  it('先頭に 前年計 / 末尾に 当年計 を置く', () => {
    const data = [
      { date: '04-01', curSales: 100, prevSales: 80, diff: 20 },
      { date: '04-02', curSales: 150, prevSales: 100, diff: 50 },
    ]
    const result = buildYoYWaterfallData(data)
    expect(result[0]).toMatchObject({ name: '前年計', value: 180, isTotal: true })
    expect(result[result.length - 1]).toMatchObject({
      name: '当年計',
      value: 250,
      isTotal: true,
    })
  })

  it('各日の diff に base + bar を設定', () => {
    const data = [{ date: '04-01', curSales: 100, prevSales: 80, diff: 20 }]
    const result = buildYoYWaterfallData(data)
    const day = result[1]
    expect(day.name).toBe('04-01')
    expect(day.value).toBe(20)
    expect(day.bar).toBe(20)
  })

  it('負の diff: base = running + diff', () => {
    const data = [{ date: '04-01', curSales: 80, prevSales: 100, diff: -20 }]
    const result = buildYoYWaterfallData(data)
    const day = result[1]
    // running = 100, diff = -20
    // base = running + diff = 80
    expect(day.base).toBe(80)
    expect(day.bar).toBe(20) // abs(-20)
  })

  it('prevSales=null は 0 として扱う', () => {
    const data = [{ date: '04-01', curSales: 100, prevSales: null, diff: 100 }]
    const result = buildYoYWaterfallData(data)
    expect(result[0].value).toBe(0) // totalPrev
  })
})

describe('computeYoYSummary', () => {
  it('空 → totalCur=0, growthRate=null', () => {
    const result = computeYoYSummary([])
    expect(result.totalCur).toBe(0)
    expect(result.totalPrev).toBe(0)
    expect(result.totalDiff).toBe(0)
    expect(result.growthRate).toBeNull()
  })

  it('各合計 + growthRate を計算', () => {
    const data = [
      { date: '04-01', curSales: 120, prevSales: 100, diff: 20 },
      { date: '04-02', curSales: 150, prevSales: 100, diff: 50 },
    ]
    const result = computeYoYSummary(data)
    expect(result.totalCur).toBe(270)
    expect(result.totalPrev).toBe(200)
    expect(result.totalDiff).toBe(70)
    expect(result.growthRate).toBeCloseTo(0.35, 3)
  })

  it('prevTotal=0 → growthRate=null', () => {
    const data = [{ date: '04-01', curSales: 100, prevSales: null, diff: 100 }]
    const result = computeYoYSummary(data)
    expect(result.growthRate).toBeNull()
  })
})
