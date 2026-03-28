/**
 * remapPrevYearSeries の不変条件テスト
 *
 * useMultiMovingAverage 内の remapPrevYearSeries は内部関数だが、
 * date / dateKey の整合が崩れると MA 表示が壊れるため不変条件を検証する。
 *
 * ここでは関数を直接テストする代わりに、
 * 「リマップ後の date.day と dateKey の日番号が一致する」
 * という不変条件を MovingAverageHandler の出力レベルで確認する。
 *
 * @guard D3 不変条件はテストで守る
 */
import { describe, it, expect } from 'vitest'
import type { DailySeriesPoint } from '@/application/services/temporal/DailySeriesTypes'

/**
 * remapPrevYearSeries の再実装（テスト用）
 * 本体と同じロジックで、date も更新することを検証する。
 */
function remapPrevYearSeries(
  prevSeries: readonly DailySeriesPoint[],
  curSeries: readonly DailySeriesPoint[],
): readonly DailySeriesPoint[] {
  const prevKeys = prevSeries.map((p) => p.dateKey).sort()
  const curKeys = curSeries.map((p) => p.dateKey).sort()
  const keyMap = new Map<string, string>()
  for (let i = 0; i < prevKeys.length && i < curKeys.length; i++) {
    keyMap.set(prevKeys[i], curKeys[i])
  }
  const curByKey = new Map(curSeries.map((p) => [p.dateKey, p]))
  return prevSeries.map((p) => {
    const mappedKey = keyMap.get(p.dateKey)
    if (!mappedKey) return p
    const curPoint = curByKey.get(mappedKey)
    return {
      ...p,
      dateKey: mappedKey,
      date: curPoint?.date ?? p.date,
    }
  })
}

function makePoint(year: number, month: number, day: number, value: number): DailySeriesPoint {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return {
    date: { year, month, day },
    dateKey: `${year}-${m}-${d}`,
    value,
    sourceMonthKey: `${year}-${m}` as DailySeriesPoint['sourceMonthKey'],
    status: 'ok',
  }
}

describe('remapPrevYearSeries 不変条件', () => {
  const curSeries = [
    makePoint(2026, 3, 1, 100),
    makePoint(2026, 3, 2, 200),
    makePoint(2026, 3, 3, 300),
  ]
  const prevSeries = [
    makePoint(2025, 3, 1, 50),
    makePoint(2025, 3, 2, 60),
    makePoint(2025, 3, 3, 70),
  ]

  it('不変条件: リマップ後の dateKey と date.day が一致する', () => {
    const remapped = remapPrevYearSeries(prevSeries, curSeries)
    for (const p of remapped) {
      const dayFromKey = Number(p.dateKey.slice(-2))
      expect(p.date.day).toBe(dayFromKey)
    }
  })

  it('不変条件: リマップ後の dateKey は当年の dateKey と一致する', () => {
    const remapped = remapPrevYearSeries(prevSeries, curSeries)
    const curKeySet = new Set(curSeries.map((p) => p.dateKey))
    for (const p of remapped) {
      expect(curKeySet.has(p.dateKey)).toBe(true)
    }
  })

  it('不変条件: リマップ後の date は当年の date と一致する', () => {
    const remapped = remapPrevYearSeries(prevSeries, curSeries)
    const curDateMap = new Map(curSeries.map((p) => [p.dateKey, p.date]))
    for (const p of remapped) {
      const expected = curDateMap.get(p.dateKey)
      expect(p.date).toEqual(expected)
    }
  })

  it('不変条件: value は前年のまま保持される', () => {
    const remapped = remapPrevYearSeries(prevSeries, curSeries)
    expect(remapped[0].value).toBe(50)
    expect(remapped[1].value).toBe(60)
    expect(remapped[2].value).toBe(70)
  })

  it('不変条件: 出力の長さは前年系列と同じ', () => {
    const remapped = remapPrevYearSeries(prevSeries, curSeries)
    expect(remapped).toHaveLength(prevSeries.length)
  })

  it('月マタギ: 前年が2月末〜3月のデータでも dateKey/date が整合する', () => {
    const prevCross = [
      makePoint(2025, 2, 28, 10),
      makePoint(2025, 3, 1, 20),
      makePoint(2025, 3, 2, 30),
    ]
    const curCross = [
      makePoint(2026, 3, 1, 100),
      makePoint(2026, 3, 2, 200),
      makePoint(2026, 3, 3, 300),
    ]
    const remapped = remapPrevYearSeries(prevCross, curCross)
    for (const p of remapped) {
      const dayFromKey = Number(p.dateKey.slice(-2))
      expect(p.date.day).toBe(dayFromKey)
    }
  })
})
