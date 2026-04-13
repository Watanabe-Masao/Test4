/**
 * averageDivisor テスト — データ駆動型除数計算
 */
import { describe, it, expect } from 'vitest'
import {
  computeAverageDivisor,
  computeActiveDowDivisorMap,
  type AveragingContext,
} from '../averageDivisor'

describe('computeAverageDivisor', () => {
  it('mode === total は常に 1 を返す', () => {
    const ctx: AveragingContext = {
      mode: 'total',
      activeDays: [1, 2, 3, 4, 5],
      year: 2024,
      month: 1,
    }
    expect(computeAverageDivisor(ctx)).toBe(1)
  })

  it('mode === total は activeDays が空でも 1 を返す', () => {
    const ctx: AveragingContext = {
      mode: 'total',
      activeDays: [],
      year: 2024,
      month: 1,
    }
    expect(computeAverageDivisor(ctx)).toBe(1)
  })

  it('mode === dailyAvg + フィルタなしでは activeDays 件数を返す', () => {
    const ctx: AveragingContext = {
      mode: 'dailyAvg',
      activeDays: [1, 2, 3, 4, 5],
      year: 2024,
      month: 1,
    }
    expect(computeAverageDivisor(ctx)).toBe(5)
  })

  it('activeDays が Set でも正しく数える', () => {
    const ctx: AveragingContext = {
      mode: 'dailyAvg',
      activeDays: new Set<number>([1, 2, 3]),
      year: 2024,
      month: 1,
    }
    expect(computeAverageDivisor(ctx)).toBe(3)
  })

  it('activeDays が空の dailyAvg は最小値 1 を返す（0除算防止）', () => {
    const ctx: AveragingContext = {
      mode: 'dailyAvg',
      activeDays: [],
      year: 2024,
      month: 1,
    }
    expect(computeAverageDivisor(ctx)).toBe(1)
  })

  it('dowFilter 指定時は該当曜日の日数のみカウント', () => {
    // 2024-01: 1=月, 2=火, 3=水, 4=木, 5=金, 6=土, 7=日, 8=月
    // 月曜フィルタ (1) → day 1, 8 が該当 = 2日
    const ctx: AveragingContext = {
      mode: 'dailyAvg',
      activeDays: [1, 2, 3, 4, 5, 6, 7, 8],
      year: 2024,
      month: 1,
      dowFilter: [1], // 月曜
    }
    expect(computeAverageDivisor(ctx)).toBe(2)
  })

  it('複数曜日フィルタは OR で合算', () => {
    // 2024-01: 1=月, 2=火, 3=水, 4=木, 5=金, 6=土, 7=日
    // 土日フィルタ (0, 6) → day 6, 7 が該当 = 2日
    const ctx: AveragingContext = {
      mode: 'dailyAvg',
      activeDays: [1, 2, 3, 4, 5, 6, 7],
      year: 2024,
      month: 1,
      dowFilter: [0, 6],
    }
    expect(computeAverageDivisor(ctx)).toBe(2)
  })

  it('dowFilter が空配列の場合は全 activeDays 件数を返す', () => {
    const ctx: AveragingContext = {
      mode: 'dailyAvg',
      activeDays: [1, 2, 3],
      year: 2024,
      month: 1,
      dowFilter: [],
    }
    expect(computeAverageDivisor(ctx)).toBe(3)
  })

  it('dowFilter 条件に合致する日が 0 でも最小値 1 を返す', () => {
    const ctx: AveragingContext = {
      mode: 'dailyAvg',
      activeDays: [1, 2, 3],
      year: 2024,
      month: 1,
      dowFilter: [6], // 土曜、該当なし
    }
    expect(computeAverageDivisor(ctx)).toBe(1)
  })
})

describe('computeActiveDowDivisorMap', () => {
  it('曜日ごとの実データ日数を正しくカウントする', () => {
    // 2024-01-01 月, 02 火, 03 水, 04 木, 05 金, 06 土, 07 日, 08 月
    const map = computeActiveDowDivisorMap([1, 2, 3, 4, 5, 6, 7, 8], 2024, 1)
    expect(map.get(1)).toBe(2) // 月曜: 1, 8
    expect(map.get(2)).toBe(1) // 火曜: 2
    expect(map.get(0)).toBe(1) // 日曜: 7
    expect(map.get(6)).toBe(1) // 土曜: 6
  })

  it('空の activeDays では空の Map を返す', () => {
    const map = computeActiveDowDivisorMap([], 2024, 1)
    expect(map.size).toBe(0)
  })

  it('Set 入力でも正しく動作する', () => {
    const map = computeActiveDowDivisorMap(new Set([1, 8, 15]), 2024, 1)
    // 1, 8, 15 すべて月曜
    expect(map.get(1)).toBe(3)
    expect(map.size).toBe(1)
  })

  it('すべての値が >= 1 を保証する', () => {
    const map = computeActiveDowDivisorMap([1, 2, 3], 2024, 1)
    for (const count of map.values()) {
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })
})
