/**
 * WeatherTemperatureChart.builders.ts — pure option builder test
 *
 * 検証対象:
 * - buildMarkAreaRanges: 連続/非連続 selected 範囲 → markArea 座標
 * - buildTemperatureChartOption:
 *   - 空 daily → 空 object
 *   - daily + rightMetric (precipitation/sunshine/humidity) 分岐
 *   - prevYearMap null / あり の legend 差分
 *   - xAxis category data / yAxis 2 本
 */
import { describe, it, expect } from 'vitest'
import {
  buildMarkAreaRanges,
  buildTemperatureChartOption,
} from '../WeatherTemperatureChart.builders'
import type { DailyWeatherSummary } from '@/domain/models/record'

const ct = {
  bg2: '#111',
  grid: '#222',
  text: '#fff',
  textMuted: '#aaa',
}

function makeDay(
  dateKey: string,
  overrides: Partial<DailyWeatherSummary> = {},
): DailyWeatherSummary {
  return {
    dateKey,
    temperatureAvg: 15,
    temperatureMax: 20,
    temperatureMin: 10,
    precipitationTotal: 0,
    humidityAvg: 60,
    windSpeedMax: 5,
    dominantWeatherCode: 100,
    sunshineTotalHours: 8,
    ...overrides,
  }
}

// ─── buildMarkAreaRanges ──────────────────────────────

describe('buildMarkAreaRanges', () => {
  it('空 selected Set は空配列', () => {
    const daily = [makeDay('2026-04-01'), makeDay('2026-04-02')]
    const result = buildMarkAreaRanges(daily, new Set())
    expect(result).toEqual([])
  })

  it('単日選択で 1 range (start=end)', () => {
    const daily = [makeDay('2026-04-01'), makeDay('2026-04-02'), makeDay('2026-04-03')]
    const selected = new Set(['2026-04-02'])
    const result = buildMarkAreaRanges(daily, selected)
    expect(result).toHaveLength(1)
    const [start, end] = result[0] as [{ xAxis: number }, { xAxis: number }]
    expect(start.xAxis).toBe(1)
    expect(end.xAxis).toBe(1)
  })

  it('連続 3 日選択で 1 range', () => {
    const daily = [
      makeDay('2026-04-01'),
      makeDay('2026-04-02'),
      makeDay('2026-04-03'),
      makeDay('2026-04-04'),
    ]
    const selected = new Set(['2026-04-02', '2026-04-03', '2026-04-04'])
    const result = buildMarkAreaRanges(daily, selected)
    expect(result).toHaveLength(1)
    const [start, end] = result[0] as [{ xAxis: number }, { xAxis: number }]
    expect(start.xAxis).toBe(1)
    expect(end.xAxis).toBe(3)
  })

  it('非連続 2 range', () => {
    const daily = [
      makeDay('2026-04-01'),
      makeDay('2026-04-02'),
      makeDay('2026-04-03'),
      makeDay('2026-04-04'),
    ]
    const selected = new Set(['2026-04-01', '2026-04-03'])
    const result = buildMarkAreaRanges(daily, selected)
    expect(result).toHaveLength(2)
  })

  it('選択範囲が末尾まで続く場合も終了処理される', () => {
    const daily = [makeDay('2026-04-01'), makeDay('2026-04-02'), makeDay('2026-04-03')]
    const selected = new Set(['2026-04-02', '2026-04-03'])
    const result = buildMarkAreaRanges(daily, selected)
    expect(result).toHaveLength(1)
    const [, end] = result[0] as [{ xAxis: number }, { xAxis: number }]
    expect(end.xAxis).toBe(2) // 最終 index
  })
})

// ─── buildTemperatureChartOption ──────────────────────

