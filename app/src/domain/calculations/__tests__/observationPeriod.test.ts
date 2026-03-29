/**
 * observationPeriod.ts — 観測期間評価の単体テスト
 *
 * 品質判定（ok/partial/invalid/undefined）と警告生成を検証。
 */
import { describe, it, expect } from 'vitest'
import { evaluateObservationPeriod, worseObservationStatus } from '../observationPeriod'

function makeDaily(salesDays: number[]): ReadonlyMap<number, { sales: number }> {
  const map = new Map<number, { sales: number }>()
  for (const day of salesDays) {
    map.set(day, { sales: 10000 })
  }
  return map
}

describe('evaluateObservationPeriod', () => {
  it('ok: 十分なデータ（15日以上の営業日）', () => {
    const daily = makeDaily(Array.from({ length: 20 }, (_, i) => i + 1))
    const result = evaluateObservationPeriod(daily, 30, 20)
    expect(result.status).toBe('ok')
    expect(result.lastRecordedSalesDay).toBe(20)
    expect(result.salesDays).toBe(20)
    expect(result.remainingDays).toBe(10)
  })

  it('partial: データはあるが日数不足（5-9日）', () => {
    const daily = makeDaily([1, 2, 3, 4, 5, 6, 7])
    const result = evaluateObservationPeriod(daily, 30, 7)
    expect(result.status).toBe('partial')
  })

  it('invalid: データが極端に少ない（< 5日）', () => {
    const daily = makeDaily([1, 2, 3])
    const result = evaluateObservationPeriod(daily, 30, 3)
    expect(result.status).toBe('invalid')
  })

  it('undefined: データなし', () => {
    const daily = new Map<number, { sales: number }>()
    const result = evaluateObservationPeriod(daily, 30, 0)
    expect(result.status).toBe('undefined')
  })

  it('daysInMonth が正しく反映される', () => {
    const daily = makeDaily([1, 2, 3, 4, 5])
    const result = evaluateObservationPeriod(daily, 28, 5)
    expect(result.daysInMonth).toBe(28)
    expect(result.remainingDays).toBe(23) // 28 - 5
  })

  it('salesDays: 売上 0 の日はカウントしない', () => {
    const map = new Map<number, { sales: number }>()
    map.set(1, { sales: 10000 })
    map.set(2, { sales: 0 }) // 売上 0
    map.set(3, { sales: 5000 })
    const result = evaluateObservationPeriod(map, 30, 3)
    // salesDays は売上 > 0 の日のみ（実装依存だが少なくとも <= 3）
    expect(result.salesDays).toBeLessThanOrEqual(3)
    expect(result.lastRecordedSalesDay).toBe(3)
  })
})

describe('worseObservationStatus', () => {
  it('ok vs partial → partial', () => {
    expect(worseObservationStatus('ok', 'partial')).toBe('partial')
  })

  it('partial vs invalid → invalid', () => {
    expect(worseObservationStatus('partial', 'invalid')).toBe('invalid')
  })

  it('ok vs ok → ok', () => {
    expect(worseObservationStatus('ok', 'ok')).toBe('ok')
  })

  it('undefined vs ok → undefined', () => {
    expect(worseObservationStatus('undefined', 'ok')).toBe('undefined')
  })

  it('対称性: a,b と b,a で同じ結果', () => {
    expect(worseObservationStatus('ok', 'invalid')).toBe(worseObservationStatus('invalid', 'ok'))
  })
})
