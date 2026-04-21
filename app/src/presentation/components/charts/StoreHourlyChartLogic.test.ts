/**
 * StoreHourlyChartLogic — pure helper テスト
 *
 * 検証対象（依存軽量な pure 関数のみ）:
 * - cosineSimilarity: 0〜1 域での正常値、0 ベクトル境界、同一ベクトル
 * - findCoreTime: ピーク / コアタイム / 折り返し時間の閾値動作
 *
 * `buildStoreHourlyData` は TimeSlotSeries / stores map 等の複合依存が多いため
 * ここでは対象外（component smoke test 経由で間接カバー）。
 */
import { describe, it, expect } from 'vitest'
import {
  cosineSimilarity,
  findCoreTimeByThreshold,
  CORE_THRESHOLD,
  SIMILARITY_HIGH,
} from './StoreHourlyChartLogic'

describe('cosineSimilarity', () => {
  it('同一ベクトルで 1 を返す', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10)
  })

  it('スケール変更に不変（cos(θ) なので長さ依存しない）', () => {
    expect(cosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10)
  })

  it('直交ベクトルで 0 を返す', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it('ゼロベクトル入力は 0 を返す（division-by-zero ガード）', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0)
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0)
  })

  it('反対方向ベクトルで -1 を返す', () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1, 10)
  })

  it('定数 SIMILARITY_HIGH は 0.95', () => {
    expect(SIMILARITY_HIGH).toBe(0.95)
  })

  it('定数 CORE_THRESHOLD は 0.8', () => {
    expect(CORE_THRESHOLD).toBe(0.8)
  })
})

describe('findCoreTimeByThreshold', () => {
  it('全 0 の入力は hourMin〜hourMax / turnover=12', () => {
    const empty = new Map<number, number>([
      [10, 0],
      [11, 0],
      [12, 0],
    ])
    expect(findCoreTimeByThreshold(empty, 10, 12)).toEqual({ start: 10, end: 12, turnover: 12 })
  })

  it('売上の 80% を占める時間帯を昇順の範囲として返す', () => {
    // 10:20 / 11:80 / 12:10 → total=110, 80% 閾値=88
    // sorted by amount desc: [11, 10, 12]
    // cumulative: 80 → 100(>=88) → 停止、coreHours = [11, 10]
    // 昇順ソート後 start=10, end=11
    const hourly = new Map<number, number>([
      [10, 20],
      [11, 80],
      [12, 10],
    ])
    const r = findCoreTimeByThreshold(hourly, 10, 12)
    expect(r.start).toBe(10)
    expect(r.end).toBe(11)
  })

  it('ピーク後に急減（前時間の 70% 未満）する時刻で turnover を決定する', () => {
    // ピーク=12 (100), 13=60 (= 60% of 100 < 70%) → turnover=13
    const hourly = new Map<number, number>([
      [11, 50],
      [12, 100],
      [13, 60],
    ])
    const r = findCoreTimeByThreshold(hourly, 11, 13)
    expect(r.turnover).toBe(13)
  })

  it('急減がなければ turnover は hourMax に到達する', () => {
    // ピーク=11 (100), 12=90 (>70%), 13=80 (>70% of 90)
    const hourly = new Map<number, number>([
      [10, 10],
      [11, 100],
      [12, 90],
      [13, 80],
    ])
    const r = findCoreTimeByThreshold(hourly, 10, 13)
    expect(r.turnover).toBe(13)
  })

  it('単一ピーク時間で start=end=peak', () => {
    // total=100, 80% 閾値=80 → 最初の候補 12 (amount=100) だけで 100>=80
    const hourly = new Map<number, number>([
      [10, 0],
      [11, 0],
      [12, 100],
    ])
    const r = findCoreTimeByThreshold(hourly, 10, 12)
    expect(r.start).toBe(12)
    expect(r.end).toBe(12)
  })
})
