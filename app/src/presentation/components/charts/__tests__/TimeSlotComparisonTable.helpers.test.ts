/**
 * TimeSlotComparisonTable — module-level pure helper tests
 *
 * 検証対象:
 * - buildCols: metric=amount/quantity と hasPrev の組み合わせで diff/ratio を算出
 * - weatherByHour: WeatherHourlyDisplay[] を hour → entry の Map に索引化
 *
 * 描画 component 本体（TimeSlotComparisonTable / TimeSlotWeatherTable）は
 * styled-components + render tree 依存なのでここでは対象外。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { buildCols, weatherByHour, type WeatherHourlyDisplay } from '../TimeSlotComparisonTable'

describe('buildCols', () => {
  const sampleRows = [
    { hour: '10', amount: 1000, prevAmount: 800, quantity: 50, prevQuantity: 40 },
    { hour: '11', amount: 2000, prevAmount: 2500, quantity: 100, prevQuantity: 125 },
    { hour: '12', amount: 3000, prevAmount: 0, quantity: 150, prevQuantity: 0 },
  ]

  it('metric=amount で amount/prevAmount を使い、差分と前年比を算出', () => {
    const cols = buildCols(sampleRows, 'amount', true)
    expect(cols).toHaveLength(3)
    expect(cols[0]).toEqual({ hour: '10', current: 1000, prev: 800, diff: 200, ratio: 1000 / 800 })
    expect(cols[1]).toEqual({
      hour: '11',
      current: 2000,
      prev: 2500,
      diff: -500,
      ratio: 2000 / 2500,
    })
  })

  it('metric=quantity で quantity/prevQuantity に切替', () => {
    const cols = buildCols(sampleRows, 'quantity', true)
    expect(cols[0]).toMatchObject({ current: 50, prev: 40, diff: 10 })
    expect(cols[1]).toMatchObject({ current: 100, prev: 125, diff: -25 })
  })

  it('prev=0 の場合 ratio は null（division-by-zero ガード）', () => {
    const cols = buildCols(sampleRows, 'amount', true)
    expect(cols[2].ratio).toBeNull()
    expect(cols[2].prev).toBe(0)
  })

  it('hasPrev=false で prev/diff/ratio をすべて 0/null 化する', () => {
    const cols = buildCols(sampleRows, 'amount', false)
    expect(cols[0]).toMatchObject({ current: 1000, prev: 0, diff: 1000, ratio: null })
    expect(cols[1]).toMatchObject({ current: 2000, prev: 0, diff: 2000 })
  })

  it('amount 欠損行は current=0 で fallback する', () => {
    const rows = [{ hour: '10', prevAmount: 800 }]
    const cols = buildCols(rows, 'amount', true)
    expect(cols[0]).toMatchObject({ current: 0, prev: 800, diff: -800 })
  })

  it('prevAmount 欠損 + hasPrev=true で prev=0', () => {
    const rows = [{ hour: '10', amount: 1000 }]
    const cols = buildCols(rows, 'amount', true)
    expect(cols[0]).toMatchObject({ current: 1000, prev: 0, ratio: null })
  })

  it('空入力で空配列', () => {
    expect(buildCols([], 'amount', true)).toEqual([])
  })

  it('hour は文字列のまま保持される', () => {
    const cols = buildCols([{ hour: '7', amount: 100 }], 'amount', false)
    expect(cols[0].hour).toBe('7')
  })
})

describe('weatherByHour', () => {
  function w(hour: number, icon: string | null = null): WeatherHourlyDisplay {
    return {
      hour,
      avgTemperature: 20,
      totalPrecipitation: 0,
      icon,
      label: null,
    }
  }

  it('undefined で空 Map', () => {
    expect(weatherByHour(undefined).size).toBe(0)
  })

  it('空配列で空 Map', () => {
    expect(weatherByHour([]).size).toBe(0)
  })

  it('hour をキーにしたエントリ Map を返す', () => {
    const data = [w(10, '☀️'), w(11, '☁️'), w(12, '🌧️')]
    const map = weatherByHour(data)
    expect(map.size).toBe(3)
    expect(map.get(10)?.icon).toBe('☀️')
    expect(map.get(11)?.icon).toBe('☁️')
    expect(map.get(12)?.icon).toBe('🌧️')
  })

  it('同じ hour があれば後勝ち（Map 構築の一般契約）', () => {
    const data = [w(10, '☀️'), w(10, '☁️')]
    const map = weatherByHour(data)
    expect(map.size).toBe(1)
    expect(map.get(10)?.icon).toBe('☁️')
  })

  it('icon=null を含むエントリもそのまま Map に入る', () => {
    const map = weatherByHour([w(10, null), w(11, '☀️')])
    expect(map.get(10)?.icon).toBeNull()
    expect(map.get(11)?.icon).toBe('☀️')
  })
})
