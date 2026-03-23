/**
 * timeSlotCalculations 数学的不変条件テスト
 *
 * @guard D3 不変条件はテストで守る
 * @guard G1 ルールはテストに書く
 *
 * ## 不変条件一覧
 *
 * INV-TS-01: findCoreTime の total は任意の3連続ウィンドウの合計以上（最大性）
 * INV-TS-02: findCoreTime のウィンドウ幅は 2（endHour - startHour = 2）、時間帯 <3 は例外
 * INV-TS-03: findTurnaroundHour 時点の累積 ≥ 総売上の 50%（定義）
 * INV-TS-04: findTurnaroundHour の直前時間帯までの累積 < 50%（最早性）
 * INV-TS-05: buildHourlyMap の値合計 = 入力 amount 合計（保存則）
 * INV-TS-06: 空入力 → null / 空 Map（境界安全性）
 */
import { describe, it, expect } from 'vitest'
import { findCoreTime, findTurnaroundHour, buildHourlyMap } from '../timeSlotCalculations'

// ── ヘルパー ──

function makeMap(entries: [number, number][]): Map<number, number> {
  return new Map(entries)
}

/** 任意の3連続ウィンドウの合計を全列挙する */
function allWindowTotals(map: Map<number, number>): number[] {
  const minH = Math.min(...map.keys())
  const maxH = Math.max(...map.keys())
  const totals: number[] = []
  for (let s = minH; s <= maxH - 2; s++) {
    totals.push((map.get(s) ?? 0) + (map.get(s + 1) ?? 0) + (map.get(s + 2) ?? 0))
  }
  return totals
}

/** 累積売上を計算する（時間帯昇順） */
function cumulativeAt(map: Map<number, number>, targetHour: number): number {
  const sorted = [...map.entries()].sort((a, b) => a[0] - b[0])
  let cum = 0
  for (const [h, v] of sorted) {
    cum += v
    if (h === targetHour) return cum
  }
  return cum
}

/** 直前の時間帯までの累積 */
function cumulativeBefore(map: Map<number, number>, targetHour: number): number {
  const sorted = [...map.entries()].sort((a, b) => a[0] - b[0])
  let cum = 0
  for (const [h, v] of sorted) {
    if (h >= targetHour) return cum
    cum += v
  }
  return cum
}

function totalOf(map: Map<number, number>): number {
  return [...map.values()].reduce((s, v) => s + v, 0)
}

// ── テストデータ ──

/** 典型的な小売店の時間帯別売上（9〜21時） */
const TYPICAL_RETAIL: [number, number][] = [
  [9, 15000],
  [10, 25000],
  [11, 45000],
  [12, 60000],
  [13, 55000],
  [14, 35000],
  [15, 30000],
  [16, 28000],
  [17, 40000],
  [18, 50000],
  [19, 42000],
  [20, 20000],
  [21, 10000],
]

/** 朝方集中型（スーパー） */
const MORNING_HEAVY: [number, number][] = [
  [8, 30000],
  [9, 80000],
  [10, 90000],
  [11, 70000],
  [12, 40000],
  [13, 20000],
  [14, 15000],
  [15, 10000],
]

/** 夕方集中型（コンビニ） */
const EVENING_HEAVY: [number, number][] = [
  [7, 5000],
  [8, 8000],
  [9, 6000],
  [10, 4000],
  [11, 7000],
  [12, 15000],
  [13, 10000],
  [14, 8000],
  [15, 9000],
  [16, 12000],
  [17, 25000],
  [18, 40000],
  [19, 35000],
  [20, 20000],
]

/** 均等分布 */
const UNIFORM: [number, number][] = [
  [10, 10000],
  [11, 10000],
  [12, 10000],
  [13, 10000],
  [14, 10000],
]

/** 単一時間帯 */
const SINGLE_HOUR: [number, number][] = [[12, 50000]]

