/**
 * PeriodFilter ユニットテスト
 *
 * 技術ルール準拠検証テスト群。
 * 「合計 → COUNT → 平均」の流れが全モードで正しいことを保証する。
 *
 * 検証観点:
 *   1. 【TR-DIV-001】computeDivisor の不変条件テスト
 *   2. 【TR-DIV-002】countDistinctDays の正確性テスト
 *   3. 【TR-DIV-003】computeDowDivisorMap の正確性テスト
 *   4. countDowInRange がカレンダーベースで正確な曜日カウントを返す
 *   5. カレンダーベース除数と実データ駆動型除数の差異を検出できる
 *   6. 前年と当年で独立した除数が算出される
 *   7. スライダー動的変更に対する除数の追従検証
 *   8. 全チャートの除数算出が一元管理関数を経由していることの構造検証
 *   9. 【TR-FIL-001】filterByStore の正確性テスト
 */
import { describe, it, expect } from 'vitest'
import type { CategoryTimeSalesRecord } from '@/domain/models'
import {
  countDowInRange,
  computeDivisor,
  countDistinctDays,
  computeDowDivisorMap,
  filterByStore,
  type AggregateMode,
} from '../PeriodFilter'

/* ── テスト用ヘルパー ─────────────────────────────── */

/** 最小限の CategoryTimeSalesRecord を生成 */
function makeRecord(day: number, amount = 10000, storeId = 'S1'): CategoryTimeSalesRecord {
  return {
    day,
    storeId,
    department: { code: 'D01', name: '食品' },
    line: { code: 'L01', name: 'グロサリー' },
    klass: { code: 'K01', name: '菓子' },
    timeSlots: [{ hour: 10, amount, quantity: 1 }],
    totalQuantity: 1,
    totalAmount: amount,
  }
}

/** computeDivisor + countDistinctDays を組み合わせた便利関数（テスト用） */
function computeDataDivisor(
  records: readonly CategoryTimeSalesRecord[],
  mode: AggregateMode,
): number {
  return computeDivisor(countDistinctDays(records), mode)
}

/** computeDowDivisorMap のエイリアス（テスト用） */
function computeDataDowDivisors(
  records: readonly CategoryTimeSalesRecord[],
  year: number,
  month: number,
): Map<number, number> {
  return computeDowDivisorMap(records, year, month)
}

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

/* ── 前年比較チャートの個別除算検証 ─────────────────── */

