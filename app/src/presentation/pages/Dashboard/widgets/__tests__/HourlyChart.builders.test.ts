/**
 * HourlyChart.builders.ts pure function test
 *
 * 検証対象:
 * - buildHourlyDataSets: 当年/前年 hourly + 全時間集約
 * - buildPaddedDataSets: allHours でゼロ埋め
 * - buildWeatherHourlyMap: 空 → null / hour→record Map
 * - buildHourlySummaryStats: maxAmt / totalQty / peakHour 算出
 * - formatSelectedHoursLabel: 1〜3 件 ・区切り / 4 件以上 範囲表記
 */
import { describe, it, expect } from 'vitest'
import {
  buildHourlyDataSets,
  buildPaddedDataSets,
  buildWeatherHourlyMap,
  buildHourlySummaryStats,
  formatSelectedHoursLabel,
} from '../HourlyChart.builders'
import type { HourlyWeatherRecord } from '@/domain/models/record'
import type { TimeSlotSeries } from '@/application/hooks/timeSlot/TimeSlotBundle.types'

/**
 * 1 hour = 1 entry で amount / quantity を持つ TimeSlotSeries を作る。
 * buildHourlyDataSets が bundle から amount/quantity を横断集計する意味を test する。
 */
function makeSeries(
  ...slots: { hour: number; amount: number; quantity: number }[]
): TimeSlotSeries {
  const byHour: (number | null)[] = new Array(24).fill(null)
  const byHourQuantity: (number | null)[] = new Array(24).fill(null)
  let total = 0
  let totalQuantity = 0
  for (const s of slots) {
    byHour[s.hour] = s.amount
    byHourQuantity[s.hour] = s.quantity
    total += s.amount
    totalQuantity += s.quantity
  }
  return {
    entries: [{ storeId: 'S1', byHour, byHourQuantity, total, totalQuantity }],
    grandTotal: total,
    grandTotalQuantity: totalQuantity,
    dayCount: 1,
  }
}

// ─── buildHourlyDataSets ────────────────────

describe('buildHourlyDataSets', () => {
  it('null / 空 series → 空 dataSets', () => {
    const result = buildHourlyDataSets(null, null)
    expect(result.actualData).toEqual([])
    expect(result.prevData).toEqual([])
    expect(result.allHours).toEqual([])
  })

  it('allHours は両 series の hour を和集合 + 昇順', () => {
    const cur = makeSeries({ hour: 10, amount: 100, quantity: 10 })
    const prev = makeSeries({ hour: 16, amount: 80, quantity: 8 })
    const result = buildHourlyDataSets(cur, prev)
    // seriesToHourlyData は min〜max でゼロ埋めするので allHours = {10} ∪ {16} = [10, 16]
    expect([...result.allHours].sort((a, b) => a - b)).toEqual([10, 16])
  })

  it('actualData / prevData は series の byHour / byHourQuantity を横断集計する', () => {
    const cur = makeSeries({ hour: 9, amount: 100, quantity: 5 })
    const prev = makeSeries({ hour: 9, amount: 90, quantity: 4 })
    const result = buildHourlyDataSets(cur, prev)
    expect(result.actualData).toEqual([{ hour: 9, amount: 100, quantity: 5 }])
    expect(result.prevData).toEqual([{ hour: 9, amount: 90, quantity: 4 }])
  })
})

// ─── buildPaddedDataSets ────────────────────

describe('buildPaddedDataSets', () => {
  it('allHours のサイズに一致', () => {
    const data = [{ hour: 10, amount: 100, quantity: 10 }]
    const ref = [{ hour: 14, amount: 50, quantity: 5 }]
    const allHours = [10, 12, 14]
    const result = buildPaddedDataSets(data, ref, allHours)
    expect(result.paddedData).toHaveLength(3)
    expect(result.paddedRef).toHaveLength(3)
  })

  it('ない時間は hour=h の zero 埋め', () => {
    const data = [{ hour: 10, amount: 100, quantity: 10 }]
    const result = buildPaddedDataSets(data, [], [10, 11])
    expect(result.paddedData[1]).toEqual({ hour: 11, amount: 0, quantity: 0 })
  })

  it('map で既存値を優先', () => {
    const data = [{ hour: 10, amount: 100, quantity: 10 }]
    const result = buildPaddedDataSets(data, [], [10])
    expect(result.paddedData[0].amount).toBe(100)
  })
})

// ─── buildWeatherHourlyMap ──────────────────

describe('buildWeatherHourlyMap', () => {
  function makeWeather(hour: number): HourlyWeatherRecord {
    return { hour, temperature: 20 } as unknown as HourlyWeatherRecord
  }

  it('undefined / 空 → null', () => {
    expect(buildWeatherHourlyMap(undefined)).toBeNull()
    expect(buildWeatherHourlyMap([])).toBeNull()
  })

  it('hour → record Map を構築', () => {
    const weather = [makeWeather(10), makeWeather(14)]
    const result = buildWeatherHourlyMap(weather)
    expect(result?.size).toBe(2)
    expect(result?.get(10)).toBe(weather[0])
    expect(result?.get(14)).toBe(weather[1])
  })
})

// ─── buildHourlySummaryStats ────────────────

describe('buildHourlySummaryStats', () => {
  it('maxAmt / totalQty / peakHour を計算', () => {
    const padded = [
      { hour: 10, amount: 100, quantity: 10 },
      { hour: 12, amount: 500, quantity: 50 },
      { hour: 14, amount: 200, quantity: 20 },
    ]
    const result = buildHourlySummaryStats(padded)
    expect(result.maxAmt).toBe(500)
    expect(result.totalQty).toBe(80)
    expect(result.peakHour.hour).toBe(12)
  })

  it('全 amount=0 → maxAmt=1 (guard)', () => {
    const padded = [{ hour: 10, amount: 0, quantity: 0 }]
    const result = buildHourlySummaryStats(padded)
    expect(result.maxAmt).toBe(1)
  })

  it('coreTime / turnaroundHour を含む', () => {
    const padded = [
      { hour: 10, amount: 100, quantity: 10 },
      { hour: 11, amount: 200, quantity: 20 },
      { hour: 12, amount: 300, quantity: 30 },
      { hour: 13, amount: 100, quantity: 10 },
    ]
    const result = buildHourlySummaryStats(padded)
    expect(result.coreTime).toBeDefined()
    expect(result.turnaroundHour).toBeDefined()
  })
})

// ─── formatSelectedHoursLabel ───────────────

describe('formatSelectedHoursLabel', () => {
  it('空 → 空文字列', () => {
    expect(formatSelectedHoursLabel(new Set())).toBe('')
  })

  it('1 件: "10時"', () => {
    expect(formatSelectedHoursLabel(new Set([10]))).toBe('10時')
  })

  it('3 件以下: ・区切り, 昇順', () => {
    expect(formatSelectedHoursLabel(new Set([14, 10, 12]))).toBe('10時・12時・14時')
  })

  it('4 件以上: 範囲表記', () => {
    expect(formatSelectedHoursLabel(new Set([10, 11, 12, 13]))).toBe('10時〜13時 (4時間)')
  })

  it('5 件: 範囲', () => {
    expect(formatSelectedHoursLabel(new Set([9, 10, 11, 12, 13]))).toBe('9時〜13時 (5時間)')
  })
})
