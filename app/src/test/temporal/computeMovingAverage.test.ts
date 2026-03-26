/**
 * computeMovingAverage 仕様テスト
 *
 * trailing 移動平均の仕様を固定する。
 * テスト名は仕様を表現し、rolling sum 実装時の振る舞い比較基準になる。
 *
 * @guard D3 不変条件はテストで守る
 */
import { describe, it, expect } from 'vitest'
import { computeMovingAverage } from '@/domain/calculations/temporal'
import type { MovingAveragePoint } from '@/domain/calculations/temporal'

function makePoint(value: number | null): MovingAveragePoint {
  return {
    value,
    status: value !== null ? 'ok' : 'missing',
  }
}

describe('computeMovingAverage', () => {
  // ── 基本仕様 ──

  it('3日 trailing window で正しい平均を返す', () => {
    const series = [makePoint(100), makePoint(200), makePoint(300), makePoint(400), makePoint(500)]
    const result = computeMovingAverage(series, 3, 'strict')

    expect(result[2].value).toBeCloseTo(200) // (100+200+300)/3
    expect(result[3].value).toBeCloseTo(300) // (200+300+400)/3
    expect(result[4].value).toBeCloseTo(400) // (300+400+500)/3
  })

  it('7日 trailing window で正しい平均を返す', () => {
    const series = Array.from({ length: 10 }, (_, i) => makePoint((i + 1) * 100))
    const result = computeMovingAverage(series, 7, 'strict')

    expect(result[6].value).toBeCloseTo(400) // (100..700)/7
  })

  it('windowSize=1 では元値がそのまま返る', () => {
    const series = [makePoint(42), makePoint(99)]
    const result = computeMovingAverage(series, 1, 'strict')

    expect(result[0].value).toBe(42)
    expect(result[1].value).toBe(99)
    expect(result[0].status).toBe('ok')
  })

  // ── 窓不足 ──

  it('窓不足（series 先頭付近）は常に missing を返す', () => {
    const series = [makePoint(100), makePoint(200), makePoint(300)]
    const result = computeMovingAverage(series, 3, 'strict')

    // 先頭2点は窓不足
    expect(result[0].value).toBeNull()
    expect(result[0].status).toBe('missing')
    expect(result[1].value).toBeNull()
    expect(result[1].status).toBe('missing')
    // 3点目は計算可能
    expect(result[2].value).toBeCloseTo(200)
  })

  // ── strict policy ──

  it('strict は窓内に missing が1件でも null を返す', () => {
    const series = [makePoint(100), makePoint(null), makePoint(300)]
    const result = computeMovingAverage(series, 3, 'strict')

    expect(result[2].value).toBeNull()
    expect(result[2].status).toBe('missing')
  })

  // ── partial policy ──

  it('partial は1件でも ok があれば計算して ok を返す', () => {
    const series = [makePoint(100), makePoint(null), makePoint(300)]
    const result = computeMovingAverage(series, 3, 'partial')

    expect(result[2].value).toBeCloseTo(200) // (100+300)/2
    expect(result[2].status).toBe('ok')
  })

  it('全 missing 窓では strict/partial どちらも null を返す', () => {
    const series = [makePoint(null), makePoint(null), makePoint(null)]

    const strict = computeMovingAverage(series, 3, 'strict')
    expect(strict[2].value).toBeNull()

    const partial = computeMovingAverage(series, 3, 'partial')
    expect(partial[2].value).toBeNull()
  })
})
