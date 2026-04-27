/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  resolvePrecipitationAxisRange,
  roundTemperatureAxis,
  classifyTemperatureBand,
  buildTemperatureBandMarkAreas,
  TEMPERATURE_BANDS,
} from '../TimeSlotChartOptionBuilder'

// ── 降水量軸 ──

describe('resolvePrecipitationAxisRange', () => {
  it('降水量 ≤ 5mm で 0〜5mm 固定、interval=1', () => {
    expect(resolvePrecipitationAxisRange(0)).toEqual({ min: 0, max: 5, interval: 1 })
    expect(resolvePrecipitationAxisRange(0.2)).toEqual({ min: 0, max: 5, interval: 1 })
    expect(resolvePrecipitationAxisRange(1.0)).toEqual({ min: 0, max: 5, interval: 1 })
    expect(resolvePrecipitationAxisRange(5)).toEqual({ min: 0, max: 5, interval: 1 })
  })

  it('5mm < 降水量 ≤ 10mm で 0〜10mm、interval=2', () => {
    expect(resolvePrecipitationAxisRange(5.1)).toEqual({ min: 0, max: 10, interval: 2 })
    expect(resolvePrecipitationAxisRange(8)).toEqual({ min: 0, max: 10, interval: 2 })
    expect(resolvePrecipitationAxisRange(10)).toEqual({ min: 0, max: 10, interval: 2 })
  })

  it('降水量 > 10mm で 0〜20mm、interval=5', () => {
    expect(resolvePrecipitationAxisRange(10.1)).toEqual({ min: 0, max: 20, interval: 5 })
    expect(resolvePrecipitationAxisRange(15)).toEqual({ min: 0, max: 20, interval: 5 })
    expect(resolvePrecipitationAxisRange(100)).toEqual({ min: 0, max: 20, interval: 5 })
  })
})

// ── 気温軸 ──

describe('roundTemperatureAxis', () => {
  it('夏データ（20〜35°C）を 5°C 刻みに丸める', () => {
    const result = roundTemperatureAxis(20, 35)
    expect(result.min).toBe(15) // 20-2=18 → floor(18/5)*5=15
    expect(result.max).toBe(40) // 35+2=37 → ceil(37/5)*5=40
    expect(result.interval).toBe(5)
  })

  it('冬データ（-5〜5°C）で 0°C をまたぐ', () => {
    const result = roundTemperatureAxis(-5, 5)
    expect(result.min).toBeLessThanOrEqual(-5)
    expect(result.max).toBeGreaterThanOrEqual(5)
    expect(result.interval).toBe(5)
    // 0°C を含む
    expect(result.min).toBeLessThanOrEqual(0)
    expect(result.max).toBeGreaterThanOrEqual(0)
  })

  it('0°C 跨ぎで 0 を含める', () => {
    const result = roundTemperatureAxis(-2, 3)
    expect(result.min).toBeLessThanOrEqual(0)
    expect(result.max).toBeGreaterThanOrEqual(0)
  })

  it('全て正の温度範囲', () => {
    const result = roundTemperatureAxis(10, 15)
    // 10-2=8 → floor(8/5)*5=5, 15+2=17 → ceil(17/5)*5=20
    expect(result.min).toBe(5)
    expect(result.max).toBe(20)
    expect(result.interval).toBe(5)
  })

  it('全て負の温度範囲', () => {
    const result = roundTemperatureAxis(-15, -5)
    // -15-2=-17 → floor(-17/5)*5=-20, -5+2=-3 → ceil(-3/5)*5=0
    expect(result.min).toBe(-20)
    expect(result.max).toBe(0)
    expect(result.interval).toBe(5)
  })

  it('狭い温度範囲（1°C差）でも最低 5°C 幅になる', () => {
    const result = roundTemperatureAxis(22, 23)
    expect(result.max - result.min).toBeGreaterThanOrEqual(5)
    expect(result.interval).toBe(5)
  })
})

// ── 温度帯分類 ──

describe('classifyTemperatureBand', () => {
  it('0°C 未満は寒冷', () => {
    expect(classifyTemperatureBand(-5).label).toBe('寒冷')
    expect(classifyTemperatureBand(-0.1).label).toBe('寒冷')
  })

  it('0〜10°C は低温', () => {
    expect(classifyTemperatureBand(0).label).toBe('低温')
    expect(classifyTemperatureBand(5).label).toBe('低温')
    expect(classifyTemperatureBand(9.9).label).toBe('低温')
  })

  it('10〜20°C は涼快', () => {
    expect(classifyTemperatureBand(10).label).toBe('涼快')
    expect(classifyTemperatureBand(15).label).toBe('涼快')
    expect(classifyTemperatureBand(19.9).label).toBe('涼快')
  })

  it('20〜28°C は暖', () => {
    expect(classifyTemperatureBand(20).label).toBe('暖')
    expect(classifyTemperatureBand(25).label).toBe('暖')
    expect(classifyTemperatureBand(27.9).label).toBe('暖')
  })

  it('28°C 以上は高温', () => {
    expect(classifyTemperatureBand(28).label).toBe('高温')
    expect(classifyTemperatureBand(35).label).toBe('高温')
    expect(classifyTemperatureBand(40).label).toBe('高温')
  })
})

// ── 温度帯バンド ──

describe('buildTemperatureBandMarkAreas', () => {
  it('全バンドが隙間なくカバーされる', () => {
    const areas = buildTemperatureBandMarkAreas(-10, 40)
    // 全5バンドが軸レンジに収まる
    expect(areas.length).toBe(5)
  })

  it('軸レンジ外のバンドはクリップされる', () => {
    // 10〜25°C の軸レンジ → 涼快(10-20) + 暖(20-28 → clipped to 25)
    const areas = buildTemperatureBandMarkAreas(10, 25)
    expect(areas.length).toBe(2)
    // 最初の帯: 涼快 10-20
    expect(areas[0][0].yAxis).toBe(10)
    expect(areas[0][1].yAxis).toBe(20)
    // 2番目の帯: 暖 20-25（クリップ）
    expect(areas[1][0].yAxis).toBe(20)
    expect(areas[1][1].yAxis).toBe(25)
  })

  it('空のレンジでは空配列を返す', () => {
    const areas = buildTemperatureBandMarkAreas(5, 5)
    expect(areas.length).toBe(0)
  })

  it('TEMPERATURE_BANDS の境界に欠落がない', () => {
    // 各バンドの max が次のバンドの min と一致する
    for (let i = 0; i < TEMPERATURE_BANDS.length - 1; i++) {
      expect(TEMPERATURE_BANDS[i].max).toBe(TEMPERATURE_BANDS[i + 1].min)
    }
  })
})
