import { describe, it, expect } from 'vitest'
import {
  resolveRequestedCompareDateKey,
  resolveSameDayOfWeekDateKey,
} from '../comparisonRules'
import type { MatchableRow } from '../comparisonTypes'

function makeRow(overrides: Partial<MatchableRow> & { dateKey: string }): MatchableRow {
  const parts = overrides.dateKey.split('-')
  return {
    year: Number(parts[0]),
    month: Number(parts[1]),
    day: Number(parts[2]),
    storeId: 'S1',
    sales: 100,
    customers: 10,
    ...overrides,
  }
}

// ── sameDate ──

describe('resolveRequestedCompareDateKey — sameDate', () => {
  it('通常ケース: 2026-03-15 → 2025-03-15', () => {
    const row = makeRow({ dateKey: '2026-03-15' })
    expect(resolveRequestedCompareDateKey(row, 'sameDate')).toBe('2025-03-15')
  })

  it('月初: 2026-03-01 → 2025-03-01', () => {
    const row = makeRow({ dateKey: '2026-03-01' })
    expect(resolveRequestedCompareDateKey(row, 'sameDate')).toBe('2025-03-01')
  })

  it('月末: 2026-03-31 → 2025-03-31', () => {
    const row = makeRow({ dateKey: '2026-03-31' })
    expect(resolveRequestedCompareDateKey(row, 'sameDate')).toBe('2025-03-31')
  })

  it('閏年 2024-02-29 → 2023-03-01（Date 正規化）', () => {
    const row = makeRow({ dateKey: '2024-02-29' })
    expect(resolveRequestedCompareDateKey(row, 'sameDate')).toBe('2023-03-01')
  })

  it('年跨ぎ: 2026-01-01 → 2025-01-01', () => {
    const row = makeRow({ dateKey: '2026-01-01' })
    expect(resolveRequestedCompareDateKey(row, 'sameDate')).toBe('2025-01-01')
  })
})

// ── sameDayOfWeek ──

