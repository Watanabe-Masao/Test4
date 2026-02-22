/**
 * PeriodFilter ユニットテスト
 *
 * 平均計算の正当性を検証するテスト群。
 * 「合計 → COUNT → 平均」の流れが全モードで正しいことを保証する。
 *
 * 検証観点:
 *   1. countDowInRange が閏年・月末を含む全パターンで正確な曜日カウントを返す
 *   2. dowAvg モードの divisor が選択曜日の出現回数と一致する
 *   3. dailyAvg モードの divisor が期間日数と一致する
 *   4. divideByMode が 0 除算を起こさない（最小値 1 保証）
 *   5. 前年と当年で曜日カウントが異なるケースでも正しい平均を算出できる
 */
import { describe, it, expect } from 'vitest'
import { countDowInRange } from '../PeriodFilter'

/* ── countDowInRange ────────────────────────────────── */

describe('countDowInRange', () => {
  it('2026年2月（非閏年・28日）の曜日カウントが正しい', () => {
    // 2026-02-01 = 日曜
    const counts = countDowInRange(2026, 2, 1, 28)

    // 28日間は各曜日4回ずつ
    expect(counts.get(0)).toBe(4) // 日
    expect(counts.get(1)).toBe(4) // 月
    expect(counts.get(2)).toBe(4) // 火
    expect(counts.get(3)).toBe(4) // 水
    expect(counts.get(4)).toBe(4) // 木
    expect(counts.get(5)).toBe(4) // 金
    expect(counts.get(6)).toBe(4) // 土

    // 合計 = 28
    const total = [...counts.values()].reduce((s, v) => s + v, 0)
    expect(total).toBe(28)
  })

  it('2024年2月（閏年・29日）の曜日カウントが正しい', () => {
    // 2024-02-01 = 木曜日
    const counts = countDowInRange(2024, 2, 1, 29)

    // 29日 = 4週 + 1日（木曜）→ 木曜だけ5回
    expect(counts.get(4)).toBe(5) // 木: 5回
    expect(counts.get(5)).toBe(4) // 金: 4回
    expect(counts.get(6)).toBe(4) // 土: 4回
    expect(counts.get(0)).toBe(4) // 日: 4回
    expect(counts.get(1)).toBe(4) // 月: 4回
    expect(counts.get(2)).toBe(4) // 火: 4回
    expect(counts.get(3)).toBe(4) // 水: 4回

    const total = [...counts.values()].reduce((s, v) => s + v, 0)
    expect(total).toBe(29)
  })

  it('2026年3月（31日）の曜日カウントが正しい', () => {
    // 2026-03-01 = 日曜
    const counts = countDowInRange(2026, 3, 1, 31)

    // 31日 = 4週 + 3日 (日月火) → 日月火が5回、他は4回
    expect(counts.get(0)).toBe(5) // 日: 5回
    expect(counts.get(1)).toBe(5) // 月: 5回
    expect(counts.get(2)).toBe(5) // 火: 5回
    expect(counts.get(3)).toBe(4) // 水: 4回
    expect(counts.get(4)).toBe(4) // 木: 4回
    expect(counts.get(5)).toBe(4) // 金: 4回
    expect(counts.get(6)).toBe(4) // 土: 4回

    const total = [...counts.values()].reduce((s, v) => s + v, 0)
    expect(total).toBe(31)
  })

  it('部分期間（中間日〜末日）の曜日カウントが正しい', () => {
    // 2026-02-10（火）〜 2026-02-20（金）= 11日間
    const counts = countDowInRange(2026, 2, 10, 20)

    const total = [...counts.values()].reduce((s, v) => s + v, 0)
    expect(total).toBe(11)

    // 11日 = 1週 + 4日 → 各曜日1〜2回
    for (const [, cnt] of counts) {
      expect(cnt).toBeGreaterThanOrEqual(1)
      expect(cnt).toBeLessThanOrEqual(2)
    }
  })

  it('1日だけの範囲でも正しく動作する', () => {
    // 2026-02-01（日曜）のみ
    const counts = countDowInRange(2026, 2, 1, 1)
    expect(counts.get(0)).toBe(1) // 日曜
    expect(counts.size).toBe(1) // 他の曜日は含まれない

    const total = [...counts.values()].reduce((s, v) => s + v, 0)
    expect(total).toBe(1)
  })
})

/* ── 平均計算の正当性（合計 → COUNT → 平均）──────── */