/** 2時間帯（ウィンドウ幅3未満） */
const TWO_HOURS: [number, number][] = [
  [11, 30000],
  [12, 40000],
]

/** 疎な分布（歯抜け時間帯あり） */
const SPARSE: [number, number][] = [
  [9, 10000],
  [12, 50000],
  [15, 30000],
  [18, 40000],
]

const ALL_DATASETS: { name: string; data: [number, number][] }[] = [
  { name: 'typical_retail', data: TYPICAL_RETAIL },
  { name: 'morning_heavy', data: MORNING_HEAVY },
  { name: 'evening_heavy', data: EVENING_HEAVY },
  { name: 'uniform', data: UNIFORM },
  { name: 'sparse', data: SPARSE },
]

// ── INV-TS-01: findCoreTime 最大性 ──

describe('INV-TS-01: findCoreTime の total は任意の3連続ウィンドウの合計以上', () => {
  for (const { name, data } of ALL_DATASETS) {
    it(`${name}: コアタイム合計 ≥ 全ウィンドウ合計`, () => {
      const map = makeMap(data)
      const result = findCoreTime(map)
      expect(result).not.toBeNull()
      const windows = allWindowTotals(map)
      for (const w of windows) {
        expect(result!.total).toBeGreaterThanOrEqual(w)
      }
    })
  }
})

// ── INV-TS-02: findCoreTime ウィンドウ幅 ──

describe('INV-TS-02: findCoreTime のウィンドウ幅', () => {
  for (const { name, data } of ALL_DATASETS) {
    it(`${name}: endHour - startHour = 2`, () => {
      const map = makeMap(data)
      const result = findCoreTime(map)
      expect(result).not.toBeNull()
      expect(result!.endHour - result!.startHour).toBe(2)
    })
  }

  it('2時間帯: ウィンドウ幅 < 2（全範囲をコアタイムとする）', () => {
    const map = makeMap(TWO_HOURS)
    const result = findCoreTime(map)
    expect(result).not.toBeNull()
    expect(result!.endHour - result!.startHour).toBe(1)
    expect(result!.total).toBe(70000)
  })

  it('単一時間帯: ウィンドウ幅 = 0（全範囲をコアタイムとする）', () => {
    const map = makeMap(SINGLE_HOUR)
    const result = findCoreTime(map)
    expect(result).not.toBeNull()
    expect(result!.endHour - result!.startHour).toBe(0)
    expect(result!.total).toBe(50000)
  })
})

// ── INV-TS-03: findTurnaroundHour 累積 ≥ 50% ──

describe('INV-TS-03: findTurnaroundHour 時点の累積 ≥ 総売上の 50%', () => {
  for (const { name, data } of ALL_DATASETS) {
    it(`${name}: 折り返し時点の累積 ≥ 50%`, () => {
      const map = makeMap(data)
      const hour = findTurnaroundHour(map)
      expect(hour).not.toBeNull()
      const total = totalOf(map)
      const cumAtHour = cumulativeAt(map, hour!)
      expect(cumAtHour).toBeGreaterThanOrEqual(total * 0.5)
    })
  }
})

// ── INV-TS-04: findTurnaroundHour 最早性 ──

describe('INV-TS-04: findTurnaroundHour の直前時間帯までの累積 < 50%', () => {
  for (const { name, data } of ALL_DATASETS) {
    it(`${name}: 折り返し直前の累積 < 50%`, () => {
      const map = makeMap(data)
      const hour = findTurnaroundHour(map)
      expect(hour).not.toBeNull()
      const total = totalOf(map)
      const sorted = [...map.entries()].sort((a, b) => a[0] - b[0])
      const hourIndex = sorted.findIndex(([h]) => h === hour)
      if (hourIndex > 0) {
        // 直前の時間帯までの累積は 50% 未満でなければならない
        const cumBefore = cumulativeBefore(map, hour!)
        expect(cumBefore).toBeLessThan(total * 0.5)
      }
      // hourIndex === 0 の場合、最初の時間帯で既に 50% 超 → 最早性は自明に満たされる
    })
  }
})