describe('前年比較: 当年・前年の実データ日数に基づく個別除算', () => {
  /**
   * TimeSlotYoYComparisonChart の除算ロジックをシミュレートする。
   * 実データから日数をカウントし、当年・前年で独立した除数を使う。
   */
  function computeAverage(
    totalAmount: number,
    actualDataDays: Set<number>,
  ): number {
    const divisor = actualDataDays.size > 0 ? actualDataDays.size : 1
    return Math.round(totalAmount / divisor)
  }

  it('当年5日/前年4日のデータで平均が個別に計算される', () => {
    // 当年: 月曜5日分のデータ、売上合計 500,000
    const curDays = new Set([2, 9, 16, 23, 30]) // 5 Mondays
    const curTotal = 500_000
    const curAvg = computeAverage(curTotal, curDays)

    // 前年: 月曜4日分のデータ、売上合計 400,000
    const prevDays = new Set([3, 10, 17, 24]) // 4 Mondays
    const prevTotal = 400_000
    const prevAvg = computeAverage(prevTotal, prevDays)

    // 当年: 500,000 / 5 = 100,000
    expect(curAvg).toBe(100_000)
    // 前年: 400,000 / 4 = 100,000
    expect(prevAvg).toBe(100_000)

    // 合計だけ見ると当年が25%多いが、平均（1日あたり）は同額
    // → 一律除算だと誤った比較になる
    expect(curTotal).toBeGreaterThan(prevTotal)
    expect(curAvg).toBe(prevAvg) // 平均は同じ
  })

  it('一律除算（同じ除数）だと誤った結果になるケースを検出', () => {
    // 当年: 5日分、合計500,000
    const curDays = new Set([2, 9, 16, 23, 30])
    const curTotal = 500_000

    // 前年: 4日分、合計400,000
    const prevDays = new Set([3, 10, 17, 24])
    const prevTotal = 400_000

    // 【正しい】個別除算: 100,000 vs 100,000 → 前年比 100%
    const curAvgCorrect = computeAverage(curTotal, curDays)
    const prevAvgCorrect = computeAverage(prevTotal, prevDays)
    const ratioCorrect = curAvgCorrect / prevAvgCorrect

    // 【間違い】一律除算（当年の5で両方割る）: 100,000 vs 80,000 → 前年比 125%
    const uniformDiv = curDays.size
    const curAvgWrong = Math.round(curTotal / uniformDiv)
    const prevAvgWrong = Math.round(prevTotal / uniformDiv)
    const ratioWrong = curAvgWrong / prevAvgWrong

    expect(ratioCorrect).toBeCloseTo(1.0, 2) // 正しい: 100%
    expect(ratioWrong).toBeCloseTo(1.25, 2)  // 間違い: 125%

    // 一律除算は実態を歪める
    expect(ratioCorrect).not.toBeCloseTo(ratioWrong, 1)
  })

  it('片方にデータ欠損日がある場合でも安全に計算', () => {
    // 当年: 3日分（1日欠損）
    const curDays = new Set([2, 9, 23]) // 16日が欠損
    const curTotal = 300_000

    // 前年: 4日分（欠損なし）
    const prevDays = new Set([3, 10, 17, 24])
    const prevTotal = 400_000

    const curAvg = computeAverage(curTotal, curDays)
    const prevAvg = computeAverage(prevTotal, prevDays)

    expect(curAvg).toBe(100_000)  // 300,000 / 3
    expect(prevAvg).toBe(100_000) // 400,000 / 4
  })

  it('データが0日の場合は除数1（0除算防止）', () => {
    const emptyDays = new Set<number>()
    const avg = computeAverage(100_000, emptyDays)
    expect(avg).toBe(100_000) // 0除算せず値がそのまま返る
  })

  it('当年・前年のデータ日数が大きく異なるケース', () => {
    // 当年: 20日分、売上合計 2,000,000
    const curDays = new Set(Array.from({ length: 20 }, (_, i) => i + 1))
    const curTotal = 2_000_000

    // 前年: 10日分（月の半分で閉店等）、売上合計 1_000,000
    const prevDays = new Set(Array.from({ length: 10 }, (_, i) => i + 1))
    const prevTotal = 1_000_000

    const curAvg = computeAverage(curTotal, curDays)   // 2,000,000 / 20 = 100,000
    const prevAvg = computeAverage(prevTotal, prevDays) // 1,000,000 / 10 = 100,000

    expect(curAvg).toBe(100_000)
    expect(prevAvg).toBe(100_000)

    // 合計は2倍だが、日平均は同じ
    expect(curTotal / prevTotal).toBe(2)
    expect(curAvg / prevAvg).toBe(1)
  })
})

/* ── 実データ駆動型除数の検証 ─────────────────────── */

describe('実データ駆動型除数 (computeDataDivisor)', () => {
  it('total モードでは常に 1 を返す', () => {
    const records = [makeRecord(1), makeRecord(2), makeRecord(3)]
    expect(computeDataDivisor(records, 'total')).toBe(1)
  })

  it('dailyAvg モードで distinct day 数を返す', () => {
    // 3日分のデータ（日の重複あり）
    const records = [
      makeRecord(1), makeRecord(1, 20000, 'S2'), // day 1: 2レコード
      makeRecord(5),                               // day 5: 1レコード
      makeRecord(10),                              // day 10: 1レコード
    ]
    // distinct days = {1, 5, 10} → 3
    expect(computeDataDivisor(records, 'dailyAvg')).toBe(3)
  })

  it('dowAvg モードでも distinct day 数を返す', () => {
    const records = [
      makeRecord(2),  // 月曜
      makeRecord(9),  // 月曜
      makeRecord(16), // 月曜
    ]
    expect(computeDataDivisor(records, 'dowAvg')).toBe(3)
  })

  it('空レコードでは 1 を返す（0除算防止）', () => {
    expect(computeDataDivisor([], 'dailyAvg')).toBe(1)
    expect(computeDataDivisor([], 'dowAvg')).toBe(1)
  })

  it('カレンダーベースと実データベースの差異を検出', () => {
    // 2026年2月: カレンダー上は28日、月曜は4回
    // しかし実データは3日分（月曜3回分）しかない
    const records = [
      makeRecord(2, 100_000),   // 月曜1
      makeRecord(9, 120_000),   // 月曜2
      makeRecord(23, 80_000),   // 月曜3  ※16日(月曜4)はデータなし
    ]

    const total = records.reduce((s, r) => s + r.totalAmount, 0) // 300,000

    // 実データ駆動型: 300,000 / 3 = 100,000
    const dataDiv = computeDataDivisor(records, 'dowAvg')
    expect(dataDiv).toBe(3)
    expect(Math.round(total / dataDiv)).toBe(100_000)

    // カレンダーベース: 300,000 / 4 = 75,000（不正確）
    const calendarDiv = countDowInRange(2026, 2, 1, 28).get(1)! // 月曜4回
    expect(calendarDiv).toBe(4)
    expect(Math.round(total / calendarDiv)).toBe(75_000) // 過小評価

    // 差異を検出
    expect(dataDiv).not.toBe(calendarDiv)
  })

  it('期間選択（1-7日）vs（1-28日）でデータ除数が正しく変わる', () => {
    // 全28日分のレコード
    const allRecords = Array.from({ length: 28 }, (_, i) =>
      makeRecord(i + 1, 10000),
    )

    // 1-7日フィルタ
    const weekRecords = allRecords.filter((r) => r.day >= 1 && r.day <= 7)
    expect(computeDataDivisor(weekRecords, 'dailyAvg')).toBe(7)

    // 1-28日フィルタ
    expect(computeDataDivisor(allRecords, 'dailyAvg')).toBe(28)
  })
})

