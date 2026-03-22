/**
 * buildWeatherMap の境界値テスト
 *
 * 同曜日比較（dowOffset > 0）で月跨ぎが発生するケースを検証する。
 */
import { describe, it, expect } from 'vitest'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { buildWeatherMap } from '../DailySalesChartBodyLogic'

/** テスト用 DailyWeatherSummary を生成するヘルパー */
function makeSummary(dateKey: string, code = 1): DailyWeatherSummary {
  return {
    dateKey,
    temperatureAvg: 15,
    temperatureMax: 20,
    temperatureMin: 10,
    precipitationTotal: 0,
    humidityAvg: 60,
    windSpeedMax: 5,
    dominantWeatherCode: code,
    sunshineTotalHours: 8,
  }
}

describe('buildWeatherMap', () => {
  it('offset=0 のとき dateKey の日番号をそのまま使う', () => {
    const data = [makeSummary('2026-02-01'), makeSummary('2026-02-28')]
    const map = buildWeatherMap(data, 0)
    expect(map.has(1)).toBe(true)
    expect(map.has(28)).toBe(true)
  })

  it('offset=0 かつ compStartDateKey なしで日番号をそのまま使う', () => {
    const data = [makeSummary('2025-02-01'), makeSummary('2025-02-28')]
    const map = buildWeatherMap(data, 0, undefined)
    expect(map.get(1)?.temp).toBe(15)
    expect(map.get(28)?.temp).toBe(15)
  })

  describe('月跨ぎ（Feb 2026 vs Feb-Mar 2025, dowOffset=1）', () => {
    // 当年: Feb 2026 (1-28), 前年: Feb 2, 2025 ~ Mar 1, 2025
    const compStartDateKey = '2025-02-02'
    const prevYearData = [
      // Feb 2025 の全日データ
      ...Array.from({ length: 28 }, (_, i) =>
        makeSummary(`2025-02-${String(i + 1).padStart(2, '0')}`),
      ),
      // Mar 1, 2025（オーバーフロー日）
      makeSummary('2025-03-01'),
    ]

    it('チャート位置1に Feb 2 のデータが入る', () => {
      const map = buildWeatherMap(prevYearData, 1, compStartDateKey)
      expect(map.has(1)).toBe(true)
    })

    it('チャート位置27に Feb 28 のデータが入る', () => {
      const map = buildWeatherMap(prevYearData, 1, compStartDateKey)
      expect(map.has(27)).toBe(true)
    })

    it('チャート位置28に Mar 1 のデータが入る（月跨ぎ）', () => {
      const map = buildWeatherMap(prevYearData, 1, compStartDateKey)
      expect(map.has(28)).toBe(true)
    })

    it('Feb 1 は比較期間外のため chartDay < 1 でスキップされる', () => {
      const map = buildWeatherMap(prevYearData, 1, compStartDateKey)
      // Feb 1 → (Feb 1 - Feb 2) / day + 1 = 0 → skipped
      expect(map.has(0)).toBe(false)
    })
  })

  describe('dowOffset=6（最大オフセット）', () => {
    // 当年: 31日ある月, 前年: 7日目～翌月6日目
    const compStartDateKey = '2025-01-07'
    const data = [
      ...Array.from({ length: 25 }, (_, i) =>
        makeSummary(`2025-01-${String(i + 7).padStart(2, '0')}`),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        makeSummary(`2025-02-${String(i + 1).padStart(2, '0')}`),
      ),
    ]

    it('チャート位置1に Jan 7 のデータが入る', () => {
      const map = buildWeatherMap(data, 6, compStartDateKey)
      expect(map.has(1)).toBe(true)
    })

    it('チャート位置31に Feb 6 のデータが入る（月跨ぎ）', () => {
      const map = buildWeatherMap(data, 6, compStartDateKey)
      expect(map.has(31)).toBe(true)
    })
  })

  it('undefined データでは空マップを返す', () => {
    const map = buildWeatherMap(undefined, 1, '2025-02-02')
    expect(map.size).toBe(0)
  })

  it('空配列では空マップを返す', () => {
    const map = buildWeatherMap([], 1, '2025-02-02')
    expect(map.size).toBe(0)
  })

  describe('weatherCode=0（晴天）の取り扱い', () => {
    it('dominantWeatherCode=0 でも sunny アイコンがマッピングされる', () => {
      const data = [makeSummary('2026-03-01', 0)]
      const map = buildWeatherMap(data, 0)
      expect(map.has(1)).toBe(true)
      expect(map.get(1)?.category).toBe('sunny')
      expect(map.get(1)?.icon).toBe('☀')
    })

    it('code=0 と code=1 は同じ sunny カテゴリになる', () => {
      const data = [makeSummary('2026-03-01', 0), makeSummary('2026-03-02', 1)]
      const map = buildWeatherMap(data, 0)
      expect(map.get(1)?.category).toBe('sunny')
      expect(map.get(2)?.category).toBe('sunny')
    })

    it('code=0 のデータが欠損扱いされない（icon が空文字でない）', () => {
      const data = [makeSummary('2026-03-15', 0)]
      const map = buildWeatherMap(data, 0)
      const info = map.get(15)
      expect(info).toBeDefined()
      expect(info?.icon).not.toBe('')
    })
  })
})