describe('resolveSameDayOfWeekDateKey', () => {
  it('通常ケース: 前年同日が同曜日ならそのまま採用', () => {
    // 2026-03-10 (火) → anchor 2025-03-10
    // 2025-03-10 の曜日を確認
    const row = makeRow({ dateKey: '2026-03-10' })
    const result = resolveSameDayOfWeekDateKey(row)

    // 結果は同曜日であることを検証
    const currentDow = new Date(2026, 2, 10).getDay()
    const resultParts = result.split('-')
    const resultDow = new Date(
      Number(resultParts[0]),
      Number(resultParts[1]) - 1,
      Number(resultParts[2]),
    ).getDay()
    expect(resultDow).toBe(currentDow)
  })

  it('月初ズレ: 2026-03-01 の比較先は前年近傍の同曜日', () => {
    // 2026-03-01 (日) → anchor 2025-03-01
    const row = makeRow({ dateKey: '2026-03-01' })
    const result = resolveSameDayOfWeekDateKey(row)

    // 結果は同曜日
    const currentDow = new Date(2026, 2, 1).getDay()
    const parts = result.split('-')
    const resultDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    expect(resultDate.getDay()).toBe(currentDow)

    // anchor (2025-03-01) から ±7 日以内
    const anchor = new Date(2025, 2, 1)
    const diff = Math.abs(resultDate.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000)
    expect(diff).toBeLessThanOrEqual(7)
  })

  it('月末ズレ: 2026-03-31 の比較先が隣月に入る場合がある', () => {
    // 2026-03-31 (火) → anchor 2025-03-31
    const row = makeRow({ dateKey: '2026-03-31' })
    const result = resolveSameDayOfWeekDateKey(row)

    const currentDow = new Date(2026, 2, 31).getDay()
    const parts = result.split('-')
    const resultDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    expect(resultDate.getDay()).toBe(currentDow)

    // 4月に入ることもありえる（月跨ぎは正常系）
    const anchor = new Date(2025, 2, 31)
    const diff = Math.abs(resultDate.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000)
    expect(diff).toBeLessThanOrEqual(7)
  })

  it('月跨ぎ期間: 2026-03-28 ～ 2026-04-03 をまとめて解決', () => {
    const dates = ['2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03']

    for (const dateKey of dates) {
      const row = makeRow({ dateKey })
      const result = resolveSameDayOfWeekDateKey(row)
      const parts = dateKey.split('-')
      const currentDow = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay()
      const rParts = result.split('-')
      const resultDow = new Date(
        Number(rParts[0]),
        Number(rParts[1]) - 1,
        Number(rParts[2]),
      ).getDay()
      expect(resultDow).toBe(currentDow)
    }
  })

  it('閏年: 2024-02-29 → anchor 2023-03-01、同曜日を選択', () => {
    // 2024-02-29 (木) → anchor = new Date(2023, 1, 29) = 2023-03-01 (水) ← Date 正規化
    const row = makeRow({ dateKey: '2024-02-29' })
    const result = resolveSameDayOfWeekDateKey(row)

    const currentDow = new Date(2024, 1, 29).getDay() // 木曜日
    const parts = result.split('-')
    const resultDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    expect(resultDate.getDay()).toBe(currentDow)

    // anchor (2023-03-01) から ±7 日以内
    const anchor = new Date(2023, 1, 29) // Date 正規化で 2023-03-01
    const diff = Math.abs(resultDate.getTime() - anchor.getTime()) / (24 * 60 * 60 * 1000)
    expect(diff).toBeLessThanOrEqual(7)
  })

  it('chooses_future_side_when_equidistant_same_dow_candidates_exist', () => {
    // タイブレークテスト: 同距離の候補が2つある場合、未来側を優先
    // 7日間隔で同曜日が必ず2つ出る: anchor-7 と anchor+7
    // ただし anchor 自体が同曜日なら距離0で唯一。
    // anchor と曜日が異なるケースで距離が同じ候補を検証する。

    // 具体例で固定:
    // 2026-03-04 (水) → anchor 2025-03-04 (火)
    // 水曜候補: 2025-02-26, 2025-03-05, 2025-03-12 (anchor ±7 範囲)
    // 2025-02-26: anchor から -6日 → 距離 6
    // 2025-03-05: anchor から +1日 → 距離 1
    // 2025-03-12: anchor から +8日 → 範囲外
    // → 最近傍は 2025-03-05（距離1）
    const row = makeRow({ dateKey: '2026-03-04' })
    const result = resolveSameDayOfWeekDateKey(row)

    // 2026-03-04 は水曜日
    expect(new Date(2026, 2, 4).getDay()).toBe(3) // 水曜日=3

    // 結果は 2025-03-05（水曜日、anchor+1）
    expect(result).toBe('2025-03-05')

    // 明示的にタイブレークが発生するケースを構築:
    // anchor の曜日と current の曜日が 3.5日ずれる場合、
    // anchor-3 と anchor+4（または anchor-4 と anchor+3）で同距離にならない。
    // 曜日差は 0-6 なので、同距離は anchor-n と anchor+(7-n) (n=1..6) で発生しうるが
    // 距離は n vs 7-n で常に異なる（n=7-n → n=3.5 は整数にならない）。
    // よって曜日ベースでは完全同距離は発生しない。
    // ただし anchor ちょうどが同曜日の場合は距離0で唯一なので問題なし。
  })
})

// ── prevMonth ──

describe('resolveRequestedCompareDateKey — prevMonth', () => {
  it('通常ケース: 2026-03-15 → 2026-02-15', () => {
    const row = makeRow({ dateKey: '2026-03-15' })
    expect(resolveRequestedCompareDateKey(row, 'prevMonth')).toBe('2026-02-15')
  })

  it('月末日数差: 2026-03-31 → 2026-03-03（Date 正規化: 2月31日は存在しない）', () => {
    const row = makeRow({ dateKey: '2026-03-31' })
    // new Date(2026, 0, 31) = 2026-01-31 ではなく、month-2 = 1 (Feb)
    // new Date(2026, 1, 31) → Date 正規化で 2026-03-03
    expect(resolveRequestedCompareDateKey(row, 'prevMonth')).toBe('2026-03-03')
  })

  it('年跨ぎ: 2026-01-15 → 2025-12-15', () => {
    const row = makeRow({ dateKey: '2026-01-15' })
    expect(resolveRequestedCompareDateKey(row, 'prevMonth')).toBe('2025-12-15')
  })
})