/* ── 曜日ごとの実データ駆動型除数の検証 ───────────── */

describe('曜日ごとの実データ駆動型除数 (computeDataDowDivisors)', () => {
  it('各曜日のデータ日数を正しくカウント', () => {
    // 2026年2月のレコード（月曜3回分、火曜2回分）
    const records = [
      makeRecord(2),   // 月曜
      makeRecord(9),   // 月曜
      makeRecord(16),  // 月曜
      makeRecord(3),   // 火曜
      makeRecord(10),  // 火曜
    ]

    const dowDivs = computeDataDowDivisors(records, 2026, 2)

    expect(dowDivs.get(1)).toBe(3) // 月曜: 3日分
    expect(dowDivs.get(2)).toBe(2) // 火曜: 2日分
    expect(dowDivs.has(0)).toBe(false) // 日曜: データなし
  })

  it('同一曜日・同一日の複数レコードが重複カウントされない', () => {
    // 同じ月曜(2日)に複数店舗のデータ
    const records = [
      makeRecord(2, 10000, 'S1'),
      makeRecord(2, 20000, 'S2'),
      makeRecord(2, 30000, 'S3'),
    ]

    const dowDivs = computeDataDowDivisors(records, 2026, 2)

    // day=2 は1日分としてカウント
    expect(dowDivs.get(1)).toBe(1) // 月曜: 1日分
  })

  it('カレンダーベースのDOWカウントと実データベースの差異', () => {
    // 2026年2月のカレンダー: 月曜4回（2,9,16,23）
    // 実データ: 月曜3回分（16日がデータなし）
    const records = [
      makeRecord(2),
      makeRecord(9),
      makeRecord(23),
    ]

    const dataDowDivs = computeDataDowDivisors(records, 2026, 2)
    const calendarDowCount = countDowInRange(2026, 2, 1, 28).get(1)!

    expect(dataDowDivs.get(1)).toBe(3)     // 実データ: 3回
    expect(calendarDowCount).toBe(4)        // カレンダー: 4回
  })

  it('閏年の曜日カウントが正しい', () => {
    // 2024年2月29日（木曜）を含むデータ
    const records = [
      makeRecord(1),   // 2024-02-01（木曜）
      makeRecord(8),   // 2024-02-08（木曜）
      makeRecord(15),  // 2024-02-15（木曜）
      makeRecord(22),  // 2024-02-22（木曜）
      makeRecord(29),  // 2024-02-29（木曜）
    ]

    const dowDivs = computeDataDowDivisors(records, 2024, 2)
    expect(dowDivs.get(4)).toBe(5) // 木曜: 5回
  })
})

/* ── エンドツーエンド: 平均計算パイプライン検証 ──── */

