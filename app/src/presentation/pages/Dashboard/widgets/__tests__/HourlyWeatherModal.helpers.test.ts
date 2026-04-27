/**
 * HourlyWeatherModal — buildSummary test
 *
 * 検証対象:
 * - 空入力で null
 * - 最高気温 / 最低気温 / 降水量合計 / 湿度平均の算出
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildSummary } from '../HourlyWeatherModal'

type HourlyWeatherRecord = Parameters<typeof buildSummary>[0][number]

function rec(
  hour: number,
  temperature: number,
  precipitation: number,
  humidity: number,
): HourlyWeatherRecord {
  return { hour, temperature, precipitation, humidity } as HourlyWeatherRecord
}

describe('buildSummary', () => {
  it('空配列で null', () => {
    expect(buildSummary([])).toBeNull()
  })

  it('1 件のレコードでも集計される', () => {
    const r = buildSummary([rec(10, 20, 0, 50)])
    expect(r).toEqual({ maxTemp: 20, minTemp: 20, totalPrecip: 0, avgHumidity: 50 })
  })

  it('maxTemp / minTemp を正しく抽出する', () => {
    const r = buildSummary([rec(10, 15, 0, 50), rec(11, 22, 0, 55), rec(12, 18, 0, 60)])
    expect(r?.maxTemp).toBe(22)
    expect(r?.minTemp).toBe(15)
  })

  it('totalPrecip は和', () => {
    const r = buildSummary([rec(10, 15, 1.5, 50), rec(11, 15, 0, 50), rec(12, 15, 2.5, 50)])
    expect(r?.totalPrecip).toBeCloseTo(4, 10)
  })

  it('avgHumidity は単純平均', () => {
    const r = buildSummary([rec(10, 15, 0, 40), rec(11, 15, 0, 60), rec(12, 15, 0, 80)])
    expect(r?.avgHumidity).toBeCloseTo(60, 10)
  })

  it('負の気温も正しく処理する（下限は負値）', () => {
    const r = buildSummary([rec(5, -3, 0, 70), rec(15, 10, 0, 65)])
    expect(r?.maxTemp).toBe(10)
    expect(r?.minTemp).toBe(-3)
  })
})