describe('buildTemperatureChartOption — 基本', () => {
  it('空 daily は空 object を返す', () => {
    const option = buildTemperatureChartOption({
      daily: [],
      prevYearMap: null,
      selectedDays: new Set(),
      rightMetric: 'precipitation',
      ct,
    })
    expect(option).toEqual({})
  })

  it('1 day daily で option を構築 (xAxis / yAxis 設定)', () => {
    const option = buildTemperatureChartOption({
      daily: [makeDay('2026-04-01')],
      prevYearMap: null,
      selectedDays: new Set(),
      rightMetric: 'precipitation',
      ct,
    })
    const xAxis = option.xAxis as { type: string; data: string[] }
    expect(xAxis.type).toBe('category')
    expect(xAxis.data).toHaveLength(1)
    // yAxis 2 本 (左: 気温 / 右: 降水量)
    const yAxis = option.yAxis as unknown[]
    expect(Array.isArray(yAxis)).toBe(true)
    expect(yAxis.length).toBe(2)
  })

  it('legend に 最高/平均/最低/降水量 が含まれる (prev なし)', () => {
    const option = buildTemperatureChartOption({
      daily: [makeDay('2026-04-01')],
      prevYearMap: null,
      selectedDays: new Set(),
      rightMetric: 'precipitation',
      ct,
    })
    const legend = option.legend as { data: string[] }
    expect(legend.data).toContain('最高気温')
    expect(legend.data).toContain('平均気温')
    expect(legend.data).toContain('最低気温')
    expect(legend.data).toContain('降水量')
    // prev なしなら prev 系は含まれない
    expect(legend.data).not.toContain('前年最高')
  })

  it('prevYearMap ありで legend に 前年系列を追加', () => {
    const prevMap = new Map<number, DailyWeatherSummary>([[1, makeDay('2025-04-01')]])
    const option = buildTemperatureChartOption({
      daily: [makeDay('2026-04-01')],
      prevYearMap: prevMap,
      selectedDays: new Set(),
      rightMetric: 'precipitation',
      ct,
    })
    const legend = option.legend as { data: string[] }
    expect(legend.data).toContain('前年最高')
    expect(legend.data).toContain('前年平均')
    expect(legend.data).toContain('前年最低')
    expect(legend.data).toContain('前年降水量')
  })
})

describe('buildTemperatureChartOption — rightMetric 分岐', () => {
  const daily = [
    makeDay('2026-04-01', { precipitationTotal: 10, sunshineTotalHours: 5, humidityAvg: 70 }),
  ]

  it("rightMetric='precipitation': legend に 降水量", () => {
    const option = buildTemperatureChartOption({
      daily,
      prevYearMap: null,
      selectedDays: new Set(),
      rightMetric: 'precipitation',
      ct,
    })
    const legend = option.legend as { data: string[] }
    expect(legend.data).toContain('降水量')
  })

  it("rightMetric='sunshine': legend に 日照時間", () => {
    const option = buildTemperatureChartOption({
      daily,
      prevYearMap: null,
      selectedDays: new Set(),
      rightMetric: 'sunshine',
      ct,
    })
    const legend = option.legend as { data: string[] }
    expect(legend.data).toContain('日照時間')
  })

  it("rightMetric='humidity': legend に 湿度 (max は 100 固定)", () => {
    const option = buildTemperatureChartOption({
      daily,
      prevYearMap: null,
      selectedDays: new Set(),
      rightMetric: 'humidity',
      ct,
    })
    const legend = option.legend as { data: string[] }
    expect(legend.data).toContain('湿度')
  })
})

describe('buildTemperatureChartOption — selectedDays (markArea)', () => {
  it('selectedDays から markArea が series に注入される', () => {
    const daily = [
      makeDay('2026-04-01'),
      makeDay('2026-04-02'),
      makeDay('2026-04-03'),
    ]
    const option = buildTemperatureChartOption({
      daily,
      prevYearMap: null,
      selectedDays: new Set(['2026-04-02']),
      rightMetric: 'precipitation',
      ct,
    })
    // 単日選択 → markArea data を持つ series が存在する
    const series = option.series as { markArea?: { data: unknown[] } }[]
    const hasMarkArea = series.some((s) => s.markArea && s.markArea.data.length > 0)
    expect(hasMarkArea).toBe(true)
  })
})
