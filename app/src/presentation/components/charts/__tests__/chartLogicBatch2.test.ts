/**
 * Second chart logic batch — pure function tests
 *
 * 対象:
 * - FeatureChartLogic: buildFeatureChartData (anomaly 検出)
 * - DowPatternChartLogic: buildDowPatternData (曜日集計 + CV)
 */
import { describe, it, expect } from 'vitest'
import { buildFeatureChartData, Z_SCORE_THRESHOLD } from '../FeatureChartLogic'
import { buildDowPatternData, DOW_LABELS } from '../DowPatternChartLogic'
import type { DailyFeatureRow, DowPatternRow } from '@/application/hooks/duckdb'

// ─── FeatureChartLogic ────────────────────

describe('buildFeatureChartData', () => {
  function makeRow(
    dateKey: string,
    sales: number,
    overrides: Partial<DailyFeatureRow> = {},
  ): DailyFeatureRow {
    return {
      dateKey,
      sales,
      salesMa3: null,
      salesMa7: null,
      salesMa28: null,
      zScore: null,
      ...overrides,
    } as unknown as DailyFeatureRow
  }

  it('空入力 → 空 chartData + 空 anomalies', () => {
    const result = buildFeatureChartData([])
    expect(result.chartData).toEqual([])
    expect(result.anomalies).toEqual([])
  })

  it('日別集計 + date=MM-DD', () => {
    const rows = [makeRow('2026-04-01', 1000)]
    const result = buildFeatureChartData(rows)
    expect(result.chartData[0].date).toBe('04-01')
    expect(result.chartData[0].sales).toBe(1000)
  })

  it('同日を合算', () => {
    const rows = [makeRow('2026-04-01', 500), makeRow('2026-04-01', 300)]
    const result = buildFeatureChartData(rows)
    expect(result.chartData).toHaveLength(1)
    expect(result.chartData[0].sales).toBe(800)
  })

  it('zScore は店舗平均 (count 個で割る)', () => {
    const rows = [
      makeRow('2026-04-01', 100, { zScore: 1.0 }),
      makeRow('2026-04-01', 200, { zScore: 3.0 }),
    ]
    const result = buildFeatureChartData(rows)
    // avg z = (1+3)/2 = 2.0
    expect(result.chartData[0].zScore).toBe(2)
  })

  it('|zScore| >= 2.0 で anomaly 検出 (spike)', () => {
    const rows = [makeRow('2026-04-01', 5000, { zScore: 2.5 })]
    const result = buildFeatureChartData(rows)
    expect(result.anomalies).toHaveLength(1)
    expect(result.anomalies[0].type).toBe('spike')
    expect(result.anomalies[0].zScore).toBe(2.5)
  })

  it('|zScore| >= 2.0 & 負: dip', () => {
    const rows = [makeRow('2026-04-01', 100, { zScore: -2.5 })]
    const result = buildFeatureChartData(rows)
    expect(result.anomalies[0].type).toBe('dip')
  })

  it('|zScore| < 2.0 は anomaly 扱いにならない', () => {
    const rows = [makeRow('2026-04-01', 1000, { zScore: 1.5 })]
    const result = buildFeatureChartData(rows)
    expect(result.anomalies).toEqual([])
  })

  it('Z_SCORE_THRESHOLD は 2.0', () => {
    expect(Z_SCORE_THRESHOLD).toBe(2.0)
  })

  it('ma3/ma7/ma28: 0 以下は null', () => {
    const rows = [makeRow('2026-04-01', 1000, { salesMa3: 0, salesMa7: null, salesMa28: 500 })]
    const result = buildFeatureChartData(rows)
    expect(result.chartData[0].ma3).toBeNull()
    expect(result.chartData[0].ma7).toBeNull()
    expect(result.chartData[0].ma28).toBe(500)
  })

  it('dateKey 昇順ソート', () => {
    const rows = [
      makeRow('2026-04-03', 300),
      makeRow('2026-04-01', 100),
      makeRow('2026-04-02', 200),
    ]
    const result = buildFeatureChartData(rows)
    expect(result.chartData.map((p) => p.date)).toEqual(['04-01', '04-02', '04-03'])
  })
})

// ─── DowPatternChartLogic ────────────────

describe('buildDowPatternData', () => {
  function makeRow(dow: number, avgSales: number): DowPatternRow {
    return { dow, avgSales } as unknown as DowPatternRow
  }

  it('空配列 → 空 chartData + overallAvg=0 / cv=0', () => {
    const result = buildDowPatternData([])
    expect(result.chartData).toEqual([])
    expect(result.overallAvg).toBe(0)
  })

  it('7 曜日分の集計', () => {
    const rows = [
      makeRow(0, 100),
      makeRow(1, 200),
      makeRow(2, 300),
      makeRow(3, 400),
      makeRow(4, 500),
      makeRow(5, 600),
      makeRow(6, 700),
    ]
    const result = buildDowPatternData(rows)
    expect(result.chartData).toHaveLength(7)
    expect(result.chartData[0].label).toBe(DOW_LABELS[0])
    expect(result.chartData[6].label).toBe(DOW_LABELS[6])
  })

  it('同曜日を合算', () => {
    const rows = [makeRow(0, 100), makeRow(0, 200)]
    const result = buildDowPatternData(rows)
    expect(result.chartData[0].avgSales).toBe(300)
  })

  it('strongest / weakest を検出', () => {
    const rows = [makeRow(0, 100), makeRow(5, 1000), makeRow(2, 50)]
    const result = buildDowPatternData(rows)
    expect(result.strongestDow).toBe(DOW_LABELS[5])
    expect(result.weakestDow).toBe(DOW_LABELS[2])
  })

  it('overallAvg は全曜日平均', () => {
    const rows = [makeRow(0, 100), makeRow(1, 200), makeRow(2, 300)]
    const result = buildDowPatternData(rows)
    expect(result.overallAvg).toBe(200)
  })

  it('CV: 一定値 → 0', () => {
    const rows = [makeRow(0, 100), makeRow(1, 100), makeRow(2, 100)]
    const result = buildDowPatternData(rows)
    expect(result.cv).toBe(0)
  })

  it('存在しない曜日は chartData に含めない', () => {
    const rows = [makeRow(1, 100), makeRow(3, 200)]
    const result = buildDowPatternData(rows)
    expect(result.chartData).toHaveLength(2)
    expect(result.chartData.map((p) => p.dow).sort()).toEqual([1, 3])
  })
})