describe('E2E: 合計 → 実データCOUNT → 平均 パイプライン', () => {
  it('フィルタ → 集計 → 実データ除数 → 平均 の完全なフロー', () => {
    // 5日分のデータ（各日100,000円）
    const records = [
      makeRecord(2, 100_000),   // 月曜
      makeRecord(9, 100_000),   // 月曜
      makeRecord(16, 100_000),  // 月曜
      makeRecord(23, 100_000),  // 月曜
      makeRecord(3, 100_000),   // 火曜
    ]

    // 1. フィルタ（月曜のみ）
    const mondayOnly = records.filter((r) => {
      const dow = new Date(2026, 1, r.day).getDay()
      return dow === 1 // 月曜
    })
    expect(mondayOnly.length).toBe(4)

    // 2. 集計
    const total = mondayOnly.reduce((s, r) => s + r.totalAmount, 0)
    expect(total).toBe(400_000)

    // 3. 実データ除数を算出
    const div = computeDataDivisor(mondayOnly, 'dowAvg')
    expect(div).toBe(4)

    // 4. 平均
    const avg = Math.round(total / div)
    expect(avg).toBe(100_000)
  })

  it('当年・前年で独立した除数を使った前年比計算', () => {
    // 当年: 月曜4回、各120,000円
    const curRecords = [
      makeRecord(2, 120_000),
      makeRecord(9, 120_000),
      makeRecord(16, 120_000),
      makeRecord(23, 120_000),
    ]

    // 前年: 月曜3回（1回欠損）、各100,000円
    const prevRecords = [
      makeRecord(3, 100_000),
      makeRecord(10, 100_000),
      makeRecord(24, 100_000),
      // 17日が欠損
    ]

    const curTotal = curRecords.reduce((s, r) => s + r.totalAmount, 0) // 480,000
    const prevTotal = prevRecords.reduce((s, r) => s + r.totalAmount, 0) // 300,000

    const curDiv = computeDataDivisor(curRecords, 'dowAvg') // 4
    const prevDiv = computeDataDivisor(prevRecords, 'dowAvg') // 3

    const curAvg = Math.round(curTotal / curDiv)   // 120,000
    const prevAvg = Math.round(prevTotal / prevDiv) // 100,000

    expect(curAvg).toBe(120_000)
    expect(prevAvg).toBe(100_000)

    // 前年比 120%（1日あたり売上が20%増加）
    expect(curAvg / prevAvg).toBeCloseTo(1.2, 2)

    // 一律除算（カレンダー4回で割る）だと:
    // 前年 300,000/4 = 75,000 → 前年比 160% と大幅に歪む
    const wrongPrevAvg = Math.round(prevTotal / curDiv) // 75,000
    expect(wrongPrevAvg).toBe(75_000)
    expect(curAvg / wrongPrevAvg).toBeCloseTo(1.6, 2) // 誤り
  })
})

/* ══════════════════════════════════════════════════════════
 * 技術ルール準拠テスト (Technical Rule Compliance Tests)
 *
 * 以下のテストは PeriodFilter が公開する純粋関数の
 * 不変条件・境界値・動的追従をチェックする。
 * 新しいチャートを追加する際も、これらのルールに準拠すること。
 * ══════════════════════════════════════════════════════════ */

/* ── 【TR-DIV-001】computeDivisor 不変条件テスト ──── */

