/**
 * weatherSummary.ts — pure weather computation test
 *
 * 検証対象:
 * - computeMonthSummary: 空 → null / 平均値 / 最大最小 / 天気カテゴリ集計
 * - computeDaySummary: 単日の各フィールド / カテゴリ判定
 * - filterPrevYearForComparison: sameDate / sameDow の両モード
 */
import { describe, it, expect } from 'vitest'
import {
  computeMonthSummary,
  computeDaySummary,
  filterPrevYearForComparison,
} from '../weatherSummary'
import type { DailyWeatherSummary } from '@/domain/models/record'

function makeDaily(overrides: Partial<DailyWeatherSummary> = {}): DailyWeatherSummary {
  return {
    dateKey: '2026-04-15',
    temperatureAvg: 15,
    temperatureMax: 20,
    temperatureMin: 10,
    precipitationTotal: 0,
    sunshineTotalHours: 8,
    humidityAvg: 60,
    windSpeedMax: 5,
    dominantWeatherCode: 0, // clear
    weatherTextDay: '晴れ',
    weatherTextNight: '晴れ',
    ...overrides,
  } as unknown as DailyWeatherSummary
}

// ─── computeMonthSummary ──────────────────────────

describe('computeMonthSummary', () => {
  it('空配列 → null', () => {
    expect(computeMonthSummary([])).toBeNull()
  })

  it('avgTemp は平均値', () => {
    const daily = [
      makeDaily({ temperatureAvg: 10 }),
      makeDaily({ temperatureAvg: 20 }),
      makeDaily({ temperatureAvg: 30 }),
    ]
    expect(computeMonthSummary(daily)?.avgTemp).toBe(20)
  })

  it('maxTemp / minTemp は全日の最大最小', () => {
    const daily = [
      makeDaily({ temperatureMax: 20, temperatureMin: 5 }),
      makeDaily({ temperatureMax: 30, temperatureMin: -2 }),
      makeDaily({ temperatureMax: 25, temperatureMin: 8 }),
    ]
    const result = computeMonthSummary(daily)
    expect(result?.maxTemp).toBe(30)
    expect(result?.minTemp).toBe(-2)
  })

  it('totalPrecip は合計', () => {
    const daily = [makeDaily({ precipitationTotal: 5 }), makeDaily({ precipitationTotal: 10 })]
    expect(computeMonthSummary(daily)?.totalPrecip).toBe(15)
  })

  it('sunshineHours は合計', () => {
    const daily = [makeDaily({ sunshineTotalHours: 6 }), makeDaily({ sunshineTotalHours: 8 })]
    expect(computeMonthSummary(daily)?.sunshineHours).toBe(14)
  })

  it('avgHumidity は平均', () => {
    const daily = [makeDaily({ humidityAvg: 50 }), makeDaily({ humidityAvg: 70 })]
    expect(computeMonthSummary(daily)?.avgHumidity).toBe(60)
  })

  it('maxWind は最大', () => {
    const daily = [makeDaily({ windSpeedMax: 3 }), makeDaily({ windSpeedMax: 10 })]
    expect(computeMonthSummary(daily)?.maxWind).toBe(10)
  })

  it('totalDays は配列長', () => {
    const daily = [makeDaily(), makeDaily(), makeDaily()]
    expect(computeMonthSummary(daily)?.totalDays).toBe(3)
  })
})

// ─── computeDaySummary ──────────────────────────

