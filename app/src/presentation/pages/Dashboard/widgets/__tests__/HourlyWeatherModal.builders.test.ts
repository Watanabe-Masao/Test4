/**
 * HourlyWeatherModal.builders.ts — pure ECharts option builder test
 *
 * 検証対象 branch:
 * - rightMetric='precipitation' / 'sunshine' / 'humidity' の label / value 取得
 * - hasRecords=true: 当年右軸 + 当年気温を含む
 * - hasPrev=true: 前年気温 + 前年右軸を含む
 * - isForecastMode=true: 線種 solid、"前年実績" label
 * - chartData からの hours 抽出 / series.length 派生
 */
import { describe, it, expect } from 'vitest'
import { buildHourlyWeatherOption } from '../HourlyWeatherModal.builders'
import type { ChartPoint } from '../HourlyWeatherModal.builders'
import { darkTheme } from '@/presentation/theme/theme'

const theme = darkTheme

function makePoint(hour: string, overrides: Partial<ChartPoint> = {}): ChartPoint {
  return {
    hour,
    temperature: 15,
    precipitation: 0,
    sunshine: 30,
    humidity: 60,
    prevTemperature: 14,
    prevPrecipitation: 0,
    prevSunshine: 25,
    prevHumidity: 65,
    ...overrides,
  }
}

describe('buildHourlyWeatherOption — 基本構築', () => {
  it('hours を xAxis.data に入れる', () => {
    const chartData = [makePoint('9'), makePoint('10'), makePoint('11')]
    const option = buildHourlyWeatherOption({
      chartData,
      hasRecords: true,
      hasPrev: false,
      isForecastMode: false,
      rightMetric: 'precipitation',
      theme,
    })
    const xAxis = option.xAxis as { data: string[] }
    expect(xAxis.data).toEqual(['9', '10', '11'])
  })

  it('yAxis を 2 本 (左: °C / 右: metric 単位) 設定', () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9')],
      hasRecords: true,
      hasPrev: false,
      isForecastMode: false,
      rightMetric: 'precipitation',
      theme,
    })
    const yAxis = option.yAxis as { name: string }[]
    expect(yAxis.length).toBe(2)
    expect(yAxis[0].name).toBe('°C')
    expect(yAxis[1].name).toBe('mm')
  })
})

describe('buildHourlyWeatherOption — hasRecords', () => {
  it('hasRecords=true: 気温 + 右軸 series を含む (2 series)', () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9')],
      hasRecords: true,
      hasPrev: false,
      isForecastMode: false,
      rightMetric: 'precipitation',
      theme,
    })
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('気温')
    expect(names).toContain('降水量(mm)')
    expect(series.length).toBe(2)
  })

  it('hasRecords=false: 当年系列なし (0 series)', () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9')],
      hasRecords: false,
      hasPrev: false,
      isForecastMode: false,
      rightMetric: 'precipitation',
      theme,
    })
    const series = option.series as unknown[]
    expect(series.length).toBe(0)
  })
})

describe('buildHourlyWeatherOption — hasPrev / isForecastMode', () => {
  it('hasPrev=true: 前年気温 + 前年右軸を追加 (4 series 合計)', () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9')],
      hasRecords: true,
      hasPrev: true,
      isForecastMode: false,
      rightMetric: 'precipitation',
      theme,
    })
    const series = option.series as { name: string }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('前年気温')
    expect(names).toContain('前年降水量(mm)')
    expect(series.length).toBe(4)
  })

  it('isForecastMode=true: label が "前年実績気温" に変わる', () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9')],
      hasRecords: true,
      hasPrev: false,
      isForecastMode: true,
      rightMetric: 'precipitation',
      theme,
    })
    const series = option.series as { name: string; lineStyle?: { type: string } }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('前年実績気温')
    expect(names).toContain('前年実績降水量(mm)')
  })

  it('isForecastMode=true: 前年気温 line は solid', () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9')],
      hasRecords: false,
      hasPrev: false,
      isForecastMode: true,
      rightMetric: 'precipitation',
      theme,
    })
    const series = option.series as { name: string; lineStyle?: { type: string } }[]
    const prevTemp = series.find((s) => s.name === '前年実績気温')
    expect(prevTemp?.lineStyle?.type).toBe('solid')
  })

  it('isForecastMode=false + hasPrev=true: 前年気温 line は dashed', () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9')],
      hasRecords: false,
      hasPrev: true,
      isForecastMode: false,
      rightMetric: 'precipitation',
      theme,
    })
    const series = option.series as { name: string; lineStyle?: { type: string } }[]
    const prevTemp = series.find((s) => s.name === '前年気温')
    expect(prevTemp?.lineStyle?.type).toBe('dashed')
  })
})

describe('buildHourlyWeatherOption — rightMetric 分岐', () => {
  it("rightMetric='sunshine': label=日照(分) / yAxis=分", () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9')],
      hasRecords: true,
      hasPrev: false,
      isForecastMode: false,
      rightMetric: 'sunshine',
      theme,
    })
    const yAxis = option.yAxis as { name: string }[]
    expect(yAxis[1].name).toBe('分')
    const series = option.series as { name: string; data: (number | null)[] }[]
    const names = series.map((s) => s.name)
    expect(names).toContain('日照(分)')
    // data は sunshine 値
    const sunshineSeries = series.find((s) => s.name === '日照(分)')
    expect(sunshineSeries?.data).toEqual([30])
  })

  it("rightMetric='humidity': label=湿度(%) / yAxis=%", () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9')],
      hasRecords: true,
      hasPrev: false,
      isForecastMode: false,
      rightMetric: 'humidity',
      theme,
    })
    const yAxis = option.yAxis as { name: string }[]
    expect(yAxis[1].name).toBe('%')
    const series = option.series as { name: string; data: (number | null)[] }[]
    const humSeries = series.find((s) => s.name === '湿度(%)')
    expect(humSeries?.data).toEqual([60])
  })

  it("rightMetric='precipitation' (default): data は precipitation 値", () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9', { precipitation: 2.5 })],
      hasRecords: true,
      hasPrev: false,
      isForecastMode: false,
      rightMetric: 'precipitation',
      theme,
    })
    const series = option.series as { name: string; data: (number | null)[] }[]
    const precSeries = series.find((s) => s.name === '降水量(mm)')
    expect(precSeries?.data).toEqual([2.5])
  })

  it('未定義値は null として data に入る', () => {
    const option = buildHourlyWeatherOption({
      chartData: [makePoint('9', { precipitation: undefined })],
      hasRecords: true,
      hasPrev: false,
      isForecastMode: false,
      rightMetric: 'precipitation',
      theme,
    })
    const series = option.series as { name: string; data: (number | null)[] }[]
    const precSeries = series.find((s) => s.name === '降水量(mm)')
    expect(precSeries?.data).toEqual([null])
  })
})