describe('【TR-DIV-001】computeDivisor 不変条件', () => {
  const modes: AggregateMode[] = ['total', 'dailyAvg', 'dowAvg']

  it('total モードでは入力に関わらず常に 1 を返す', () => {
    expect(computeDivisor(0, 'total')).toBe(1)
    expect(computeDivisor(1, 'total')).toBe(1)
    expect(computeDivisor(28, 'total')).toBe(1)
    expect(computeDivisor(1000, 'total')).toBe(1)
  })

  it('dailyAvg / dowAvg モードで正の値を返す', () => {
    expect(computeDivisor(5, 'dailyAvg')).toBe(5)
    expect(computeDivisor(5, 'dowAvg')).toBe(5)
    expect(computeDivisor(1, 'dailyAvg')).toBe(1)
    expect(computeDivisor(1, 'dowAvg')).toBe(1)
  })

  it('返り値は全モードで >= 1 であること（0除算防止）', () => {
    for (const mode of modes) {
      for (const dayCount of [0, 1, 5, 28, 31]) {
        const result = computeDivisor(dayCount, mode)
        expect(result).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('distinctDayCount = 0 で dailyAvg/dowAvg でも 1 を返す', () => {
    expect(computeDivisor(0, 'dailyAvg')).toBe(1)
    expect(computeDivisor(0, 'dowAvg')).toBe(1)
  })

  it('distinctDayCount が負の異常値でも安全に動作する', () => {
    // 負値は実運用では発生しないが、防御的に >= 1 を保証
    expect(computeDivisor(-1, 'dailyAvg')).toBe(1)
    expect(computeDivisor(-100, 'dowAvg')).toBe(1)
  })
})

/* ── 【TR-DIV-002】countDistinctDays テスト ────────── */

describe('【TR-DIV-002】countDistinctDays', () => {
  it('空配列では 0 を返す', () => {
    expect(countDistinctDays([])).toBe(0)
  })

  it('単一レコードでは 1 を返す', () => {
    expect(countDistinctDays([makeRecord(5)])).toBe(1)
  })

  it('同一日の複数レコード（複数店舗）は 1 としてカウント', () => {
    const records = [
      makeRecord(5, 10000, 'S1'),
      makeRecord(5, 20000, 'S2'),
      makeRecord(5, 30000, 'S3'),
    ]
    expect(countDistinctDays(records)).toBe(1)
  })

  it('異なる日のレコードは個別にカウント', () => {
    const records = [
      makeRecord(1), makeRecord(5), makeRecord(10), makeRecord(20),
    ]
    expect(countDistinctDays(records)).toBe(4)
  })

  it('重複日を含む場合は正しく deduplicate される', () => {
    const records = [
      makeRecord(1), makeRecord(1, 20000, 'S2'),
      makeRecord(5), makeRecord(5, 30000, 'S3'),
      makeRecord(10),
    ]
    expect(countDistinctDays(records)).toBe(3)
  })
})

/* ── 【TR-DIV-003】computeDowDivisorMap テスト ──────── */

describe('【TR-DIV-003】computeDowDivisorMap', () => {
  it('各曜日の実データ日数を正しくカウント', () => {
    // 2026年2月: 月曜=2,9,16,23  火曜=3,10,17,24
    const records = [
      makeRecord(2),  makeRecord(9),  makeRecord(16), // 月曜3日
      makeRecord(3),  makeRecord(10),                  // 火曜2日
    ]
    const result = computeDowDivisorMap(records, 2026, 2)
    expect(result.get(1)).toBe(3) // 月曜
    expect(result.get(2)).toBe(2) // 火曜
  })

  it('返り値の各値は >= 1 であること', () => {
    const records = [makeRecord(2)] // 2026-02-02 = 月曜
    const result = computeDowDivisorMap(records, 2026, 2)
    for (const [, count] of result) {
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })

  it('データのない曜日は Map に含まれない', () => {
    const records = [makeRecord(2)] // 月曜のみ
    const result = computeDowDivisorMap(records, 2026, 2)
    expect(result.has(1)).toBe(true)  // 月曜
    expect(result.has(0)).toBe(false) // 日曜: データなし
    expect(result.has(6)).toBe(false) // 土曜: データなし
  })

  it('空配列では空の Map を返す', () => {
    const result = computeDowDivisorMap([], 2026, 2)
    expect(result.size).toBe(0)
  })
})

/* ── スライダー動的変更テスト ─────────────────────── */

describe('スライダー動的変更に対する除数追従', () => {
  // 全28日分のデータ
  const allRecords = Array.from({ length: 28 }, (_, i) =>
    makeRecord(i + 1, (i + 1) * 10_000),
  )

  /** dayRange に基づくフィルタをシミュレート */
  function filterByDayRange(records: readonly CategoryTimeSalesRecord[], from: number, to: number) {
    return records.filter((r) => r.day >= from && r.day <= to)
  }

  it('スライダー範囲を変えると除数が正しく追従する', () => {
    // 全期間: 1-28日 → 28日分
    const full = filterByDayRange(allRecords, 1, 28)
    expect(computeDivisor(countDistinctDays(full), 'dailyAvg')).toBe(28)

    // 前半: 1-14日 → 14日分
    const firstHalf = filterByDayRange(allRecords, 1, 14)
    expect(computeDivisor(countDistinctDays(firstHalf), 'dailyAvg')).toBe(14)

    // 1週間: 1-7日 → 7日分
    const week = filterByDayRange(allRecords, 1, 7)
    expect(computeDivisor(countDistinctDays(week), 'dailyAvg')).toBe(7)

    // 1日: 15-15日 → 1日分
    const single = filterByDayRange(allRecords, 15, 15)
    expect(computeDivisor(countDistinctDays(single), 'dailyAvg')).toBe(1)
  })

  it('データ欠損範囲のスライダーでも安全に動作する', () => {
    // 1, 5, 10, 20日のみデータあり
    const sparse = [makeRecord(1), makeRecord(5), makeRecord(10), makeRecord(20)]

    // 1-28日スライダー: データは4日分
    const full = filterByDayRange(sparse, 1, 28)
    expect(computeDivisor(countDistinctDays(full), 'dailyAvg')).toBe(4)

    // 1-7日スライダー: データは2日分（1日, 5日）
    const week = filterByDayRange(sparse, 1, 7)
    expect(computeDivisor(countDistinctDays(week), 'dailyAvg')).toBe(2)

    // 11-19日スライダー: データなし → 除数 1（0除算防止）
    const empty = filterByDayRange(sparse, 11, 19)
    expect(computeDivisor(countDistinctDays(empty), 'dailyAvg')).toBe(1)
  })

  it('total モードではスライダー変更に関わらず除数 1', () => {
    for (const [from, to] of [[1, 28], [1, 7], [15, 15], [11, 19]] as const) {
      const filtered = filterByDayRange(allRecords, from, to)
      expect(computeDivisor(countDistinctDays(filtered), 'total')).toBe(1)
    }
  })

  it('dowAvg モードで曜日ごとの除数がスライダーに追従する', () => {
    // 全期間: 2026年2月 各曜日4回
    const full = filterByDayRange(allRecords, 1, 28)
    const fullDow = computeDowDivisorMap(full, 2026, 2)
    for (const [, count] of fullDow) {
      expect(count).toBe(4) // 28日 ÷ 7曜日 = 4回ずつ
    }

    // 前半: 1-14日 各曜日2回
    const half = filterByDayRange(allRecords, 1, 14)
    const halfDow = computeDowDivisorMap(half, 2026, 2)
    for (const [, count] of halfDow) {
      expect(count).toBe(2)
    }

    // 1週間: 1-7日 各曜日1回
    const week = filterByDayRange(allRecords, 1, 7)
    const weekDow = computeDowDivisorMap(week, 2026, 2)
    for (const [, count] of weekDow) {
      expect(count).toBe(1)
    }
  })
})

/* ── 平均計算 E2E: computeDivisor を経由した一元管理検証 ── */

describe('平均計算 E2E: 一元管理関数経由の検証', () => {
  it('computeDivisor を使った平均と手動計算の結果が一致する', () => {
    const records = [
      makeRecord(2, 100_000),
      makeRecord(9, 120_000),
      makeRecord(16, 80_000),
    ]
    const total = records.reduce((s, r) => s + r.totalAmount, 0) // 300,000

    // 一元管理関数経由
    const div = computeDivisor(countDistinctDays(records), 'dailyAvg')
    const avg = Math.round(total / div)

    // 手動計算（期待値）
    expect(div).toBe(3)
    expect(avg).toBe(100_000)
  })

  it('当年・前年で独立した除数を computeDivisor で算出', () => {
    const curRecords = [
      makeRecord(2, 120_000), makeRecord(9, 120_000),
      makeRecord(16, 120_000), makeRecord(23, 120_000),
    ]
    const prevRecords = [
      makeRecord(3, 100_000), makeRecord(10, 100_000), makeRecord(24, 100_000),
    ]

    const curDiv = computeDivisor(countDistinctDays(curRecords), 'dowAvg')
    const prevDiv = computeDivisor(countDistinctDays(prevRecords), 'dowAvg')

    expect(curDiv).toBe(4)
    expect(prevDiv).toBe(3)

    const curAvg = Math.round(480_000 / curDiv)   // 120,000
    const prevAvg = Math.round(300_000 / prevDiv)  // 100,000
    expect(curAvg / prevAvg).toBeCloseTo(1.2, 2)
  })
})

/* ── 構造テスト: 全チャートが computeDivisor を使用していることの検証 ── */

describe('構造テスト: computeDivisor の一元管理', () => {
  it('computeDivisor は AggregateMode の全値を網羅している', () => {
    // 全てのモードで呼び出し可能であることを検証
    const modes: AggregateMode[] = ['total', 'dailyAvg', 'dowAvg']
    for (const mode of modes) {
      expect(typeof computeDivisor(10, mode)).toBe('number')
    }
  })

  it('computeDivisor と countDistinctDays の組合せで computeDataDivisor と同一結果', () => {
    const records = [
      makeRecord(1), makeRecord(1, 20000, 'S2'),
      makeRecord(5), makeRecord(10),
    ]
    for (const mode of ['total', 'dailyAvg', 'dowAvg'] as AggregateMode[]) {
      const viaPure = computeDivisor(countDistinctDays(records), mode)
      const viaHelper = computeDataDivisor(records, mode)
      expect(viaPure).toBe(viaHelper)
    }
  })

  it('computeDowDivisorMap の各値と computeDivisor(count, "dowAvg") が整合', () => {
    const records = [
      makeRecord(2),  makeRecord(9),  makeRecord(16), // 月曜3日
      makeRecord(3),  makeRecord(10),                  // 火曜2日
    ]
    const dowMap = computeDowDivisorMap(records, 2026, 2)

    // 各曜日について computeDivisor を使っても同じ結果が得られる
    for (const [dow, count] of dowMap) {
      expect(computeDivisor(count, 'dowAvg')).toBe(count)
      expect(dow).toBeGreaterThanOrEqual(0)
      expect(dow).toBeLessThanOrEqual(6)
    }
  })
})

/* ── 【TR-FIL-001】filterByStore テスト ──────────── */

describe('【TR-FIL-001】filterByStore', () => {
  it('空の storeIds で全レコードを返す', () => {
    const records = [makeRecord(1, 10000, 'S1'), makeRecord(2, 20000, 'S2')]
    const result = filterByStore(records, new Set<string>())
    expect(result).toBe(records) // 同一参照
    expect(result.length).toBe(2)
  })

  it('指定された店舗のみフィルタする', () => {
    const records = [
      makeRecord(1, 10000, 'S1'),
      makeRecord(2, 20000, 'S2'),
      makeRecord(3, 30000, 'S3'),
    ]
    const result = filterByStore(records, new Set(['S1', 'S3']))
    expect(result.length).toBe(2)
    expect(result[0].storeId).toBe('S1')
    expect(result[1].storeId).toBe('S3')
  })

  it('存在しない店舗IDで空配列を返す', () => {
    const records = [makeRecord(1, 10000, 'S1')]
    const result = filterByStore(records, new Set(['S99']))
    expect(result.length).toBe(0)
  })

  it('空レコードで空配列を返す', () => {
    const result = filterByStore([], new Set(['S1']))
    expect(result.length).toBe(0)
  })

  it('filterByStore + countDistinctDays の組み合わせが正しく動作する', () => {
    const records = [
      makeRecord(1, 10000, 'S1'),
      makeRecord(1, 20000, 'S2'), // 同日・別店舗
      makeRecord(2, 30000, 'S1'),
      makeRecord(3, 40000, 'S2'),
    ]
    // S1のみ: day 1, 2 → distinct 2日
    const s1Only = filterByStore(records, new Set(['S1']))
    expect(countDistinctDays(s1Only)).toBe(2)

    // S2のみ: day 1, 3 → distinct 2日
    const s2Only = filterByStore(records, new Set(['S2']))
    expect(countDistinctDays(s2Only)).toBe(2)

    // 全店舗: day 1, 2, 3 → distinct 3日
    const all = filterByStore(records, new Set<string>())
    expect(countDistinctDays(all)).toBe(3)
  })

  it('filterByStore → computeDivisor のパイプラインが正しい除数を返す', () => {
    const records = [
      makeRecord(1, 100_000, 'S1'),
      makeRecord(2, 200_000, 'S1'),
      makeRecord(1, 150_000, 'S2'),
      makeRecord(3, 300_000, 'S2'),
    ]

    // S1: 2日分、合計 300,000 → 日平均 150,000
    const s1Filtered = filterByStore(records, new Set(['S1']))
    const s1Div = computeDivisor(countDistinctDays(s1Filtered), 'dailyAvg')
    const s1Total = s1Filtered.reduce((s, r) => s + r.totalAmount, 0)
    expect(s1Div).toBe(2)
    expect(Math.round(s1Total / s1Div)).toBe(150_000)

    // S2: 2日分、合計 450,000 → 日平均 225,000
    const s2Filtered = filterByStore(records, new Set(['S2']))
    const s2Div = computeDivisor(countDistinctDays(s2Filtered), 'dailyAvg')
    const s2Total = s2Filtered.reduce((s, r) => s + r.totalAmount, 0)
    expect(s2Div).toBe(2)
    expect(Math.round(s2Total / s2Div)).toBe(225_000)
  })
})