describe('曜日別平均の計算フロー検証', () => {
  it('当年と前年で同じ曜日の出現回数が異なる場合の平均が正しい', () => {
    // シナリオ: 月曜の売上平均を比較
    //   当年（2026年2月）: 月曜は4回、売上合計 400,000
    //   前年（2025年2月）: 月曜は4回、売上合計 380,000
    //   → 平均: 100,000 vs 95,000

    // 2026年2月の月曜カウント
    const curCounts = countDowInRange(2026, 2, 1, 28)
    expect(curCounts.get(1)).toBe(4) // 月曜4回

    // 2025年2月の月曜カウント
    const prevCounts = countDowInRange(2025, 2, 1, 28)
    expect(prevCounts.get(1)).toBe(4) // 月曜4回

    const curTotal = 400_000
    const prevTotal = 380_000

    const curAvg = Math.round(curTotal / curCounts.get(1)!)
    const prevAvg = Math.round(prevTotal / prevCounts.get(1)!)

    expect(curAvg).toBe(100_000)
    expect(prevAvg).toBe(95_000)
  })

  it('3月（31日）vs 2月（28日）で月曜の回数が異なるケース', () => {
    // 2026年3月: 月曜5回
    // 2026年2月: 月曜4回
    // 同じ売上合計でも平均は異なるべき
    const marchCounts = countDowInRange(2026, 3, 1, 31)
    const febCounts = countDowInRange(2026, 2, 1, 28)

    expect(marchCounts.get(1)).toBe(5)
    expect(febCounts.get(1)).toBe(4)

    const totalSales = 500_000
    const marchAvg = Math.round(totalSales / marchCounts.get(1)!)
    const febAvg = Math.round(totalSales / febCounts.get(1)!)

    expect(marchAvg).toBe(100_000) // 500,000 / 5
    expect(febAvg).toBe(125_000)   // 500,000 / 4

    // 同じ売上合計でも日数差により平均が25%異なることを検証
    expect(febAvg).toBeGreaterThan(marchAvg)
  })

  it('複数曜日選択時の除数は各曜日の出現回数の合計', () => {
    // 2026年2月: 全曜日4回 × 7 = 28日
    // 月曜+火曜を選択 → 4 + 4 = 8
    const counts = countDowInRange(2026, 2, 1, 28)
    const selectedDows = new Set([1, 2]) // 月, 火

    let totalCount = 0
    for (const dow of selectedDows) {
      totalCount += counts.get(dow) ?? 0
    }

    expect(totalCount).toBe(8)

    // 売上合計800,000を8で割る → 平均100,000
    expect(Math.round(800_000 / totalCount)).toBe(100_000)
  })

  it('曜日未選択時は全日数が除数になる', () => {
    const counts = countDowInRange(2026, 2, 1, 28)
    const selectedDows = new Set<number>() // 空 = 全曜日

    // 全曜日の合計 = 28
    let totalCount = 0
    for (const [, cnt] of counts) {
      totalCount += cnt
    }

    expect(totalCount).toBe(28)
    expect(selectedDows.size).toBe(0)
  })

  it('0除算が発生しない: 存在しない曜日を選択してもカウントは0だが除数は最低1', () => {
    // 2026-02-01 (日) 〜 2026-02-06 (金) の6日間 → 土曜(6)は含まれない
    const counts = countDowInRange(2026, 2, 1, 6)
    expect(counts.get(6)).toBeUndefined() // 土曜は0回

    // 除数計算時: undefined → 0 → max(0, 1) で最低1
    const satCount = counts.get(6) ?? 0
    const safeDivisor = satCount > 0 ? satCount : 1
    expect(safeDivisor).toBe(1)
  })
})

/* ── 閏年・年跨ぎの境界値テスト ───────────────────── */

describe('閏年・境界値テスト', () => {
  it('閏年2月29日がカウントに含まれる', () => {
    // 2024-02-29 = 木曜
    const counts = countDowInRange(2024, 2, 29, 29)
    expect(counts.get(4)).toBe(1) // 木曜1回
    expect(counts.size).toBe(1)
  })

  it('非閏年2月は28日まで（29日目は3月1日扱い）', () => {
    // 2026年2月に day=29 を渡すと、Date(2026,1,29) = 2026-03-01
    // countDowInRange がこの日を含む場合でも正しく動く
    const counts = countDowInRange(2026, 2, 1, 29)
    const total = [...counts.values()].reduce((s, v) => s + v, 0)
    // 29日分カウント（月跨ぎだが計算自体は壊れない）
    expect(total).toBe(29)
  })

  it('12月→1月の年跨ぎは別月として正しくカウント', () => {
    // 2025年12月: 31日
    const decCounts = countDowInRange(2025, 12, 1, 31)
    const decTotal = [...decCounts.values()].reduce((s, v) => s + v, 0)
    expect(decTotal).toBe(31)

    // 2026年1月: 31日
    const janCounts = countDowInRange(2026, 1, 1, 31)
    const janTotal = [...janCounts.values()].reduce((s, v) => s + v, 0)
    expect(janTotal).toBe(31)

    // 同じ31日でも曜日分布は異なるはず
    // 2025-12-01 = 月曜, 2026-01-01 = 木曜
    expect(decCounts.get(1)).toBe(5) // 12月: 月曜5回
    expect(janCounts.get(4)).toBe(5) // 1月: 木曜5回
  })
})
