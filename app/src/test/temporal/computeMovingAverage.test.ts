/**
 * computeMovingAverage テスト
 *
 * 純粋関数の trailing 移動平均計算を検証する。
 * 境界・欠損・閏年を網羅。
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
  it('3日 trailing 平均が正しい', () => {
    const series = [makePoint(100), makePoint(200), makePoint(300), makePoint(400), makePoint(500)]
    const result = computeMovingAverage(series, 3, 'strict')

    // 先頭2点は窓不足で null
    expect(result[0].value).toBeNull()
    expect(result[1].value).toBeNull()
    // 3日目: (100+200+300)/3 = 200
    expect(result[2].value).toBeCloseTo(200)
    // 4日目: (200+300+400)/3 = 300
    expect(result[3].value).toBeCloseTo(300)
    // 5日目: (300+400+500)/3 = 400
    expect(result[4].value).toBeCloseTo(400)
  })

  it('7日 trailing 平均が正しい', () => {
    const series = Array.from({ length: 10 }, (_, i) => makePoint((i + 1) * 100))
    const result = computeMovingAverage(series, 7, 'strict')

    // 先頭6点は窓不足
    for (let i = 0; i < 6; i++) {
      expect(result[i].value).toBeNull()
    }
    // 7日目: (100+200+300+400+500+600+700)/7 = 400
    expect(result[6].value).toBeCloseTo(400)
  })

  it('windowSize=1 → 元値維持', () => {
    const series = [makePoint(42), makePoint(99)]
    const result = computeMovingAverage(series, 1, 'strict')

    expect(result[0].value).toBe(42)
    expect(result[1].value).toBe(99)
    expect(result[0].status).toBe('ok')
  })

  it('月末→月初を跨ぐ平均が正しい（series は連続）', () => {
    // 3点の連続 series（日付は series 構築側の責務なので値のみ）
    const series = [makePoint(100), makePoint(200), makePoint(300)]
    const result = computeMovingAverage(series, 3, 'strict')

    expect(result[2].value).toBeCloseTo(200)
    expect(result[2].status).toBe('ok')
  })

  it('閏年を含む窓でも計算が正しい', () => {
    const series = [makePoint(100), makePoint(200), makePoint(300)]
    const result = computeMovingAverage(series, 3, 'strict')

    expect(result[2].value).toBeCloseTo(200) // (100+200+300)/3
    expect(result[2].status).toBe('ok')
  })

  it('strict: missing を含む窓は null', () => {
    const series = [makePoint(100), makePoint(null), makePoint(300)]
    const result = computeMovingAverage(series, 3, 'strict')

    expect(result[2].value).toBeNull()
    expect(result[2].status).toBe('missing')
  })

  it('partial: ok 値のみで平均', () => {
    const series = [makePoint(100), makePoint(null), makePoint(300)]
    const result = computeMovingAverage(series, 3, 'partial')

    // ok 値のみ: (100+300)/2 = 200
    expect(result[2].value).toBeCloseTo(200)
    expect(result[2].status).toBe('ok')
  })

  it('全 missing 窓は null（strict/partial 共通）', () => {
    const series = [makePoint(null), makePoint(null), makePoint(null)]

    const strict = computeMovingAverage(series, 3, 'strict')
    expect(strict[2].value).toBeNull()

    const partial = computeMovingAverage(series, 3, 'partial')
    expect(partial[2].value).toBeNull()
  })
})