// ── INV-TS-05: buildHourlyMap 保存則 ──

describe('INV-TS-05: buildHourlyMap の値合計 = 入力 amount 合計', () => {
  it('重複なしデータ: 合計が保存される', () => {
    const input = [
      { hour: 10, amount: 100 },
      { hour: 11, amount: 200 },
      { hour: 12, amount: 300 },
    ]
    const map = buildHourlyMap(input)
    const inputTotal = input.reduce((s, d) => s + d.amount, 0)
    const mapTotal = totalOf(map)
    expect(mapTotal).toBe(inputTotal)
  })

  it('重複ありデータ: 同一時間帯が合算され合計が保存される', () => {
    const input = [
      { hour: 10, amount: 100 },
      { hour: 10, amount: 150 },
      { hour: 11, amount: 200 },
      { hour: 11, amount: 50 },
      { hour: 12, amount: 300 },
    ]
    const map = buildHourlyMap(input)
    const inputTotal = input.reduce((s, d) => s + d.amount, 0)
    const mapTotal = totalOf(map)
    expect(mapTotal).toBe(inputTotal)
    // 重複は合算されるのでキー数 < 入力数
    expect(map.size).toBe(3)
    expect(map.get(10)).toBe(250)
    expect(map.get(11)).toBe(250)
  })

  it('大量データ: 保存則が成立する', () => {
    const input = Array.from({ length: 100 }, (_, i) => ({
      hour: 8 + (i % 14),
      amount: Math.floor(Math.random() * 10000) + 1,
    }))
    const map = buildHourlyMap(input)
    const inputTotal = input.reduce((s, d) => s + d.amount, 0)
    const mapTotal = totalOf(map)
    expect(mapTotal).toBe(inputTotal)
  })
})

// ── INV-TS-06: 境界安全性 ──

describe('INV-TS-06: 境界安全性', () => {
  it('findCoreTime: 空 Map → null', () => {
    expect(findCoreTime(new Map())).toBeNull()
  })

  it('findTurnaroundHour: 空 Map → null', () => {
    expect(findTurnaroundHour(new Map())).toBeNull()
  })

  it('findTurnaroundHour: 全ゼロ → null', () => {
    const map = makeMap([
      [10, 0],
      [11, 0],
      [12, 0],
    ])
    expect(findTurnaroundHour(map)).toBeNull()
  })

  it('buildHourlyMap: 空配列 → 空 Map', () => {
    const map = buildHourlyMap([])
    expect(map.size).toBe(0)
  })

  it('findCoreTime: 結果の total は有限値', () => {
    for (const { data } of ALL_DATASETS) {
      const result = findCoreTime(makeMap(data))
      expect(result).not.toBeNull()
      expect(Number.isFinite(result!.total)).toBe(true)
    }
  })

  it('findTurnaroundHour: 結果は有限整数', () => {
    for (const { data } of ALL_DATASETS) {
      const result = findTurnaroundHour(makeMap(data))
      expect(result).not.toBeNull()
      expect(Number.isFinite(result!)).toBe(true)
      expect(Number.isInteger(result!)).toBe(true)
    }
  })
})

// ── INV-TS-07: findCoreTime total の整合性 ──

describe('INV-TS-07: findCoreTime total = 実際のウィンドウ合計', () => {
  for (const { name, data } of ALL_DATASETS) {
    it(`${name}: total は startHour〜endHour の合計に一致`, () => {
      const map = makeMap(data)
      const result = findCoreTime(map)
      expect(result).not.toBeNull()
      const { startHour, endHour, total } = result!
      let windowSum = 0
      for (let h = startHour; h <= endHour; h++) {
        windowSum += map.get(h) ?? 0
      }
      expect(total).toBe(windowSum)
    })
  }
})
