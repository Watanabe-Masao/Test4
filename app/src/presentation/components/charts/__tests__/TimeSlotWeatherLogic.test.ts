/**
 * TimeSlotWeatherLogic.ts — weather display conversion tests
 */
import { describe, it, expect } from 'vitest'
import { toWeatherHourlyDisplayList } from '../TimeSlotWeatherLogic'
import type { HourlyWeatherAvgRow } from '@/application/hooks/duckdb'

function row(hour: number, temp: number, precip: number, code: number | null): HourlyWeatherAvgRow {
  return {
    hour,
    avgTemperature: temp,
    totalPrecipitation: precip,
    weatherCode: code,
  } as unknown as HourlyWeatherAvgRow
}

describe('toWeatherHourlyDisplayList', () => {
  it('returns undefined for null input', () => {
    expect(toWeatherHourlyDisplayList(null)).toBeUndefined()
  })

  it('returns undefined for undefined input', () => {
    expect(toWeatherHourlyDisplayList(undefined)).toBeUndefined()
  })

  it('returns empty array for empty input', () => {
    const out = toWeatherHourlyDisplayList([])
    expect(out).toEqual([])
  })

  it('maps each row to a display entry preserving hour/temp/precip', () => {
    const rows: HourlyWeatherAvgRow[] = [row(8, 15, 0, 0), row(9, 16, 0.5, 61), row(14, 18, 0, 0)]
    const out = toWeatherHourlyDisplayList(rows)
    expect(out).toBeDefined()
    expect(out).toHaveLength(3)
    expect(out?.[0]?.hour).toBe(8)
    expect(out?.[0]?.avgTemperature).toBe(15)
    expect(out?.[0]?.totalPrecipitation).toBe(0)
    expect(out?.[1]?.hour).toBe(9)
    expect(out?.[1]?.totalPrecipitation).toBe(0.5)
  })

  it('produces a non-empty tooltip string for each row', () => {
    const rows: HourlyWeatherAvgRow[] = [row(9, 15, 0, 0), row(14, 18, 0, 0)]
    const out = toWeatherHourlyDisplayList(rows)
    expect(out?.[0]?.tooltip).toContain('9時')
    expect(out?.[1]?.tooltip).toContain('14時')
    // AM and PM summaries should be present
    expect(out?.[0]?.tooltip).toContain('午前')
    expect(out?.[0]?.tooltip).toContain('午後')
  })

  it('handles null weatherCode by producing null icon/label', () => {
    const rows: HourlyWeatherAvgRow[] = [row(10, 20, 0, null)]
    const out = toWeatherHourlyDisplayList(rows)
    expect(out?.[0]?.icon).toBeNull()
    expect(out?.[0]?.label).toBeNull()
  })

  it('propagates AM/PM partition (6-11 / 12-17) in tooltip content', () => {
    const rows: HourlyWeatherAvgRow[] = [row(7, 10, 1.0, 0), row(15, 22, 0, 0)]
    const out = toWeatherHourlyDisplayList(rows)
    // 7時のtooltip includes both AM (午前) and PM (午後)
    const tip = out?.[0]?.tooltip ?? ''
    expect(tip.split('\n').length).toBeGreaterThanOrEqual(2)
  })
})