describe('computeDaySummary', () => {
  it('単日の各フィールドを伝搬', () => {
    const d = makeDaily({
      temperatureAvg: 18,
      temperatureMax: 22,
      temperatureMin: 12,
      precipitationTotal: 3,
      sunshineTotalHours: 5,
      humidityAvg: 65,
      windSpeedMax: 7,
    })
    const result = computeDaySummary(d)
    expect(result.avgTemp).toBe(18)
    expect(result.maxTemp).toBe(22)
    expect(result.minTemp).toBe(12)
    expect(result.totalPrecip).toBe(3)
    expect(result.sunshineHours).toBe(5)
    expect(result.avgHumidity).toBe(65)
    expect(result.maxWind).toBe(7)
    expect(result.totalDays).toBe(1)
  })

  it('weatherCategory / weatherText を含む', () => {
    const d = makeDaily({ weatherTextDay: '晴れ時々曇り' })
    const result = computeDaySummary(d)
    expect(result.weatherCategory).toBeDefined()
    expect(result.weatherText).toBe('晴れ時々曇り')
  })

  it('weatherTextDay 無しなら weatherTextNight を使う', () => {
    const d = makeDaily({ weatherTextDay: undefined, weatherTextNight: '夜間雨' })
    const result = computeDaySummary(d)
    expect(result.weatherText).toBe('夜間雨')
  })
})

// ─── filterPrevYearForComparison ────────────────

describe('filterPrevYearForComparison', () => {
  it('sameDate: 当年に存在する日番号のみを前年から選択', () => {
    const currentDaily = [
      makeDaily({ dateKey: '2026-04-01' }),
      makeDaily({ dateKey: '2026-04-02' }),
      makeDaily({ dateKey: '2026-04-05' }),
    ]
    const prevYearAll = [
      makeDaily({ dateKey: '2025-04-01' }),
      makeDaily({ dateKey: '2025-04-02' }),
      makeDaily({ dateKey: '2025-04-03' }),
      makeDaily({ dateKey: '2025-04-05' }),
      makeDaily({ dateKey: '2025-04-06' }),
    ]
    const result = filterPrevYearForComparison(currentDaily, prevYearAll, 4, 'sameDate')
    expect(result.map((d) => d.dateKey)).toEqual(['2025-04-01', '2025-04-02', '2025-04-05'])
  })

  it('sameDate: 他月のデータは除外される', () => {
    const currentDaily = [makeDaily({ dateKey: '2026-04-01' })]
    const prevYearAll = [makeDaily({ dateKey: '2025-04-01' }), makeDaily({ dateKey: '2025-05-01' })]
    const result = filterPrevYearForComparison(currentDaily, prevYearAll, 4, 'sameDate')
    expect(result).toHaveLength(1)
    expect(result[0].dateKey).toBe('2025-04-01')
  })

  it('sameDow: 前年から同曜日の日を必要数だけ取得', () => {
    // 2026-04-01 は水曜日
    const currentDaily = [makeDaily({ dateKey: '2026-04-01' })]
    // 2025 年の 4月の水曜日: 4/2, 4/9, 4/16, 4/23, 4/30
    const prevYearAll = [
      makeDaily({ dateKey: '2025-04-02' }), // Wed
      makeDaily({ dateKey: '2025-04-09' }), // Wed
      makeDaily({ dateKey: '2025-04-03' }), // Thu
    ]
    const result = filterPrevYearForComparison(currentDaily, prevYearAll, 4, 'sameDow')
    // 水曜日が 1 必要 → 最初の水曜日 1 件のみ
    expect(result).toHaveLength(1)
    expect(result[0].dateKey).toBe('2025-04-02')
  })

  it('空 currentDaily → sameDate は空を返す (交差なし)', () => {
    const prevYearAll = [makeDaily({ dateKey: '2025-04-01' })]
    const result = filterPrevYearForComparison([], prevYearAll, 4, 'sameDate')
    expect(result).toEqual([])
  })

  it('月番号が 1 桁も zero pad される', () => {
    const currentDaily = [makeDaily({ dateKey: '2026-05-01' })]
    const prevYearAll = [makeDaily({ dateKey: '2025-05-01' }), makeDaily({ dateKey: '2025-04-01' })]
    const result = filterPrevYearForComparison(currentDaily, prevYearAll, 5, 'sameDate')
    expect(result).toHaveLength(1)
    expect(result[0].dateKey).toBe('2025-05-01')
  })
})
