/**
 * computeMovingAverage 仕様テスト
 *
 * trailing 移動平均の仕様を固定する。
 * テスト名は仕様を表現し、rolling sum 実装時の振る舞い比較基準になる。
 *
 * @guard D3 不変条件はテストで守る
 *
 * @taxonomyKind T:unclassified
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

  // ── 不変条件 ──

  it('不変条件: 定数系列では MA も同じ定数', () => {
    const C = 500
    const series = Array.from({ length: 10 }, () => makePoint(C))
    const result = computeMovingAverage(series, 7, 'strict')
    // 窓が満たされた7日目以降はすべて定数 C
    for (let i = 6; i < 10; i++) {
      expect(result[i].value).toBeCloseTo(C)
    }
  })

  it('不変条件: 出力の長さは入力と同じ', () => {
    const series = Array.from({ length: 15 }, (_, i) => makePoint(i * 10))
    const result = computeMovingAverage(series, 7, 'strict')
    expect(result).toHaveLength(series.length)
  })

  it('不変条件: strict の結果は partial の結果の部分集合（strict null → partial は null or 値）', () => {
    // missing が混在する系列
    const series = [
      makePoint(100),
      makePoint(null),
      makePoint(300),
      makePoint(400),
      makePoint(null),
      makePoint(600),
      makePoint(700),
    ]
    const strict = computeMovingAverage(series, 3, 'strict')
    const partial = computeMovingAverage(series, 3, 'partial')

    for (let i = 0; i < series.length; i++) {
      if (strict[i].value !== null) {
        // strict が値を返す場合、partial も同じ値を返す
        expect(partial[i].value).toBeCloseTo(strict[i].value!)
      }
      // strict が null でも partial は値を返す可能性がある（逆は成り立つ）
    }
  })

  it('不変条件: partial では ok 値の平均は個々の ok 値の min〜max 範囲内', () => {
    const series = [makePoint(100), makePoint(null), makePoint(500), makePoint(300)]
    const result = computeMovingAverage(series, 3, 'partial')

    for (let i = 0; i < result.length; i++) {
      if (result[i].value !== null) {
        const windowStart = Math.max(0, i - 2)
        const windowValues = series
          .slice(windowStart, i + 1)
          .filter((p) => p.value !== null)
          .map((p) => p.value!)
        if (windowValues.length > 0) {
          expect(result[i].value).toBeGreaterThanOrEqual(Math.min(...windowValues))
          expect(result[i].value).toBeLessThanOrEqual(Math.max(...windowValues))
        }
      }
    }
  })

  it('不変条件: 窓不足（index < windowSize - 1）は policy に関わらず null', () => {
    const series = Array.from({ length: 10 }, (_, i) => makePoint(i * 100))
    const strict = computeMovingAverage(series, 7, 'strict')
    const partial = computeMovingAverage(series, 7, 'partial')

    for (let i = 0; i < 6; i++) {
      expect(strict[i].value).toBeNull()
      expect(partial[i].value).toBeNull()
    }
  })
})
